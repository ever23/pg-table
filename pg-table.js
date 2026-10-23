const { Pool, Client } = require("pg")
const pgTabla = require("./lib/pgTabla")
const pgResult = require("./lib/pgResult")
const { POSTGRESQL_DB, connect, dbResult } = pgTabla

/**
 * postgreSqlTable
 * Crea una conexión a una base de datos PostgreSQL utilizando un Pool de conexiones.
 */
class postgreSqlTable extends connect {
    /**
     * @param {object|Pool|Client} params - Configuración para postgres o instancia existente.
     * @param {boolean} connect - (Legacy) Indica si conecta al instante.
     */
    constructor(params, connect = true) {
        // Detectamos si params es una instancia de Pool o Client
        const isPool = params && (params.constructor.name === 'Pool' || (params.connect && params.query && params.on));
        const isConn = params && (params.constructor.name === 'Client' || params instanceof Client);

        if (isPool || isConn) {
            super({}, POSTGRESQL_DB)
            this.connection = params
        } else {
            super(params, POSTGRESQL_DB)
            // Usamos Pool por defecto para mejor gestión de conexiones
            this.connection = new Pool(this.config)
        }
        this._escapeChar = "\""
        this._information_schema = "SELECT information_schema.columns.* FROM information_schema.columns WHERE table_name="
        this._connectCallback = () => { }
        this._transactionClient = null
    }

    /**
     * Obtiene un cliente dedicado para transacciones si no existe uno.
     * @returns {Promise<Client>}
     */
    async _getTransactionClient() {
        if (this._transactionClient) return this._transactionClient;

        // Si this.connection es un Client simple, lo usamos directamente
        if (!(this.connection instanceof Pool) && typeof this.connection.connect !== 'function') {
            this._transactionClient = this.connection;
            return this._transactionClient;
        }

        // Si es un Pool, pedimos un cliente
        this._transactionClient = await this.connection.connect();
        return this._transactionClient;
    }

    /**
     * Inicia una transacción.
     */
    async beginTransaction() {
        const client = await this._getTransactionClient();
        return client.query("BEGIN");
    }

    /**
     * Confirma la transacción y libera el cliente.
     */
    async commit() {
        if (!this._transactionClient) return;
        try {
            return await this._transactionClient.query("COMMIT");
        } finally {
            this._releaseTransactionClient();
        }
    }

    /**
     * Revierte la transacción y libera el cliente.
     */
    async rollback() {
        if (!this._transactionClient) return;
        try {
            return await this._transactionClient.query("ROLLBACK");
        } finally {
            this._releaseTransactionClient();
        }
    }

    /**
     * Libera el cliente de la transacción de vuelta al pool.
     */
    _releaseTransactionClient() {
        if (this._transactionClient) {
            // Solo liberamos si viene de un Pool (tiene el método release)
            if (typeof this._transactionClient.release === 'function') {
                this._transactionClient.release();
            }
            this._transactionClient = null;
        }
    }

    async _acquireDedicatedConnection() {
        return new Promise((resolve, reject) => {
            if (typeof this.connection.connect !== 'function') {
                return resolve(this.connection);
            }
            this.connection.connect((err, client, release) => {
                if (err) return reject(err);
                client.release = release;
                resolve(client);
            });
        });
    }

    async _releaseDedicatedConnection(client) {
        if (client && typeof client.release === 'function') {
            client.release();
        }
    }

    async _queryOnConnection(client, query) {
        this.lastSql = query;
        return this._executeWithTiming(query, async () => {
            try {
                const result = await client.query(query);
                if (result && result.rows) {
                    return new pgResult(this, result);
                }
                return result;
            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * Construye un objeto dbTabla asociado al nombre de la tabla.
     * @param {string} tabla - Nombre de la tabla.
     * @param {function} callback - Callback opcional.
     * @param {boolean} verify - Indica si se debe verificar la existencia de la tabla.
     * @return {dbTabla}
     */
    tabla(tabla, callback, verify = false) {
        if (this._caheTablas[tabla] !== undefined) {
            if (typeof callback === "function") callback(this._caheTablas[tabla])
            return this._caheTablas[tabla]
        }
        return this._caheTablas[tabla] = new pgTabla({
            tabla: tabla,
            connection: this,
            callback: t => typeof callback === "function" ? callback(t) : null,
            config: this.helpersConf()
        }, verify)
    }

    /**..
     * Conecta con la base de datos (Principalmente para compatibilidad).
     * @param {function} callback - Función que se ejecutará al conectar.
     */
    connect(callback = () => { }) {
        this.connection.connect((err, client, release) => {
            if (err) return callback(err)
            if (release) release() // Liberar el cliente inmediatamente si es un Pool
            callback(null)
        })
    }

    /**
     * Envía una consulta a la base de datos.
     * @param {string} query - Consulta SQL.
     * @return {Promise}
     */
    async query(query) {
        this.lastSql = query;
        return this._executeWithTiming(query, async () => {
            // Si hay una transacción activa, usamos ese cliente. Si no, usamos el pool.
            const runner = this._transactionClient || this.connection;
            try {
                const result = await runner.query(query);
                if (result && result.rows) {
                    return new pgResult(this, result);
                }
                return result;
            } catch (error) {
                throw error;
            }
        });
    }

    /**
     * Termina la conexión y libera el Pool.
     */
    end() {
        if (typeof this.connection.end === 'function') {
            this.connection.end()
        }
    }

    /**
     * Verifica la existencia de la tabla y obtiene sus metadatos.
     * @param {string} table - Nombre de la tabla.
     * @return {Promise}
     */
    async _keysInTable(table) {
        // Intentamos obtener el nombre de la base de datos de varias fuentes
        const db = this.config.database || (this.connection.options ? this.connection.options.database : this.connection.database);

        try {
            // 1. Obtener columnas básicas (filtramos por public que es lo estándar en PG)
            const result1 = await this.query(`${this._information_schema}'${table}' AND (table_schema='public' OR table_catalog='${db}')`);
            const hasRows = result1 && result1.length > 0;

            if (!hasRows) {
                // Si no existe, intentamos cargar desde el modelo
                const model = await this.inModel(table, true);
                if (model) {
                    // Si se creó, re-intentamos obtener las llaves
                    return this._keysInTable(table);
                }
                throw new Error(`La tabla '${table}' no existe en la base de datos y no se encontró modelo.`);
            }

            // 2. Obtener constraints (Primary Keys, Uniques)
            const result2 = await this.query(`
                SELECT 
                    usage.column_name, 
                    const.constraint_type 
                FROM information_schema.key_column_usage usage
                JOIN information_schema.table_constraints const
                  ON usage.constraint_name = const.constraint_name 
                  AND usage.table_schema = const.table_schema
                WHERE usage.table_name = '${table}' 
                  AND (usage.table_catalog = '${db}' OR usage.table_schema = 'public')
            `);

            return new Promise(resolve => {
                this._procesingKeys(table, result1, result2, resolve);
            });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Procesa los metadatos y genera el objeto descriptivo de columnas.
     */
    _procesingKeys(table, data1, data2, callback) {
        const colums = new Array(data1.length)
        for (let item of data1) {
            colums[item.ordinal_position - 1] = {
                name: item.column_name,
                type: item.data_type,
                defaultNull: item.is_nullable === "YES",
                primary: !!data2.find(d => d.column_name === item.column_name && d.constraint_type === 'PRIMARY KEY'),
                unique: !!data2.find(d => d.column_name === item.column_name && d.constraint_type === 'UNIQUE'),
                default: !/nextval\('[\w]+'::regclass\)/i.test(item.column_default) ? item.column_default : "",
                autoincrement: /nextval\('[\w]+'::regclass\)/i.test(item.column_default)
            }
        }

        callback({
            tabla: table,
            colums: colums,
            colum: colums
        })
    }
}

module.exports = postgreSqlTable

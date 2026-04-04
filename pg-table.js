const { Client } = require("pg")
const pgTabla = require("./lib/pgTabla")
const { POSTGRESQL_DB, connect } = pgTabla
/**
* postgreSqlTable
* crea una conexion a una base de datos postgresql
*/
class postgreSqlTable extends connect {
    /**
    * @param {object|Client} param - configuracion para postgres o objeto Client de pg
    * @param {boolean} connect - indica si connectata al instante
    */
    constructor(params, connect = true) {
        if (params instanceof Client) {
            super({}, POSTGRESQL_DB)
            this.connection = params
        } else {
            super(params, POSTGRESQL_DB)
            this.connection = new Client(params)
            if (connect)
                this.connect()
        }
        this._escapeChar = "\""
        this._information_schema = "SELECT information_schema.columns.* FROM information_schema.columns WHERE table_name="
        this._connectCallback = () => { }
    }
    /**
    * construlle un objeto dbtabla asociado a el nombre
    * de la tabla del primer parametro
    * @param {string} tabla - nombre de la tabla en la base de datos
    * @param {function} callback - funcion anomina que se ejecutara cuando se verifique la existencia de la tabla
    * @param {boolean} verify -
    * @return {dbTabla}
    */
    tabla(tabla, callback, verify = false) {
        if (typeof this._caheTablas[tabla] !== "undefined") {
            typeof callback === "function" ? callback(this._caheTablas[tabla]) : null
            return this._caheTablas[tabla]
        }
        return this._caheTablas[tabla] = new pgTabla({
            tabla: tabla,
            connection: this,
            callback: t => typeof callback === "function" ? callback(t) : null,
            config: {
                escapeChar: this._escapeChar,
                reserveIdentifiers: this._reserveIdentifiers,
                ar_aliased_tables: this._ar_aliased_tables,
                dbprefix: this._dbprefix,
                swap_pre: this._swap_pre,

            }
        }, typeof callback === "function" && verify)

    }
    /**
    * connecta con la base de datos
    * @param {function} callback - funcion que se  ejecutara al connectar
    */
    connect(callback = () => { }) {
        //this._connectCallback=callback
        this.connection.connect(ok => {
            callback(ok)
        })
    }

    /**
    * envia una consulta a la base de datos
    * @param {string} query - consulta sql
    * @return {Promise}
    */
    query(query) {
        return new Promise((resolver, reject) => {
            try {
                this.connection.query(query, (error, result) => {
                    if (error) {
                        return reject(error)
                    }
                    resolver(result)
                })
            } catch (e) {
                reject(e)
            }

        })
    }

    /**
    * termina la conexion
    */
    end() {
        this.connection.end()
    }
    /**
    * verificara la existencia de la tabla
    * en la base de datos y pasa lo metadatos de la misma calback en
    * el segundo parametro
    * @param {string} table - nombre de la tabla
    * @return {Promise}
    */
    _keysInTable(table) {
        return new Promise((res, rej) => {

            this.query(`${this._information_schema}'${table}' and table_catalog='${this.connection.database}'`)
                .then(result1 => {
                    this.inModel(table, result1.rows.length == 0)
                        .then(res).catch(e => {
                            if (e === undefined) {
                                if (result1.rows.length == 0)
                                    rej("la tabla no existe")

                                const db = this.connection.database
                                this.query(`
                                    SELECT 
                                        information_schema.key_column_usage.column_name, 
                                        information_schema.table_constraints.constraint_type 
                                    FROM information_schema.key_column_usage
                                    JOIN information_schema.table_constraints 
                                      ON information_schema.key_column_usage.constraint_name = information_schema.table_constraints.constraint_name 
                                      AND information_schema.key_column_usage.table_schema = information_schema.table_constraints.table_schema
                                    WHERE information_schema.key_column_usage.table_name = '${table}' 
                                      AND information_schema.key_column_usage.table_catalog = '${db}' 
                                      AND information_schema.table_constraints.table_catalog = '${db}'
                                `)
                                    .then(resul2 => {
                                        this._procesingKeys(table, result1.rows, resul2.rows, res)
                                    }).catch(rej)
                            } else {
                                rej(e)
                            }
                        })
                }).catch(rej)
        })
    }
    /**
    * procesa los metadatos y los pasa a la funcion
    * @param {string} table - nombre de la tabla
    * @param {array} data - metadatos crudos
    * @param {function} callback - funcion a ejecutar cuando se obtengan los metadatos
    *
    */
    _procesingKeys(table, data1, data2, callback) {

        let colums = new Array(data1.length)
        for (let item of data1) {
            colums[item.ordinal_position - 1] = {
                name: item.column_name,
                type: item.data_type,
                defaultNull: item.is_nullable == "YES" ? true : false,
                primary: data2.find(d => d.column_name == item.column_name && d.constraint_type == 'PRIMARY KEY') ? true : false,
                unique: data2.find(d => d.column_name == item.column_name && d.constraint_type == 'UNIQUE') ? true : false,
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

# pg-table

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]

**pg-table** es el módulo final y listo para producción para interactuar con bases de datos PostgreSQL en Node.js. Al integrar de manera fluida las capacidades de **dbtabla** (la capa de abstracción de base de datos) y **tabla-model** (la definición de esquemas), proporciona al desarrollador una interfaz robusta y escalable para la gestión de datos.

## Tabla de contenidos

- [Instalación](#instalación)
- [Introducción](#introducción)
- [Uso](#uso)
- [Documentación del API](#documentación-del-api)

## Instalación

`pg-table` es el paquete principal que necesitas para interactuar con PostgreSQL de forma eficiente:

```sh
$ npm install pg-table
```

---

## Introducción

`pg-table` actúa como la interfaz definitiva que simplifica la interacción con PostgreSQL, ocultando la complejidad del driver nativo `pg` y las abstracciones subyacentes. Internamente, utiliza un ecosistema diseñado para maximizar la productividad y escalabilidad:

1.  **Capa de Datos de Alto Nivel**: Utiliza las abstracciones de `dbtabla` para realizar operaciones CRUD potentes (Select, Insert, Update, Delete) sin escribir consultas SQL manuales.
2.  **Gestión de Esquemas Automática**: Al integrar `tabla-model`, tus tablas se crean y se inicializan automáticamente al arrancar la aplicación basándose en tus definiciones de modelos.
3.  **Filas Inteligentes**: Los resultados de tus consultas son objetos interactivos que permiten actualizar o eliminar registros directamente desde JavaScript.

### Beneficios clave:
*   **Velocidad de Desarrollo**: Implementa búsquedas complejas con Joins y filtros dinámicos en segundos.
*   **Agnosticismo Sintáctico**: Olvídate de los detalles de la sintaxis SQL específica de PostgreSQL para tareas comunes.
*   **Integridad de Datos**: Manejo profesional de tipos de datos y relaciones de claves foráneas.

---

## Uso

Para empezar, solo necesitas configurar la conexión y definir tus modelos. `pg-table` se encargará de gestionar el pool de conexiones y garantizar que tus datos se guarden correctamente.

[Más documentación sobre dbTabla..](https://github.com/ever23/dbtabla#dbtabla-1)

### Ejemplo de uso básico:
```js
const Postgre = require("pg-table");

// Conexión estándar
let db = new Postgre({
    host: 'localhost',
    user: 'postgres',
    password: 'password',
    database: 'mi_base_de_datos'
});

let tabla = db.tabla("clientes");

// Inserción directa sin preocuparte por la formación de sentencias SQL
tabla.insert({ nombre: "Juan Pérez", empresa: "TechCorp" })
    .then(res => console.log("Cliente guardado:", res))
    .catch(err => console.error("Error:", err));
```

### El flujo recomendado (Model-Driven)
Define tus esquemas en archivos `.js` independientes y deja que `pg-table` orqueste la base de datos PostgreSQL por ti.

```js
// ./model/cliente.js
const Model = require("tabla-model");

module.exports = new Model("clientes", {
    colums: [ 
        { name: "id", type: "serial", primary: true }, // Notación específica de PostgreSQL
        { name: "nombre", type: "varchar(100)", defaultNull: false },
        { name: "empresa", type: "varchar(100)" }
    ]
});
```

#### Integración en el Servidor:
```js
const Postgre = require("pg-table");
const path = require("path");

const db = new Postgre({ /* config */ });

// Carga global: pg-table leerá tus modelos y creará las tablas automáticamente
db.pathModels(path.join(__dirname, "model"));

// Consultar y manipular filas como objetos interactivos
db.tabla("clientes").select({ nombre: "Juan Pérez" }).then(async (rows) => {
    if (rows.length > 0) {
        let row = rows[0];
        row.nombre = "Juan Pérez Actualizado";
        await row.update(); // pg-table genera el SQL de actualización automáticamente
    }
});
```

---

## Documentación del API

### `postgreSqlTable#constructor(config)`
*   `config {object}`: Configuración estándar del driver `pg` o instancia activa de `Client`.

### `postgreSqlTable#tabla(tabla, [callback], [verify])`
Estructura y retorna un objeto `dbTabla` (abstracción de alto nivel).

### `postgreSqlTable#addModel(model)` / `postgreSqlTable#pathModels(path)`
Métodos para integrar esquemas de `tabla-model` de forma masiva o individual. Especialmente útil para la creación automática de tablas en esquemas PostgreSQL.

### `postgreSqlTable#query(sql)`
Ejecuta SQL nativo directamente para casos especiales o funciones avanzadas de PG.

### `postgreSqlTable#end()`
Finaliza todas las conexiones con el servidor PostgreSQL.

[npm-image]: https://img.shields.io/npm/v/pg-table.svg
[npm-url]: https://npmjs.org/package/pg-table
[node-version-image]: https://img.shields.io/node/v/pg-table.svg
[node-version-url]: https://nodejs.org/en/download/
[downloads-image]: https://img.shields.io/npm/dm/pg-table.svg
[downloads-url]: https://npmjs.org/package/pg-table

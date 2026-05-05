# pg-table

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]

**pg-table** es una interfaz de alto nivel diseñada para interactuar con bases de datos PostgreSQL en Node.js de forma eficiente. Basada en el patrón **Active Record**, permite abstraer la complejidad de PostgreSQL y gestionar tus datos mediante objetos de JavaScript, manteniendo la flexibilidad y el rendimiento.

## 🚀 Características Principales

*   **Abstracción de Alto Nivel**: CRUD completo sin escribir SQL manual.
*   **Patrón Active Record**: Los resultados de las consultas son objetos inteligentes con métodos `.update()` y `.delete()`.
*   **Gestión de Esquemas Inteligente**: Extracción automática de metadatos y sincronización con modelos de `tabla-model`.
*   **Fluent Query Builder**: Soporte para consultas complejas, Joins dinámicos y búsquedas avanzadas.
*   **API Consistente**: Interfaz idéntica a `mysql-tab` y `sqlite3-tab`, facilitando el desarrollo multiplataforma.

## 📚 Ecosistema dbtabla

Este paquete forma parte de un ecosistema modular. También puedes utilizar:

*   **[tabla-model](https://github.com/ever23/tabla-model)**: El motor de definición de esquemas (requerido para definir modelos).
*   **[mysql-tab](https://github.com/ever23/mysql-tab)**: Si necesitas soporte para MySQL/MariaDB.
*   **[sqlite3-tab](https://github.com/ever23/sqlite3-tab)**: Si necesitas soporte para SQLite3.

---

## 📦 Instalación

```sh
$ npm install pg-table
```

---

## 🛠️ Inicio Rápido

### 1. Conexión y Configuración
Instancia la conexión pasando un objeto de configuración estándar de `pg` (PostgreSQL Client).

```javascript
const PostgreSQL = require('pg-table');

const db = new PostgreSQL({
    host: 'localhost',
    user: 'postgres',
    password: 'secretpassword',
    database: 'mi_empresa',
    port: 5432
});
```

### 2. Definición de Modelos
Utiliza `tabla-model` para definir tus esquemas.

```javascript
// model/Usuario.js
const Model = require('tabla-model');

module.exports = new Model('usuarios', {
    colums: [
        { name: 'id', type: 'serial', primary: true },
        { name: 'nombre', type: 'varchar(100)' },
        { name: 'email', type: 'varchar(100)', unique: true }
    ]
});
```

Registra tus modelos:
```javascript
const path = require('path');
db.pathModels(path.join(__dirname, 'model'));
```

---

## 📖 Guía de Uso: Operaciones de Tabla

Obtén una instancia de la tabla:
```javascript
const usuarios = db.tabla('usuarios');
```

### Inserción de Datos
```javascript
// Inserción por objeto
await usuarios.insert({ nombre: 'Antigravity', email: 'ai@dev.com' });
```

### Consultas (Select)
El método `.select()` es polimórfico y potente.

```javascript
// 1. Selección con filtros
const todos = await usuarios.select("id > 10");

// 2. Selección con Joins Dinámicos
// Prefijos: '>' Right Join, '<' Left Join, '=' Inner Join
const conPerfiles = await usuarios.select(
    ["u.nombre", "p.bio"], 
    { "<perfiles": "u.id = p.id_usuario" }, 
    "u.estado = 'activo'"
);

// 3. Búsqueda por ID
const user = await usuarios.selectById(1);
```

#### Sintaxis Avanzada de Filtrado (Where Object)
Al usar un objeto en el parámetro `where`, puedes usar prefijos y sufijos para operadores especiales:
*   **Sufijos:** `campo%` (LIKE), `campo!` (!=), `campo>` (>), `campo<` (<), `campo>=` (>=), `campo<=` (<=).
*   **Prefijos:** `||campo` (OR), `&&campo` (AND).

```javascript
// Ejemplo: WHERE estado = 'activo' OR nombre LIKE 'Anti%'
await usuarios.select({ "estado": "activo", "||nombre%": "Anti%" });
```

> [!IMPORTANT]
> **Uso de Parámetros Polimórficos:**
> Si pasas un **objeto** como primer argumento en `.select()`, la librería lo interpretará como una definición de **Joins**. Para usar un objeto de filtrado `where` sin definir campos ni joins, utiliza `null`:
> ```javascript
> // Correcto: (campos, joins, where)
> await tabla.select(null, null, { "activo": 1 });
> ```

### Sintaxis de Objeto Único (Recomendada)
Evita el uso de `null` en parámetros opcionales pasando un objeto con llaves explícitas:

```javascript
await clientes.select({
    where: { "empresa": "TechCorp" },
    order: "id_cliente ASC",
    limit: 10
});
```

### Actualización y Borrado
```javascript
// Actualización masiva o filtrada con cláusula string
await usuarios.update({ nombre: 'Editado' }, "id = 1");

// Actualización por ID (más directo)
await usuarios.updateById({ nombre: 'Nuevo' }, 1);

// Borrado
await usuarios.delete("id = 5");

// Borrado por ID
await usuarios.deleteById(5);
```

---

## 💎 El Poder de Active Record (dbRow)

Los resultados devueltos son instancias de `dbRow`, lo que permite modificar datos directamente sobre el objeto.

```javascript
const user = await usuarios.selectOne("id = 1");

if (user) {
    user.nombre = "Nuevo Nombre";
    await user.update(); // Genera y ejecuta el UPDATE SQL automáticamente
    
    // O si deseas eliminarlo
    // await user.delete();
}
```

---

## 🧪 Pruebas
Para ejecutar los tests del proyecto:
```sh
$ npm test
```

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.

[npm-image]: https://img.shields.io/npm/v/pg-table.svg
[npm-url]: https://npmjs.org/package/pg-table
[node-version-image]: https://img.shields.io/node/v/pg-table.svg
[node-version-url]: https://nodejs.org/en/download/
[downloads-image]: https://img.shields.io/npm/dm/pg-table.svg
[downloads-url]: https://npmjs.org/package/pg-table

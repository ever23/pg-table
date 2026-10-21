# pg-table AI Skill (Gestor de Base de Datos)

Esta skill define las instrucciones y patrones de uso recomendados para la librería **pg-table**. Utiliza estos principios para que cualquier agente de IA gestione la persistencia de datos de manera eficiente, segura y consistente en PostgreSQL.

## 1. Inicialización y Registro de Modelos

Para comenzar, instancia la conexión y registra los modelos definidos con `tabla-model`.

```javascript
const Postgre = require('pg-table');
const path = require('path');

// 1. Conexión (Pool de clientes nativo de PG)
const db = new Postgre({
    host: 'localhost',
    user: 'postgres',
    password: 'password',
    database: 'mi_base_de_datos'
});

// 2. Carga Masiva de Modelos (Recomendado)
db.pathModels(path.join(process.cwd(), 'model'));

// 3. Obtención de una instancia de tabla
const clientes = db.tabla('clientes');
```

## 2. Operaciones CRUD Básicas

### Inserción con Soporte de Serial
```javascript
await clientes.insert({ 
    nombre: "Juan Pérez", 
    empresa: "TechCorp" 
});
```

### Consultas Select: Sintaxis de Objeto ?nico (REGLA MANDATORIA PARA EL AGENTE)

**Prioridad Absoluta:** Usa **siempre** la sintaxis de objeto ?nico `{ where, campos, joins, order, limit }` al llamar a `.select()`, `.selectOne()` o `.busqueda()`. Esto garantiza cero errores de ambig?edad con par?metros posicionales.

```javascript
// Consulta est?ndar recomendada para el agente:
const resultados = await usuarios.select({
    where: { 
        "estado": "activo", 
        "puntos>": 50,       // Sufijo > para mayor que
        "||nombre%": "A%"    // Prefijo || para OR, sufijo % para LIKE
    },
    campos: ["id", "nombre", "email"],
    joins: { ">perfiles": "perfiles.id_user = usuarios.id" }, // > = LEFT JOIN
    order: "id DESC",
    limit: 10
});
```

#### Operadores en `where`:
* **Sufijos de comparaci?n**: `campo%` (LIKE), `campo!` (!=), `campo>` (>), `campo<` (<), `campo>=` (>=), `campo<=` (<=).
* **Prefijos l?gicos**: `||campo` (OR), `&&campo` (AND por defecto).

<details>
<summary>Sintaxis Posicional Alternativa (Legacy)</summary>

Si usas la firma posicional `select(campos, joins, where)` y deseas filtrar con objeto sin definir campos ni joins, debes pasar `null`:
```javascript
// Posicional: (campos, joins, where)
await usuarios.select(null, null, { "activo": true });
```
*(Evita este modo si puedes; prefiere la sintaxis de objeto ?nico)*.
</details>


## 3. Patrón Active Record (Instancias Inteligentes)

Todos los resultados son instancias de **Active Record**.

```javascript
const cliente = await clientes.selectOne("nombre = 'Juan Pérez'");
if (cliente) {
    cliente.empresa = "Nueva Empresa S.A.";
    await cliente.update(); // Genera el UPDATE SQL automáticamente
}
```

## 4. Búsqueda y Filtrado en PG

PostgreSQL es estricto con los tipos de datos. Asegúrate de que las consultas coincidan con el esquema definido en `tabla-model`.

```javascript
// Búsqueda LIKE inteligente en los campos indicados
const resultados = await clientes.busqueda("Juan", ["nombre", "empresa"]);
```

## 5. Directrices Críticas para la IA (AI-Guidelines)

> [!IMPORTANT]
> Sigue estas reglas para maximizar la eficiencia:

1.  **Conoce tu esquema primero**: Lee siempre los archivos en el directorio `model/` para asegurar nombres de columnas correctos y tipos nativos de PG (como `SERIAL`).
2.  **Prefiere `selectOne` para registros únicos**: Si buscas por ID o Email, usa `selectOne()`. Devuelve `null` si no hay resultados.
3.  **Actualizaciones Masivas**: Para actualizar múltiples filas, usa un bucle asíncrono sobre el array de resultados para invocar `.update()` individualmente.
4.  **Cierre de Conexión**: El driver gestiona un pool. Solo usa `db.end()` cuando la aplicación se apague para liberar los sockets del servidor PostgreSQL.

## 6. Firma de Métodos Principales

- `selectOne(where, select, join, order)`: Retorna un objeto o `null`.
- `select(...)`: Retorna un array de objetos Active Record.
- `query(sql)`: Ejecuta SQL nativo (usar para funciones avanzadas de PG como JSONB o GIN indexes).
- `end()`: Cierra todas las conexiones del pool.

## 7. Sintaxis Avanzada de Filtrado (Where Object)

Al utilizar objetos para el parámetro `where`, puedes usar operadores especiales:
- **Sufijos:** `campo%` (LIKE), `campo!` (!=), `campo>` (>), `campo<` (<), `campo>=` (>=), `campo<=` (<=).
- **Prefijos:** `||campo` (OR), `&&campo` (AND).

### Nota sobre Cadenas Numéricas
Los strings con ceros a la izquierda (ej: `"01"`) se tratan siempre como **strings** (con comillas) para preservar el formato.

> **Peligro de Polimorfismo:**
> Si pasas un objeto como primer argumento en `select()`, se interpretará como **Joins**. Para filtrar por objeto de forma segura:
> `await tabla.select(null, null, { "campo": "valor" });`
>
> **Sintaxis Recomendada (Objeto Único):**
> Usa un objeto con llaves explícitas para mayor seguridad:
> `await tabla.select({ where: { activo: 1 }, order: "id ASC" });`

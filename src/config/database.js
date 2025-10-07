// ============================================================
// CONFIGURACIÓN DE BASE DE DATOS - CAMPO DIRECTO
// ============================================================

const mysql = require('mysql2/promise');

// Configuración del pool de conexiones
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'KeMc2003*/',
    database: process.env.DB_NAME || 'datos_prueba_completos',
    port: process.env.DB_PORT || 3306,
    
    // Configuración del pool
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // Configuración de charset
    charset: 'utf8mb4',
    
    // Configuración de timezone
    timezone: '+00:00',
    
    // Configuración adicional
    multipleStatements: false,
    namedPlaceholders: true
};

// Crear pool de conexiones
const pool = mysql.createPool(poolConfig);

// ============================================================
// FUNCIONES ÚTILES
// ============================================================

/**
 * Ejecutar una consulta SQL
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise} Resultado de la consulta
 */
async function executeQuery(query, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(query, params);
        return results;
    } catch (error) {
        console.error('Error ejecutando consulta:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

/**
 * Ejecutar múltiples consultas en una transacción
 * @param {Array} queries - Array de objetos {query, params}
 * @returns {Promise} Resultado de todas las consultas
 */
async function executeTransaction(queries) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        const results = [];
        for (const {query, params} of queries) {
            const [result] = await connection.execute(query, params);
            results.push(result);
        }
        
        await connection.commit();
        return results;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error en transacción:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

/**
 * Obtener un solo registro
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise} Un solo registro o null
 */
async function findOne(query, params = []) {
    const results = await executeQuery(query, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Insertar un registro y obtener el ID
 * @param {string} table - Nombre de la tabla
 * @param {Object} data - Datos a insertar
 * @returns {Promise} ID del registro insertado
 */
async function insert(table, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await executeQuery(query, values);
    
    return result.insertId;
}

/**
 * Actualizar un registro
 * @param {string} table - Nombre de la tabla
 * @param {Object} data - Datos a actualizar
 * @param {string} whereClause - Cláusula WHERE
 * @param {Array} whereParams - Parámetros de la cláusula WHERE
 * @returns {Promise} Número de filas afectadas
 */
async function update(table, data, whereClause, whereParams = []) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await executeQuery(query, [...values, ...whereParams]);
    
    return result.affectedRows;
}

/**
 * Eliminar un registro
 * @param {string} table - Nombre de la tabla
 * @param {string} whereClause - Cláusula WHERE
 * @param {Array} whereParams - Parámetros de la cláusula WHERE
 * @returns {Promise} Número de filas afectadas
 */
async function deleteRecord(table, whereClause, whereParams = []) {
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await executeQuery(query, whereParams);
    
    return result.affectedRows;
}

/**
 * Verificar si existe un registro
 * @param {string} table - Nombre de la tabla
 * @param {string} whereClause - Cláusula WHERE
 * @param {Array} whereParams - Parámetros de la cláusula WHERE
 * @returns {Promise<boolean>} True si existe, false si no
 */
async function exists(table, whereClause, whereParams = []) {
    const query = `SELECT 1 FROM ${table} WHERE ${whereClause} LIMIT 1`;
    const result = await executeQuery(query, whereParams);
    return result.length > 0;
}

/**
 * Contar registros
 * @param {string} table - Nombre de la tabla
 * @param {string} whereClause - Cláusula WHERE (opcional)
 * @param {Array} whereParams - Parámetros de la cláusula WHERE
 * @returns {Promise<number>} Número de registros
 */
async function count(table, whereClause = '', whereParams = []) {
    const query = `SELECT COUNT(*) as count FROM ${table} ${whereClause ? `WHERE ${whereClause}` : ''}`;
    const result = await executeQuery(query, whereParams);
    return result[0].count;
}

/**
 * Escapar valores para prevenir SQL injection
 * @param {*} value - Valor a escapar
 * @returns {string} Valor escapado
 */
function escape(value) {
    return pool.escape(value);
}

/**
 * Formatear fecha para MySQL
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada para MySQL
 */
function formatDate(date = new Date()) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Probar la conexión a la base de datos
 * @returns {Promise} Resultado de la prueba
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        
        // Verificar que la base de datos existe y tiene las tablas principales
        const tables = await executeQuery("SHOW TABLES LIKE 'usuarios'");
        if (tables.length === 0) {
            throw new Error('La tabla usuarios no existe. ¿Has ejecutado el schema de la base de datos?');
        }
        
        return true;
    } catch (error) {
        console.error('Error conectando a la base de datos:', error.message);
        throw error;
    }
}

/**
 * Cerrar todas las conexiones del pool
 */
async function closePool() {
    try {
        await pool.end();
        console.log('Pool de conexiones cerrado correctamente');
    } catch (error) {
        console.error('Error cerrando pool de conexiones:', error);
    }
}

// ============================================================
// MANEJO DE EVENTOS DEL POOL
// ============================================================

pool.on('connection', (connection) => {
    console.log(`Nueva conexión establecida como id ${connection.threadId}`);
});

pool.on('error', (err) => {
    console.error('Error en el pool de conexiones:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Conexión perdida, reconectando...');
    } else {
        throw err;
    }
});

// ============================================================
// EXPORTAR FUNCIONES
// ============================================================

module.exports = {
    pool,
    executeQuery,
    executeTransaction,
    findOne,
    insert,
    update,
    deleteRecord,
    exists,
    count,
    escape,
    formatDate,
    testConnection,
    closePool
};
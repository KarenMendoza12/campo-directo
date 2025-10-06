// ============================================================
// MIDDLEWARE DE MANEJO DE ERRORES - CAMPO DIRECTO
// ============================================================

/**
 * Middleware global para manejo de errores
 */
const errorHandler = (error, req, res, next) => {
    console.error('Error capturado:', error);

    // Error de validación de express-validator
    if (error.type === 'validation') {
        return res.status(400).json({
            status: 'error',
            message: 'Datos inválidos',
            errors: error.errors
        });
    }

    // Error de base de datos
    if (error.code) {
        switch (error.code) {
            case 'ER_DUP_ENTRY':
                return res.status(409).json({
                    status: 'error',
                    message: 'El registro ya existe',
                    details: 'Email o identificador duplicado'
                });
            
            case 'ER_NO_REFERENCED_ROW_2':
                return res.status(400).json({
                    status: 'error',
                    message: 'Referencia inválida',
                    details: 'El recurso referenciado no existe'
                });
            
            case 'ER_ROW_IS_REFERENCED_2':
                return res.status(409).json({
                    status: 'error',
                    message: 'No se puede eliminar',
                    details: 'El recurso está siendo utilizado'
                });
            
            case 'ECONNREFUSED':
                return res.status(503).json({
                    status: 'error',
                    message: 'Servicio no disponible',
                    details: 'Error de conexión con la base de datos'
                });
        }
    }

    // Error de JWT
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token inválido'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token expirado'
        });
    }

    // Error de sintaxis JSON
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            status: 'error',
            message: 'JSON inválido en la petición'
        });
    }

    // Error personalizado con status
    if (error.status && error.message) {
        return res.status(error.status).json({
            status: 'error',
            message: error.message,
            ...(error.details && { details: error.details })
        });
    }

    // Error por defecto
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : error.message || 'Error interno del servidor';

    res.status(statusCode).json({
        status: 'error',
        message: message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack,
            path: req.path,
            method: req.method
        })
    });
};

/**
 * Middleware para manejar rutas no encontradas
 */
const notFound = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
};

/**
 * Wrapper para funciones async para capturar errores automáticamente
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Crear error personalizado
 */
const createError = (message, status = 500, details = null) => {
    const error = new Error(message);
    error.status = status;
    if (details) {
        error.details = details;
    }
    return error;
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler,
    createError
};
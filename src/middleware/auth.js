// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN - CAMPO DIRECTO
// ============================================================

const jwt = require('jsonwebtoken');
const { findOne } = require('../config/database');

/**
 * Middleware para verificar JWT token
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Token de acceso requerido'
            });
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que el usuario existe y está activo
        const user = await findOne(
            'SELECT id, nombre, apellido, email, tipo_usuario, estado FROM usuarios WHERE id = ? AND estado = "activo"',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Usuario no válido o inactivo'
            });
        }

        // Agregar usuario a la request
        req.user = {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            tipo_usuario: user.tipo_usuario
        };

        next();
    } catch (error) {
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
        
        console.error('Error en autenticación:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor'
        });
    }
};

/**
 * Middleware para verificar que el usuario es campesino
 */
const requireFarmer = (req, res, next) => {
    if (req.user.tipo_usuario !== 'campesino') {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso denegado. Se requiere ser campesino.'
        });
    }
    next();
};

/**
 * Middleware para verificar que el usuario es comprador
 */
const requireBuyer = (req, res, next) => {
    if (req.user.tipo_usuario !== 'comprador') {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso denegado. Se requiere ser comprador.'
        });
    }
    next();
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await findOne(
                'SELECT id, nombre, apellido, email, tipo_usuario FROM usuarios WHERE id = ? AND estado = "activo"',
                [decoded.userId]
            );

            if (user) {
                req.user = {
                    id: user.id,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    email: user.email,
                    tipo_usuario: user.tipo_usuario
                };
            }
        }

        next();
    } catch (error) {
        // Si hay error, continuar sin usuario autenticado
        next();
    }
};

module.exports = {
    authenticateToken,
    requireFarmer,
    requireBuyer,
    optionalAuth
};
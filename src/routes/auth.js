// ============================================================
// RUTAS DE AUTENTICACIÓN - CAMPO DIRECTO
// ============================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// VALIDACIONES
// ============================================================

const registerValidation = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    
    body('apellido')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Apellido debe tener entre 2 y 100 caracteres'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    
    body('telefono')
        .isMobilePhone('es-CO')
        .withMessage('Teléfono inválido (formato colombiano)'),
    
    body('tipo_usuario')
        .isIn(['campesino', 'comprador'])
        .withMessage('Tipo de usuario debe ser campesino o comprador'),
    
    body('fecha_nacimiento')
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('Fecha de nacimiento inválida (YYYY-MM-DD)')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18 || age > 100) {
                throw new Error('Edad debe estar entre 18 y 100 años');
            }
            return true;
        }),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
    body('nombreFinca')
        .optional()
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage('Nombre de finca debe tener entre 2 y 150 caracteres')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    
    body('password')
        .notEmpty()
        .withMessage('Contraseña requerida')
];

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Generar JWT token
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user.id,
            email: user.email,
            tipo_usuario: user.tipo_usuario
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Formatear respuesta de usuario
 */
const formatUserResponse = (user) => {
    return {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        tipo_usuario: user.tipo_usuario,
        calificacion_promedio: user.calificacion_promedio,
        ...(user.nombre_finca && {
            finca: {
                nombre: user.nombre_finca,
                departamento: user.ubicacion_departamento,
                municipio: user.ubicacion_municipio,
                area: user.area_hectareas,
                tipo_cultivo: user.tipo_cultivo
            }
        })
    };
};

// ============================================================
// RUTAS
// ============================================================

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Datos de registro inválidos',
            errors: errors.array()
        });
    }

    try {
        const userData = {
            nombre: req.body.nombre,
            apellido: req.body.apellido,
            email: req.body.email,
            telefono: req.body.telefono,
            tipo_usuario: req.body.tipo_usuario,
            fecha_nacimiento: req.body.fecha_nacimiento,
            password: req.body.password,
            nombreFinca: req.body.nombreFinca
        };

        const user = await User.create(userData);
        const token = generateToken(user);

        res.status(201).json({
            status: 'success',
            message: 'Usuario registrado exitosamente',
            data: {
                user: formatUserResponse(user),
                token: token
            }
        });

    } catch (error) {
        if (error.message === 'El email ya está registrado') {
            return res.status(409).json({
                status: 'error',
                message: error.message
            });
        }
        throw error;
    }
}));

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Datos de login inválidos',
            errors: errors.array()
        });
    }

    const { email, password } = req.body;

    try {
        const user = await User.authenticate(email, password);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Credenciales inválidas'
            });
        }

        const token = generateToken(user);

        res.json({
            status: 'success',
            message: 'Login exitoso',
            data: {
                user: formatUserResponse(user),
                token: token
            }
        });

    } catch (error) {
        if (error.message === 'Usuario inactivo o suspendido') {
            return res.status(403).json({
                status: 'error',
                message: error.message
            });
        }
        throw error;
    }
}));

/**
 * POST /api/auth/logout
 * Cerrar sesión (informativo, el cliente debe eliminar el token)
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
    // En una implementación con blacklist de tokens o sesiones en DB,
    // aquí invalidaríamos el token
    
    res.json({
        status: 'success',
        message: 'Sesión cerrada exitosamente'
    });
}));

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
        throw createError('Usuario no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: {
            user: formatUserResponse(user)
        }
    });
}));

/**
 * POST /api/auth/verify-token
 * Verificar si un token es válido
 */
router.post('/verify-token', asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            status: 'error',
            message: 'Token requerido'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.estado !== 'activo') {
            return res.status(401).json({
                status: 'error',
                message: 'Token inválido o usuario inactivo'
            });
        }

        res.json({
            status: 'success',
            message: 'Token válido',
            data: {
                user: formatUserResponse(user)
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token inválido o expirado'
            });
        }
        throw error;
    }
}));

/**
 * PUT /api/auth/change-password
 * Cambiar contraseña
 */
router.put('/change-password', 
    authenticateToken,
    [
        body('currentPassword')
            .notEmpty()
            .withMessage('Contraseña actual requerida'),
        
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('Nueva contraseña debe tener al menos 6 caracteres')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos inválidos',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        try {
            const success = await User.changePassword(req.user.id, currentPassword, newPassword);
            
            if (!success) {
                throw createError('Error al cambiar contraseña', 500);
            }

            res.json({
                status: 'success',
                message: 'Contraseña cambiada exitosamente'
            });

        } catch (error) {
            if (error.message === 'Contraseña actual incorrecta') {
                return res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            }
            throw error;
        }
    })
);

module.exports = router;
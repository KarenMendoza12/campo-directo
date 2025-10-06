// ============================================================
// RUTAS DE USUARIOS - CAMPO DIRECTO
// ============================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireFarmer, requireBuyer } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users/profile
 * Obtener perfil del usuario autenticado
 */
router.get('/profile', asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    res.json({
        status: 'success',
        data: { user }
    });
}));

/**
 * PUT /api/users/profile
 * Actualizar perfil del usuario
 */
router.put('/profile',
    [
        body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
        body('apellido').optional().trim().isLength({ min: 2, max: 100 }),
        body('telefono').optional().isMobilePhone('es-CO')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const updatedUser = await User.updateProfile(req.user.id, req.body);
        
        res.json({
            status: 'success',
            message: 'Perfil actualizado exitosamente',
            data: { user: updatedUser }
        });
    })
);

/**
 * GET /api/users/farmers
 * Obtener lista de campesinos (público)
 */
router.get('/farmers', asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    
    const result = await User.getFarmers(parseInt(page), parseInt(limit), filters);
    
    res.json({
        status: 'success',
        data: result
    });
}));

/**
 * GET /api/users/stats
 * Obtener estadísticas del usuario
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await User.getStats(req.user.id, req.user.tipo_usuario);
    
    res.json({
        status: 'success',
        data: { stats: stats[0] }
    });
}));

module.exports = router;
const express = require('express');
const { validate } = require('../middleware/validation');
const { authenticateToken, requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    changeUserPassword,
    deactivateUser,
    activateUser,
    deleteUser,
    getUserStats
} = require('../controllers/usersController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/users
 * @desc    Obtener todos los usuarios
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.get(
    '/',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    getAllUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.get(
    '/stats',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    getUserStats
);

/**
 * @route   GET /api/users/:id
 * @desc    Obtener usuario por ID
 * @access  Private (Propietario o Admin)
 */
router.get(
    '/:id',
    requireOwnershipOrAdmin,
    getUserById
);

/**
 * @route   POST /api/users
 * @desc    Crear nuevo usuario
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post(
    '/',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    validate('register'),
    createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar usuario
 * @access  Private (Propietario o Admin)
 */
router.put(
    '/:id',
    requireOwnershipOrAdmin,
    updateUser
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Cambiar contraseña de otro usuario
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.put(
    '/:id/password',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    changeUserPassword
);

/**
 * @route   PUT /api/users/:id/deactivate
 * @desc    Desactivar usuario
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.put(
    '/:id/deactivate',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    deactivateUser
);

/**
 * @route   PUT /api/users/:id/activate
 * @desc    Activar usuario
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.put(
    '/:id/activate',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    activateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar usuario permanentemente
 * @access  Private (Solo SUPER_ADMIN)
 */
router.delete(
    '/:id',
    requireRole(['SUPER_ADMIN']),
    deleteUser
);

module.exports = router;
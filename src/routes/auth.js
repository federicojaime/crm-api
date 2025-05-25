const express = require('express');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    verifyToken
} = require('../controllers/authController');

const router = express.Router();

// Rate limiting específico para auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por ventana
    message: {
        error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para registro (menos restrictivo)
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 registros por hora
    message: {
        error: 'Demasiados registros desde esta IP. Intenta de nuevo en 1 hora.'
    }
});

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public (pero limitado)
 */
router.post('/register', registerLimiter, validate('register'), register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', authLimiter, validate('login'), login);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Actualizar perfil del usuario actual
 * @access  Private
 */
router.put('/profile', authenticateToken, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña del usuario actual
 * @access  Private
 */
router.put('/change-password', authenticateToken, changePassword);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar token JWT
 * @access  Private
 */
router.get('/verify', authenticateToken, verifyToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión (invalidar token en cliente)
 * @access  Private
 */
router.post('/logout', authenticateToken, (req, res) => {
    // En JWT stateless, el logout se maneja en el cliente
    // Aquí podríamos agregar el token a una blacklist si es necesario
    res.json({
        message: 'Sesión cerrada exitosamente'
    });
});

module.exports = router;
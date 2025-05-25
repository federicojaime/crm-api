const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Token de acceso requerido'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar que el usuario existe y está activo
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
                rol: true,
                subRol: true,
                isActive: true
            }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                error: 'Usuario no válido o inactivo'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado'
            });
        }

        return res.status(403).json({
            error: 'Token inválido'
        });
    }
};

// Middleware para verificar roles
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        const userRole = req.user.rol;
        const userSubRole = req.user.subRol;

        // Verificar rol principal
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        // Verificar sub-rol para ASISTENTE
        if (userRole === 'ASISTENTE' && userSubRole) {
            const combinedRole = `ASISTENTE_${userSubRole}`;
            if (allowedRoles.includes(combinedRole)) {
                return next();
            }
        }

        return res.status(403).json({
            error: 'No tienes permisos para acceder a este recurso',
            required: allowedRoles,
            current: userRole
        });
    };
};

// Middleware para verificar si es el mismo usuario o admin
const requireOwnershipOrAdmin = async (req, res, next) => {
    try {
        const targetUserId = req.params.id || req.params.userId;
        const currentUser = req.user;

        // Si es el mismo usuario
        if (currentUser.id === targetUserId) {
            return next();
        }

        // Si es admin o distribuidor
        if (['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(currentUser.rol)) {
            return next();
        }

        return res.status(403).json({
            error: 'Solo puedes acceder a tu propia información'
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error verificando permisos'
        });
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireOwnershipOrAdmin
};
// middleware/auth.js - ACTUALIZADO con verificaciones de permisos mejoradas
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verificar token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Token de acceso requerido'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que el usuario aún existe y está activo
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

        if (!user) {
            return res.status(401).json({
                error: 'Usuario no encontrado'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                error: 'Usuario desactivado'
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(403).json({
            error: 'Token inválido'
        });
    }
};

// Verificar roles específicos
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        if (!allowedRoles.includes(req.user.rol)) {
            return res.status(403).json({
                error: 'No tienes permisos suficientes para realizar esta acción',
                requiredRoles: allowedRoles,
                userRole: req.user.rol
            });
        }

        next();
    };
};

// 🚀 NUEVA FUNCIÓN: Verificar propiedad de recurso o permisos de admin
const requireOwnershipOrAdmin = async (req, res, next) => {
    try {
        const resourceId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.rol;

        // Admins y distribuidores pueden acceder a cualquier recurso
        if (['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(userRole)) {
            return next();
        }

        // Para otros roles, verificar que el recurso les pertenece
        if (resourceId === userId) {
            return next();
        }

        return res.status(403).json({
            error: 'No tienes permisos para acceder a este recurso'
        });

    } catch (error) {
        console.error('Error verificando propiedad:', error);
        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// 🚀 NUEVA FUNCIÓN: Verificar permisos para clientes
const requireClientAccess = async (req, res, next) => {
    try {
        const clientId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.rol;

        // Admins y distribuidores pueden acceder a cualquier cliente
        if (['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(userRole)) {
            return next();
        }

        // Para emprendedores y asistentes, verificar que el cliente les pertenece
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
                assignedToId: true,
                createdById: true,
                referredById: true
            }
        });

        if (!client) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        const hasAccess = 
            client.assignedToId === userId ||
            client.createdById === userId ||
            (client.referredById && client.referredById === userId);

        if (!hasAccess) {
            return res.status(403).json({
                error: 'No tienes permisos para acceder a este cliente'
            });
        }

        req.client = client; // Pasar datos del cliente al siguiente middleware
        next();

    } catch (error) {
        console.error('Error verificando acceso a cliente:', error);
        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// 🚀 NUEVA FUNCIÓN: Middleware para logging de acciones
const logUserAction = (action) => {
    return (req, res, next) => {
        const user = req.user;
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress;
        
        console.log(`[${timestamp}] ${action} - Usuario: ${user.firstname} ${user.lastname} (${user.rol}) - IP: ${ip}`);
        
        // Aquí podrías guardar en una tabla de auditoría si la tienes
        // await prisma.auditLog.create({ ... });
        
        next();
    };
};

// 🚀 NUEVA FUNCIÓN: Verificar si el usuario puede realizar operaciones masivas
const requireBulkOperationPermissions = (req, res, next) => {
    const userRole = req.user.rol;
    
    if (!['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(userRole)) {
        return res.status(403).json({
            error: 'Solo administradores y distribuidores pueden realizar operaciones masivas'
        });
    }
    
    next();
};

// 🚀 NUEVA FUNCIÓN: Verificar límites de rate limiting por usuario
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const userRequests = new Map();
    
    return (req, res, next) => {
        const userId = req.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!userRequests.has(userId)) {
            userRequests.set(userId, []);
        }
        
        const requests = userRequests.get(userId);
        
        // Limpiar requests antiguos
        const validRequests = requests.filter(time => time > windowStart);
        
        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        validRequests.push(now);
        userRequests.set(userId, validRequests);
        
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole,
    requireOwnershipOrAdmin,
    requireClientAccess,
    logUserAction,
    requireBulkOperationPermissions,
    rateLimitByUser
};
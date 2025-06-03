const express = require('express');
const multer = require('multer');
const { validate } = require('../middleware/validation');
const { 
    authenticateToken, 
    requireRole, 
    requireClientAccess,
    logUserAction,
    requireBulkOperationPermissions,
    rateLimitByUser
} = require('../middleware/auth');
const { generateClientImportTemplate } = require('../utils/excelTemplateGenerator');
const {
    getAllClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    getClientStats,
    searchClients,
    exportClients,
    importClients,
    bulkUpdateClients,
    duplicateClient,
    importContacts
} = require('../controllers/clientsController');

const router = express.Router();

// Configurar multer para upload de archivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo archivos Excel
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
        }
    }
});

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/clients
 * @desc    Obtener todos los clientes con filtros y paginación (filtrados por usuario automáticamente)
 * @access  Private
 * @query   page, limit, search, source, estado, etapa, assignedToId, referredById, createdById, userScope, tags, sortBy, sortOrder
 */
router.get('/', 
    logUserAction('GET_ALL_CLIENTS'),
    rateLimitByUser(50, 5 * 60 * 1000), // 50 requests por 5 minutos
    getAllClients
);

/**
 * @route   GET /api/clients/stats
 * @desc    Obtener estadísticas de clientes (filtradas por usuario)
 * @access  Private
 */
router.get('/stats', 
    logUserAction('GET_CLIENT_STATS'),
    getClientStats
);

/**
 * @route   GET /api/clients/search
 * @desc    Buscar clientes (solo en los propios)
 * @access  Private
 * @query   q, source, estado, etapa, limit
 */
router.get('/search', 
    rateLimitByUser(30, 5 * 60 * 1000), // 30 búsquedas por 5 minutos
    searchClients
);

/**
 * @route   GET /api/clients/export
 * @desc    Exportar clientes a Excel (solo los propios)
 * @access  Private
 * @query   format, source, estado, etapa (filtros opcionales)
 */
router.get('/export', 
    logUserAction('EXPORT_CLIENTS'),
    rateLimitByUser(5, 15 * 60 * 1000), // 5 exportaciones por 15 minutos
    exportClients
);

/**
 * @route   GET /api/clients/import-template
 * @desc    Descargar template para importar clientes
 * @access  Private
 */
router.get('/import-template', async (req, res) => {
    try {
        console.log(`[TEMPLATE] Usuario ${req.user.firstname} descargando template`);
        await generateClientImportTemplate(res);
    } catch (error) {
        console.error('Error generando template:', error);
        res.status(500).json({
            error: 'Error generando template de importación'
        });
    }
});

/**
 * @route   POST /api/clients
 * @desc    Crear nuevo cliente (se asigna automáticamente al usuario actual)
 * @access  Private
 */
router.post('/', 
    validate('client'), 
    logUserAction('CREATE_CLIENT'),
    rateLimitByUser(20, 5 * 60 * 1000), // 20 creaciones por 5 minutos
    createClient
);

/**
 * @route   POST /api/clients/import
 * @desc    Importar clientes desde Excel (se asignan al usuario actual)
 * @access  Private
 */
router.post('/import', 
    upload.single('file'),
    logUserAction('IMPORT_CLIENTS_EXCEL'),
    rateLimitByUser(3, 15 * 60 * 1000), // 3 importaciones por 15 minutos
    importClients
);

/**
 * @route   POST /api/clients/import-contacts
 * @desc    Importar contactos desde Google Contacts u otras fuentes (se asignan al usuario actual)
 * @access  Private
 * @body    { contacts: Array<Contact> }
 */
router.post('/import-contacts',
    logUserAction('IMPORT_CONTACTS'),
    rateLimitByUser(5, 15 * 60 * 1000), // 5 importaciones por 15 minutos
    importContacts
);

/**
 * @route   POST /api/clients/bulk-update
 * @desc    Actualización masiva de clientes
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post('/bulk-update',
    requireBulkOperationPermissions,
    logUserAction('BULK_UPDATE_CLIENTS'),
    rateLimitByUser(10, 15 * 60 * 1000), // 10 operaciones masivas por 15 minutos
    bulkUpdateClients
);

/**
 * @route   GET /api/clients/:id
 * @desc    Obtener cliente por ID (verifica permisos automáticamente)
 * @access  Private
 */
router.get('/:id', 
    requireClientAccess, // Middleware que verifica automáticamente los permisos
    getClientById
);

/**
 * @route   PUT /api/clients/:id
 * @desc    Actualizar cliente (verifica permisos automáticamente)
 * @access  Private
 */
router.put('/:id', 
    requireClientAccess,
    validate('client'), 
    logUserAction('UPDATE_CLIENT'),
    updateClient
);

/**
 * @route   POST /api/clients/:id/duplicate
 * @desc    Duplicar cliente (se asigna al usuario actual)
 * @access  Private
 */
router.post('/:id/duplicate', 
    requireClientAccess,
    logUserAction('DUPLICATE_CLIENT'),
    rateLimitByUser(10, 15 * 60 * 1000), // 10 duplicaciones por 15 minutos
    duplicateClient
);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Eliminar cliente (verifica permisos automáticamente)
 * @access  Private
 */
router.delete('/:id', 
    requireClientAccess,
    logUserAction('DELETE_CLIENT'),
    deleteClient
);

// 🚀 NUEVA RUTA: Obtener clientes asignados a un usuario específico (solo para admins)
router.get('/user/:userId',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    logUserAction('GET_CLIENTS_BY_USER'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 50 } = req.query;
            
            const clients = await prisma.client.findMany({
                where: {
                    OR: [
                        { assignedToId: userId },
                        { createdById: userId }
                    ]
                },
                include: {
                    assignedTo: {
                        select: { firstname: true, lastname: true }
                    }
                },
                skip: (page - 1) * limit,
                take: parseInt(limit),
                orderBy: { updatedAt: 'desc' }
            });
            
            res.json({ clients });
        } catch (error) {
            console.error('Error obteniendo clientes por usuario:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// 🚀 NUEVA RUTA: Obtener resumen de clientes del usuario actual
router.get('/my/summary',
    logUserAction('GET_MY_CLIENTS_SUMMARY'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const userRole = req.user.rol;
            
            // Construir filtros según el rol
            const where = {};
            if (userRole === 'EMPRENDEDOR' || userRole === 'ASISTENTE') {
                where.OR = [
                    { assignedToId: userId },
                    { createdById: userId }
                ];
            }
            
            const [
                totalClients,
                activeClients,
                recentClients,
                clientsBySource,
                clientsByEtapa
            ] = await Promise.all([
                prisma.client.count({ where }),
                prisma.client.count({ where: { ...where, estado: 'ACTIVO' } }),
                prisma.client.count({
                    where: {
                        ...where,
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // últimos 7 días
                        }
                    }
                }),
                prisma.client.groupBy({
                    by: ['source'],
                    where,
                    _count: { _all: true },
                    orderBy: { _count: { _all: 'desc' } },
                    take: 5
                }),
                prisma.client.groupBy({
                    by: ['etapa'],
                    where,
                    _count: { _all: true }
                })
            ]);
            
            res.json({
                summary: {
                    total: totalClients,
                    active: activeClients,
                    inactive: totalClients - activeClients,
                    recent: recentClients
                },
                distribution: {
                    bySource: clientsBySource,
                    byEtapa: clientsByEtapa
                },
                userInfo: {
                    name: `${req.user.firstname} ${req.user.lastname}`,
                    role: req.user.rol,
                    canViewAll: ['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(req.user.rol)
                }
            });
            
        } catch (error) {
            console.error('Error obteniendo resumen de clientes:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// 🚀 NUEVA RUTA: Verificar duplicados antes de crear/importar
router.post('/check-duplicates',
    rateLimitByUser(20, 5 * 60 * 1000),
    async (req, res) => {
        try {
            const { contacts } = req.body;
            
            if (!Array.isArray(contacts) || contacts.length === 0) {
                return res.status(400).json({
                    error: 'Se requiere un array de contactos válido'
                });
            }
            
            const duplicates = [];
            const userId = req.user.id;
            const userRole = req.user.rol;
            
            for (const contact of contacts) {
                if (!contact.telefono && !contact.email) continue;
                
                // Construir condición de búsqueda
                const whereCondition = {
                    OR: [
                        contact.telefono ? { telefono: contact.telefono } : null,
                        contact.email ? { email: contact.email } : null
                    ].filter(Boolean)
                };
                
                // Si no es admin, solo buscar en sus propios clientes
                if (userRole === 'EMPRENDEDOR' || userRole === 'ASISTENTE') {
                    whereCondition.AND = [
                        {
                            OR: [
                                { assignedToId: userId },
                                { createdById: userId }
                            ]
                        }
                    ];
                }
                
                const existingClient = await prisma.client.findFirst({
                    where: whereCondition,
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        telefono: true,
                        email: true,
                        assignedTo: {
                            select: { firstname: true, lastname: true }
                        }
                    }
                });
                
                if (existingClient) {
                    duplicates.push({
                        inputContact: {
                            nombre: contact.nombre,
                            apellido: contact.apellido,
                            telefono: contact.telefono,
                            email: contact.email
                        },
                        existingClient
                    });
                }
            }
            
            res.json({
                totalChecked: contacts.length,
                duplicatesFound: duplicates.length,
                duplicates,
                canProceed: duplicates.length < contacts.length
            });
            
        } catch (error) {
            console.error('Error verificando duplicados:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// 🚀 NUEVA RUTA: Obtener clientes recientes del usuario
router.get('/my/recent',
    rateLimitByUser(30, 5 * 60 * 1000),
    async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const userId = req.user.id;
            const userRole = req.user.rol;
            
            const where = {};
            if (userRole === 'EMPRENDEDOR' || userRole === 'ASISTENTE') {
                where.OR = [
                    { assignedToId: userId },
                    { createdById: userId }
                ];
            }
            
            const recentClients = await prisma.client.findMany({
                where,
                include: {
                    assignedTo: {
                        select: { firstname: true, lastname: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit)
            });
            
            res.json({
                clients: recentClients,
                count: recentClients.length
            });
            
        } catch (error) {
            console.error('Error obteniendo clientes recientes:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// Middleware de manejo de errores específico para archivos
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'El archivo es demasiado grande. Máximo 10MB permitido.'
            });
        }
        return res.status(400).json({
            error: 'Error procesando archivo: ' + error.message
        });
    }
    
    if (error.message.includes('Solo se permiten archivos Excel')) {
        return res.status(400).json({
            error: 'Solo se permiten archivos Excel (.xlsx, .xls)'
        });
    }
    
    next(error);
});

module.exports = router;
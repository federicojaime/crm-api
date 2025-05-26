const express = require('express');
const multer = require('multer');
const { validate } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
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
    importContacts // 🚀 NUEVA IMPORTACIÓN
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
 * @desc    Obtener todos los clientes con filtros y paginación
 * @access  Private
 * @query   page, limit, search, source, estado, etapa, assignedTo, tags, sortBy, sortOrder
 */
router.get('/', getAllClients);

/**
 * @route   GET /api/clients/stats
 * @desc    Obtener estadísticas de clientes
 * @access  Private
 */
router.get('/stats', getClientStats);

/**
 * @route   GET /api/clients/search
 * @desc    Buscar clientes
 * @access  Private
 * @query   q, source, estado, etapa, limit
 */
router.get('/search', searchClients);

/**
 * @route   GET /api/clients/export
 * @desc    Exportar clientes a Excel
 * @access  Private
 * @query   format, source, estado, etapa (filtros opcionales)
 */
router.get('/export', exportClients);

/**
 * @route   GET /api/clients/import-template
 * @desc    Descargar template para importar clientes
 * @access  Private
 */
router.get('/import-template', async (req, res) => {
    try {
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
 * @desc    Crear nuevo cliente
 * @access  Private
 */
router.post('/', validate('client'), createClient);

/**
 * @route   POST /api/clients/import
 * @desc    Importar clientes desde Excel
 * @access  Private
 */
router.post('/import', upload.single('file'), importClients);

/**
 * @route   POST /api/clients/bulk-update
 * @desc    Actualización masiva de clientes
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post(
    '/bulk-update',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    bulkUpdateClients
);

/**
 * @route   GET /api/clients/:id
 * @desc    Obtener cliente por ID con información detallada
 * @access  Private
 */
router.get('/:id', getClientById);

/**
 * @route   PUT /api/clients/:id
 * @desc    Actualizar cliente
 * @access  Private
 */
router.put('/:id', validate('client'), updateClient);

/**
 * @route   POST /api/clients/:id/duplicate
 * @desc    Duplicar cliente
 * @access  Private
 */
router.post('/:id/duplicate', duplicateClient);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Eliminar cliente
 * @access  Private
 */
router.delete('/:id', deleteClient);



/**
 * @route   POST /api/clients/import-contacts
 * @desc    Importar contactos desde Google Contacts u otras fuentes
 * @access  Private
 * @body    { contacts: Array<Contact> }
 */
router.post('/import-contacts', importContacts);


module.exports = router;
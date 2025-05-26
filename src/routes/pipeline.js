const express = require('express');
const { validate } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
    getAllPipelineItems,
    getPipelineByStatus,
    createPipelineItem,
    getPipelineItemById,
    updatePipelineItem,
    updateItemStatus,
    deletePipelineItem,
    getPipelineStats,
    searchPipelineItems,
    duplicatePipelineItem,
    bulkUpdatePipelineItems,
    getPipelineItemHistory
} = require('../controllers/pipelineController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/pipeline
 * @desc    Obtener todos los items del pipeline
 * @access  Private
 */
router.get('/', getAllPipelineItems);

/**
 * @route   GET /api/pipeline/kanban
 * @desc    Obtener items agrupados por estado (vista kanban)
 * @access  Private
 */
router.get('/kanban', getPipelineByStatus);

/**
 * @route   GET /api/pipeline/stats
 * @desc    Obtener estadísticas del pipeline
 * @access  Private
 */
router.get('/stats', getPipelineStats);

/**
 * @route   GET /api/pipeline/search
 * @desc    Buscar items en el pipeline
 * @access  Private
 */
router.get('/search', searchPipelineItems);

/**
 * @route   POST /api/pipeline
 * @desc    Crear nuevo item en el pipeline (clientId obligatorio)
 * @access  Private
 */
router.post('/', validate('pipelineItem'), createPipelineItem);

/**
 * @route   POST /api/pipeline/bulk-update
 * @desc    Actualización masiva de items
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post(
    '/bulk-update',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    bulkUpdatePipelineItems
);

/**
 * @route   GET /api/pipeline/:id
 * @desc    Obtener item del pipeline por ID con historial completo
 * @access  Private
 */
router.get('/:id', getPipelineItemById);

/**
 * @route   GET /api/pipeline/:id/history
 * @desc    Obtener historial de movimientos de un item
 * @access  Private
 */
router.get('/:id/history', getPipelineItemHistory);

/**
 * @route   PUT /api/pipeline/:id
 * @desc    Actualizar item del pipeline
 * @access  Private
 */
router.put('/:id', validate('pipelineItem'), updatePipelineItem);

/**
 * @route   PATCH /api/pipeline/:id/status
 * @desc    Cambiar estado de un item (para drag & drop)
 * @access  Private
 */
router.patch('/:id/status', updateItemStatus);

/**
 * @route   POST /api/pipeline/:id/duplicate
 * @desc    Duplicar item del pipeline
 * @access  Private
 */
router.post('/:id/duplicate', duplicatePipelineItem);

/**
 * @route   DELETE /api/pipeline/:id
 * @desc    Eliminar item del pipeline
 * @access  Private
 */
router.delete('/:id', deletePipelineItem);

module.exports = router;
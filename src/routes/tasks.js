const express = require('express');
const { validate } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
    getAllTasks,
    getMyTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    completeTask,
    deleteTask,
    getTaskStats,
    searchTasks,
    getOverdueTasks,
    getUpcomingTasks,
    duplicateTask,
    bulkUpdateTasks
} = require('../controllers/tasksController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/tasks
 * @desc    Obtener todas las tareas con filtros y paginación
 * @access  Private
 * @query   page, limit, assignedTo, status, priority, type, search, clientId, overdue, dateFrom, dateTo, sortBy, sortOrder
 */
router.get('/', getAllTasks);

/**
 * @route   GET /api/tasks/my-tasks
 * @desc    Obtener tareas asignadas al usuario actual
 * @access  Private
 * @query   status, priority, limit
 */
router.get('/my-tasks', getMyTasks);

/**
 * @route   GET /api/tasks/stats
 * @desc    Obtener estadísticas de tareas
 * @access  Private
 * @query   assignedTo, period, dateFrom, dateTo
 */
router.get('/stats', getTaskStats);

/**
 * @route   GET /api/tasks/search
 * @desc    Buscar tareas por término
 * @access  Private
 * @query   q, assignedTo, status, priority, type, limit
 */
router.get('/search', searchTasks);

/**
 * @route   GET /api/tasks/overdue
 * @desc    Obtener tareas vencidas
 * @access  Private
 * @query   limit
 */
router.get('/overdue', getOverdueTasks);

/**
 * @route   GET /api/tasks/upcoming
 * @desc    Obtener tareas próximas a vencer
 * @access  Private
 * @query   days, limit
 */
router.get('/upcoming', getUpcomingTasks);

/**
 * @route   POST /api/tasks
 * @desc    Crear nueva tarea
 * @access  Private
 */
router.post('/', validate('task'), createTask);

/**
 * @route   POST /api/tasks/bulk-update
 * @desc    Actualización masiva de tareas
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post(
    '/bulk-update',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    bulkUpdateTasks
);

/**
 * @route   POST /api/tasks/bulk-complete
 * @desc    Completar múltiples tareas
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post(
    '/bulk-complete',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    async (req, res) => {
        try {
            const { taskIds } = req.body;

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({
                    error: 'Se requiere un array de IDs válido'
                });
            }

            const result = await prisma.task.updateMany({
                where: { id: { in: taskIds } },
                data: { status: 'COMPLETED' }
            });

            res.json({
                message: `${result.count} tareas marcadas como completadas`,
                updated: result.count
            });

        } catch (error) {
            console.error('Error completando tareas masivamente:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

/**
 * @route   POST /api/tasks/bulk-assign
 * @desc    Asignar múltiples tareas a un usuario
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.post(
    '/bulk-assign',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    async (req, res) => {
        try {
            const { taskIds, assignedToId } = req.body;

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({
                    error: 'Se requiere un array de IDs válido'
                });
            }

            if (!assignedToId) {
                return res.status(400).json({
                    error: 'Se requiere un usuario asignado'
                });
            }

            // Verificar que el usuario existe
            const user = await prisma.user.findUnique({
                where: { id: assignedToId }
            });

            if (!user) {
                return res.status(404).json({
                    error: 'Usuario no encontrado'
                });
            }

            const result = await prisma.task.updateMany({
                where: { id: { in: taskIds } },
                data: { assignedToId }
            });

            res.json({
                message: `${result.count} tareas asignadas a ${user.firstname} ${user.lastname}`,
                updated: result.count
            });

        } catch (error) {
            console.error('Error asignando tareas masivamente:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

/**
 * @route   DELETE /api/tasks/bulk-delete
 * @desc    Eliminar múltiples tareas
 * @access  Private (Solo SUPER_ADMIN y DISTRIBUIDOR)
 */
router.delete(
    '/bulk-delete',
    requireRole(['SUPER_ADMIN', 'DISTRIBUIDOR']),
    async (req, res) => {
        try {
            const { taskIds } = req.body;

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({
                    error: 'Se requiere un array de IDs válido'
                });
            }

            const result = await prisma.task.deleteMany({
                where: { id: { in: taskIds } }
            });

            res.json({
                message: `${result.count} tareas eliminadas exitosamente`,
                deleted: result.count
            });

        } catch (error) {
            console.error('Error eliminando tareas masivamente:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Obtener tarea por ID
 * @access  Private
 */
router.get('/:id', getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Actualizar tarea
 * @access  Private
 */
router.put('/:id', validate('task'), updateTask);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Cambiar estado de tarea
 * @access  Private
 */
router.patch('/:id/status', updateTaskStatus);

/**
 * @route   PATCH /api/tasks/:id/complete
 * @desc    Marcar tarea como completada
 * @access  Private
 */
router.patch('/:id/complete', completeTask);

/**
 * @route   PATCH /api/tasks/:id/start
 * @desc    Marcar tarea como en progreso
 * @access  Private
 */
router.patch('/:id/start', async (req, res) => {
    try {
        const { id } = req.params;

        const existingTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!existingTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingTask.assignedToId !== req.user.id && existingTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para iniciar esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { status: 'IN_PROGRESS' },
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        empresa: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.json({
            message: 'Tarea marcada como en progreso',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error iniciando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   PATCH /api/tasks/:id/cancel
 * @desc    Cancelar tarea
 * @access  Private
 */
router.patch('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;

        const existingTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!existingTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingTask.assignedToId !== req.user.id && existingTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para cancelar esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        empresa: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.json({
            message: 'Tarea cancelada',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error cancelando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   PUT /api/tasks/:id/priority
 * @desc    Cambiar prioridad de tarea
 * @access  Private
 */
router.put('/:id/priority', async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        if (!['ALTA', 'MEDIA', 'BAJA'].includes(priority)) {
            return res.status(400).json({
                error: 'Prioridad inválida'
            });
        }

        const existingTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!existingTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingTask.assignedToId !== req.user.id && existingTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para cambiar la prioridad de esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { priority },
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        empresa: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.json({
            message: 'Prioridad de tarea actualizada',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error cambiando prioridad de tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   POST /api/tasks/:id/duplicate
 * @desc    Duplicar tarea
 * @access  Private
 */
router.post('/:id/duplicate', duplicateTask);

/**
 * @route   POST /api/tasks/:id/sync-calendar
 * @desc    Sincronizar tarea con Google Calendar
 * @access  Private
 */
router.post('/:id/sync-calendar', async (req, res) => {
    try {
        const { id } = req.params;
        const { eventData, calendarId = 'primary' } = req.body;

        const task = await prisma.task.findUnique({
            where: { id }
        });

        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para sincronizar esta tarea'
                });
            }
        }

        // Aquí iría la lógica de sincronización con Google Calendar
        // Por ahora solo guardamos el eventId y calendarId
        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                eventId: eventData?.id || `event_${Date.now()}`,
                calendarId: calendarId
            }
        });

        res.json({
            message: 'Tarea sincronizada con Google Calendar',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error sincronizando con calendario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   DELETE /api/tasks/:id/unsync-calendar
 * @desc    Desincronizar tarea de Google Calendar
 * @access  Private
 */
router.delete('/:id/unsync-calendar', async (req, res) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.findUnique({
            where: { id }
        });

        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para desincronizar esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                eventId: null,
                calendarId: null
            }
        });

        res.json({
            message: 'Tarea desincronizada de Google Calendar',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error desincronizando calendario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   POST /api/tasks/:id/reminder
 * @desc    Configurar recordatorio para tarea
 * @access  Private
 */
router.post('/:id/reminder', async (req, res) => {
    try {
        const { id } = req.params;
        const { reminderTime } = req.body;

        const task = await prisma.task.findUnique({
            where: { id }
        });

        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para configurar recordatorios de esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                reminderEnabled: true,
                reminderTime: reminderTime || '30'
            }
        });

        res.json({
            message: 'Recordatorio configurado',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error configurando recordatorio:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   DELETE /api/tasks/:id/reminder
 * @desc    Eliminar recordatorio de tarea
 * @access  Private
 */
router.delete('/:id/reminder', async (req, res) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.findUnique({
            where: { id }
        });

        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'EMPRENDEDOR') {
            if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para eliminar recordatorios de esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                reminderEnabled: false,
                reminderTime: null
            }
        });

        res.json({
            message: 'Recordatorio eliminado',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error eliminando recordatorio:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Eliminar tarea
 * @access  Private
 */
router.delete('/:id', deleteTask);

module.exports = router;
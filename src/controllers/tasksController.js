const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Obtener todas las tareas con filtros
const getAllTasks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            assignedTo,
            status,
            priority,
            type,
            search,
            clientId,
            overdue,
            dateFrom,
            dateTo,
            sortBy = 'dueDate',
            sortOrder = 'asc'
        } = req.query;

        const skip = (page - 1) * limit;

        // Construir filtros
        const where = {};

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.OR = [
                { assignedToId: req.user.id },
                { createdById: req.user.id }
            ];
        } else if (assignedTo) {
            where.assignedToId = assignedTo;
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (type) {
            where.type = type;
        }

        if (clientId) {
            where.clientId = clientId;
        }

        // Filtro de búsqueda
        if (search) {
            where.OR = [
                ...where.OR || [],
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { 
                    client: {
                        OR: [
                            { nombre: { contains: search, mode: 'insensitive' } },
                            { apellido: { contains: search, mode: 'insensitive' } },
                            { empresa: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                }
            ];
        }

        // Filtro de fechas
        if (dateFrom || dateTo) {
            where.dueDate = {};
            if (dateFrom) where.dueDate.gte = new Date(dateFrom);
            if (dateTo) where.dueDate.lte = new Date(dateTo);
        }

        // Filtro de tareas vencidas
        if (overdue === 'true') {
            where.dueDate = { lt: new Date() };
            where.status = { in: ['PENDING', 'IN_PROGRESS'] };
        }

        // Obtener tareas con paginación
        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            nombre: true,
                            apellido: true,
                            email: true,
                            telefono: true,
                            empresa: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstname: true,
                            lastname: true,
                            email: true
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            firstname: true,
                            lastname: true
                        }
                    }
                },
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { [sortBy]: sortOrder }
            }),
            prisma.task.count({ where })
        ]);

        res.json({
            tasks,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo tareas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener tareas del usuario actual
const getMyTasks = async (req, res) => {
    try {
        const { status, priority, limit = 50 } = req.query;

        const where = {
            assignedToId: req.user.id
        };

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        empresa: true
                    }
                }
            },
            take: parseInt(limit),
            orderBy: { dueDate: 'asc' }
        });

        res.json({ tasks });

    } catch (error) {
        console.error('Error obteniendo mis tareas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener tarea por ID
const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true,
                        telefono: true,
                        empresa: true,
                        cargo: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        email: true
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para ver esta tarea'
                });
            }
        }

        res.json({ task });

    } catch (error) {
        console.error('Error obteniendo tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear nueva tarea
const createTask = async (req, res) => {
    try {
        const data = req.body;

        // Asignar creador
        data.createdById = req.user.id;

        // Si no se especifica asignado, asignar al usuario actual
        if (!data.assignedToId) {
            data.assignedToId = req.user.id;
        }

        // Verificar que el cliente existe si se especifica
        if (data.clientId) {
            const client = await prisma.client.findUnique({
                where: { id: data.clientId }
            });

            if (!client) {
                return res.status(404).json({
                    error: 'Cliente no encontrado'
                });
            }

            // Verificar permisos sobre el cliente si es EMPRENDEDOR
            if (req.user.rol === 'EMPRENDEDOR') {
                if (client.assignedToId !== req.user.id && client.createdById !== req.user.id) {
                    return res.status(403).json({
                        error: 'No tienes permisos para crear tareas para este cliente'
                    });
                }
            }
        }

        const task = await prisma.task.create({
            data,
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
                },
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.status(201).json({
            message: 'Tarea creada exitosamente',
            task
        });

    } catch (error) {
        console.error('Error creando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar tarea
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Verificar que la tarea existe
        const existingTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!existingTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingTask.assignedToId !== req.user.id && existingTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para editar esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data,
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
                },
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.json({
            message: 'Tarea actualizada exitosamente',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error actualizando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Cambiar estado de tarea
const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Verificar que la tarea existe
        const existingTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!existingTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingTask.assignedToId !== req.user.id && existingTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para cambiar el estado de esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { status },
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
            message: 'Estado de tarea actualizado exitosamente',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error actualizando estado de tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Marcar tarea como completada
const completeTask = async (req, res) => {
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
                    error: 'No tienes permisos para completar esta tarea'
                });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { status: 'COMPLETED' },
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
            message: 'Tarea marcada como completada',
            task: updatedTask
        });

    } catch (error) {
        console.error('Error completando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar tarea
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la tarea existe
        const existingTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!existingTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingTask.assignedToId !== req.user.id && existingTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para eliminar esta tarea'
                });
            }
        }

        await prisma.task.delete({
            where: { id }
        });

        res.json({
            message: 'Tarea eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas de tareas
const getTaskStats = async (req, res) => {
    try {
        const { assignedTo, period = '30', dateFrom, dateTo } = req.query;

        // Construir filtros
        const where = {};

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.OR = [
                { assignedToId: req.user.id },
                { createdById: req.user.id }
            ];
        } else if (assignedTo) {
            where.assignedToId = assignedTo;
        }

        // Filtro de período
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        } else if (period !== 'all') {
            const periodDays = parseInt(period);
            if (periodDays > 0) {
                const dateFromPeriod = new Date();
                dateFromPeriod.setDate(dateFromPeriod.getDate() - periodDays);
                where.createdAt = { gte: dateFromPeriod };
            }
        }

        // Estadísticas básicas
        const [
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            cancelledTasks,
            overdueTasks,
            todayTasks,
            thisWeekTasks,
            tasksByType,
            tasksByPriority,
            tasksByStatus
        ] = await Promise.all([
            prisma.task.count({ where }),
            prisma.task.count({ where: { ...where, status: 'PENDING' } }),
            prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.task.count({ where: { ...where, status: 'CANCELLED' } }),
            prisma.task.count({
                where: {
                    ...where,
                    dueDate: { lt: new Date() },
                    status: { in: ['PENDING', 'IN_PROGRESS'] }
                }
            }),
            prisma.task.count({
                where: {
                    ...where,
                    dueDate: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            }),
            prisma.task.count({
                where: {
                    ...where,
                    dueDate: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            prisma.task.groupBy({
                by: ['type'],
                where,
                _count: { _all: true }
            }),
            prisma.task.groupBy({
                by: ['priority'],
                where,
                _count: { _all: true }
            }),
            prisma.task.groupBy({
                by: ['status'],
                where,
                _count: { _all: true }
            })
        ]);

        // Estadísticas por usuario (solo para admins/distribuidores)
        let statsByUser = [];
        if (['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(req.user.rol)) {
            const userStats = await prisma.task.groupBy({
                by: ['assignedToId'],
                where,
                _count: { _all: true }
            });

            // Obtener nombres de usuarios
            const userIds = userStats.map(stat => stat.assignedToId).filter(Boolean);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstname: true, lastname: true }
            });

            statsByUser = userStats.map(stat => ({
                userId: stat.assignedToId,
                count: stat._count._all,
                user: users.find(u => u.id === stat.assignedToId)
            }));
        }

        res.json({
            total: totalTasks,
            pending: pendingTasks,
            inProgress: inProgressTasks,
            completed: completedTasks,
            cancelled: cancelledTasks,
            overdue: overdueTasks,
            today: todayTasks,
            thisWeek: thisWeekTasks,
            byType: tasksByType,
            byPriority: tasksByPriority,
            byStatus: tasksByStatus,
            byUser: statsByUser
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de tareas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Buscar tareas
const searchTasks = async (req, res) => {
    try {
        const { q, assignedTo, status, priority, type, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        // Construir filtros
        const where = {
            OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                {
                    client: {
                        OR: [
                            { nombre: { contains: q, mode: 'insensitive' } },
                            { apellido: { contains: q, mode: 'insensitive' } },
                            { empresa: { contains: q, mode: 'insensitive' } }
                        ]
                    }
                }
            ]
        };

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.AND = [
                {
                    OR: [
                        { assignedToId: req.user.id },
                        { createdById: req.user.id }
                    ]
                }
            ];
        } else if (assignedTo) {
            where.assignedToId = assignedTo;
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (type) {
            where.type = type;
        }

        const tasks = await prisma.task.findMany({
            where,
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
            },
            take: parseInt(limit),
            orderBy: { dueDate: 'asc' }
        });

        res.json({ tasks });

    } catch (error) {
        console.error('Error buscando tareas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener tareas vencidas
const getOverdueTasks = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const where = {
            dueDate: { lt: new Date() },
            status: { in: ['PENDING', 'IN_PROGRESS'] }
        };

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.OR = [
                { assignedToId: req.user.id },
                { createdById: req.user.id }
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
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
            },
            take: parseInt(limit),
            orderBy: { dueDate: 'desc' }
        });

        res.json({ tasks });

    } catch (error) {
        console.error('Error obteniendo tareas vencidas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener tareas próximas a vencer
const getUpcomingTasks = async (req, res) => {
    try {
        const { days = 3, limit = 50 } = req.query;

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + parseInt(days));

        const where = {
            dueDate: {
                gte: now,
                lte: futureDate
            },
            status: { in: ['PENDING', 'IN_PROGRESS'] }
        };

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.OR = [
                { assignedToId: req.user.id },
                { createdById: req.user.id }
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
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
            },
            take: parseInt(limit),
            orderBy: { dueDate: 'asc' }
        });

        res.json({ tasks });

    } catch (error) {
        console.error('Error obteniendo tareas próximas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Duplicar tarea
const duplicateTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener tarea original
        const originalTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!originalTask) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (originalTask.assignedToId !== req.user.id && originalTask.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para duplicar esta tarea'
                });
            }
        }

        // Crear copia (excluyendo campos únicos)
        const { id: _, createdAt, updatedAt, eventId, calendarId, ...taskData } = originalTask;

        // Ajustar fecha para el día siguiente
        const newDueDate = new Date(taskData.dueDate);
        newDueDate.setDate(newDueDate.getDate() + 1);

        const duplicatedTask = await prisma.task.create({
            data: {
                ...taskData,
                title: `${taskData.title} (Copia)`,
                dueDate: newDueDate,
                status: 'PENDING', // Resetear estado
                createdById: req.user.id,
                assignedToId: req.user.id,
                reminderEnabled: false, // Resetear recordatorio
                reminderTime: null
            },
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
                },
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.status(201).json({
            message: 'Tarea duplicada exitosamente',
            task: duplicatedTask
        });

    } catch (error) {
        console.error('Error duplicando tarea:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Operaciones masivas
const bulkUpdateTasks = async (req, res) => {
    try {
        const { taskIds, updates } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                error: 'Se requiere un array de IDs válido'
            });
        }

        // Verificar permisos para cada tarea si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            const userTasks = await prisma.task.findMany({
                where: {
                    id: { in: taskIds },
                    OR: [
                        { assignedToId: req.user.id },
                        { createdById: req.user.id }
                    ]
                },
                select: { id: true }
            });

            if (userTasks.length !== taskIds.length) {
                return res.status(403).json({
                    error: 'No tienes permisos para actualizar algunas de estas tareas'
                });
            }
        }

        // Actualizar tareas
        const result = await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: updates
        });

        res.json({
            message: `${result.count} tareas actualizadas exitosamente`,
            updated: result.count
        });

    } catch (error) {
        console.error('Error en actualización masiva de tareas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
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
};
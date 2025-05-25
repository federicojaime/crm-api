const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Obtener todos los items del pipeline
const getAllPipelineItems = async (req, res) => {
    try {
        const { status, priority, assignedTo, search, page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        // Construir filtros
        const where = {};

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.assignedToId = req.user.id;
        } else if (assignedTo) {
            where.assignedToId = assignedTo;
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Obtener items del pipeline
        const [items, total] = await Promise.all([
            prisma.pipelineItem.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            nombre: true,
                            apellido: true,
                            email: true
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
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.pipelineItem.count({ where })
        ]);

        res.json({
            items,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener items agrupados por estado (para vista kanban)
const getPipelineByStatus = async (req, res) => {
    try {
        const { assignedTo } = req.query;

        // Construir filtros
        const where = {};

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.assignedToId = req.user.id;
        } else if (assignedTo) {
            where.assignedToId = assignedTo;
        }

        // Obtener todos los items
        const items = await prisma.pipelineItem.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
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
            orderBy: { updatedAt: 'desc' }
        });

        // Agrupar por estado
        const groupedItems = items.reduce((acc, item) => {
            if (!acc[item.status]) {
                acc[item.status] = [];
            }
            acc[item.status].push(item);
            return acc;
        }, {});

        // Asegurar que todos los estados existan
        const statuses = [
            'NUEVO', 'CONTACTADO', 'CITA_AGENDADA', 'SIN_RESPUESTA',
            'REPROGRAMAR', 'NO_VENTA', 'IRRELEVANTE', 'NO_QUIERE_SPV',
            'NO_QUIERE_DEMO', 'VENTA_AGREGADO', 'VENTA_NUEVA', 'VENTA_CAIDA'
        ];

        statuses.forEach(status => {
            if (!groupedItems[status]) {
                groupedItems[status] = [];
            }
        });

        res.json({ pipeline: groupedItems });

    } catch (error) {
        console.error('Error obteniendo pipeline por estado:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear nuevo item en el pipeline
const createPipelineItem = async (req, res) => {
    try {
        const data = req.body;

        // Asignar al usuario actual si no se especifica otro
        if (!data.assignedToId) {
            data.assignedToId = req.user.id;
        }

        const item = await prisma.pipelineItem.create({
            data,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
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

        res.status(201).json({
            message: 'Item del pipeline creado exitosamente',
            item
        });

    } catch (error) {
        console.error('Error creando item del pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener item del pipeline por ID
const getPipelineItemById = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await prisma.pipelineItem.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true,
                        telefono: true,
                        direccion: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        email: true
                    }
                }
            }
        });

        if (!item) {
            return res.status(404).json({
                error: 'Item del pipeline no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR' && item.assignedToId !== req.user.id) {
            return res.status(403).json({
                error: 'No tienes permisos para ver este item'
            });
        }

        res.json({ item });

    } catch (error) {
        console.error('Error obteniendo item del pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar item del pipeline
const updatePipelineItem = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Verificar que el item existe
        const existingItem = await prisma.pipelineItem.findUnique({
            where: { id }
        });

        if (!existingItem) {
            return res.status(404).json({
                error: 'Item del pipeline no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR' && existingItem.assignedToId !== req.user.id) {
            return res.status(403).json({
                error: 'No tienes permisos para editar este item'
            });
        }

        const updatedItem = await prisma.pipelineItem.update({
            where: { id },
            data,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
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
            message: 'Item del pipeline actualizado exitosamente',
            item: updatedItem
        });

    } catch (error) {
        console.error('Error actualizando item del pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Cambiar estado de un item (para drag & drop)
const updateItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, position } = req.body;

        // Verificar que el item existe
        const existingItem = await prisma.pipelineItem.findUnique({
            where: { id }
        });

        if (!existingItem) {
            return res.status(404).json({
                error: 'Item del pipeline no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR' && existingItem.assignedToId !== req.user.id) {
            return res.status(403).json({
                error: 'No tienes permisos para mover este item'
            });
        }

        // Actualizar estado
        const updatedItem = await prisma.pipelineItem.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date()
            },
            include: {
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
            message: 'Estado actualizado exitosamente',
            item: updatedItem
        });

    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar item del pipeline
const deletePipelineItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el item existe
        const existingItem = await prisma.pipelineItem.findUnique({
            where: { id }
        });

        if (!existingItem) {
            return res.status(404).json({
                error: 'Item del pipeline no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR' && existingItem.assignedToId !== req.user.id) {
            return res.status(403).json({
                error: 'No tienes permisos para eliminar este item'
            });
        }

        await prisma.pipelineItem.delete({
            where: { id }
        });

        res.json({
            message: 'Item del pipeline eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando item del pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas del pipeline
const getPipelineStats = async (req, res) => {
    try {
        const { assignedTo, period = '30' } = req.query;

        // Construir filtros
        const where = {};

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.assignedToId = req.user.id;
        } else if (assignedTo) {
            where.assignedToId = assignedTo;
        }

        // Filtro de período
        const periodDays = parseInt(period);
        if (periodDays > 0) {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - periodDays);
            where.createdAt = { gte: dateFrom };
        }

        // Estadísticas por estado
        const statsByStatus = await prisma.pipelineItem.groupBy({
            by: ['status'],
            where,
            _count: { _all: true }
        });

        // Estadísticas por prioridad
        const statsByPriority = await prisma.pipelineItem.groupBy({
            by: ['priority'],
            where,
            _count: { _all: true }
        });

        // Total de items
        const totalItems = await prisma.pipelineItem.count({ where });

        // Items convertidos a ventas
        const convertedItems = await prisma.pipelineItem.count({
            where: {
                ...where,
                status: { in: ['VENTA_NUEVA', 'VENTA_AGREGADO'] }
            }
        });

        // Tasa de conversión
        const conversionRate = totalItems > 0 ? (convertedItems / totalItems) * 100 : 0;

        // Items por usuario (solo para admins/distribuidores)
        let statsByUser = [];
        if (['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(req.user.rol)) {
            statsByUser = await prisma.pipelineItem.groupBy({
                by: ['assignedToId'],
                where,
                _count: { _all: true }
            });

            // Obtener nombres de usuarios
            const userIds = statsByUser.map(stat => stat.assignedToId).filter(Boolean);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstname: true, lastname: true }
            });

            statsByUser = statsByUser.map(stat => ({
                ...stat,
                user: users.find(u => u.id === stat.assignedToId)
            }));
        }

        res.json({
            total: totalItems,
            converted: convertedItems,
            conversionRate: parseFloat(conversionRate.toFixed(2)),
            byStatus: statsByStatus,
            byPriority: statsByPriority,
            byUser: statsByUser
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas del pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Buscar items del pipeline
const searchPipelineItems = async (req, res) => {
    try {
        const { q, status, priority, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        // Construir filtros
        const where = {
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { notes: { contains: q, mode: 'insensitive' } },
                { products: { hasSome: [q] } }
            ]
        };

        // Filtrar por usuario si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            where.assignedToId = req.user.id;
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        const items = await prisma.pipelineItem.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
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
            orderBy: { updatedAt: 'desc' }
        });

        res.json({ items });

    } catch (error) {
        console.error('Error buscando en pipeline:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Duplicar item del pipeline
const duplicatePipelineItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener item original
        const originalItem = await prisma.pipelineItem.findUnique({
            where: { id }
        });

        if (!originalItem) {
            return res.status(404).json({
                error: 'Item del pipeline no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR' && originalItem.assignedToId !== req.user.id) {
            return res.status(403).json({
                error: 'No tienes permisos para duplicar este item'
            });
        }

        // Crear copia (excluyendo campos únicos)
        const { id: _, createdAt, updatedAt, ...itemData } = originalItem;

        const duplicatedItem = await prisma.pipelineItem.create({
            data: {
                ...itemData,
                name: `${itemData.name} (Copia)`,
                status: 'NUEVO' // Resetear estado
            },
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
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

        res.status(201).json({
            message: 'Item duplicado exitosamente',
            item: duplicatedItem
        });

    } catch (error) {
        console.error('Error duplicando item:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Bulk update (actualización masiva)
const bulkUpdatePipelineItems = async (req, res) => {
    try {
        const { itemIds, updates } = req.body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({
                error: 'Se requiere un array de IDs válido'
            });
        }

        // Verificar permisos para cada item si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            const userItems = await prisma.pipelineItem.findMany({
                where: {
                    id: { in: itemIds },
                    assignedToId: req.user.id
                },
                select: { id: true }
            });

            if (userItems.length !== itemIds.length) {
                return res.status(403).json({
                    error: 'No tienes permisos para actualizar algunos de estos items'
                });
            }
        }

        // Actualizar items
        const result = await prisma.pipelineItem.updateMany({
            where: { id: { in: itemIds } },
            data: updates
        });

        res.json({
            message: `${result.count} items actualizados exitosamente`,
            updated: result.count
        });

    } catch (error) {
        console.error('Error en actualización masiva:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
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
    bulkUpdatePipelineItems
};
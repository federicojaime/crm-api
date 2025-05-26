const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Función para crear historial de movimientos
const createPipelineHistory = async (pipelineItemId, action, oldData = null, newData = null, userId) => {
    try {
        await prisma.pipelineHistory.create({
            data: {
                pipelineItemId,
                action, // 'CREATED', 'STATUS_CHANGED', 'UPDATED', 'ASSIGNED', 'DELETED'
                oldData: oldData ? JSON.stringify(oldData) : null,
                newData: newData ? JSON.stringify(newData) : null,
                changedById: userId,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error creando historial:', error);
        // No fallar la operación principal por error en historial
    }
};

// Obtener todos los items del pipeline
const getAllPipelineItems = async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            assignedTo, 
            search, 
            page = 1, 
            limit = 50,
            clientId 
        } = req.query;
        
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

        if (clientId) {
            where.clientId = clientId;
        }

        if (search) {
            where.OR = [
                { 
                    client: {
                        OR: [
                            { nombre: { contains: search, mode: 'insensitive' } },
                            { apellido: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { telefono: { contains: search, mode: 'insensitive' } },
                            { empresa: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                { notes: { contains: search, mode: 'insensitive' } },
                { products: { hasSome: [search] } }
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
                            email: true,
                            telefono: true,
                            empresa: true,
                            source: true,
                            etapa: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstname: true,
                            lastname: true
                        }
                    },
                    _count: {
                        select: {
                            history: true
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
                        email: true,
                        telefono: true,
                        empresa: true,
                        source: true,
                        etapa: true
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

// Crear nuevo item en el pipeline (DEBE tener clientId)
const createPipelineItem = async (req, res) => {
    try {
        const data = req.body;

        // Validar que clientId sea obligatorio
        if (!data.clientId) {
            return res.status(400).json({
                error: 'El ID del cliente es obligatorio'
            });
        }

        // Verificar que el cliente existe
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
                    error: 'No tienes permisos para crear pipeline para este cliente'
                });
            }
        }

        // Asignar al usuario actual si no se especifica otro
        if (!data.assignedToId) {
            data.assignedToId = req.user.id;
        }

        // Remover campos que ya no son necesarios (ahora vienen del cliente)
        delete data.name;
        delete data.phone;

        const item = await prisma.pipelineItem.create({
            data,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true,
                        telefono: true,
                        empresa: true,
                        source: true,
                        etapa: true
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

        // Crear historial
        await createPipelineHistory(
            item.id,
            'CREATED',
            null,
            {
                status: item.status,
                priority: item.priority,
                products: item.products,
                value: item.value,
                assignedToId: item.assignedToId
            },
            req.user.id
        );

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

// Obtener item del pipeline por ID con historial
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
                        empresa: true,
                        cargo: true,
                        direccion: true,
                        source: true,
                        estado: true,
                        etapa: true,
                        tags: true,
                        customFields: true
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
                history: {
                    include: {
                        changedBy: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true
                            }
                        }
                    },
                    orderBy: { timestamp: 'desc' }
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

        // Obtener item actual para historial
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

        // Remover campos que no deben actualizarse aquí
        delete data.name;
        delete data.phone;
        delete data.clientId; // No permitir cambiar cliente

        const updatedItem = await prisma.pipelineItem.update({
            where: { id },
            data,
            include: {
                client: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true,
                        telefono: true,
                        empresa: true,
                        source: true,
                        etapa: true
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

        // Crear historial de cambios
        const changes = {};
        Object.keys(data).forEach(key => {
            if (existingItem[key] !== data[key]) {
                changes[key] = {
                    from: existingItem[key],
                    to: data[key]
                };
            }
        });

        if (Object.keys(changes).length > 0) {
            await createPipelineHistory(
                id,
                'UPDATED',
                changes,
                data,
                req.user.id
            );
        }

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

        // Obtener item actual
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

        const oldStatus = existingItem.status;

        // Actualizar estado
        const updatedItem = await prisma.pipelineItem.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date()
            },
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
                        lastname: true
                    }
                }
            }
        });

        // Crear historial del cambio de estado
        await createPipelineHistory(
            id,
            'STATUS_CHANGED',
            { status: oldStatus },
            { status: status },
            req.user.id
        );

        // Si es una venta, actualizar etapa del cliente
        if (['VENTA_NUEVA', 'VENTA_AGREGADO'].includes(status)) {
            await prisma.client.update({
                where: { id: existingItem.clientId },
                data: { etapa: 'Cliente' }
            });
        }

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

// Obtener historial de un item
const getPipelineItemHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el item existe y permisos
        const item = await prisma.pipelineItem.findUnique({
            where: { id }
        });

        if (!item) {
            return res.status(404).json({
                error: 'Item del pipeline no encontrado'
            });
        }

        if (req.user.rol === 'EMPRENDEDOR' && item.assignedToId !== req.user.id) {
            return res.status(403).json({
                error: 'No tienes permisos para ver el historial de este item'
            });
        }

        const history = await prisma.pipelineHistory.findMany({
            where: { pipelineItemId: id },
            include: {
                changedBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        res.json({ history });

    } catch (error) {
        console.error('Error obteniendo historial:', error);
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
            where: { id },
            include: {
                client: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                }
            }
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

        // Crear historial antes de eliminar
        await createPipelineHistory(
            id,
            'DELETED',
            {
                status: existingItem.status,
                priority: existingItem.priority,
                products: existingItem.products,
                value: existingItem.value,
                clientName: `${existingItem.client.nombre} ${existingItem.client.apellido}`
            },
            null,
            req.user.id
        );

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
            _count: { _all: true },
            _sum: { value: true }
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

        // Valor total del pipeline
        const totalValue = await prisma.pipelineItem.aggregate({
            where,
            _sum: { value: true }
        });

        // Tasa de conversión
        const conversionRate = totalItems > 0 ? (convertedItems / totalItems) * 100 : 0;

        // Clientes únicos en pipeline
        const uniqueClients = await prisma.pipelineItem.findMany({
            where,
            select: { clientId: true },
            distinct: ['clientId']
        });

        res.json({
            total: totalItems,
            converted: convertedItems,
            conversionRate: parseFloat(conversionRate.toFixed(2)),
            totalValue: totalValue._sum.value || 0,
            uniqueClients: uniqueClients.length,
            byStatus: statsByStatus,
            byPriority: statsByPriority
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
                {
                    client: {
                        OR: [
                            { nombre: { contains: q, mode: 'insensitive' } },
                            { apellido: { contains: q, mode: 'insensitive' } },
                            { email: { contains: q, mode: 'insensitive' } },
                            { telefono: { contains: q, mode: 'insensitive' } },
                            { empresa: { contains: q, mode: 'insensitive' } }
                        ]
                    }
                },
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
                        email: true,
                        telefono: true,
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
                status: 'NUEVO', // Resetear estado
                notes: `${itemData.notes} (Copia)`.substring(0, 500)
            },
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
                        lastname: true
                    }
                }
            }
        });

        // Crear historial
        await createPipelineHistory(
            duplicatedItem.id,
            'CREATED',
            null,
            {
                ...itemData,
                duplicatedFrom: id
            },
            req.user.id
        );

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

        // Obtener items originales para historial
        const originalItems = await prisma.pipelineItem.findMany({
            where: { id: { in: itemIds } },
            select: {
                id: true,
                status: true,
                priority: true,
                assignedToId: true,
                value: true
            }
        });

        // Actualizar items
        const result = await prisma.pipelineItem.updateMany({
            where: { id: { in: itemIds } },
            data: updates
        });

        // Crear historial para cada item
        for (const originalItem of originalItems) {
            const changes = {};
            Object.keys(updates).forEach(key => {
                if (originalItem[key] !== updates[key]) {
                    changes[key] = {
                        from: originalItem[key],
                        to: updates[key]
                    };
                }
            });

            if (Object.keys(changes).length > 0) {
                await createPipelineHistory(
                    originalItem.id,
                    'BULK_UPDATED',
                    changes,
                    updates,
                    req.user.id
                );
            }
        }

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
    bulkUpdatePipelineItems,
    getPipelineItemHistory
};
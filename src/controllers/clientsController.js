const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

// Obtener todos los clientes
const getAllClients = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            search, 
            source, 
            estado, 
            etapa,
            assignedTo,
            tags,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
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

        if (search) {
            where.OR = [
                ...where.OR || [],
                { nombre: { contains: search, mode: 'insensitive' } },
                { apellido: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { telefono: { contains: search, mode: 'insensitive' } },
                { empresa: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (source) {
            where.source = source;
        }

        if (estado) {
            where.estado = estado;
        }

        if (etapa) {
            where.etapa = etapa;
        }

        if (tags) {
            const tagArray = tags.split(',');
            where.tags = { hasSome: tagArray };
        }

        // Obtener clientes con paginación
        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            firstname: true,
                            lastname: true
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
                            sales: true,
                            tasks: true,
                            pipelineItems: true
                        }
                    }
                },
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { [sortBy]: sortOrder }
            }),
            prisma.client.count({ where })
        ]);

        res.json({
            clients,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener cliente por ID
const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        email: true
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
                sales: {
                    select: {
                        id: true,
                        fecha: true,
                        productos: true,
                        precioLista: true,
                        modalidadPago: true
                    },
                    orderBy: { fecha: 'desc' },
                    take: 5
                },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        status: true,
                        dueDate: true
                    },
                    orderBy: { dueDate: 'asc' },
                    take: 5
                },
                pipelineItems: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        value: true,
                        priority: true
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 3
                }
            }
        });

        if (!client) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (client.assignedToId !== req.user.id && client.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para ver este cliente'
                });
            }
        }

        res.json({ client });

    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear cliente
const createClient = async (req, res) => {
    try {
        const data = req.body;

        // Asignar al usuario actual si no se especifica otro
        if (!data.assignedToId) {
            data.assignedToId = req.user.id;
        }

        data.createdById = req.user.id;

        // Verificar si ya existe un cliente con el mismo teléfono o email
        if (data.telefono || data.email) {
            const existingClient = await prisma.client.findFirst({
                where: {
                    OR: [
                        data.telefono ? { telefono: data.telefono } : null,
                        data.email ? { email: data.email } : null
                    ].filter(Boolean)
                }
            });

            if (existingClient) {
                return res.status(400).json({
                    error: 'Ya existe un cliente con este teléfono o email',
                    existingClient: {
                        id: existingClient.id,
                        nombre: existingClient.nombre,
                        apellido: existingClient.apellido
                    }
                });
            }
        }

        const client = await prisma.client.create({
            data,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
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
            message: 'Cliente creado exitosamente',
            client
        });

    } catch (error) {
        console.error('Error creando cliente:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar cliente
const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Verificar que el cliente existe
        const existingClient = await prisma.client.findUnique({
            where: { id }
        });

        if (!existingClient) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingClient.assignedToId !== req.user.id && existingClient.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para editar este cliente'
                });
            }
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
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
            message: 'Cliente actualizado exitosamente',
            client: updatedClient
        });

    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar cliente
const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el cliente existe
        const existingClient = await prisma.client.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        sales: true,
                        tasks: true,
                        pipelineItems: true
                    }
                }
            }
        });

        if (!existingClient) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (existingClient.assignedToId !== req.user.id && existingClient.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para eliminar este cliente'
                });
            }
        }

        // Verificar si tiene registros relacionados
        const hasRelatedRecords = existingClient._count.sales > 0 || 
                                 existingClient._count.tasks > 0 || 
                                 existingClient._count.pipelineItems > 0;

        if (hasRelatedRecords) {
            return res.status(400).json({
                error: 'No se puede eliminar el cliente porque tiene registros relacionados',
                relatedRecords: existingClient._count
            });
        }

        await prisma.client.delete({
            where: { id }
        });

        res.json({
            message: 'Cliente eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando cliente:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas de clientes
const getClientStats = async (req, res) => {
    try {
        const { assignedTo, period = '30' } = req.query;

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
        const periodDays = parseInt(period);
        if (periodDays > 0) {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - periodDays);
            where.createdAt = { gte: dateFrom };
        }

        // Estadísticas básicas
        const [
            totalClients,
            activeClients,
            clientsBySource,
            clientsByEtapa,
            clientsByEstado,
            recentClients
        ] = await Promise.all([
            prisma.client.count({ where }),
            prisma.client.count({ 
                where: { ...where, estado: 'ACTIVO' } 
            }),
            prisma.client.groupBy({
                by: ['source'],
                where,
                _count: { _all: true }
            }),
            prisma.client.groupBy({
                by: ['etapa'],
                where,
                _count: { _all: true }
            }),
            prisma.client.groupBy({
                by: ['estado'],
                where,
                _count: { _all: true }
            }),
            prisma.client.count({
                where: {
                    ...where,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // últimos 7 días
                    }
                }
            })
        ]);

        // Estadísticas por usuario (solo para admins/distribuidores)
        let statsByUser = [];
        if (['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(req.user.rol)) {
            statsByUser = await prisma.client.groupBy({
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
            total: totalClients,
            active: activeClients,
            inactive: totalClients - activeClients,
            recent: recentClients,
            bySource: clientsBySource,
            byEtapa: clientsByEtapa,
            byEstado: clientsByEstado,
            byUser: statsByUser
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Buscar clientes
const searchClients = async (req, res) => {
    try {
        const { q, source, estado, etapa, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        // Construir filtros
        const where = {
            OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { apellido: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { telefono: { contains: q, mode: 'insensitive' } },
                { empresa: { contains: q, mode: 'insensitive' } },
                { tags: { hasSome: [q] } }
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
        }

        if (source) {
            where.source = source;
        }

        if (estado) {
            where.estado = estado;
        }

        if (etapa) {
            where.etapa = etapa;
        }

        const clients = await prisma.client.findMany({
            where,
            include: {
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

        res.json({ clients });

    } catch (error) {
        console.error('Error buscando clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Exportar clientes a Excel
const exportClients = async (req, res) => {
    try {
        const { format = 'xlsx', ...filters } = req.query;

        // Construir filtros (similar a getAllClients)
        const where = {};

        if (req.user.rol === 'EMPRENDEDOR') {
            where.OR = [
                { assignedToId: req.user.id },
                { createdById: req.user.id }
            ];
        }

        // Aplicar filtros adicionales...
        if (filters.source) where.source = filters.source;
        if (filters.estado) where.estado = filters.estado;
        if (filters.etapa) where.etapa = filters.etapa;

        const clients = await prisma.client.findMany({
            where,
            include: {
                createdBy: {
                    select: { firstname: true, lastname: true }
                },
                assignedTo: {
                    select: { firstname: true, lastname: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Crear archivo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Clientes');

        // Definir columnas
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Nombre', key: 'nombre', width: 20 },
            { header: 'Apellido', key: 'apellido', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Empresa', key: 'empresa', width: 25 },
            { header: 'Cargo', key: 'cargo', width: 20 },
            { header: 'Fuente', key: 'source', width: 15 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Etapa', key: 'etapa', width: 15 },
            { header: 'Asignado a', key: 'assignedTo', width: 25 },
            { header: 'Creado por', key: 'createdBy', width: 25 },
            { header: 'Fecha Creación', key: 'createdAt', width: 20 },
            { header: 'Tags', key: 'tags', width: 30 }
        ];

        // Agregar datos
        clients.forEach(client => {
            worksheet.addRow({
                id: client.id,
                nombre: client.nombre,
                apellido: client.apellido,
                email: client.email,
                telefono: client.telefono,
                empresa: client.empresa,
                cargo: client.cargo,
                source: client.source,
                estado: client.estado,
                etapa: client.etapa,
                assignedTo: client.assignedTo ? 
                    `${client.assignedTo.firstname} ${client.assignedTo.lastname}` : '',
                createdBy: `${client.createdBy.firstname} ${client.createdBy.lastname}`,
                createdAt: client.createdAt.toLocaleDateString(),
                tags: client.tags.join(', ')
            });
        });

        // Estilo de encabezados
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        // Configurar respuesta
        const fileName = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exportando clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Importar clientes desde Excel
const importClients = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No se ha subido ningún archivo'
            });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        
        const worksheet = workbook.getWorksheet(1);
        const clients = [];
        const errors = [];

        // Procesar filas (empezar desde la fila 2, saltar encabezados)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Saltar encabezados

            try {
                const clientData = {
                    nombre: row.getCell(1).value?.toString().trim(),
                    apellido: row.getCell(2).value?.toString().trim(),
                    email: row.getCell(3).value?.toString().trim(),
                    telefono: row.getCell(4).value?.toString().trim(),
                    empresa: row.getCell(5).value?.toString().trim(),
                    cargo: row.getCell(6).value?.toString().trim(),
                    source: row.getCell(7).value?.toString().trim() || 'OTRO',
                    estado: row.getCell(8).value?.toString().trim() || 'ACTIVO',
                    etapa: row.getCell(9).value?.toString().trim(),
                    direccion: row.getCell(10).value?.toString().trim(),
                    tags: row.getCell(11).value?.toString().trim().split(',').map(t => t.trim()).filter(Boolean) || [],
                    createdById: req.user.id,
                    assignedToId: req.user.id
                };

                // Validaciones básicas
                if (!clientData.nombre || !clientData.apellido || !clientData.telefono) {
                    errors.push({
                        row: rowNumber,
                        error: 'Nombre, apellido y teléfono son campos obligatorios'
                    });
                    return;
                }

                clients.push(clientData);

            } catch (error) {
                errors.push({
                    row: rowNumber,
                    error: `Error procesando fila: ${error.message}`
                });
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Errores en el archivo',
                details: errors,
                processedClients: clients.length
            });
        }

        // Insertar clientes en la base de datos
        const createdClients = [];
        const duplicates = [];

        for (const clientData of clients) {
            try {
                // Verificar duplicados
                const existing = await prisma.client.findFirst({
                    where: {
                        OR: [
                            { telefono: clientData.telefono },
                            clientData.email ? { email: clientData.email } : null
                        ].filter(Boolean)
                    }
                });

                if (existing) {
                    duplicates.push({
                        data: clientData,
                        existing: {
                            id: existing.id,
                            nombre: existing.nombre,
                            apellido: existing.apellido
                        }
                    });
                    continue;
                }

                const client = await prisma.client.create({
                    data: clientData,
                    include: {
                        assignedTo: {
                            select: { firstname: true, lastname: true }
                        }
                    }
                });

                createdClients.push(client);

            } catch (error) {
                errors.push({
                    data: clientData,
                    error: error.message
                });
            }
        }

        res.json({
            message: 'Importación completada',
            summary: {
                total: clients.length,
                created: createdClients.length,
                duplicates: duplicates.length,
                errors: errors.length
            },
            createdClients,
            duplicates,
            errors
        });

    } catch (error) {
        console.error('Error importando clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Actualización masiva de clientes
const bulkUpdateClients = async (req, res) => {
    try {
        const { clientIds, updates } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({
                error: 'Se requiere un array de IDs válido'
            });
        }

        // Verificar permisos para cada cliente si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            const userClients = await prisma.client.findMany({
                where: {
                    id: { in: clientIds },
                    OR: [
                        { assignedToId: req.user.id },
                        { createdById: req.user.id }
                    ]
                },
                select: { id: true }
            });

            if (userClients.length !== clientIds.length) {
                return res.status(403).json({
                    error: 'No tienes permisos para actualizar algunos de estos clientes'
                });
            }
        }

        // Actualizar clientes
        const result = await prisma.client.updateMany({
            where: { id: { in: clientIds } },
            data: updates
        });

        res.json({
            message: `${result.count} clientes actualizados exitosamente`,
            updated: result.count
        });

    } catch (error) {
        console.error('Error en actualización masiva de clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Duplicar cliente
const duplicateClient = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener cliente original
        const originalClient = await prisma.client.findUnique({
            where: { id }
        });

        if (!originalClient) {
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        // Verificar permisos si es EMPRENDEDOR
        if (req.user.rol === 'EMPRENDEDOR') {
            if (originalClient.assignedToId !== req.user.id && originalClient.createdById !== req.user.id) {
                return res.status(403).json({
                    error: 'No tienes permisos para duplicar este cliente'
                });
            }
        }

        // Crear copia (excluyendo campos únicos)
        const { id: _, createdAt, updatedAt, telefono, email, ...clientData } = originalClient;

        const duplicatedClient = await prisma.client.create({
            data: {
                ...clientData,
                nombre: `${clientData.nombre} (Copia)`,
                telefono: `${telefono}_copia_${Date.now()}`,
                email: email ? `copia_${Date.now()}_${email}` : null,
                createdById: req.user.id,
                assignedToId: req.user.id
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
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
            message: 'Cliente duplicado exitosamente',
            client: duplicatedClient
        });

    } catch (error) {
        console.error('Error duplicando cliente:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
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
    duplicateClient
};
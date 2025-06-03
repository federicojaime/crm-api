const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

// 🚀 FUNCIÓN NUEVA: Construir filtros de usuario

// Obtener todos los clientes (ACTUALIZADO)
// 🔧 FUNCIÓN CORREGIDA: Construir filtros de usuario
const buildUserFilters = (user, queryFilters = {}) => {
    const where = {};

    console.log(`[FILTER-DEBUG] Construyendo filtros para usuario: ${user.firstname} (${user.rol}, ID: ${user.id})`);

    // 🎯 APLICAR FILTROS SEGÚN ROL DEL USUARIO
    if (user.rol === 'EMPRENDEDOR' || user.rol === 'ASISTENTE') {
        // ⚠️ CRÍTICO: Solo pueden ver sus clientes y los referidos a ellos
        where.OR = [
            { assignedToId: user.id },
            { createdById: user.id }
            // { referredById: user.id } // Agregar si tienes este campo
        ];
        console.log(`[FILTER-DEBUG] ✅ Aplicando filtro restrictivo para ${user.rol}`);
        console.log(`[FILTER-DEBUG] Filtro aplicado:`, JSON.stringify(where, null, 2));
    } else if (user.rol === 'DISTRIBUIDOR') {
        // Pueden ver todos los clientes (o filtrar por organización si tienes ese campo)
        console.log(`[FILTER-DEBUG] ⚠️ DISTRIBUIDOR puede ver todos los clientes`);
        // Si quieres restringir distribuidores por organización:
        // where.organizationId = user.organizationId;
    } else if (user.rol === 'SUPER_ADMIN') {
        // Pueden ver absolutamente todo
        console.log(`[FILTER-DEBUG] ⚠️ SUPER_ADMIN puede ver todos los clientes`);
    } else {
        // Rol no reconocido, aplicar filtro restrictivo por seguridad
        console.warn(`[FILTER-DEBUG] ⚠️ Rol no reconocido: ${user.rol}. Aplicando filtro restrictivo.`);
        where.OR = [
            { assignedToId: user.id },
            { createdById: user.id }
        ];
    }

    return where;
};

// 🔧 FUNCIÓN CORREGIDA: Obtener todos los clientes
const getAllClients = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            source,
            estado,
            etapa,
            tags,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (page - 1) * limit;
        const userId = req.user.id;

        console.log(`[CLIENTS] 🔍 Usuario: ${req.user.firstname} (${req.user.rol}) - ID: ${userId}`);

        // 🎯 FILTRO DIRECTO Y SIMPLE
        const where = {
            OR: [
                { assignedToId: userId },
                { createdById: userId }
            ]
        };

        console.log(`[CLIENTS] 🔍 Filtro aplicado:`, JSON.stringify(where, null, 2));

        // Aplicar filtros adicionales
        if (search) {
            where.AND = [
                { OR: where.OR }, // Mantener el filtro de usuario
                {
                    OR: [
                        { nombre: { contains: search, mode: 'insensitive' } },
                        { apellido: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { telefono: { contains: search, mode: 'insensitive' } },
                        { empresa: { contains: search, mode: 'insensitive' } }
                    ]
                }
            ];
            delete where.OR; // Eliminar el OR original
        }

        if (source) where.source = source;
        if (estado) where.estado = estado;
        if (etapa) where.etapa = etapa;
        if (tags) {
            const tagArray = tags.split(',');
            where.tags = { hasSome: tagArray };
        }

        console.log(`[CLIENTS] 🔍 Filtro final:`, JSON.stringify(where, null, 2));

        // Ejecutar consulta
        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                include: {
                    createdBy: {
                        select: { id: true, firstname: true, lastname: true }
                    },
                    assignedTo: {
                        select: { id: true, firstname: true, lastname: true }
                    },
                    _count: {
                        select: { sales: true, tasks: true, pipelineItems: true }
                    }
                },
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { [sortBy]: sortOrder }
            }),
            prisma.client.count({ where })
        ]);

        console.log(`[CLIENTS] ✅ Encontrados: ${clients.length} clientes de un total de ${total}`);

        // 🚨 VERIFICACIÓN DE SEGURIDAD
        clients.forEach(client => {
            if (client.assignedToId !== userId && client.createdById !== userId) {
                console.error(`[CLIENTS] ⚠️ PROBLEMA: Cliente ${client.id} no pertenece al usuario ${userId}`);
            }
        });

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
        console.error('[CLIENTS] ❌ Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// Obtener cliente por ID (ACTUALIZADO)
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

        // 🎯 VERIFICAR PERMISOS MEJORADOS
        const canViewClient =
            req.user.rol === 'SUPER_ADMIN' ||
            req.user.rol === 'DISTRIBUIDOR' ||
            client.assignedToId === req.user.id ||
            client.createdById === req.user.id ||
            (client.referredById && client.referredById === req.user.id);

        if (!canViewClient) {
            return res.status(403).json({
                error: 'No tienes permisos para ver este cliente'
            });
        }

        console.log(`[CLIENTS] Usuario ${req.user.firstname} accedió al cliente ${client.id}`);

        res.json({ client });

    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear cliente (YA ESTABA BIEN)
const createClient = async (req, res) => {
    try {
        const data = req.body;

        // Asignar al usuario actual si no se especifica otro
        if (!data.assignedToId) {
            data.assignedToId = req.user.id;
        }

        data.createdById = req.user.id;

        console.log(`[CLIENTS] Usuario ${req.user.firstname} creando cliente para ${data.assignedToId === req.user.id ? 'sí mismo' : 'otro usuario'}`);

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

        console.log(`[CLIENTS] ✅ Cliente creado: ${client.id} - ${client.nombre} ${client.apellido}`);

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

// Actualizar cliente (MEJORADO)
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

        // 🎯 VERIFICAR PERMISOS MEJORADOS
        const canEditClient =
            req.user.rol === 'SUPER_ADMIN' ||
            req.user.rol === 'DISTRIBUIDOR' ||
            existingClient.assignedToId === req.user.id ||
            existingClient.createdById === req.user.id;

        if (!canEditClient) {
            return res.status(403).json({
                error: 'No tienes permisos para editar este cliente'
            });
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

        console.log(`[CLIENTS] Usuario ${req.user.firstname} actualizó cliente ${id}`);

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

// Eliminar cliente (MEJORADO)
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

        // 🎯 VERIFICAR PERMISOS MEJORADOS
        const canDeleteClient =
            req.user.rol === 'SUPER_ADMIN' ||
            req.user.rol === 'DISTRIBUIDOR' ||
            existingClient.assignedToId === req.user.id ||
            existingClient.createdById === req.user.id;

        if (!canDeleteClient) {
            return res.status(403).json({
                error: 'No tienes permisos para eliminar este cliente'
            });
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

        console.log(`[CLIENTS] Usuario ${req.user.firstname} eliminó cliente ${id}`);

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

// Obtener estadísticas de clientes (ACTUALIZADO)
const getClientStats = async (req, res) => {
    try {
        const { assignedTo, period = '30' } = req.query;

        console.log(`[STATS] Usuario ${req.user.firstname} (${req.user.rol}) solicitando estadísticas`);

        // 🎯 CONSTRUIR FILTROS BASADOS EN USUARIO
        const where = buildUserFilters(req.user, {
            assignedToId: assignedTo
        });

        // Filtro de período
        const periodDays = parseInt(period);
        if (periodDays > 0) {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - periodDays);
            if (where.AND) {
                where.AND.push({ createdAt: { gte: dateFrom } });
            } else {
                where.createdAt = { gte: dateFrom };
            }
        }

        console.log(`[STATS] Filtros aplicados:`, JSON.stringify(where, null, 2));

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

        console.log(`[STATS] Devolviendo estadísticas: ${totalClients} clientes totales`);

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

// Buscar clientes (ACTUALIZADO)
const searchClients = async (req, res) => {
    try {
        const { q, source, estado, etapa, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        console.log(`[SEARCH] Usuario ${req.user.firstname} buscando: "${q}"`);

        // 🎯 CONSTRUIR FILTROS BASADOS EN USUARIO
        const where = buildUserFilters(req.user);

        // Agregar términos de búsqueda
        const searchConditions = [
            { nombre: { contains: q, mode: 'insensitive' } },
            { apellido: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { telefono: { contains: q, mode: 'insensitive' } },
            { empresa: { contains: q, mode: 'insensitive' } },
            { tags: { hasSome: [q] } }
        ];

        if (where.OR) {
            // Si ya hay condiciones OR (filtros de usuario), combinar con AND
            where.AND = [
                { OR: where.OR },
                { OR: searchConditions }
            ];
            delete where.OR;
        } else {
            where.OR = searchConditions;
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

        console.log(`[SEARCH] Encontrados ${clients.length} clientes para "${q}"`);

        res.json({ clients });

    } catch (error) {
        console.error('Error buscando clientes:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Exportar clientes a Excel (ACTUALIZADO)
const exportClients = async (req, res) => {
    try {
        const { format = 'xlsx', ...filters } = req.query;

        console.log(`[EXPORT] Usuario ${req.user.firstname} exportando clientes`);

        // 🎯 CONSTRUIR FILTROS BASADOS EN USUARIO
        const where = buildUserFilters(req.user, filters);

        // Aplicar filtros adicionales
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

        console.log(`[EXPORT] Exportando ${clients.length} clientes`);

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
        const userSuffix = req.user.rol === 'SUPER_ADMIN' ? '_todos' : `_${req.user.firstname}`;
        const fileName = `clientes${userSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

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

// Importar clientes desde Excel (YA ESTABA BIEN)
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
                    assignedToId: req.user.id // 🎯 ASIGNAR AL USUARIO ACTUAL
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

        console.log(`[IMPORT] Usuario ${req.user.firstname} importó ${createdClients.length} clientes`);

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

// Actualización masiva de clientes (ACTUALIZADO)
const bulkUpdateClients = async (req, res) => {
    try {
        const { clientIds, updates } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({
                error: 'Se requiere un array de IDs válido'
            });
        }

        console.log(`[BULK] Usuario ${req.user.firstname} actualizando ${clientIds.length} clientes`);

        // 🎯 VERIFICAR PERMISOS PARA CADA CLIENTE
        if (req.user.rol === 'EMPRENDEDOR' || req.user.rol === 'ASISTENTE') {
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

        console.log(`[BULK] Actualizados ${result.count} clientes`);

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

// Duplicar cliente (ACTUALIZADO)
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

        // 🎯 VERIFICAR PERMISOS MEJORADOS
        const canDuplicateClient =
            req.user.rol === 'SUPER_ADMIN' ||
            req.user.rol === 'DISTRIBUIDOR' ||
            originalClient.assignedToId === req.user.id ||
            originalClient.createdById === req.user.id;

        if (!canDuplicateClient) {
            return res.status(403).json({
                error: 'No tienes permisos para duplicar este cliente'
            });
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
                assignedToId: req.user.id // 🎯 ASIGNAR AL USUARIO ACTUAL
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

        console.log(`[DUPLICATE] Usuario ${req.user.firstname} duplicó cliente ${id} -> ${duplicatedClient.id}`);

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

// 🚀 FUNCIÓN MEJORADA: Importar contactos
const importContacts = async (req, res) => {
    try {
        const { contacts } = req.body;

        console.log(`[IMPORT-CONTACTS] Usuario ${req.user.firstname} (${req.user.rol}) importando ${contacts?.length || 0} contactos...`);

        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({
                error: 'No hay contactos para importar',
                details: 'Se requiere un array de contactos válido'
            });
        }

        const results = {
            successful: 0,
            failed: 0,
            total: contacts.length,
            errors: [],
            successfulContacts: [],
            duplicates: []
        };

        console.log(`[IMPORT-CONTACTS] Procesando ${contacts.length} contactos para usuario ${req.user.id}...`);

        // Procesar cada contacto individualmente
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];

            try {
                console.log(`[IMPORT-CONTACTS] Procesando contacto ${i + 1}/${contacts.length}: ${contact.nombre} ${contact.apellido}`);

                // 🎯 MAPEAR CONTACTO A FORMATO DE CLIENTE CON ASIGNACIÓN AUTOMÁTICA
                const clientData = {
                    nombre: contact.nombre?.trim() || 'Sin Nombre',
                    apellido: contact.apellido?.trim() || 'Sin Apellido',
                    email: contact.email?.trim() || null,
                    email2: contact.email2?.trim() || null,
                    telefono: contact.telefono?.trim() || '',
                    telefono2: contact.telefono2?.trim() || null,
                    empresa: contact.empresa?.trim() || null,
                    cargo: contact.cargo?.trim() || null,
                    direccion: contact.direccion?.trim() || null,
                    source: contact.source || 'GOOGLE_CONTACTS',
                    estado: contact.estado || 'ACTIVO',
                    etapa: contact.etapa || 'Prospecto',
                    tags: Array.isArray(contact.tags) ? contact.tags : ['importado'],
                    notas: contact.notas || `Importado por ${req.user.firstname} el ${new Date().toLocaleDateString()}`,
                    createdById: req.user.id,
                    assignedToId: req.user.id // 🎯 SIEMPRE ASIGNAR AL USUARIO ACTUAL
                };

                // Validaciones básicas
                if (!clientData.nombre || clientData.nombre === 'Sin Nombre') {
                    throw new Error('Nombre es requerido');
                }

                if (!clientData.telefono) {
                    throw new Error('Teléfono es requerido');
                }

                // 🎯 VERIFICAR DUPLICADOS SOLO EN CLIENTES DEL USUARIO
                const whereCondition = {
                    OR: [
                        { telefono: clientData.telefono },
                        clientData.email ? { email: clientData.email } : null
                    ].filter(Boolean)
                };

                // Si no es admin, solo buscar en sus propios clientes
                if (req.user.rol === 'EMPRENDEDOR' || req.user.rol === 'ASISTENTE') {
                    whereCondition.AND = [
                        {
                            OR: [
                                { assignedToId: req.user.id },
                                { createdById: req.user.id }
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
                        assignedToId: true,
                        createdById: true
                    }
                });

                if (existingClient) {
                    console.log(`[IMPORT-CONTACTS] ⚠️ Contacto duplicado: ${clientData.nombre} ${clientData.apellido}`);
                    results.duplicates.push({
                        contact: clientData,
                        existingClient: existingClient
                    });
                    results.failed++;
                    continue;
                }

                // Crear cliente
                const newClient = await prisma.client.create({
                    data: clientData,
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

                results.successfulContacts.push(newClient);
                results.successful++;

                console.log(`[IMPORT-CONTACTS] ✅ Cliente creado: ${newClient.id} - ${newClient.nombre} ${newClient.apellido} (asignado a ${req.user.firstname})`);

            } catch (error) {
                console.error(`[IMPORT-CONTACTS] ❌ Error procesando contacto ${i + 1}:`, error.message);
                results.failed++;
                results.errors.push({
                    contact: contact,
                    error: error.message,
                    index: i + 1
                });
            }

            // 🎯 MOSTRAR PROGRESO CADA 50 CONTACTOS
            if ((i + 1) % 50 === 0) {
                console.log(`[IMPORT-CONTACTS] 📊 Progreso: ${i + 1}/${contacts.length} (${Math.round(((i + 1) / contacts.length) * 100)}%)`);
            }
        }

        console.log(`[IMPORT-CONTACTS] ✅ Importación completada para ${req.user.firstname}:`, {
            successful: results.successful,
            failed: results.failed,
            duplicates: results.duplicates.length,
            total: results.total
        });

        // Respuesta con resumen completo
        res.status(200).json({
            message: `Importación de contactos completada para ${req.user.firstname}`,
            summary: {
                successful: results.successful,
                failed: results.failed,
                duplicates: results.duplicates.length,
                total: results.total
            },
            results: {
                successfulContacts: results.successfulContacts,
                duplicates: results.duplicates.map(d => ({
                    nombre: d.contact.nombre,
                    apellido: d.contact.apellido,
                    telefono: d.contact.telefono,
                    existingId: d.existingClient.id,
                    belongsToUser: d.existingClient.assignedToId === req.user.id || d.existingClient.createdById === req.user.id
                })),
                errors: results.errors.map(e => ({
                    nombre: e.contact.nombre,
                    apellido: e.contact.apellido,
                    error: e.error,
                    index: e.index
                }))
            },
            userInfo: {
                userId: req.user.id,
                userName: req.user.firstname,
                userRole: req.user.rol,
                canViewAll: ['SUPER_ADMIN', 'DISTRIBUIDOR'].includes(req.user.rol)
            }
        });

    } catch (error) {
        console.error(`[IMPORT-CONTACTS] Error en importación de contactos para usuario ${req.user.firstname}:`, error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message,
            userId: req.user.id,
            userName: req.user.firstname
        });
    }
};

// Agregar al final del archivo antes del module.exports:
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
    duplicateClient,
    importContacts
};
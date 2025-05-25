const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 50, search, rol, isActive } = req.query;
        const skip = (page - 1) * limit;

        const where = {};

        if (search) {
            where.OR = [
                { firstname: { contains: search, mode: 'insensitive' } },
                { lastname: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (rol) {
            where.rol = rol;
        }

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstname: true,
                    lastname: true,
                    rol: true,
                    subRol: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true
                },
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
                rol: true,
                subRol: true,
                phone: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.json({ user });

    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Crear usuario
const createUser = async (req, res) => {
    try {
        const { email, password, firstname, lastname, rol, subRol, phone } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Ya existe un usuario con este email'
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstname,
                lastname,
                rol,
                subRol,
                phone
            },
            select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
                rol: true,
                subRol: true,
                phone: true,
                isActive: true,
                createdAt: true
            }
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar usuario
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, lastname, phone, rol, subRol } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                firstname,
                lastname,
                phone,
                rol,
                subRol
            },
            select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
                rol: true,
                subRol: true,
                phone: true,
                isActive: true,
                updatedAt: true
            }
        });

        res.json({
            message: 'Usuario actualizado exitosamente',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Cambiar contraseña de usuario
const changeUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });

        res.json({
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Desactivar usuario
const deactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.user.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({
            message: 'Usuario desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Activar usuario
const activateUser = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.user.update({
            where: { id },
            data: { isActive: true }
        });

        res.json({
            message: 'Usuario activado exitosamente'
        });

    } catch (error) {
        console.error('Error activando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.user.delete({
            where: { id }
        });

        res.json({
            message: 'Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Estadísticas de usuarios
const getUserStats = async (req, res) => {
    try {
        const [totalUsers, activeUsers, usersByRole] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.groupBy({
                by: ['rol'],
                _count: { _all: true }
            })
        ]);

        res.json({
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            byRole: usersByRole
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    changeUserPassword,
    deactivateUser,
    activateUser,
    deleteUser,
    getUserStats
};
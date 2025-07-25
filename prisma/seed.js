const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    await prisma.pipelineItem.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    // Crear usuarios
    console.log('👥 Creando usuarios...');
 
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmin = await prisma.user.create({
        data: {
            email: 'admin@crm.com',
            password: hashedPassword,
            firstname: 'Super',
            lastname: 'Admin',
            rol: 'SUPER_ADMIN',
            phone: '+54911234567',
            isActive: true
        }
    });

    const distribuidor = await prisma.user.create({
        data: {
            email: 'distribuidor@crm.com',
            password: hashedPassword,
            firstname: 'María',
            lastname: 'Distribuidora',
            rol: 'DISTRIBUIDOR',
            phone: '+54911234568',
            isActive: true
        }
    });

    const emprendedor1 = await prisma.user.create({
        data: {
            email: 'emprendedor1@crm.com',
            password: hashedPassword,
            firstname: 'Juan',
            lastname: 'Pérez',
            rol: 'EMPRENDEDOR',
            phone: '+54911234569',
            isActive: true
        }
    });

    const emprendedor2 = await prisma.user.create({
        data: {
            email: 'emprendedor2@crm.com',
            password: hashedPassword,
            firstname: 'Ana',
            lastname: 'González',
            rol: 'EMPRENDEDOR',
            phone: '+54911234570',
            isActive: true
        }
    });

    const asistente = await prisma.user.create({
        data: {
            email: 'asistente@crm.com',
            password: hashedPassword,
            firstname: 'Carlos',
            lastname: 'Asistente',
            rol: 'ASISTENTE',
            subRol: 'COMERCIAL',
            phone: '+54911234571',
            isActive: true
        }
    });

    console.log(`✅ Creados ${5} usuarios`);

    // Crear clientes
    console.log('👤 Creando clientes...');

    const clientesData = [
        {
            nombre: 'Laura',
            apellido: 'Martínez',
            email: 'laura.martinez@email.com',
            telefono: '+54911555001',
            empresa: 'Marketing Digital SA',
            cargo: 'Directora',
            source: 'LANDING',
            estado: 'ACTIVO',
            etapa: 'Cliente',
            direccion: 'Av. Corrientes 1234, CABA',
            tags: ['premium', 'marketing', 'activa'],
            notas: 'Cliente VIP con múltiples compras',
            createdById: emprendedor1.id,
            assignedToId: emprendedor1.id
        },
        {
            nombre: 'Roberto',
            apellido: 'Silva',
            email: 'roberto.silva@empresa.com',
            telefono: '+54911555002',
            empresa: 'Tech Solutions',
            cargo: 'CTO',
            source: 'REFERIDO',
            estado: 'ACTIVO',
            etapa: 'Prospecto',
            direccion: 'Av. Santa Fe 5678, CABA',
            tags: ['tecnología', 'interesado'],
            notas: 'Referido por Laura Martínez',
            createdById: emprendedor1.id,
            assignedToId: emprendedor1.id
        },
        {
            nombre: 'Sofia',
            apellido: 'Rodríguez',
            email: 'sofia.rodriguez@startup.io',
            telefono: '+54911555003',
            empresa: 'StartupTech',
            cargo: 'Founder',
            source: 'STAND',
            estado: 'ACTIVO',
            etapa: 'Lead',
            direccion: 'Puerto Madero, CABA',
            tags: ['startup', 'innovación', 'joven'],
            notas: 'Conocida en evento de emprendedores',
            createdById: emprendedor2.id,
            assignedToId: emprendedor2.id
        },
        {
            nombre: 'Diego',
            apellido: 'Fernández',
            email: 'diego.fernandez@consultora.com',
            telefono: '+54911555004',
            empresa: 'Consultora Estratégica',
            cargo: 'Consultor Senior',
            source: 'ANUNCIO',
            estado: 'ACTIVO',
            etapa: 'Prospecto',
            direccion: 'Av. Belgrano 2345, CABA',
            tags: ['consultoría', 'estrategia'],
            notas: 'Llegó por publicidad en LinkedIn',
            createdById: emprendedor2.id,
            assignedToId: emprendedor2.id
        },
        {
            nombre: 'Valentina',
            apellido: 'López',
            email: 'valentina.lopez@pyme.com',
            telefono: '+54911555005',
            empresa: 'PYME Familiar',
            cargo: 'Gerente',
            source: 'CONVENIO',
            estado: 'ACTIVO',
            etapa: 'Cliente',
            direccion: 'Av. Rivadavia 3456, CABA',
            tags: ['pyme', 'familia', 'lealtad'],
            notas: 'Cliente desde convenio con cámara de comercio',
            createdById: distribuidor.id,
            assignedToId: emprendedor1.id
        },
        {
            nombre: 'Maximiliano',
            apellido: 'Ruiz',
            email: 'maxi.ruiz@freelance.com',
            telefono: '+54911555006',
            empresa: null,
            cargo: 'Freelancer',
            source: 'GOOGLE_CONTACTS',
            estado: 'ACTIVO',
            etapa: 'Prospecto',
            direccion: 'Palermo, CABA',
            tags: ['freelance', 'diseño', 'creativo'],
            notas: 'Designer freelancer muy activo',
            createdById: emprendedor2.id,
            assignedToId: emprendedor2.id
        },
        {
            nombre: 'Camila',
            apellido: 'Torres',
            email: 'camila.torres@corporativo.com',
            telefono: '+54911555007',
            empresa: 'Corporativo Internacional',
            cargo: 'VP Marketing',
            source: 'EMBAJADOR',
            estado: 'ACTIVO',
            etapa: 'Cliente VIP',
            direccion: 'Av. del Libertador 7890, CABA',
            tags: ['corporativo', 'internacional', 'vip'],
            notas: 'Cliente corporativo de alto valor',
            createdById: distribuidor.id,
            assignedToId: distribuidor.id
        },
        {
            nombre: 'Sebastián',
            apellido: 'Morales',
            email: 'sebastian.morales@local.com',
            telefono: '+54911555008',
            empresa: 'Negocio Local',
            cargo: 'Propietario',
            source: 'URNA',
            estado: 'INACTIVO',
            etapa: 'Ex Cliente',
            direccion: 'San Telmo, CABA',
            tags: ['local', 'tradicional'],
            notas: 'Cliente que pausó servicios temporalmente',
            createdById: emprendedor1.id,
            assignedToId: emprendedor1.id
        }
    ];

    const clientes = [];
    for (const clienteData of clientesData) {
        const cliente = await prisma.client.create({
            data: clienteData
        });
        clientes.push(cliente);
    }

    console.log(`✅ Creados ${clientes.length} clientes`);

    // Crear items de pipeline
    console.log('🎯 Creando items de pipeline...');

    const pipelineData = [
        {
            name: 'María Elena Vega',
            phone: '+54911666001',
            products: ['Curso Básico', 'Material Starter'],
            value: '1500',
            priority: 'MEDIA',
            status: 'NUEVO',
            lastContact: new Date('2024-01-15T10:00:00Z'),
            notes: 'Primera consulta por WhatsApp',
            tags: ['whatsapp', 'primera-vez'],
            assignedToId: emprendedor1.id
        },
        {
            name: 'Andrés Castillo',
            phone: '+54911666002',
            products: ['Curso Avanzado', 'Coaching Personal'],
            value: '3500',
            priority: 'ALTA',
            status: 'CONTACTADO',
            lastContact: new Date('2024-01-16T14:30:00Z'),
            demoDate: new Date('2024-01-20T16:00:00Z'),
            notes: 'Muy interesado, demo programada',
            tags: ['interesado', 'demo', 'premium'],
            assignedToId: emprendedor1.id,
            clientId: clientes[1].id
        },
        {
            name: 'Lucía Herrera',
            phone: '+54911666003',
            products: ['Pack Completo'],
            value: '5000',
            priority: 'ALTA',
            status: 'CITA_AGENDADA',
            lastContact: new Date('2024-01-17T09:00:00Z'),
            demoDate: new Date('2024-01-22T11:00:00Z'),
            paymentPlan: '12 cuotas sin interés',
            notes: 'Cita confirmada para el lunes',
            tags: ['confirmado', 'pack-completo'],
            assignedToId: emprendedor2.id
        },
        {
            name: 'Fernando Jiménez',
            phone: '+54911666004',
            products: ['Curso Básico'],
            value: '800',
            priority: 'BAJA',
            status: 'SIN_RESPUESTA',
            lastContact: new Date('2024-01-10T15:00:00Z'),
            notes: 'No responde llamadas, intentar por email',
            tags: ['sin-respuesta', 'seguimiento'],
            assignedToId: emprendedor2.id
        },
        {
            name: 'Gabriela Santos',
            phone: '+54911666005',
            products: ['Curso Intermedio', 'Mentorías'],
            value: '2800',
            priority: 'MEDIA',
            status: 'REPROGRAMAR',
            lastContact: new Date('2024-01-18T12:00:00Z'),
            notes: 'Pidió reprogramar por viaje',
            tags: ['reprogramar', 'viaje'],
            assignedToId: emprendedor1.id
        },
        {
            name: 'Patricio Moreno',
            phone: '+54911666006',
            products: ['Workshop'],
            value: '600',
            priority: 'BAJA',
            status: 'NO_VENTA',
            lastContact: new Date('2024-01-12T16:30:00Z'),
            notes: 'No le interesó la propuesta final',
            tags: ['no-venta', 'precio'],
            assignedToId: emprendedor2.id
        },
        {
            name: 'Isabella Cruz',
            phone: '+54911666007',
            products: ['Curso Premium', 'Certificación'],
            value: '4200',
            priority: 'ALTA',
            status: 'VENTA_NUEVA',
            lastContact: new Date('2024-01-19T13:00:00Z'),
            deliveryDate: new Date('2024-01-25T10:00:00Z'),
            paymentPlan: 'Contado con descuento',
            notes: '¡Venta cerrada! Cliente muy satisfecha',
            tags: ['venta-cerrada', 'premium', 'satisfecha'],
            assignedToId: emprendedor1.id,
            clientId: clientes[2].id
        },
        {
            name: 'Tomás Aguirre',
            phone: '+54911666008',
            products: ['Curso Básico'],
            value: '1200',
            priority: 'MEDIA',
            status: 'VENTA_AGREGADO',
            lastContact: new Date('2024-01-20T11:00:00Z'),
            deliveryDate: new Date('2024-01-28T14:00:00Z'),
            notes: 'Cliente existente que agregó nuevo curso',
            tags: ['cliente-existente', 'agregado'],
            assignedToId: emprendedor2.id,
            clientId: clientes[0].id
        }
    ];

    const pipelineItems = [];
    for (const pipelineItemData of pipelineData) {
        const item = await prisma.pipelineItem.create({
            data: pipelineItemData
        });
        pipelineItems.push(item);
    }

    console.log(`✅ Creados ${pipelineItems.length} items de pipeline`);

    // Resumen final
    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`   👥 Usuarios: ${5}`);
    console.log(`   👤 Clientes: ${clientes.length}`);
    console.log(`   🎯 Pipeline Items: ${pipelineItems.length}`);

    console.log('\n🔐 Credenciales de acceso:');
    console.log('   📧 Super Admin: admin@crm.com / admin123');
    console.log('   📧 Distribuidor: distribuidor@crm.com / admin123');
    console.log('   📧 Emprendedor 1: emprendedor1@crm.com / admin123');
    console.log('   📧 Emprendedor 2: emprendedor2@crm.com / admin123');
    console.log('   📧 Asistente: asistente@crm.com / admin123');

    console.log('\n🚀 La base de datos está lista para usar!');
    console.log('   Puedes hacer login con cualquiera de las credenciales arriba');
    console.log('   y explorar los diferentes módulos del CRM.\n');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
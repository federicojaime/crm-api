const ExcelJS = require('exceljs');

// Generar template de Excel para importar clientes
const generateClientImportTemplate = async (res) => {
    try {
        const workbook = new ExcelJS.Workbook();

        // Worksheet principal con template
        const worksheet = workbook.addWorksheet('Clientes - Template');

        // Definir columnas con ejemplos
        worksheet.columns = [
            { header: 'Nombre *', key: 'nombre', width: 20 },
            { header: 'Apellido *', key: 'apellido', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Teléfono *', key: 'telefono', width: 15 },
            { header: 'Empresa', key: 'empresa', width: 25 },
            { header: 'Cargo', key: 'cargo', width: 20 },
            { header: 'Fuente', key: 'source', width: 15 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Etapa', key: 'etapa', width: 15 },
            { header: 'Dirección', key: 'direccion', width: 30 },
            { header: 'Tags (separados por comas)', key: 'tags', width: 25 }
        ];

        // Estilo de encabezados
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).alignment = { horizontal: 'center' };

        // Agregar filas de ejemplo
        const ejemplos = [
            {
                nombre: 'Juan',
                apellido: 'Pérez',
                email: 'juan.perez@email.com',
                telefono: '+5491123456789',
                empresa: 'Empresa ABC',
                cargo: 'Gerente',
                source: 'REFERIDO',
                estado: 'ACTIVO',
                etapa: 'Prospecto',
                direccion: 'Av. Corrientes 1234, CABA',
                tags: 'premium, interesado'
            },
            {
                nombre: 'María',
                apellido: 'González',
                email: 'maria.gonzalez@email.com',
                telefono: '+5491987654321',
                empresa: 'Tech Solutions',
                cargo: 'Desarrolladora',
                source: 'LANDING',
                estado: 'ACTIVO',
                etapa: 'Lead',
                direccion: 'Av. Santa Fe 5678, CABA',
                tags: 'tecnología, emprendedora'
            }
        ];

        ejemplos.forEach(ejemplo => {
            worksheet.addRow(ejemplo);
        });

        // Colorear filas de ejemplo
        worksheet.getRow(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F3FF' }
        };
        worksheet.getRow(3).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F3FF' }
        };

        // Worksheet con instrucciones
        const instructionsSheet = workbook.addWorksheet('Instrucciones');

        instructionsSheet.columns = [
            { header: 'Instrucciones para Importar Clientes', key: 'instruction', width: 80 }
        ];

        const instructions = [
            '',
            '📋 INSTRUCCIONES PARA IMPORTAR CLIENTES',
            '',
            '1. CAMPOS OBLIGATORIOS (marcados con *):',
            '   • Nombre: Nombre del cliente',
            '   • Apellido: Apellido del cliente',
            '   • Teléfono: Número de teléfono (con código de país)',
            '',
            '2. CAMPOS OPCIONALES:',
            '   • Email: Dirección de correo electrónico',
            '   • Empresa: Nombre de la empresa',
            '   • Cargo: Posición en la empresa',
            '   • Fuente: Origen del cliente',
            '   • Estado: Estado del cliente (ACTIVO/INACTIVO)',
            '   • Etapa: Etapa en el proceso (Prospecto/Lead/Cliente)',
            '   • Dirección: Dirección física',
            '   • Tags: Etiquetas separadas por comas',
            '',
            '3. VALORES VÁLIDOS PARA FUENTE:',
            '   • LANDING - Página de aterrizaje',
            '   • REFERIDO - Cliente referido',
            '   • DERIVADO - Cliente derivado',
            '   • STAND - Evento o stand',
            '   • CONVENIO - Convenio empresarial',
            '   • URNA - Urna de contactos',
            '   • EMBAJADOR - Programa de embajadores',
            '   • ANUNCIO - Publicidad/anuncios',
            '   • GOOGLE_CONTACTS - Google Contacts',
            '   • OTRO - Otros medios',
            '',
            '4. VALORES VÁLIDOS PARA ESTADO:',
            '   • ACTIVO - Cliente activo',
            '   • INACTIVO - Cliente inactivo',
            '',
            '5. FORMATO DE TELÉFONO:',
            '   • Incluir código de país: +54911234567',
            '   • Sin espacios ni guiones',
            '',
            '6. FORMATO DE EMAIL:',
            '   • Debe ser una dirección válida: usuario@dominio.com',
            '',
            '7. TAGS:',
            '   • Separar múltiples tags con comas',
            '   • Ejemplo: premium, interesado, urgente',
            '',
            '8. PROCESO DE IMPORTACIÓN:',
            '   • Eliminar estas filas de instrucciones',
            '   • Mantener solo los encabezados y datos',
            '   • Guardar como archivo Excel (.xlsx)',
            '   • Subir a través del endpoint /api/clients/import',
            '',
            '9. VALIDACIONES:',
            '   • Se verificarán duplicados por teléfono y email',
            '   • Los campos obligatorios no pueden estar vacíos',
            '   • Se validará el formato de email y teléfono',
            '',
            '10. ERRORES COMUNES:',
            '    • Teléfono sin código de país',
            '    • Email con formato inválido',
            '    • Campos obligatorios vacíos',
            '    • Fuente con valor no permitido',
            '',
            '⚠️  IMPORTANTE:',
            '• Revisa los datos antes de importar',
            '• Los duplicados serán reportados pero no importados',
            '• Máximo 1000 registros por importación',
            '',
            '✅ EJEMPLO DE FILA VÁLIDA:',
            'Juan | Pérez | juan@email.com | +5491123456789 | ABC Corp | Gerente | REFERIDO | ACTIVO | Cliente | Av. Corrientes 123 | premium, vip'
        ];

        instructions.forEach((instruction, index) => {
            const row = instructionsSheet.addRow({ instruction });

            // Estilo para títulos
            if (instruction.includes('📋') || instruction.includes('✅') || instruction.includes('⚠️')) {
                row.font = { bold: true, size: 14 };
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFEB3B' }
                };
            }
            // Estilo para secciones numeradas
            else if (/^\d+\./.test(instruction)) {
                row.font = { bold: true, color: { argb: 'FF1976D2' } };
            }
            // Estilo para bullets
            else if (instruction.includes('•')) {
                row.font = { color: { argb: 'FF424242' } };
                row.alignment = { indent: 1 };
            }
        });

        // Worksheet con valores permitidos
        const valuesSheet = workbook.addWorksheet('Valores Permitidos');

        // Fuentes
        valuesSheet.getCell('A1').value = 'FUENTES VÁLIDAS';
        valuesSheet.getCell('A1').font = { bold: true };
        valuesSheet.getCell('A1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4CAF50' }
        };

        const sources = ['LANDING', 'REFERIDO', 'DERIVADO', 'STAND', 'CONVENIO', 'URNA', 'EMBAJADOR', 'ANUNCIO', 'GOOGLE_CONTACTS', 'OTRO'];
        sources.forEach((source, index) => {
            valuesSheet.getCell(`A${index + 2}`).value = source;
        });

        // Estados
        valuesSheet.getCell('C1').value = 'ESTADOS VÁLIDOS';
        valuesSheet.getCell('C1').font = { bold: true };
        valuesSheet.getCell('C1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2196F3' }
        };

        const estados = ['ACTIVO', 'INACTIVO'];
        estados.forEach((estado, index) => {
            valuesSheet.getCell(`C${index + 2}`).value = estado;
        });

        // Ejemplos de etapas
        valuesSheet.getCell('E1').value = 'EJEMPLOS DE ETAPAS';
        valuesSheet.getCell('E1').font = { bold: true };
        valuesSheet.getCell('E1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF9800' }
        };

        const etapas = ['Prospecto', 'Lead', 'Cliente', 'Cliente VIP', 'Ex Cliente', 'Seguimiento'];
        etapas.forEach((etapa, index) => {
            valuesSheet.getCell(`E${index + 2}`).value = etapa;
        });

        // Ajustar ancho de columnas
        valuesSheet.getColumn('A').width = 20;
        valuesSheet.getColumn('C').width = 20;
        valuesSheet.getColumn('E').width = 20;

        // Configurar respuesta
        const fileName = `template_importar_clientes_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generando template:', error);
        throw error;
    }
};

module.exports = {
    generateClientImportTemplate
};
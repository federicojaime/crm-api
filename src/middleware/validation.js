const { body, validationResult } = require('express-validator');

// Reglas de validación
const validationRules = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener mínimo 6 caracteres'),
    body('firstname')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .trim(),
    body('lastname')
      .notEmpty()
      .withMessage('El apellido es requerido')
      .trim(),
    body('rol')
      .optional()
      .isIn(['SUPER_ADMIN', 'DISTRIBUIDOR', 'EMPRENDEDOR', 'ASISTENTE'])
      .withMessage('Rol inválido'),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Número de teléfono inválido')
  ],
  
  login: [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida')
  ],
  
  updateUser: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('firstname')
      .optional()
      .notEmpty()
      .withMessage('El nombre no puede estar vacío')
      .trim(),
    body('lastname')
      .optional()
      .notEmpty()
      .withMessage('El apellido no puede estar vacío')
      .trim(),
    body('rol')
      .optional()
      .isIn(['SUPER_ADMIN', 'DISTRIBUIDOR', 'EMPRENDEDOR', 'ASISTENTE'])
      .withMessage('Rol inválido'),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Número de teléfono inválido')
  ],
  
  pipelineItem: [
    body('clientId')
      .notEmpty()
      .withMessage('El ID del cliente es requerido')
      .isString()
      .withMessage('El ID del cliente debe ser una cadena válida'),
    body('products')
      .notEmpty()
      .withMessage('Los productos son requeridos')
      .isArray()
      .withMessage('Los productos deben ser un array'),
    body('products.*')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Cada producto debe tener entre 1 y 100 caracteres'),
    body('value')
      .optional({ nullable: true })
      .isString()
      .trim()
      .isLength({ max: 20 })
      .withMessage('El valor no puede exceder 20 caracteres'),
    body('priority')
      .optional()
      .isIn(['ALTA', 'MEDIA', 'BAJA'])
      .withMessage('Prioridad inválida'),
    body('status')
      .optional()
      .isIn([
        'NUEVO', 'CONTACTADO', 'CITA_AGENDADA', 'SIN_RESPUESTA',
        'REPROGRAMAR', 'NO_VENTA', 'IRRELEVANTE', 'NO_QUIERE_SPV',
        'NO_QUIERE_DEMO', 'VENTA_AGREGADO', 'VENTA_NUEVA', 'VENTA_CAIDA'
      ])
      .withMessage('Estado inválido'),
    body('lastContact')
      .notEmpty()
      .withMessage('La fecha del último contacto es requerida')
      .isISO8601()
      .withMessage('La fecha del último contacto debe tener un formato válido'),
    body('demoDate')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('La fecha de demo debe tener un formato válido'),
    body('deliveryDate')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('La fecha de entrega debe tener un formato válido'),
    body('paymentPlan')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 200 })
      .withMessage('El plan de pago no puede exceder 200 caracteres'),
    body('notes')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Las notas no pueden exceder 1000 caracteres'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Las etiquetas deben ser un array'),
    body('tags.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Cada etiqueta debe tener entre 1 y 20 caracteres'),
    body('assignedToId')
      .optional({ nullable: true })
      .isString()
      .withMessage('El ID del usuario asignado debe ser una cadena válida')
  ],

  client: [
    body('nombre')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    body('apellido')
      .notEmpty()
      .withMessage('El apellido es requerido')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
    body('email')
      .optional({ nullable: true })
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('telefono')
      .notEmpty()
      .withMessage('El teléfono es requerido')
      .isMobilePhone('any')
      .withMessage('Número de teléfono inválido'),
    body('empresa')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('El nombre de la empresa no puede exceder 100 caracteres'),
    body('cargo')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage('El cargo no puede exceder 50 caracteres'),
    body('direccion')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 200 })
      .withMessage('La dirección no puede exceder 200 caracteres'),
    body('source')
      .optional()
      .isIn(['LANDING', 'REFERIDO', 'DERIVADO', 'STAND', 'CONVENIO', 'URNA', 'EMBAJADOR', 'ANUNCIO', 'GOOGLE_CONTACTS', 'OTRO'])
      .withMessage('Fuente inválida'),
    body('estado')
      .optional()
      .isIn(['ACTIVO', 'INACTIVO'])
      .withMessage('Estado inválido'),
    body('etapa')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 30 })
      .withMessage('La etapa no puede exceder 30 caracteres'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Las etiquetas deben ser un array'),
    body('tags.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Cada etiqueta debe tener entre 1 y 20 caracteres'),
    body('notas')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Las notas no pueden exceder 1000 caracteres'),
    body('customFields')
      .optional({ nullable: true })
      .isObject()
      .withMessage('Los campos personalizados deben ser un objeto')
  ],

  sale: [
    body('fecha')
      .notEmpty()
      .withMessage('La fecha es requerida')
      .isISO8601()
      .withMessage('La fecha debe tener un formato válido'),
    body('clienteNombre')
      .notEmpty()
      .withMessage('El nombre del cliente es requerido')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre del cliente debe tener entre 2 y 100 caracteres'),
    body('productos')
      .notEmpty()
      .withMessage('Los productos son requeridos')
      .isObject()
      .withMessage('Los productos deben ser un objeto'),
    body('precioLista')
      .notEmpty()
      .withMessage('El precio de lista es requerido')
      .isFloat({ min: 0 })
      .withMessage('El precio de lista debe ser un número positivo'),
    body('modalidadPago')
      .optional()
      .isIn(['CONTADO', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'FINANCIADO'])
      .withMessage('Modalidad de pago inválida'),
    body('cuotas')
      .optional({ nullable: true })
      .trim(),
    body('valorCuota')
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage('El valor de la cuota debe ser un número positivo'),
    body('anticipoAcordado')
      .notEmpty()
      .withMessage('El anticipo acordado es requerido')
      .isFloat({ min: 0 })
      .withMessage('El anticipo acordado debe ser un número positivo'),
    body('fechaCobroTotal')
      .notEmpty()
      .withMessage('La fecha de cobro total es requerida')
      .isISO8601()
      .withMessage('La fecha de cobro total debe tener un formato válido'),
    body('regaloVenta')
      .optional()
      .isBoolean()
      .withMessage('Regalo de venta debe ser verdadero o falso'),
    body('detalleRegalo')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 200 })
      .withMessage('El detalle del regalo no puede exceder 200 caracteres'),
    body('observaciones')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Las observaciones no pueden exceder 500 caracteres'),
    body('requiereFactura')
      .optional()
      .isBoolean()
      .withMessage('Requiere factura debe ser verdadero o falso'),
    body('datosFactura')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 300 })
      .withMessage('Los datos de factura no pueden exceder 300 caracteres'),
    body('origen')
      .optional()
      .isIn(['REFERIDO', 'BASE', 'EXHIBICION', 'DIGITAL', 'STAND', 'CONVENIO', 'URNA', 'EMBAJADOR', 'ANUNCIO', 'OTRO'])
      .withMessage('Origen inválido'),
    body('referido')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('El referido no puede exceder 100 caracteres'),
    body('esAgregado')
      .optional()
      .isBoolean()
      .withMessage('Es agregado debe ser verdadero o falso')
  ],

  task: [
    body('title')
      .notEmpty()
      .withMessage('El título es requerido')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('El título debe tener entre 3 y 100 caracteres'),
    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('La descripción no puede exceder 500 caracteres'),
    body('type')
      .optional()
      .isIn(['LLAMADA', 'EMAIL', 'REUNION', 'SEGUIMIENTO', 'DOCUMENTO'])
      .withMessage('Tipo de tarea inválido'),
    body('status')
      .optional()
      .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .withMessage('Estado de tarea inválido'),
    body('priority')
      .optional()
      .isIn(['ALTA', 'MEDIA', 'BAJA'])
      .withMessage('Prioridad inválida'),
    body('dueDate')
      .notEmpty()
      .withMessage('La fecha de vencimiento es requerida')
      .isISO8601()
      .withMessage('La fecha de vencimiento debe tener un formato válido'),
    body('reminderEnabled')
      .optional()
      .isBoolean()
      .withMessage('Recordatorio habilitado debe ser verdadero o falso'),
    body('reminderTime')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 10 })
      .withMessage('El tiempo de recordatorio no puede exceder 10 caracteres'),
    body('assignedToId')
      .notEmpty()
      .withMessage('El usuario asignado es requerido')
      .isString()
      .withMessage('El ID del usuario asignado debe ser una cadena válida')
  ],

  hrCandidate: [
    body('nombre')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    body('apellido')
      .notEmpty()
      .withMessage('El apellido es requerido')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
    body('email')
      .notEmpty()
      .withMessage('El email es requerido')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('telefono')
      .notEmpty()
      .withMessage('El teléfono es requerido')
      .isMobilePhone('any')
      .withMessage('Número de teléfono inválido'),
    body('puesto')
      .notEmpty()
      .withMessage('El puesto es requerido')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('El puesto debe tener entre 2 y 50 caracteres'),
    body('fuente')
      .notEmpty()
      .withMessage('La fuente es requerida')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('La fuente debe tener entre 2 y 50 caracteres'),
    body('estado')
      .optional()
      .isIn(['PENDIENTE', 'CONTACTADO', 'ENTREVISTA', 'SELECCIONADO', 'RECHAZADO'])
      .withMessage('Estado inválido'),
    body('fechaContacto')
      .notEmpty()
      .withMessage('La fecha de contacto es requerida')
      .isISO8601()
      .withMessage('La fecha de contacto debe tener un formato válido'),
    body('notas')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Las notas no pueden exceder 500 caracteres'),
    body('skills')
      .optional()
      .isArray()
      .withMessage('Las habilidades deben ser un array'),
    body('skills.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Cada habilidad debe tener entre 1 y 30 caracteres')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('La contraseña actual es requerida'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('La nueva contraseña debe tener mínimo 6 caracteres')
  ]
};

// Función de validación
const validate = (ruleName) => {
  if (!validationRules[ruleName]) {
    throw new Error(`Regla de validación '${ruleName}' no encontrada`);
  }

  return [
    // Aplicar las reglas de validación
    ...validationRules[ruleName],
    
    // Middleware para verificar errores
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
          }))
        });
      }
      
      next();
    }
  ];
};

module.exports = {
  validate,
  validationRules
};
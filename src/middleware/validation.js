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
    body('name')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .trim(),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Número de teléfono inválido'),
    body('status')
      .optional()
      .isIn([
        'NUEVO', 'CONTACTADO', 'CITA_AGENDADA', 'SIN_RESPUESTA',
        'REPROGRAMAR', 'NO_VENTA', 'IRRELEVANTE', 'NO_QUIERE_SPV',
        'NO_QUIERE_DEMO', 'VENTA_AGREGADO', 'VENTA_NUEVA', 'VENTA_CAIDA'
      ])
      .withMessage('Estado inválido'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Prioridad inválida'),
    body('products')
      .optional()
      .isArray()
      .withMessage('Los productos deben ser un array'),
    body('notes')
      .optional()
      .trim()
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
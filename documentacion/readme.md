# 🚀 CRM API - Sistema Completo

API REST completa para sistema CRM (Customer Relationship Management) construida con Node.js, Express, Prisma y PostgreSQL.

## 📋 Características Principales

### ✅ Módulos Implementados
- 🔐 **Autenticación JWT** - Login, registro, perfiles
- 👥 **Gestión de Usuarios** - CRUD completo con roles
- 👤 **Gestión de Clientes** - CRUD con importación/exportación Excel
- 🎯 **Pipeline de Ventas** - Sistema Kanban con drag & drop
- 📊 **Estadísticas y Reportes** - Dashboard con métricas

### 🔧 Funcionalidades Avanzadas
- 📤 **Importación/Exportación Excel** - Carga masiva de clientes
- 🔍 **Búsqueda Avanzada** - Filtros múltiples y búsqueda de texto
- 📈 **Sistema de Estadísticas** - Métricas en tiempo real
- 🎭 **Roles y Permisos** - Sistema de autorización granular
- 🔄 **Operaciones Masivas** - Actualización de múltiples registros
- 📱 **Rate Limiting** - Protección contra ataques
- 🛡️ **Validaciones Robustas** - Validación de datos de entrada

## 🏗️ Arquitectura

```
src/
├── controllers/     # Lógica de negocio
├── routes/         # Definición de rutas
├── middleware/     # Middleware de autenticación y validación
├── utils/         # Utilidades (Excel, helpers)
prisma/            # Esquema de base de datos
documentacion/     # Colección de Postman
```

## 🚦 Instalación y Configuración

### 1. Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### 2. Clonar e Instalar
```bash
git clone <repository-url>
cd crm-api
npm install
```

### 3. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Editar `.env`:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/crm_db"
JWT_SECRET="tu_jwt_secret_super_seguro_2024"
PORT=3000
NODE_ENV=development
```

### 4. Configurar Base de Datos
```bash
# Generar cliente Prisma
npm run db:generate

# Sincronizar esquema
npm run db:push

# Poblar con datos de ejemplo
npm run db:seed
```

### 5. Iniciar Servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 👥 Roles y Permisos

### SUPER_ADMIN
- ✅ Acceso completo a todo el sistema
- ✅ Gestión de usuarios (crear, editar, eliminar)
- ✅ Operaciones masivas
- ✅ Estadísticas globales

### DISTRIBUIDOR
- ✅ Gestión de usuarios emprendedores
- ✅ Acceso a clientes y pipeline
- ✅ Operaciones masivas
- ✅ Estadísticas de su red

### EMPRENDEDOR
- ✅ Gestión de sus clientes
- ✅ Pipeline personal
- ✅ Estadísticas propias
- ❌ No puede gestionar otros usuarios

### ASISTENTE
- ✅ Acceso limitado según subRol
- ✅ Soporte operativo
- ❌ Permisos limitados

## 📚 API Endpoints

### 🔐 Autenticación
```
POST   /api/auth/register      # Registrar usuario
POST   /api/auth/login         # Iniciar sesión
GET    /api/auth/profile       # Obtener perfil
PUT    /api/auth/profile       # Actualizar perfil
PUT    /api/auth/change-password # Cambiar contraseña
GET    /api/auth/verify        # Verificar token
POST   /api/auth/logout        # Cerrar sesión
```

### 👥 Usuarios
```
GET    /api/users              # Listar usuarios
GET    /api/users/stats        # Estadísticas de usuarios
GET    /api/users/:id          # Obtener usuario por ID
POST   /api/users              # Crear usuario
PUT    /api/users/:id          # Actualizar usuario
PUT    /api/users/:id/password # Cambiar contraseña
PUT    /api/users/:id/activate # Activar usuario
PUT    /api/users/:id/deactivate # Desactivar usuario
DELETE /api/users/:id          # Eliminar usuario
```

### 👤 Clientes
```
GET    /api/clients            # Listar clientes
GET    /api/clients/stats      # Estadísticas de clientes
GET    /api/clients/search     # Buscar clientes
GET    /api/clients/export     # Exportar a Excel
GET    /api/clients/import-template # Descargar template
POST   /api/clients            # Crear cliente
POST   /api/clients/import     # Importar desde Excel
POST   /api/clients/bulk-update # Actualización masiva
GET    /api/clients/:id        # Obtener cliente por ID
PUT    /api/clients/:id        # Actualizar cliente
POST   /api/clients/:id/duplicate # Duplicar cliente
DELETE /api/clients/:id        # Eliminar cliente
```

### 🎯 Pipeline
```
GET    /api/pipeline           # Listar items
GET    /api/pipeline/kanban    # Vista Kanban
GET    /api/pipeline/stats     # Estadísticas
GET    /api/pipeline/search    # Buscar items
POST   /api/pipeline           # Crear item
POST   /api/pipeline/bulk-update # Actualización masiva
GET    /api/pipeline/:id       # Obtener item por ID
PUT    /api/pipeline/:id       # Actualizar item
PATCH  /api/pipeline/:id/status # Cambiar estado
POST   /api/pipeline/:id/duplicate # Duplicar item
DELETE /api/pipeline/:id       # Eliminar item
```

## 📊 Importación/Exportación Excel

### 📤 Exportar Clientes
```bash
GET /api/clients/export?format=xlsx&source=REFERIDO&estado=ACTIVO
```

### 📥 Importar Clientes
1. **Descargar Template**:
   ```bash
   GET /api/clients/import-template
   ```

2. **Completar Excel** con los datos requeridos:
   - Nombre* (obligatorio)
   - Apellido* (obligatorio)  
   - Teléfono* (obligatorio)
   - Email, Empresa, Cargo, etc. (opcional)

3. **Subir Archivo**:
   ```bash
   POST /api/clients/import
   Content-Type: multipart/form-data
   Body: file=clientes.xlsx
   ```

### 📋 Formatos Válidos
- **Fuentes**: LANDING, REFERIDO, DERIVADO, STAND, CONVENIO, URNA, EMBAJADOR, ANUNCIO, GOOGLE_CONTACTS, OTRO
- **Estados**: ACTIVO, INACTIVO
- **Teléfono**: +54911234567 (con código de país)
- **Tags**: separados por comas

## 🧪 Testing con Postman

### 1. Importar Colección
- Importar `documentacion/coleccion_postman.json`
- Configurar environment con `base_url=http://localhost:3000`

### 2. Flujo de Prueba Automático
```bash
# Ejecutar la carpeta "🧪 Tests Clientes"
# Incluye login automático y tests completos
```

### 3. Variables de Environment
```json
{
  "base_url": "http://localhost:3000",
  "auth_token": "",
  "user_id": "",
  "client_id": "",
  "pipeline_item_id": ""
}
```

## 📈 Datos de Ejemplo

Después del seed, tendrás:
- **5 usuarios** con diferentes roles
- **8 clientes** con datos realistas
- **8 items de pipeline** en diferentes estados

### 🔐 Credenciales de Prueba
```
Super Admin:    admin@crm.com / admin123
Distribuidor:   distribuidor@crm.com / admin123
Emprendedor 1:  emprendedor1@crm.com / admin123
Emprendedor 2:  emprendedor2@crm.com / admin123
Asistente:      asistente@crm.com / admin123
```

## 🔒 Seguridad

- **JWT Authentication** con expiración configurable
- **Rate Limiting** configurable por environment
- **Validación robusta** con express-validator
- **Hashing de contraseñas** con bcryptjs
- **Middleware de autorización** por roles
- **Headers de seguridad** con helmet
- **Validación de archivos** en uploads

## 📊 Estadísticas Disponibles

### Usuarios
- Total de usuarios por rol
- Usuarios activos/inactivos
- Distribución por fechas

### Clientes  
- Total por estado/etapa/fuente
- Clientes por usuario asignado
- Tendencias temporales
- Clientes recientes

### Pipeline
- Items por estado/prioridad
- Tasa de conversión
- Performance por usuario
- Valor total del pipeline

## 🚀 Próximos Módulos (TODO)

- 💰 **Ventas** - Registro y seguimiento de ventas
- 📋 **Tareas** - Sistema de tareas y recordatorios
- 👨‍💼 **RRHH** - Gestión de candidatos
- 📧 **Notificaciones** - Email y WhatsApp
- 📅 **Calendario** - Integración con Google Calendar
- 📱 **App Móvil** - React Native

## 🛠️ Scripts Disponibles

```bash
npm start           # Iniciar servidor
npm run dev         # Desarrollo con nodemon
npm run db:generate # Generar cliente Prisma
npm run db:push     # Sincronizar esquema
npm run db:migrate  # Crear migración
npm run db:studio   # Abrir Prisma Studio
npm run db:seed     # Poblar base de datos
```

## 🐛 Troubleshooting

### Error de Conexión a DB
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo service postgresql start

# Verificar URL de conexión en .env
DATABASE_URL="postgresql://usuario:password@localhost:5432/crm_db"
```

### Error de Permisos
```bash
# Verificar que el token esté en el header
Authorization: Bearer <tu-token>

# Verificar que el usuario tenga el rol correcto
```

### Error de Validación
```bash
# Revisar el formato de los datos enviados
# Consultar la documentación de validaciones en validation.js
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

MIT License - ver archivo `LICENSE` para detalles.

## 📞 Soporte

Para soporte técnico:
- 📧 Email: soporte@crm.com
- 📱 WhatsApp: +54911234567
- 💬 Slack: #crm-support

---

**¡El sistema CRM está listo para usar! 🎉**

Puedes iniciar haciendo login con cualquiera de las credenciales de prueba y explorando todos los módulos disponibles.
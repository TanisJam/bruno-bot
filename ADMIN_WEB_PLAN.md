# Plan de Desarrollo - Interfaz Web de Administración

## 📋 Overview

Documento de planificación para el desarrollo de una interfaz web de administración para Bruno Bot, utilizando una arquitectura de microservicios con procesos separados y base de datos compartida.

## 🏗️ Arquitectura General

### Servicios Separados
```
bruno-bot/
├── src/                    # Bot Discord (existente)
├── admin-web/              # Panel web de administración (nuevo)
│   ├── src/
│   │   ├── server.ts       # Servidor Express
│   │   ├── routes/         # Rutas API y vistas
│   │   ├── middleware/     # Middleware de autenticación
│   │   ├── views/          # Plantillas EJS
│   │   ├── public/         # Assets estáticos
│   │   └── services/       # Servicios de negocio
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yaml     # Configuración de ambos servicios
└── data/                   # Base de datos SQLite compartida
```

### Stack Tecnológico
- **Backend**: Express.js + TypeScript
- **Frontend**: EJS + Tailwind CSS
- **Base de datos**: SQLite (compartida via volume)
- **Autenticación**: JWT tokens
- **Deployment**: Docker Compose
- **Orquestación**: Servicios independientes

## 🎯 Objetivos del Proyecto

### Funcionalidades Principales
- [ ] **Dashboard**: Métricas en tiempo real del bot
- [ ] **Guild Management**: Administración de servidores Discord
- [ ] **Reminder System**: CRUD completo de recordatorios
- [ ] **Shop Admin**: Gestión de catálogo e inventario
- [ ] **Weather Control**: Configuración de clima
- [ ] **Settings**: Configuración global del bot

### Características Técnicas
- [ ] **API RESTful**: Endpoints para todas las operaciones
- [ ] **Autenticación segura**: JWT con API key
- [ ] **UI Responsiva**: Tailwind CSS mobile-first
- [ ] **Real-time updates**: WebSocket para métricas
- [ ] **Logging integrado**: Compartido con bot principal

## 📦 Estructura del Proyecto Admin-Web

### Directorios y Archivos
```
admin-web/
├── src/
│   ├── server.ts                    # Punto de entrada del servidor
│   ├── config/
│   │   ├── database.ts              # Configuración de base de datos
│   │   ├── auth.ts                  # Configuración de JWT
│   │   └── index.ts                 # Exportación de configuraciones
│   ├── routes/
│   │   ├── index.ts                 # Router principal
│   │   ├── auth.ts                  # Rutas de autenticación
│   │   ├── api.ts                   # API RESTful
│   │   └── admin.ts                 # Vistas de administración
│   ├── middleware/
│   │   ├── auth.ts                  # Middleware de autenticación
│   │   ├── logger.ts                # Middleware de logging
│   │   └── validation.ts            # Middleware de validación
│   ├── services/
│   │   ├── database.service.ts      # Servicio de base de datos
│   │   ├── guild.service.ts         # Servicio de guilds
│   │   ├── reminder.service.ts      # Servicio de recordatorios
│   │   ├── shop.service.ts          # Servicio de tienda
│   │   └── weather.service.ts       # Servicio de clima
│   ├── views/
│   │   ├── layout.ejs               # Plantilla base
│   │   ├── partials/
│   │   │   ├── header.ejs           # Header común
│   │   │   ├── sidebar.ejs          # Navegación lateral
│   │   │   └── footer.ejs           # Footer común
│   │   ├── auth/
│   │   │   └── login.ejs            # Formulario de login
│   │   ├── dashboard/
│   │   │   └── index.ejs            # Dashboard principal
│   │   ├── guilds/
│   │   │   ├── index.ejs            # Lista de guilds
│   │   │   └── detail.ejs           # Detalle de guild
│   │   ├── reminders/
│   │   │   ├── index.ejs            # Lista de recordatorios
│   │   │   ├── create.ejs           # Crear recordatorio
│   │   │   └── edit.ejs             # Editar recordatorio
│   │   ├── shop/
│   │   │   ├── catalog.ejs          # Catálogo de items
│   │   │   ├── inventory.ejs        # Inventario actual
│   │   │   └── transactions.ejs     # Historial de transacciones
│   │   ├── weather/
│   │   │   ├── conditions.ejs       # Condiciones climáticas
│   │   │   └── history.ejs          # Historial de clima
│   │   └── settings/
│   │       └── index.ejs            # Configuración global
│   ├── public/
│   │   ├── css/
│   │   │   └── main.css             # CSS compilado de Tailwind
│   │   ├── js/
│   │   │   ├── main.js              # JavaScript principal
│   │   │   ├── dashboard.js         # Lógica del dashboard
│   │   │   └── api.js               # Cliente API
│   │   └── assets/
│   │       └── images/              # Imágenes estáticas
│   └── types/
│       ├── express.d.ts             # Tipos de Express
│       ├── api.types.ts             # Tipos de API
│       └── database.types.ts        # Tipos de base de datos
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── Dockerfile
├── .env.example
└── README.md
```

## 🔧 Configuración Docker Compose

### docker-compose.yaml (Actualizado)
```yaml
version: '3.8'

services:
  # Bot Discord (existente)
  bruno-bot:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - CLIENT_ID=${CLIENT_ID}
      - TOKEN=${TOKEN}
      - GUILD_ID=${GUILD_ID}
      - DB_PATH=/app/data/bruno-bot.db
      - TIMEZONE=${TIMEZONE:-America/Argentina/Buenos_Aires}
    volumes:
      - bruno-bot-data:/app/data
    restart: unless-stopped
    depends_on:
      - admin-web

  # Panel web de administración (nuevo)
  admin-web:
    build:
      context: ./admin-web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_PATH=/app/data/bruno-bot.db
      - ADMIN_API_KEY=${ADMIN_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - bruno-bot-data:/app/data
    restart: unless-stopped

volumes:
  bruno-bot-data:
```

### Variables de Entorno (.env.example - Actualizado)
```env
# Discord Bot Configuration
CLIENT_ID=your_discord_client_id_here
TOKEN=your_discord_bot_token_here
GUILD_ID=your_discord_guild_id_here

# Admin Web Configuration
ADMIN_API_KEY=your_admin_api_key_here
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Environment
NODE_ENV=development
TIMEZONE=America/Argentina/Buenos_Aires

# Database (shared between services)
DB_PATH=./data/bruno-bot.db
```

## 🚀 Plan de Implementación

### Fase 1: Fundación (Week 1)
- [ ] **Crear estructura del proyecto admin-web**
- [ ] **Configurar Express + TypeScript**
- [ ] **Implementar Tailwind CSS**
- [ ] **Configurar base de datos compartida**
- [ ] **Crear Dockerfile para admin-web**
- [ ] **Actualizar docker-compose.yaml**

### Fase 2: Autenticación y API (Week 2)
- [ ] **Implementar sistema de autenticación JWT**
- [ ] **Crear middleware de autenticación**
- [ ] **Implementar API RESTful básica**
- [ ] **Crear servicios de base de datos**
- [ ] **Configurar logging integrado**

### Fase 3: Vistas Principales (Week 3)
- [ ] **Crear layout base con Tailwind**
- [ ] **Implementar dashboard principal**
- [ ] **Crear vistas de guild management**
- [ ] **Implementar navegación y sidebar**
- [ ] **Agregar componentes reutilizables**

### Fase 4: Funcionalidades Específicas (Week 4)
- [ ] **Implementar gestión de recordatorios**
- [ ] **Crear administración de tienda**
- [ ] **Implementar control de clima**
- [ ] **Agregar configuración global**
- [ ] **Implementar validaciones y errores**

### Fase 5: Mejoras y Despliegue (Week 5)
- [ ] **Optimizar rendimiento**
- [ ] **Agregar tests unitarios**
- [ ] **Implementar real-time updates**
- [ ] **Configurar producción**
- [ ] **Documentación final**

## 🔐 Consideraciones de Seguridad

### Autenticación
- **JWT tokens** con expiración configurable
- **API key** para acceso administrativo
- **Session management** con cookies seguras
- **Rate limiting** para prevenir ataques

### Base de Datos
- **Read-only mode** para operaciones sensibles
- **Connection pooling** para eficiencia
- **Backup automático** configurado
- **Migration system** para actualizaciones

### Red
- **CORS configurado** para dominios específicos
- **HTTPS obligatorio** en producción
- **Headers de seguridad** (Helmet.js)
- **Input sanitization** para prevenir XSS

## 📈 Métricas y Monitoreo

### Dashboard Principal
- **Guilds activas**: Número de servidores conectados
- **Usuarios totales**: Estadísticas de usuarios
- **Comandos ejecutados**: Contador por tipo
- **Recordatorios activos**: Estado del scheduler
- **Items en tienda**: Estadísticas de inventario

### Logs y Auditoría
- **Access logs**: Registro de accesos al panel
- **Action logs**: Registro de cambios importantes
- **Error tracking**: Integración con sistema de logs
- **Performance metrics**: Tiempos de respuesta

## 🔄 Futura Migración a Servicio Externo

### Preparación para Cloud
- **Stateless design**: Sin estado local
- **Environment configuration**: Toda configuración via env vars
- **Database agnostic**: Fácil migración a PostgreSQL
- **API-first**: Separación clara frontend/backend

### Proveedores Considerados
- **Vercel**: Para frontend estático
- **Railway/Render**: Para backend Node.js
- **Supabase**: Para base de datos PostgreSQL
- **Cloudflare**: Para CDN y seguridad

## 📝 Checklist de Desarrollo

### ✅ Completado
- [x] Plan de arquitectura definido
- [x] Stack tecnológico seleccionado
- [x] Estructura de proyecto diseñada
- [x] Configuración Docker planeada

### 🚧 En Progreso
- [ ] Crear estructura del proyecto admin-web
- [ ] Configurar Express + TypeScript
- [ ] Implementar Tailwind CSS

### 📋 Pendiente
- [ ] Configurar base de datos compartida
- [ ] Implementar autenticación JWT
- [ ] Crear API RESTful
- [ ] Desarrollar vistas con Tailwind
- [ ] Configurar producción
- [ ] Documentación final

## 🎥 Demo y Presentación

### Features para Demo
- **Login seguro** con JWT
- **Dashboard interactivo** con métricas
- **Gestión visual** de recordatorios
- **Administración de tienda** con drag & drop
- **Configuración en vivo** del bot

### Métricas de Éxito
- **Tiempo de carga** < 2 segundos
- **UI/UX intuitiva** sin documentación
- **Mobile responsive** 100% funcional
- **Zero downtime** en actualizaciones

---

## 📞 Contacto y Soporte

Para dudas o sugerencias durante el desarrollo:
- **Issues**: GitHub repository
- **Discussions**: Foro del proyecto
- **Documentation**: Wiki del proyecto

---

**Última actualización**: $(date +%Y-%m-%d)  
**Versión**: 1.0.0  
**Estado**: Planificación completada, iniciando implementación
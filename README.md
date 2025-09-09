# Bruno Bot - D&D 5e Campaign Manager

Un bot de Discord completo para automatizar la gestión de campañas de D&D 5e, optimizar la experiencia del jugador y facilitar el trabajo del Dungeon Master (DM) a través de comandos de barra (/).

## 🚀 Características del Producto (MVP)

### ✅ **Buscador de Personajes de Nivel20** (Implementado)
- **Búsqueda por Nombre**: Busca personajes por nombre en una campaña específica de Nivel20
- **Información Detallada**: Muestra estadísticas completas, habilidades, tiradas de salvación y más
- **Interfaz Interactiva**: Usa botones de Discord para una experiencia de usuario fluida
- **Embeds Elegantes**: Presenta la información en formato visualmente atractivo

### 🚧 **Recordatorios Semanales** (Planificado)
- **Configuración Flexible**: Los DMs pueden configurar recordatorios automáticos para las partidas
- **Personalización Completa**: Canal, día, hora y mensaje personalizables
- **Gestión Sencilla**: Comandos para crear, editar y eliminar recordatorios

### 🚧 **Clima Semanal** (Planificado)
- **Descripciones Automáticas**: Publica el clima del mundo al inicio de cada semana
- **Tablas Personalizables**: Los DMs pueden crear y gestionar sus propias tablas de clima
- **Variedad Narrativa**: Múltiples descripciones para mantener la inmersión

### 🚧 **Tienda del Servidor** (Planificado)
- **Inventario Único**: Sistema de tienda exclusivo para este servidor
- **Gestión DM**: Los DMs pueden agregar y quitar ítems personalizados
- **Catálogo Dinámico**: Inventario que se actualiza según las decisiones del DM

## 📋 Requisitos

- Node.js 18 o superior
- Una aplicación de Discord Bot
- Acceso a una campaña de Nivel20.com
- Base de datos (Vercel Postgres o Supabase recomendado para características futuras)

## 🛠️ Instalación

1. **Clona el repositorio**:
   ```bash
   git clone <tu-repositorio>
   cd nivel20-character-bot
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   # o si prefieres pnpm
   pnpm install
   ```

3. **Configura las variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   CLIENT_ID=tu_client_id_de_discord
   TOKEN=tu_token_del_bot
   GUILD_ID=id_de_tu_servidor_discord
   
   # Base de datos (para características futuras)
   DATABASE_URL=tu_url_de_base_de_datos
   ```

4. **Configura la campaña de Nivel20**:
   Edita `src/services/nivel20.service.ts` y actualiza la variable `CAMPAIGN_URL` con el ID de tu campaña:
   ```typescript
   const CAMPAIGN_URL = `${BASE_URL}/games/dnd-5/campaigns/TU_CAMPAIGN_ID/characters`;
   ```

5. **Compila el proyecto**:
   ```bash
   npm run build
   ```

6. **Despliega los comandos de Discord**:
   ```bash
   npm run deploy:commands
   ```

7. **Inicia el bot**:
   ```bash
   npm start
   ```

## 🐳 Despliegue con Docker

### Construcción de la Imagen

```bash
# Construir la imagen
docker build -t bruno-bot .

# O con un tag específico
docker build -t bruno-bot:latest .
```

### Ejecución del Contenedor

```bash
# Ejecutar con variables de entorno desde archivo .env
docker run --env-file .env bruno-bot

# O especificar variables manualmente
docker run -e CLIENT_ID=tu_client_id \
           -e TOKEN=tu_token \
           -e GUILD_ID=tu_guild_id \
           -e DATABASE_URL=tu_database_url \
           bruno-bot
```

### Docker Compose (Recomendado)

Crea un archivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  bruno-bot:
    build: .
    environment:
      - CLIENT_ID=${CLIENT_ID}
      - TOKEN=${TOKEN}
      - GUILD_ID=${GUILD_ID}
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
```

Luego ejecuta:

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f bruno-bot

# Detener
docker-compose down
```

## 🎮 Comandos Disponibles

> **⚠️ Importante**: Todos los comandos están restringidos a usuarios con rol de Dungeon Master (DM)

### ✅ **Comandos Implementados**

#### `/character` - Búsqueda de Personajes
Busca información de un personaje en la campaña configurada de Nivel20.

**Parámetros**:
- `name` (requerido): Nombre del personaje a buscar (mínimo 2 caracteres)

**Ejemplo**:
```
/character name:Gandalf
```

El bot mostrará una lista de personajes que coincidan con la búsqueda. Puedes hacer clic en los botones para ver la información detallada de cada personaje.

### 🚧 **Comandos Planificados**

#### `/recordatorio` - Gestión de Recordatorios
- `/recordatorio configurar [canal] [dia] [hora] [mensaje]`: Establece un recordatorio semanal
- `/recordatorio editar [opcion] [valor]`: Modifica canal, día, hora o mensaje del recordatorio
- `/recordatorio eliminar`: Desactiva el recordatorio activo

#### `/clima` - Sistema de Clima Semanal
- `/clima configurar [tabla_id]`: Asocia una tabla de clima al servidor
- `/clima agregar [descripcion]`: Agrega una nueva descripción a la tabla de clima
- `/clima eliminar [descripcion_id]`: Elimina una descripción de la tabla

#### `/tienda` - Tienda del Servidor
- `/tienda agregar [nombre] [precio] [descripcion]`: Agrega un ítem personalizado al inventario
- `/tienda eliminar [item_id]`: Quita un ítem del inventario
- `/tienda mostrar`: Muestra el inventario actual de la tienda
- `/tienda modificar [item_id] [opcion] [nuevo_valor]`: Modifica un ítem existente (opcional)

## 🔧 Desarrollo

### Scripts Disponibles

- `npm run build` - Compila TypeScript a JavaScript
- `npm run start` - Inicia el bot en producción
- `npm run dev` - Modo desarrollo con recarga automática
- `npm run deploy:commands` - Despliega comandos slash de Discord

### Estructura del Proyecto

```
src/
├── commands/                    # Comandos de Discord
│   ├── character.ts            # ✅ Comando de búsqueda de personajes
│   ├── reminder.ts             # 🚧 Comandos de recordatorios (planificado)
│   ├── weather.ts              # 🚧 Comandos de clima (planificado)
│   ├── shop.ts                 # 🚧 Comandos de tienda (planificado)
│   └── index.ts                # Exportación de comandos
├── services/                   # Servicios de negocio
│   ├── nivel20.service.ts      # ✅ Integración con Nivel20
│   ├── database.service.ts     # 🚧 Servicio de base de datos (planificado)
│   ├── reminder.service.ts     # 🚧 Lógica de recordatorios (planificado)
│   ├── weather.service.ts      # 🚧 Lógica de clima (planificado)
│   └── shop.service.ts         # 🚧 Lógica de tienda (planificado)
├── types/                      # Definiciones de TypeScript
│   ├── Character.ts            # ✅ Tipos de personajes
│   ├── Command.ts              # ✅ Interfaz de comandos
│   ├── Database.ts             # 🚧 Tipos de base de datos (planificado)
│   └── models/                 # Modelos de datos
│       ├── character-sheet.ts  # ✅ Modelo de ficha de personaje
│       ├── reminder.ts         # 🚧 Modelo de recordatorios (planificado)
│       ├── weather.ts          # 🚧 Modelo de clima (planificado)
│       └── shop.ts             # 🚧 Modelo de tienda (planificado)
├── utils/                      # Utilidades
│   ├── discord.utils.ts        # ✅ Helpers de Discord
│   ├── format-text.ts          # ✅ Formateo de texto
│   ├── logger.ts               # ✅ Sistema de logging
│   ├── permissions.ts          # 🚧 Gestión de permisos DM (planificado)
│   └── scheduler.ts            # 🚧 Tareas programadas (planificado)
├── migrations/                 # 🚧 Migraciones de BD (planificado)
├── bot.ts                      # ✅ Cliente de Discord
├── config.ts                   # ✅ Configuración
├── deploy-commands.ts          # ✅ Script de despliegue
└── index.ts                    # ✅ Punto de entrada
```

**Leyenda**: ✅ Implementado | 🚧 Planificado

## 🔒 Configuración del Bot de Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. Ve a la sección "Bot" y crea un bot
4. Copia el token y úsalo como `TOKEN` en tu `.env`
5. En "OAuth2 > General", copia el Client ID y úsalo como `CLIENT_ID`
6. En "OAuth2 > URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
7. Usa la URL generada para invitar el bot a tu servidor

## 🗺️ Roadmap de Desarrollo

### Fase 1: Fundación ✅
- [x] Estructura base del proyecto
- [x] Integración con Discord.js
- [x] Sistema de comandos slash
- [x] Buscador de personajes de Nivel20

### Fase 2: Automatización Básica 🚧
- [ ] Sistema de base de datos
- [ ] Gestión de permisos DM
- [ ] Recordatorios semanales
- [ ] Tareas programadas (cron jobs)

### Fase 3: Contenido Dinámico 🚧
- [ ] Sistema de clima semanal
- [ ] Tablas personalizables
- [ ] Tienda rotativa semanal
- [ ] Gestión de inventarios

### Fase 4: Mejoras y Optimización 📅
- [ ] Dashboard web para configuración
- [ ] Métricas y analytics
- [ ] Backup automático de datos
- [ ] Integración con más plataformas

## 📝 Personalización

### Cambiar la Campaña

Para usar una campaña diferente de Nivel20:

1. Ve a tu campaña en Nivel20.com
2. Copia el ID de la URL (ej: `campaigns/12345-mi-campana`)
3. Actualiza `CAMPAIGN_URL` en `src/services/nivel20.service.ts`

### Configurar Base de Datos (Características Futuras)

Se recomienda usar **Vercel Postgres** o **Supabase** para las características que requieren persistencia:

1. **Vercel Postgres**:
   ```bash
   # Instalar CLI de Vercel
   npm i -g vercel
   
   # Crear base de datos
   vercel postgres create
   ```

2. **Supabase**:
   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Copia la URL de conexión

### Añadir Más Comandos

1. Crea un nuevo archivo en `src/commands/`
2. Implementa la interfaz `Command`
3. Exporta el comando en `src/commands/index.ts`
4. Ejecuta `npm run deploy:commands`

## 🐛 Solución de Problemas

### El bot no responde a comandos
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de haber ejecutado `npm run deploy:commands`
- Revisa los logs para errores específicos

### Error al buscar personajes
- Verifica que el `CAMPAIGN_URL` sea correcto
- Asegúrate de que la campaña sea pública o que tengas acceso
- Revisa la conectividad de red

### Problemas de permisos
- Verifica que el bot tenga los permisos necesarios en el servidor
- Asegúrate de que el bot pueda enviar mensajes y usar comandos slash
- **Confirma que el usuario tenga rol de Dungeon Master** - Todos los comandos requieren permisos DM

### Problemas con características futuras
- Verifica la configuración de la base de datos si usas funciones que requieren persistencia
- Asegúrate de que las variables de entorno de la base de datos estén correctamente configuradas

## 📄 Licencia

ISC License

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🙏 Agradecimientos

- [Discord.js](https://discord.js.org/) - Librería para interactuar con Discord
- [Nivel20.com](https://nivel20.com/) - Plataforma de gestión de personajes D&D
- [Cheerio](https://cheerio.js.org/) - Web scraping
- [Axios](https://axios-http.com/) - Cliente HTTP
- [TypeScript](https://www.typescriptlang.org/) - Lenguaje de programación
- [Vercel](https://vercel.com/) - Plataforma de deployment y base de datos
- [Supabase](https://supabase.com/) - Alternativa de base de datos

---

**Bruno Bot** - Automatizando la gestión de campañas D&D 5e, una característica a la vez. 🎲

# Bruno Bot - D&D 5e Campaign Manager

Un bot de Discord para buscar personajes de Nivel20 y gestionar campañas de D&D 5e, optimizando la experiencia del jugador y facilitando el trabajo del Dungeon Master (DM) a través de comandos de barra (/).

## 🚀 Características del Producto (MVP)

### ✅ **Buscador de Personajes de Nivel20** (Implementado)
- **Búsqueda por Nombre**: Busca personajes por nombre en una campaña específica de Nivel20
- **Información Detallada**: Muestra estadísticas completas, habilidades, tiradas de salvación y más
- **Interfaz Interactiva**: Usa botones de Discord para una experiencia de usuario fluida
- **Embeds Elegantes**: Presenta la información en formato visualmente atractivo

### ✅ **Recordatorios Semanales** (Implementado)
- **Configuración Flexible**: Los DMs pueden configurar recordatorios automáticos para las partidas
- **Personalización Completa**: Canal, día, hora y mensaje personalizables
- **Gestión Sencilla**: Comandos para crear, listar, activar/desactivar y eliminar recordatorios
- **Sistema de Programación**: Usa node-cron para verificar y enviar recordatorios automáticamente

### 🚧 **Clima Semanal** (Planificado)
- **Descripciones Automáticas**: Publica el clima del mundo al inicio de cada semana
- **Tablas Personalizables**: Los DMs pueden crear y gestionar sus propias tablas de clima
- **Variedad Narrativa**: Múltiples descripciones para mantener la inmersión

### ✅ **Tienda del Servidor** (Implementado)
- **Catálogo de Ítems Mágicos**: Sistema completo de ítems con carga desde archivos SDR (System Reference Document)
- **Gestión de Inventario**: Los DMs pueden agregar/quitar ítems del inventario de la tienda
- **Varianza de Precios**: Sistema configurable de fluctuación de precios para mayor realismo
- **Embeds Mejorados**: Interfaz visual atractiva con colores por rareza y formato optimizado
- **Sistema de Stock**: Control de cantidades disponibles (limitado o ilimitado)
- **Filtros y Búsqueda**: Buscar ítems por nombre, tipo o rareza
- **Paginación**: Navegación fácil entre múltiples páginas de ítems

## 📋 Requisitos

- Node.js 18 o superior
- Una aplicación de Discord Bot
- Acceso a una campaña de Nivel20.com (opcional, solo para búsqueda de personajes)

## 🛠️ Instalación

1. **Clona el repositorio**:
   ```bash
   git clone <tu-repositorio>
   cd bruno-bot
   ```

2. **Instala las dependencias**:
   ```bash
   pnpm install
   ```

3. **Configura las variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:
   ```env
   # Discord Bot Configuration
   CLIENT_ID=your_discord_client_id_here
   TOKEN=your_discord_bot_token_here
   GUILD_ID=your_discord_guild_id_here

   # Environment
   NODE_ENV=development

   # Base de datos (opcional, por defecto usa ./data/bruno-bot.db)
   DB_PATH=./data/bruno-bot.db

   # Zona horaria (opcional, por defecto America/Argentina/Buenos_Aires - GMT-3)
   # Usa formato IANA: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   TIMEZONE=America/Argentina/Buenos_Aires
   ```

4. **Configura la campaña de Nivel20**:
   Edita `src/services/nivel20.service.ts` y actualiza la variable `CAMPAIGN_URL` con el ID de tu campaña:
   ```typescript
   const CAMPAIGN_URL = `${BASE_URL}/games/dnd-5/campaigns/TU_CAMPAIGN_ID/characters`;
   ```

5. **Compila el proyecto**:
   ```bash
   pnpm run build
   ```

6. **Despliega los comandos de Discord**:
   ```bash
   pnpm run deploy:commands
   ```

7. **Inicia el bot**:
   ```bash
   pnpm start
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

El proyecto incluye un archivo `docker-compose.yaml` configurado:

```yaml
version: '3.8'

services:
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
    volumes:
      - bruno-bot-data:/app/data
    restart: unless-stopped

volumes:
  bruno-bot-data:
```

Ejecuta:

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

#### `/recordatorio` - Gestión de Recordatorios ✅
Crea y gestiona recordatorios semanales automáticos para las sesiones de juego.

> **⏰ Zona Horaria**: Los recordatorios se ejecutan según la zona horaria configurada en `TIMEZONE` (por defecto Argentina GMT-3). Puedes cambiar esto en tu archivo `.env`.

**Subcomandos**:
- `/recordatorio crear [canal] [mensaje] [dia] [hora]`: Crea un nuevo recordatorio semanal
  - `canal`: Canal donde se enviará el recordatorio
  - `mensaje`: Mensaje personalizado del recordatorio
  - `dia`: Día de la semana (Domingo-Sábado)
  - `hora`: Hora en formato 24h (ej: 19:00)

- `/recordatorio listar`: Muestra todos los recordatorios configurados en el servidor

- `/recordatorio activar [id]`: Activa un recordatorio desactivado
  - `id`: ID del recordatorio a activar

- `/recordatorio desactivar [id]`: Desactiva un recordatorio sin eliminarlo
  - `id`: ID del recordatorio a desactivar

- `/recordatorio eliminar [id]`: Elimina permanentemente un recordatorio
  - `id`: ID del recordatorio a eliminar

**Ejemplo**:
```
/recordatorio crear canal:#general mensaje:¡Partida en 1 hora! 🎲 dia:Viernes hora:19:00
```

#### `/tienda` - Tienda del Servidor ✅
Gestiona el catálogo de ítems mágicos y el inventario de la tienda del servidor.

**Comandos de Catálogo**:
- `/tienda catalogo-cargar`: [DM] Carga ítems desde archivos SDR al catálogo
- `/tienda catalogo-ver [rareza] [tipo]`: Ver catálogo completo con filtros opcionales
- `/tienda catalogo-buscar [nombre]`: Buscar un ítem específico en el catálogo
- `/tienda catalogo-agregar`: [DM] Agregar un ítem personalizado mediante modal interactivo
- `/tienda catalogo-editar [id]`: [DM] Editar un ítem existente del catálogo
- `/tienda catalogo-eliminar [id]`: [DM] Eliminar un ítem del catálogo

**Comandos de Inventario**:
- `/tienda inventario-ver`: Ver los ítems actualmente disponibles en la tienda
- `/tienda inventario-agregar [item_id] [stock]`: [DM] Agregar ítem del catálogo al inventario
- `/tienda inventario-quitar [id]`: [DM] Quitar ítem del inventario
- `/tienda inventario-stock [id] [cantidad]`: [DM] Actualizar stock de un ítem

**Comandos de Configuración**:
- `/tienda config-ver`: [DM] Ver configuración actual de la tienda
- `/tienda config-varianza [min] [max]`: [DM] Configurar rango de varianza de precios
- `/tienda config-capacidad [max]`: [DM] Configurar capacidad máxima del inventario

**Rarezas disponibles**: Common, Uncommon, Rare, Very Rare, Legendary, Artifact

**Tipos de ítems**: Weapon, Armor, Potion, Scroll, Wondrous, Misc

**Ejemplo**:
```
# Ver catálogo filtrando por rareza legendary
/tienda catalogo-ver rareza:legendary

# Agregar ítem al inventario con stock limitado
/tienda inventario-agregar item_id:42 stock:3

# Configurar varianza de precios (80% - 150%)
/tienda config-varianza min:0.8 max:1.5
```

### 🚧 **Comandos Planificados**

#### `/clima` - Sistema de Clima Semanal
- `/clima configurar [tabla_id]`: Asocia una tabla de clima al servidor
- `/clima agregar [descripcion]`: Agrega una nueva descripción a la tabla de clima
- `/clima eliminar [descripcion_id]`: Elimina una descripción de la tabla

## 🔧 Desarrollo

### Scripts Disponibles

- `pnpm run build` - Compila TypeScript a JavaScript y copia assets
- `pnpm run start` - Inicia el bot en producción
- `pnpm run dev` - Modo desarrollo con recarga automática
- `pnpm run deploy:commands` - Despliega comandos slash de Discord

### Estructura del Proyecto

```
src/
├── commands/                    # Comandos de Discord
│   ├── character.ts            # ✅ Comando de búsqueda de personajes
│   ├── reminder.ts             # ✅ Comandos de recordatorios
│   ├── shop.ts                 # ✅ Comandos de tienda
│   └── index.ts                # Exportación de comandos
├── services/                   # Servicios de negocio
│   ├── nivel20.service.ts      # ✅ Integración con Nivel20
│   ├── database.service.ts     # ✅ Servicio de base de datos (SQLite)
│   ├── scheduler.service.ts    # ✅ Servicio de programación de tareas
│   └── shop.service.ts         # ✅ Lógica de tienda
├── database/                   # Base de datos
│   └── schema.sql              # ✅ Schema de SQLite
├── types/                      # Definiciones de TypeScript
│   ├── Character.ts            # ✅ Tipos de personajes
│   ├── Command.ts              # ✅ Interfaz de comandos
│   ├── Database.ts             # ✅ Tipos de base de datos
│   ├── Shop.ts                 # ✅ Tipos y constantes de tienda
│   └── models/                 # Modelos de datos
│       └── character-sheet.ts  # ✅ Modelo de ficha de personaje
├── utils/                      # Utilidades
│   ├── discord.utils.ts        # ✅ Helpers de Discord
│   ├── format-text.ts          # ✅ Formateo de texto
│   ├── logger.ts               # ✅ Sistema de logging
│   └── shop-modals.ts          # ✅ Modales interactivos de tienda
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

### Fase 2: Automatización Básica ✅
- [x] Sistema de base de datos (SQLite con better-sqlite3)
- [x] Gestión de permisos DM
- [x] Recordatorios semanales
- [x] Tareas programadas (cron jobs con node-cron)

### Fase 3: Contenido Dinámico ✅
- [x] Sistema de tienda con catálogo de ítems
- [x] Gestión de inventarios
- [x] Varianza de precios configurable
- [x] Embeds mejorados con colores por rareza
- [ ] Sistema de clima semanal
- [ ] Tablas personalizables de clima
- [ ] Rotación automática de inventario

### Fase 4: Mejoras y Optimización 📅
- [ ] Dashboard web para configuración
- [ ] Métricas y analytics
- [ ] Backup automático de datos
- [ ] Integración con más plataformas

## 🎨 Características Visuales

### Embeds Mejorados de la Tienda

Los embeds del sistema de tienda cuentan con un diseño cuidado y profesional:

- **Colores Dinámicos por Rareza**: Cada embed refleja visualmente la rareza del ítem
  - Common: Gris
  - Uncommon: Verde
  - Rare: Azul
  - Very Rare: Púrpura
  - Legendary: Naranja
  - Artifact: Dorado

- **Formato Optimizado**:
  - Emojis contextuales para cada tipo de ítem
  - Información estructurada con separadores visuales
  - Espaciado vertical entre ítems para mejor legibilidad
  - Descripciones en cursiva para destacar detalles

- **Navegación Intuitiva**:
  - Paginación con botones interactivos
  - Filtros visuales con emojis
  - Información clara de stock y precios
  - Enlaces a detalles completos cuando están disponibles

## 📝 Personalización

### Archivos SDR para la Tienda

El sistema de tienda incluye archivos SDR (System Reference Document) preconfigurados en la carpeta `sdr/`:

#### Archivos Disponibles
- `common.json` - Ítems comunes (beads, tokens, basic equipment)
- `uncommon.json` - Ítems poco comunes (potions, scrolls, minor magic items)
- `rare.json` - Ítems raros (powerful weapons, armor, significant magic items)
- `potions.json` - Pociones variadas (healing, enhancement, utility)

#### Estructura de los Archivos
Cada archivo JSON contiene un array de objetos con esta estructura:
```json
[
  {
    "name": "Bead of Nourishment x20",
    "price": "1",
    "link": "https://5e.tools/items.html#bead%20of%20nourishment_xge"
  }
]
```

#### Uso
1. Los archivos ya están incluidos en el proyecto
2. Usa `/tienda catalogo-cargar` para importar todos los ítems al catálogo
3. El tipo de ítem (weapon, armor, potion, etc.) se infiere automáticamente del nombre
4. Los precios están en piezas de oro (po) por defecto

**Nota**: Puedes agregar más ítems editando estos archivos o crear nuevos archivos JSON con la misma estructura.

### Cambiar la Campaña

Para usar una campaña diferente de Nivel20:

1. Ve a tu campaña en Nivel20.com
2. Copia el ID de la URL (ej: `campaigns/12345-mi-campana`)
3. Actualiza `CAMPAIGN_URL` en `src/services/nivel20.service.ts`

### Configurar Base de Datos

El bot usa **SQLite** con better-sqlite3 para persistencia local:

- **Base de datos por defecto**: `./data/bruno-bot.db`
- **Schema**: Ver `src/database/schema.sql`
- **Migraciones**: Automáticas al iniciar el bot

Para producción con Docker, la base de datos se persiste en el volumen `bruno-bot-data`.

Si necesitas una base de datos externa (característica futura):
1. **Vercel Postgres**:
   ```bash
   # Instalar CLI de Vercel
   pnpm add -g vercel
   
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
4. Ejecuta `pnpm run deploy:commands`

## 🐛 Solución de Problemas

### El bot no responde a comandos
- Verifica que las variables de entorno estén correctamente configuradas en `.env`
- Asegúrate de haber ejecutado `pnpm run deploy:commands` después de cambios
- Revisa los logs para errores específicos: `docker-compose logs -f bruno-bot`
- Confirma que el bot esté online en Discord

### Error al buscar personajes
- Verifica que el `CAMPAIGN_URL` en `src/services/nivel20.service.ts` sea correcto
- Asegúrate de que la campaña sea pública o que tengas acceso
- Revisa la conectividad de red y que nivel20.com esté accesible

### Problemas de permisos
- Verifica que el bot tenga los permisos necesarios: Send Messages, Use Slash Commands, Embed Links
- Asegúrate de que el bot pueda enviar mensajes y usar comandos slash
- **Confirma que el usuario tenga rol de Dungeon Master** - Todos los comandos requieren permisos DM

### Problemas con la base de datos
- Verifica que la carpeta `data/` exista y tenga permisos de escritura
- En Docker, asegúrate de que el volumen `bruno-bot-data` esté montado correctamente
- Revisa que `DB_PATH` en `.env` apunte a una ubicación válida

### Problemas con pnpm
- Si tienes errores de dependencias, ejecuta `pnpm install --force`
- Para limpiar caché: `pnpm store prune`
- Asegúrate de tener pnpm instalado: `npm install -g pnpm`

### Problemas con la tienda
- Verifica que los archivos SDR en `sdr/` tengan formato JSON válido
- Usa `/tienda catalogo-cargar` para poblar el catálogo inicialmente
- Revisa que los precios tengan formato válido (número o "X po")

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

---

**Bruno Bot** - Automatizando la gestión de campañas D&D 5e, una característica a la vez. 🎲

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bruno Bot is a Discord bot for D&D 5e campaign management that integrates with Nivel20.com. It provides character lookup functionality with plans for automated reminders, weather systems, and server-specific shops.

## Essential Commands

### Development
```bash
# Build TypeScript to JavaScript
pnpm run build

# Development mode with auto-reload
pnpm run dev

# Production start
pnpm start

# Deploy Discord slash commands (required after adding/modifying commands)
pnpm run deploy:commands
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f bruno-bot

# Stop container
docker-compose down
```

## Architecture

### Core Bot Flow
1. **Entry point**: `src/index.ts` → imports `src/bot.ts`
2. **Bot initialization**: `src/bot.ts` creates Discord client, registers commands, sets up event handlers
3. **Command registration**: Commands from `src/commands/` are loaded into `client.commands` Collection
4. **Interaction handling**: `Events.InteractionCreate` handler routes commands to their `execute()` functions

### Command System
- All commands must implement the `Command` interface (`src/types/Command.ts`)
- Each command exports `data` (SlashCommandBuilder) and `execute()` function
- Commands are auto-registered by exporting from `src/commands/index.ts`
- Deploy commands with `pnpm run deploy:commands` after changes

### Key Architectural Patterns

**Service Layer**:
- `src/services/nivel20.service.ts` - Web scraping service for Nivel20.com character data
- Uses Axios for HTTP requests and Cheerio for HTML parsing
- CharacterSheet model transforms raw JSON to Discord embeds

**Interactive Components**:
- Character search uses button-based interaction (60-second timeout)
- Button collectors verify user ownership before responding
- Custom IDs format: `character_{index}` for tracking selections

**Error Handling**:
- Global error handlers in `src/bot.ts` for unhandled rejections and exceptions
- Command errors respond with user-friendly Spanish error messages
- Proper handling of deferred/replied interaction states

**Configuration**:
- Environment variables validated in `src/config.ts` at startup
- Required: `CLIENT_ID`, `TOKEN`, `GUILD_ID`
- Optional: `DATABASE_URL` (for future features)

### Important Implementation Details

**Nivel20 Integration**:
- Campaign URL is hardcoded in `src/services/nivel20.service.ts` (line 16)
- Search endpoint: `{CAMPAIGN_URL}?utf8=%E2%9C%93&q={query}`
- Character details: `{BASE_URL}{character_path}.json`
- Must update `CAMPAIGN_URL` constant when changing campaigns

**TypeScript Configuration**:
- Strict mode enabled with comprehensive null checks
- `noUncheckedIndexedAccess: true` - requires explicit null checking for array/object access
- Module system: CommonJS for Node.js compatibility
- Target: ES2022

**Discord.js Patterns**:
- Client interface extended to include `commands: Collection<string, Command>`
- Intents: Guilds, GuildMessages, MessageContent
- All user-facing text is in Spanish

## Testing Workflow

1. Make code changes
2. Run `pnpm run build` to compile TypeScript
3. If command definitions changed, run `pnpm run deploy:commands`
4. Run `pnpm start` or `pnpm run dev` to test
5. Monitor logs via `src/utils/logger.ts`

## Future Features (Planned)

The README outlines planned features: weekly reminders, weather system, and server shop. These will require:
- Database integration (DATABASE_URL env var exists but unused)
- Scheduled tasks (cron jobs)
- Additional command files in `src/commands/`
- New service files in `src/services/`

When implementing these, follow the existing command pattern and service architecture.

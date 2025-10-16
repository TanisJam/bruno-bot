# AGENTS.md - Bruno Bot Development Guidelines

## Build/Lint/Test Commands
- **Build**: `pnpm run build` - Compile TypeScript to JavaScript
- **Dev**: `pnpm run dev` - Development mode with auto-reload
- **Start**: `pnpm start` - Production start
- **Deploy Commands**: `pnpm run deploy:commands` - Register Discord slash commands
- **No linting or testing setup** - Run `pnpm run build` to check for TypeScript errors

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled with comprehensive null checks
- `noUncheckedIndexedAccess: true` - explicit null checking required
- Target ES2022, CommonJS modules

### Imports
- Group discord.js imports first
- Local imports follow, grouped by directory (types, services, utils)
- Use relative imports for local files

### Naming Conventions
- **Variables/Functions**: camelCase
- **Classes/Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case.ts

### Formatting
- 2-space indentation
- Single quotes for strings
- No semicolons
- JSDoc comments for interfaces and public methods
- Multi-line imports with trailing commas

### Error Handling
- Try-catch blocks in async functions
- User-friendly Spanish error messages
- Logger for debugging (info/warn/error/debug levels)
- Global error handlers in bot.ts

### Architecture Patterns
- Service layer with singleton pattern for database
- Command pattern for Discord interactions
- All user-facing text in Spanish
- Button interactions with 60-second timeout

### Security
- Never commit secrets or keys
- Validate environment variables at startup
- Use proper permission checks for guild management commands
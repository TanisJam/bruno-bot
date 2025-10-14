# GEMINI.md

## Project Overview

This is a Discord bot for managing D&D 5e campaigns. It's written in TypeScript and uses the discord.js library. The bot provides several features to help Dungeon Masters (DMs) and players, including:

*   **Character Lookup:** Search for characters in a Nivel20.com campaign.
*   **Weekly Reminders:** Set up automated reminders for game sessions.
*   **Server Shop:** Manage a catalog of magic items with inventory and price variance.

The bot uses a SQLite database for data persistence and includes features for scheduling tasks and handling interactions like slash commands and modals.

### Key Technologies

*   **Language:** TypeScript
*   **Framework:** Node.js with `discord.js`
*   **Database:** SQLite (`better-sqlite3`)
*   **Web Scraping:** `cheerio` and `axios` for fetching data from Nivel20.com
*   **Scheduling:** `node-cron` for automated tasks
*   **Date/Time:** `luxon` for handling timezones

## Building and Running

### Prerequisites

*   Node.js 18 or higher
*   A Discord Bot application

### Installation

1.  **Clone the repository and install dependencies:**
    ```bash
    git clone <repository-url>
    cd bruno-bot
    pnpm install
    ```

2.  **Configure environment variables:**
    Create a `.env` file in the root of the project with the following content:
    ```env
    CLIENT_ID=<your_discord_client_id>
    TOKEN=<your_bot_token>
    GUILD_ID=<your_discord_server_id>
    DB_PATH=./data/bruno-bot.db
    TIMEZONE=America/Argentina/Buenos_Aires
    ```

### Available Scripts

*   **Build the project:**
    ```bash
    pnpm run build
    ```

*   **Start the bot in production:**
    ```bash
    pnpm start
    ```

*   **Run in development mode with auto-reload:**
    ```bash
    pnpm run dev
    ```

*   **Deploy slash commands to Discord:**
    ```bash
    pnpm run deploy:commands
    ```

## Development Conventions

*   **Code Style:** The project follows standard TypeScript and Prettier conventions.
*   **Modularity:** The code is organized into modules for commands, services, types, and utils.
*   **Services:** Business logic is encapsulated in services (e.g., `DatabaseService`, `Nivel20Service`).
*   **Commands:** Discord slash commands are defined in the `src/commands` directory.
*   **Types:** TypeScript types and interfaces are defined in the `src/types` directory.
*   **Error Handling:** The bot includes error handling for commands and asynchronous operations.
*   **Logging:** A custom logger is used for logging events and errors.

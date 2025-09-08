import { CommandInteraction, SlashCommandBuilder, Client } from 'discord.js';

/**
 * Interface for Discord slash commands
 */
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction, client?: Client) => Promise<void>;
}

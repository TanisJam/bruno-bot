import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  ComponentType 
} from 'discord.js';
import { Nivel20Service } from '../services/nivel20.service';
import { createCharacterButtons } from '../utils/discord.utils';
import { logger } from '../utils/logger';

/**
 * Timeout for button interactions (1 minute)
 */
const INTERACTION_TIMEOUT = 60000;

/**
 * Instance of the Nivel20 service
 */
const nivel20Service = new Nivel20Service();

/**
 * Character search command definition
 */
export const data = new SlashCommandBuilder()
  .setName('character')
  .setDescription('Busca información de un personaje en Nivel20')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Nombre del personaje a buscar')
      .setMinLength(2)
      .setRequired(true)
  );

/**
 * Execute the character search command
 */
export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();
    
    const name = interaction.options.get('name')?.value as string;
    logger.info(`Character search requested by ${interaction.user.username} for: ${name}`);
    
    const characters = await nivel20Service.searchCharacters(name);

    if (characters.length === 0) {
      await interaction.editReply(`❌ No se encontró ningún personaje con el nombre "${name}"`);
      return;
    }

    const rows = createCharacterButtons(characters);
    const message = await interaction.editReply({
      content: `🔍 Se encontraron los siguientes personajes:\n${characters
        .map((char, index) => `${index + 1}. **${char.name}**`)
        .join('\n')}`,
      components: rows,
    });

    // Create button collector
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: INTERACTION_TIMEOUT,
    });

    collector.on('collect', async (buttonInteraction) => {
      // Check if the user who clicked is the same as who initiated the command
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: '❌ No puedes interactuar con este comando. Usa `/character` para hacer tu propia búsqueda.',
          ephemeral: true,
        });
        return;
      }

      // Extract character index from button custom ID
      const indexStr = buttonInteraction.customId.split('_')[1];
      if (!indexStr) return;
      const index = parseInt(indexStr);
      const selectedChar = characters[index];
      
      if (!selectedChar) {
        await buttonInteraction.reply({
          content: '❌ Error: Personaje no encontrado.',
          ephemeral: true,
        });
        return;
      }

      logger.info(`Loading character stats for: ${selectedChar.name}`);
      
      // Defer the button interaction reply
      await buttonInteraction.deferReply();

      // Fetch character stats
      const charStats = await nivel20Service.getCharacterStats(selectedChar.link);

      if (charStats) {
        const embed = charStats.toEmbed();
        await buttonInteraction.editReply({ embeds: [embed] });
        logger.info(`Successfully displayed character stats for: ${selectedChar.name}`);
      } else {
        await buttonInteraction.editReply({
          content: '❌ No se pudo cargar la información del personaje. Inténtalo de nuevo más tarde.'
        });
        logger.warn(`Failed to load character stats for: ${selectedChar.name}`);
      }
    });

    // Handle collector timeout
    collector.on('end', async () => {
      try {
        await interaction.editReply({ 
          content: `🔍 Se encontraron los siguientes personajes:\n${characters
            .map((char, index) => `${index + 1}. **${char.name}**`)
            .join('\n')}\n\n⏰ *Los botones han expirado. Usa el comando de nuevo para interactuar.*`,
          components: [] 
        });
      } catch (error) {
        // Ignore errors when editing expired messages
        logger.debug('Could not edit expired interaction message');
      }
    });

  } catch (error) {
    logger.error('Error in character command:', error);
    
    const errorMessage = '❌ Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo más tarde.';
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else if (interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    }
  }
}

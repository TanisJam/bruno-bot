import axios from 'axios';
import { load } from 'cheerio';
import { Character } from '../types/Character';
import { CharacterSheet } from '../types/models/character-sheet';
import { logger } from '../utils/logger';

/**
 * Base URL for Nivel20 website
 */
const BASE_URL = 'https://nivel20.com';

/**
 * Campaign URL - you'll need to update this with your specific campaign ID
 * Format: https://nivel20.com/games/dnd-5/campaigns/YOUR_CAMPAIGN_ID/characters
 */
const CAMPAIGN_URL = `${BASE_URL}/games/dnd-5/campaigns/112294-loto-negro---gremio/characters`;

/**
 * Service for interacting with Nivel20 character data
 */
export class Nivel20Service {
  /**
   * Search for characters by name in the Nivel20 campaign
   * @param name Character name to search for
   * @returns Array of matching characters
   */
  async searchCharacters(name: string): Promise<Character[]> {
    try {
      logger.debug(`Searching for characters with name: ${name}`);
      
      const response = await axios.get(`${CAMPAIGN_URL}?utf8=%E2%9C%93&q=${encodeURIComponent(name)}`);
      const $ = load(response.data);
      
      const characters = $('.campaign-characters .character-desc')
        .map((_, el) => {
          const character = $(el);
          const characterName = character.find('a').text().trim();
          const link = character.find('a').attr('href');
          
          if (characterName && link) {
            return { name: characterName, link };
          }
          return null;
        })
        .get()
        .filter((char): char is Character => char !== null);

      logger.info(`Found ${characters.length} characters matching "${name}"`);
      return characters;
      
    } catch (error) {
      logger.error('Error searching for characters:', error);
      return [];
    }
  }

  /**
   * Get detailed character statistics from Nivel20
   * @param url Character URL path (e.g., /characters/12345)
   * @returns CharacterSheet object or null if error
   */
  async getCharacterStats(url: string): Promise<CharacterSheet | null> {
    const fullUrl = `${BASE_URL}${url}`;
    
    try {
      logger.debug(`Fetching character stats from: ${fullUrl}`);
      
      const response = await axios.get(`${fullUrl}.json`);
      const characterData = response.data;
      
      const characterSheet = new CharacterSheet(characterData, fullUrl);
      logger.info(`Successfully loaded character stats for: ${characterData.printable_hash.info.name}`);
      
      return characterSheet;
      
    } catch (error) {
      logger.error('Error loading character stats:', error);
      return null;
    }
  }
}

/**
 * Basic character information from Nivel20 search
 */
export interface Character {
  name: string;
  link: string;
}

/**
 * Extended character information with additional details
 */
export interface CharacterDetails extends Character {
  imageUrl?: string;
}

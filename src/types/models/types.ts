/**
 * D&D 5e ability score interface
 */
export interface Ability {
  total: number;
  mod: number;
}

/**
 * D&D 5e saving throw interface
 */
export interface SavingThrow {
  total: number;
  proficient: boolean;
}

/**
 * D&D 5e skill interface
 */
export interface Skill {
  total: number;
  proficient: boolean;
}

/**
 * Type for all ability scores
 */
export type AbilityScores = Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', Ability>;

/**
 * Type for all saving throws
 */
export type SavingThrows = Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', SavingThrow>;

/**
 * Skill definition interface for mapping
 */
export interface SkillDefinition {
  name: string;
  key: keyof Skills;
  ability: string;
}

/**
 * Interface for all D&D 5e skills
 */
export interface Skills {
  acrobatics: Skill;
  arcana: Skill;
  athletics: Skill;
  deception: Skill;
  history: Skill;
  performance: Skill;
  insight: Skill;
  intimidation: Skill;
  investigation: Skill;
  sleight_of_hand: Skill;
  medicine: Skill;
  nature: Skill;
  perception: Skill;
  persuasion: Skill;
  religion: Skill;
  stealth: Skill;
  survival: Skill;
  animal_handling: Skill;
}

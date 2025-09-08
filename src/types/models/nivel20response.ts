/**
 * Nivel20 API response interfaces
 */

export interface Nivel20character {
  printable_hash: PrintableHash;
}

export interface PrintableHash {
  originals: Originals;
  info: Info;
  ability: Abilities;
  skill: SkillsResponse;
  speed: Speed;
  initiative: Initiative;
  armor: Armor;
}

export interface Originals {
  abilities: OriginalAbilities;
  skills: OriginalSkills;
  static: StaticValues;
}

export interface OriginalAbilities {
  fue: { total: number };
  des: { total: number };
  con: { total: number };
  int: { total: number };
  sab: { total: number };
  car: { total: number };
}

export interface OriginalSkills {
  arcanos: { proficiency: string | null; total: number };
  enganar: { proficiency: string | null; total: number };
  intimidar: { proficiency: string | null; total: number };
  persuasion: { proficiency: string | null; total: number };
  sigilo: { proficiency: string | null; total: number };
  supervivencia: { proficiency: string | null; total: number };
}

export interface StaticValues {
  spell_attack: { total: number };
  spell_save: { total: number };
}

export interface Abilities {
  fue: AbilityValue;
  des: AbilityValue;
  con: AbilityValue;
  int: AbilityValue;
  sab: AbilityValue;
  car: AbilityValue;
}

export interface AbilityValue {
  total: number;
  mod: number;
  saving_throw: SavingThrowValue;
}

export interface SavingThrowValue {
  total: number;
  proficiency: string;
}

export interface SkillsResponse {
  acrobacias: SkillValue;
  arcanos: SkillValue;
  atletismo: SkillValue;
  enganar: SkillValue;
  historia: SkillValue;
  interpretacion: SkillValue;
  perspicacia: SkillValue;
  intimidar: SkillValue;
  investigacion: SkillValue;
  juego_de_manos: SkillValue;
  medicina: SkillValue;
  naturaleza: SkillValue;
  percepcion: SkillValue;
  persuasion: SkillValue;
  religion: SkillValue;
  sigilo: SkillValue;
  supervivencia: SkillValue;
  trato_con_animales: SkillValue;
}

export interface SkillValue {
  total: number;
  proficiency: string;
}

export interface Speed {
  total: number;
}

export interface Initiative {
  total: number;
}

export interface Armor {
  normal: number;
}

export interface Info {
  level: number;
  level_desc: string;
  proficiency_bonus: number;
  hit_points: number;
  id: number;
  name: string;
  status: string;
  race_id: number;
  race_name: string;
  subrace_id: any;
  subrace_name: any;
  race: string;
  player: string;
  speed: number;
  campaign_id: number;
  campaign: string;
  campaign_logo: any;
  image_url: string;
  spell_caster: boolean;
}

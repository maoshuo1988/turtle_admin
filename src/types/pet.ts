import type { PageParams } from '@/types/http';

export type PetRarity = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
export const PET_RARITY_OPTIONS: PetRarity[] = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
export type FeatureScope = 'PET' | 'GLOBAL';
export type FeatureEffectiveEvent =
  | 'DAILY_SIGNIN'
  | 'EGG_PURCHASE'
  | 'EGG_RESOLVE'
  | 'BET_SETTLE'
  | 'CHAT_STAMINA'
  | 'MINIGAME';

export interface LocalizedText {
  [locale: string]: string;
}

export interface PetDisplay {
  icon?: string;
  cover?: string;
  thumbnail?: string;
}

export interface PetDiscount {
  type: 'rate' | 'fixed';
  value: number;
}

export interface PetPricing {
  egg_price?: number;
  egg_discount?: PetDiscount | null;
}

export interface PetMetadata {
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export type PetAbilityParams = Record<string, unknown>;

export type PetAbilities = Record<string, PetAbilityParams>;

export interface PetDefinition {
  id: string;
  pet_id: string;
  name: LocalizedText;
  rarity: PetRarity;
  enabled: boolean;
  obtainable_by_egg: boolean;
  display?: PetDisplay;
  description?: LocalizedText;
  abilities?: PetAbilities;
  pricing?: PetPricing;
  metadata?: PetMetadata;
  raw: Record<string, unknown>;
}

export interface FeatureCatalogItem {
  feature_key: string;
  name: LocalizedText;
  scope: FeatureScope;
  effective_event: FeatureEffectiveEvent;
  params_schema: Record<string, unknown>;
  enabled: boolean;
  metadata?: PetMetadata;
  raw: Record<string, unknown>;
}

export interface PetDefinitionListParams extends PageParams {
  enabled?: boolean;
  rarity?: PetRarity;
}

export interface FeatureCatalogListParams extends PageParams {
  enabled?: boolean;
  scope?: FeatureScope;
  q?: string;
}

export type GachaPoolRarityWeights = Record<PetRarity, number>;

export interface GachaPoolConfig {
  enabled: boolean;
  base_cost: number;
  rarity_weights: GachaPoolRarityWeights;
}

export interface PetKillSwitchPayload {
  action: string;
  scope: string;
  reason?: string;
}

export interface ReplacePetAbilitiesPayload {
  petDefinitionId: string;
  abilities: PetAbilities;
}

export interface SavePetAbilityPayload {
  petDefinitionId: string;
  featureKey: string;
  params: Record<string, unknown>;
}

export interface DeletePetAbilityPayload {
  petDefinitionId: string;
  featureKey: string;
}

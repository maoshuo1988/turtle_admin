import type { FeatureCatalogItem, FeatureEffectiveEvent, FeatureScope, LocalizedText, PetAbilities, PetDefinition, PetMetadata, PetPricing, PetRarity } from '@/types/pet';

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }

  return fallback;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function pickRecord(source: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function pickString(source: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}

function pickBoolean(source: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return toBoolean(source[key]);
    }
  }

  return false;
}

function sanitizeLocalizedText(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  const result: LocalizedText = {};

  Object.entries(value).forEach(([locale, text]) => {
    const normalized = toString(text).trim();
    if (normalized) {
      result[locale] = normalized;
    }
  });

  return result;
}

function sanitizeAbilities(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const result: PetAbilities = {};

  Object.entries(value).forEach(([featureKey, config]) => {
    if (isRecord(config)) {
      result[featureKey] = config;
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function sanitizePricing(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const eggPrice = toNumber(value.egg_price ?? value.eggPrice);
  const discount = isRecord(value.egg_discount ?? value.eggDiscount)
    ? (value.egg_discount ?? value.eggDiscount) as AnyRecord
    : undefined;

  const pricing: PetPricing = {};

  if (eggPrice !== undefined) {
    pricing.egg_price = eggPrice;
  }

  if (discount) {
    const discountType = pickString(discount, 'type');
    const discountValue = toNumber(discount.value);

    if ((discountType === 'rate' || discountType === 'fixed') && discountValue !== undefined) {
      pricing.egg_discount = {
        type: discountType,
        value: discountValue,
      };
    }
  }

  return Object.keys(pricing).length ? pricing : undefined;
}

function sanitizeMetadata(source: AnyRecord) {
  const metadata = pickRecord(source, 'metadata') ?? source;
  const result: PetMetadata = {
    created_at: pickString(metadata, 'created_at', 'createdAt') || undefined,
    created_by: pickString(metadata, 'created_by', 'createdBy') || undefined,
    updated_at: pickString(metadata, 'updated_at', 'updatedAt') || undefined,
    updated_by: pickString(metadata, 'updated_by', 'updatedBy') || undefined,
  };

  return Object.values(result).some(Boolean) ? result : undefined;
}

function normalizeRarity(value: unknown): PetRarity {
  const normalized = toString(value).toUpperCase();
  if (
    normalized === 'C' ||
    normalized === 'B' ||
    normalized === 'A' ||
    normalized === 'S' ||
    normalized === 'SS' ||
    normalized === 'SSS'
  ) {
    return normalized;
  }

  return 'C';
}

function normalizeScope(value: unknown): FeatureScope {
  return toString(value).toUpperCase() === 'GLOBAL' ? 'GLOBAL' : 'PET';
}

function normalizeEffectiveEvent(value: unknown): FeatureEffectiveEvent {
  const normalized = toString(value).toUpperCase();
  if (
    normalized === 'DAILY_SIGNIN' ||
    normalized === 'EGG_PURCHASE' ||
    normalized === 'EGG_RESOLVE' ||
    normalized === 'BET_SETTLE' ||
    normalized === 'CHAT_STAMINA' ||
    normalized === 'MINIGAME'
  ) {
    return normalized;
  }

  return 'DAILY_SIGNIN';
}

export function getLocalizedLabel(text: LocalizedText | undefined) {
  if (!text) {
    return '-';
  }

  return text['zh-CN'] || text['en-US'] || Object.values(text)[0] || '-';
}

export function mapPetDefinition(item: unknown): PetDefinition {
  const record = isRecord(item) ? item : {};
  const display = pickRecord(record, 'display');

  return {
    pet_id: pickString(record, 'pet_id', 'petId', 'id') || 'unknown',
    name: sanitizeLocalizedText(record.name),
    rarity: normalizeRarity(record.rarity),
    enabled: pickBoolean(record, 'enabled'),
    obtainable_by_egg: pickBoolean(record, 'obtainable_by_egg', 'obtainableByEgg'),
    display: display
      ? {
          icon: pickString(display, 'icon') || undefined,
          cover: pickString(display, 'cover') || undefined,
          thumbnail: pickString(display, 'thumbnail') || undefined,
        }
      : undefined,
    description: sanitizeLocalizedText(record.description),
    abilities: sanitizeAbilities(record.abilities),
    pricing: sanitizePricing(record.pricing),
    metadata: sanitizeMetadata(record),
    raw: record,
  };
}

export function mapFeatureCatalogItem(item: unknown): FeatureCatalogItem {
  const record = isRecord(item) ? item : {};
  const paramsSchema = pickRecord(record, 'params_schema', 'paramsSchema') ?? {};

  return {
    feature_key: pickString(record, 'feature_key', 'featureKey', 'id') || 'unknown',
    name: sanitizeLocalizedText(record.name),
    scope: normalizeScope(record.scope),
    effective_event: normalizeEffectiveEvent(record.effective_event ?? record.effectiveEvent),
    params_schema: paramsSchema,
    enabled: pickBoolean(record, 'enabled'),
    metadata: sanitizeMetadata(record),
    raw: record,
  };
}

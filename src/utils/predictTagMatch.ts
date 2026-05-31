import type { PredictTagRecord } from '@/types/predictTag';

export function getPredictTagMatchers(tag: PredictTagRecord | string) {
  if (typeof tag === 'string') {
    return [tag.trim()].filter(Boolean);
  }

  return [tag.slug, tag.name, tag.cnName].map((item) => item.trim()).filter(Boolean);
}

export function marketMatchesPredictTag(
  market: { tags: string[] },
  tag: PredictTagRecord | string,
) {
  const matchers = getPredictTagMatchers(tag);
  if (!matchers.length) {
    return false;
  }

  const keySet = new Set(matchers.map((key) => key.toLowerCase()));
  return market.tags.some((marketTag) => keySet.has(marketTag.toLowerCase()));
}

import { apiFetch } from './client';
import type { PriceTierMetadata } from './types';

export function fetchPriceTierMetadata(): Promise<PriceTierMetadata> {
  return apiFetch<PriceTierMetadata>('/meta/price-tiers');
}

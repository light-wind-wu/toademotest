import seedData from '@/data/dsta-participants.json';
import type { DSTAEngagementEntry } from './types';

const REGISTRY_KEY = 'dsta_participants';
type RegistryEntry = { email: string; engagements: DSTAEngagementEntry[] };

function loadRaw(): RegistryEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : (seedData as RegistryEntry[]);
  } catch {
    return seedData as RegistryEntry[];
  }
}

export function getEngagements(email: string): DSTAEngagementEntry[] {
  return loadRaw().find(p => p.email === email)?.engagements ?? [];
}

export function addEngagement(email: string, entry: DSTAEngagementEntry): void {
  const data = loadRaw();
  const idx  = data.findIndex(p => p.email === email);
  const existing = idx >= 0 ? data[idx].engagements : [];
  if (existing.some(e => e.year === entry.year && e.title === entry.title)) return;
  if (idx >= 0) {
    data[idx] = { ...data[idx], engagements: [...existing, entry] };
  } else {
    data.push({ email, engagements: [entry] });
  }
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
}

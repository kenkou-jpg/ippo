import type { ConsentLevel } from "../../policies";

// Maps each data-use category to the minimum consent level required
export const DATA_USE_REQUIREMENTS: Record<string, ConsentLevel> = {
  record:     0,   // personal access always allowed
  case:       0,   // owner can always view own case
  analytics:  1,   // anonymous statistics: L1+
  similarity: 2,   // similar-case search: L2+
  research:   3,   // external research: L3
} as const;

export type DataUseCategory = keyof typeof DATA_USE_REQUIREMENTS;

export function requiredLevelFor(category: DataUseCategory): ConsentLevel {
  return DATA_USE_REQUIREMENTS[category] ?? (3 as ConsentLevel);
}

export function isAllowed(
  category: DataUseCategory,
  currentLevel: ConsentLevel,
  isRevoked: boolean,
): boolean {
  if (isRevoked) return false;
  return currentLevel >= requiredLevelFor(category);
}

// Allowed uses per level (cumulative)
export const ALLOWED_USES_BY_LEVEL: Record<ConsentLevel, string[]> = {
  0: ["record", "case"],
  1: ["record", "case", "analytics"],
  2: ["record", "case", "analytics", "similarity"],
  3: ["record", "case", "analytics", "similarity", "research"],
};

export function allowedUsesFor(level: ConsentLevel): string[] {
  return ALLOWED_USES_BY_LEVEL[level] ?? [];
}

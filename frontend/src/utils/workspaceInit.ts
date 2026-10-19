/**
 * Picks the starting state for a workspace slice (brand profile, findings, graph).
 *
 * Demo data belongs only to the demo user. Any other user starts from their own saved state, or from an
 * EMPTY workspace. Never fall back to demo data: a real user must not see synthetic findings as their own.
 */
export function loadWorkspaceState<T>(
  isDemoUser: boolean,
  savedJson: string | null,
  demoValue: T,
  emptyValue: T,
  isValid: (value: unknown) => boolean,
): T {
  if (isDemoUser) return demoValue;
  if (!savedJson) return emptyValue;
  try {
    const parsed = JSON.parse(savedJson);
    return isValid(parsed) ? (parsed as T) : emptyValue;
  } catch {
    return emptyValue;
  }
}

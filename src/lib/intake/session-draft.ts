import { GUIDED_INTAKE_STORAGE_KEY, GuidedIntakeDraft } from './types';

export function loadGuidedIntakeDraft(): GuidedIntakeDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(GUIDED_INTAKE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuidedIntakeDraft;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGuidedIntakeDraft(draft: GuidedIntakeDraft): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    GUIDED_INTAKE_STORAGE_KEY,
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
  );
}

export function clearGuidedIntakeDraft(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(GUIDED_INTAKE_STORAGE_KEY);
}

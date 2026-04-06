export interface LocalPrivacyPreferences {
  rememberOnDevice: boolean;
}

export const LOCAL_PRIVACY_STORAGE_KEY = "willing-ways-ai:local-privacy";

export const DEFAULT_LOCAL_PRIVACY_PREFERENCES: LocalPrivacyPreferences = {
  rememberOnDevice: false,
};

export function normalizeLocalPrivacyPreferences(
  value: unknown,
): LocalPrivacyPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_LOCAL_PRIVACY_PREFERENCES;
  }

  const candidate = value as Partial<LocalPrivacyPreferences>;

  return {
    rememberOnDevice: candidate.rememberOnDevice === true,
  };
}

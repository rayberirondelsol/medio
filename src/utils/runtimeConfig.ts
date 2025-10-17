const PLACEHOLDER_VALUES = new Set<string>([
  '$REACT_APP_API_URL',
  '__REACT_APP_API_URL__',
]);

export const resolveApiBaseUrl = (): string | undefined => {
  const normalizedFromProcess = normalizeCandidate(process.env.REACT_APP_API_URL);
  if (normalizedFromProcess) {
    return normalizedFromProcess;
  }

  if (typeof window !== 'undefined' && window.__ENV__) {
    const normalizedRuntime = normalizeCandidate(window.__ENV__.REACT_APP_API_URL);
    if (normalizedRuntime) {
      return normalizedRuntime;
    }
  }

  return undefined;
};

export const resolveApiBaseUrlOrDefault = (fallback: string): string => {
  return resolveApiBaseUrl() ?? fallback;
};

const normalizeCandidate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return undefined;
  }

  if (PLACEHOLDER_VALUES.has(trimmed)) {
    return undefined;
  }

  return trimmed;
};

declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>;
  }
}

export {}; // Ensure this file is treated as a module.

import "dotenv/config";

export type Provider = "ollama" | "openrouter";

export interface Config {
  provider: Provider;
  model: string;
  cacheDir: string | undefined;
  verbose: 0 | 1 | 2;
}

export const DEFAULT_MODEL = "ministral-3:14b";

function parseVerbose(value: string | undefined): 0 | 1 | 2 {
  return value === "0" ? 0 : value === "2" ? 2 : 1;
}

function parseProvider(value: string | undefined): Provider {
  if (value === undefined || value === "ollama") return "ollama";
  if (value === "openrouter") return "openrouter";
  throw new Error(`Unknown provider "${value}". Use "ollama" or "openrouter".`);
}

/** Resolve config: explicit overrides win, then env vars, then defaults. */
export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    provider: overrides.provider ?? parseProvider(process.env.NLT_PROVIDER),
    model: overrides.model ?? process.env.NLT_MODEL ?? DEFAULT_MODEL,
    cacheDir: overrides.cacheDir ?? process.env.NLT_CACHE_DIR,
    verbose: overrides.verbose ?? parseVerbose(process.env.NLT_VERBOSE),
  };
}

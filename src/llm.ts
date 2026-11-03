import { createOllama } from "ai-sdk-ollama";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Stagehand, AISdkClient, type V3Options } from "@browserbasehq/stagehand";
import { loadConfig, type Config } from "./config.js";

// AISdkClient does not expose the model it wraps, so we keep it reachable.
class AISdkClientWithLanguageModel extends AISdkClient {
  private modelInstance: any;
  constructor(config: { model: any }) {
    super(config);
    this.modelInstance = config.model;
  }
  getLanguageModel() {
    return this.modelInstance;
  }
}

function createModel(provider: Config["provider"], modelName: string) {
  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
    return createOpenRouter({ apiKey })(modelName);
  }
  const ollama = createOllama({
    baseURL: process.env.NGROK_URL || "http://localhost:11434",
    // Bypasses ngrok's HTML interstitial page.
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  return ollama(modelName);
}

export function createStagehand(
  overrides: Partial<Config> = {},
  stagehandOptions: Partial<V3Options> = {},
): Stagehand {
  const config = loadConfig(overrides);
  return new Stagehand({
    env: "LOCAL",
    verbose: config.verbose,
    ...(config.cacheDir ? { cacheDir: config.cacheDir } : {}),
    ...stagehandOptions,
    llmClient: new AISdkClientWithLanguageModel({
      model: createModel(config.provider, config.model),
    }),
  });
}

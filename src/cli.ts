import { parseArgs } from "node:util";
import { loadConfig, type Provider } from "./config.js";
import { createStagehand } from "./llm.js";
import { loadTestCase } from "./parsers.js";
import { Runner } from "./runner.js";

const USAGE = `Usage: nlt run <testcase.(txt|jsonl|json)> [options]

Options:
  --url <url>          Start URL (required for .jsonl)
  --provider <name>    ollama | openrouter   (env NLT_PROVIDER)
  --model <name>       model id              (env NLT_MODEL)
  --cache-dir <dir>    Stagehand action cache (env NLT_CACHE_DIR)
  --verify             Verify every step with an LLM check
  --keep-open          Leave the browser open afterwards
  -h, --help           Show this help`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string" },
      provider: { type: "string" },
      model: { type: "string" },
      "cache-dir": { type: "string" },
      verify: { type: "boolean", default: false },
      "keep-open": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const [command, file] = positionals;
  if (values.help || command !== "run" || !file) {
    console.error(USAGE);
    return values.help ? 0 : 1;
  }

  const config = loadConfig({
    ...(values.provider ? { provider: values.provider as Provider } : {}),
    ...(values.model ? { model: values.model } : {}),
    ...(values["cache-dir"] ? { cacheDir: values["cache-dir"] } : {}),
  });

  const testCase = loadTestCase(file, values.url);
  const stagehand = createStagehand(config);
  await stagehand.init();

  try {
    const result = await new Runner(stagehand, {
      verifyAll: values.verify,
    }).run(testCase);
    console.log(
      `\n${result.success ? "PASSED" : "FAILED"}: ${result.name} ` +
        `(${result.steps.filter((s) => s.success).length}/${testCase.steps.length} steps, ${result.durationMs}ms)`,
    );
    return result.success ? 0 : 1;
  } finally {
    if (!values["keep-open"]) await stagehand.close();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);

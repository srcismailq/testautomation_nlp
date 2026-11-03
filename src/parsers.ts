import fs from "node:fs";
import path from "node:path";
import { TestCaseSchema, type Step, type TestCase } from "./schema.js";

/**
 * Legacy text format: `;`-separated commands, optional first `url:<address>`.
 */
export function parseTextTestCase(content: string, name?: string): TestCase {
  const parts = content
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const first = parts[0];
  if (!first || !first.startsWith("url:")) {
    throw new Error('Text test case must start with "url:<address>;"');
  }
  const url = first.slice("url:".length).trim();
  const steps: Step[] = parts.slice(1).map((instruction) => ({ instruction }));
  return TestCaseSchema.parse({ ...(name ? { name } : {}), url, steps });
}

/**
 * Recorder format: one JSON object per line with `instruction` and optional
 * `element.target`. The URL is not part of the file, so it is supplied.
 */
export function parseJsonlTestCase(
  content: string,
  url: string,
  name?: string,
): TestCase {
  const steps: Step[] = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line, i) => {
      let raw: any;
      try {
        raw = JSON.parse(line);
      } catch {
        throw new Error(`Invalid JSON on line ${i + 1}`);
      }
      const target = raw?.element?.target;
      return {
        instruction: raw?.instruction,
        ...(target
          ? {
              element: {
                tag: target.tag,
                selector: target.selector,
                text: target.text,
                attributes: target.attributes,
              },
            }
          : {}),
        ...(raw?.assert ? { assert: raw.assert } : {}),
      };
    });
  return TestCaseSchema.parse({ ...(name ? { name } : {}), url, steps });
}

/** Native format: a JSON file matching TestCaseSchema. */
export function parseJsonTestCase(content: string): TestCase {
  return TestCaseSchema.parse(JSON.parse(content));
}

/** Pick a parser from the file extension. `url` is required for .jsonl. */
export function loadTestCase(filePath: string, url?: string): TestCase {
  const content = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(filePath, path.extname(filePath));
  switch (path.extname(filePath).toLowerCase()) {
    case ".txt":
      return parseTextTestCase(content, name);
    case ".jsonl":
      if (!url) throw new Error(".jsonl test cases need a URL (--url)");
      return parseJsonlTestCase(content, url, name);
    case ".json":
      return parseJsonTestCase(content);
    default:
      throw new Error(`Unsupported test case file: ${filePath}`);
  }
}

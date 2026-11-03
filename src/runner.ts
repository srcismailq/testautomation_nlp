import { z } from "zod";
import type { Stagehand } from "@browserbasehq/stagehand";
import type { Step, StepResult, TestCase, TestResult } from "./schema.js";

export interface RunnerOptions {
  /** Delay between act and the verification, letting the UI settle. */
  settleMs?: number;
  /** Verify every step with extract(), not only steps that have `assert`. */
  verifyAll?: boolean;
  log?: (msg: string) => void;
}

const VerdictSchema = z.object({
  success: z.boolean().describe("True if the expectation holds"),
  reason: z.string().describe("Brief reasoning"),
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function buildPrompt(step: Step): string {
  const el = step.element;
  if (!el) return step.instruction;
  const context = [
    el.tag && `Tag: ${el.tag}`,
    el.selector && `Selector: ${el.selector}`,
    el.text && `Text: ${el.text}`,
    el.attributes && `Attributes: ${JSON.stringify(el.attributes)}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `Instruction: "${step.instruction}"\n\nFocus on this element:\n${context}`;
}

export class Runner {
  private readonly settleMs: number;
  private readonly verifyAll: boolean;
  private readonly log: (msg: string) => void;

  constructor(
    private readonly stagehand: Stagehand,
    options: RunnerOptions = {},
  ) {
    this.settleMs = options.settleMs ?? 1000;
    this.verifyAll = options.verifyAll ?? false;
    this.log = options.log ?? console.log;
  }

  async run(testCase: TestCase): Promise<TestResult> {
    const started = Date.now();
    const results: StepResult[] = [];
    const page = await this.stagehand.context.awaitActivePage();

    this.log(`Navigating to ${testCase.url}`);
    await page.goto(testCase.url);

    for (const step of testCase.steps) {
      const result = await this.runStep(step);
      results.push(result);
      this.log(
        `${result.success ? "PASS" : "FAIL"}: ${step.instruction}` +
          (result.message ? ` (${result.message})` : ""),
      );
      if (!result.success) break;
    }

    return {
      name: testCase.name ?? testCase.url,
      success:
        results.length === testCase.steps.length &&
        results.every((r) => r.success),
      steps: results,
      durationMs: Date.now() - started,
    };
  }

  private async runStep(step: Step): Promise<StepResult> {
    const started = Date.now();
    const done = (success: boolean, message?: string): StepResult => ({
      step,
      success,
      ...(message ? { message } : {}),
      durationMs: Date.now() - started,
    });

    try {
      const act = await this.stagehand.act(buildPrompt(step));
      if (!act.success) return done(false, act.message);

      if (step.assert || this.verifyAll) {
        await new Promise((r) => setTimeout(r, this.settleMs));
        const expectation =
          step.assert ?? `The action "${step.instruction}" was accomplished.`;
        const verdict = await this.stagehand.extract(
          `Check the current page state. Expectation: ${expectation}`,
          VerdictSchema,
        );
        if (!verdict.success) return done(false, verdict.reason);
        return done(true, verdict.reason);
      }
      return done(true);
    } catch (e) {
      return done(false, errMsg(e));
    }
  }
}

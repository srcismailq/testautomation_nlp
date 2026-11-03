import { z } from "zod";

export const ElementContextSchema = z.object({
  tag: z.string().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const StepSchema = z.object({
  instruction: z.string().min(1),
  element: ElementContextSchema.optional(),
  // Natural-language expectation checked after the step runs.
  assert: z.string().min(1).optional(),
});

export const TestCaseSchema = z.object({
  name: z.string().optional(),
  url: z.string().min(1),
  steps: z.array(StepSchema).min(1),
});

export type ElementContext = z.infer<typeof ElementContextSchema>;
export type Step = z.infer<typeof StepSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;

export interface StepResult {
  step: Step;
  success: boolean;
  message?: string;
  durationMs: number;
}

export interface TestResult {
  name: string;
  success: boolean;
  steps: StepResult[];
  durationMs: number;
}

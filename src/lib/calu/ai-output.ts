import { z } from "zod";

export const AiFoodSchema = z.object({
  name: z.string().min(1).max(80),
  estimatedQuantity: z.number().positive().max(10000).optional(),
  quantity: z.number().positive().max(10000).optional(),
  unit: z.string().max(20).optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  identificationConfidence: z.number().min(0).max(1).nullable().optional(),
  portionConfidence: z.number().min(0).max(1).nullable().optional(),
  preparation: z.string().max(80).optional(),
  calories: z.number().min(0).max(8000).nullable().optional(),
  protein: z.number().min(0).max(500).nullable().optional(),
  carbohydrates: z.number().min(0).max(800).nullable().optional(),
  fat: z.number().min(0).max(500).nullable().optional(),
  fiber: z.number().min(0).max(200).nullable().optional(),
});

export const AiAnalysisSchema = z.object({
  mealType: z.string().max(40).optional(),
  foods: z.array(AiFoodSchema).max(12),
  uncertainties: z.array(z.string().max(180)).max(6).optional(),
  insight: z.string().max(400).optional(),
});

export function validateAiAnalysis(raw: unknown): unknown | null {
  const parsed = AiAnalysisSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

import { z } from 'zod'

export const diagnosticActionSchema = z.union([
  z.tuple([z.enum(['supply', 'forward', 'reverse', 'stop', 'trip', 'reset']), z.boolean()]),
  z.tuple([z.literal('measure'), z.string().max(24), z.string().max(24)]),
  z.tuple([z.literal('inspect'), z.string().max(24)]),
])
export type DiagnosticAction = z.infer<typeof diagnosticActionSchema>
export const diagnosticAnswerSchema = z
  .object({
    version: z.literal(1),
    actions: z.array(diagnosticActionSchema).max(24),
    location: z.string().max(24),
    mechanism: z.string().max(24),
    hint: z.boolean(),
  })
  .strict()
export type DiagnosticAnswer = z.infer<typeof diagnosticAnswerSchema>
export const diagnosticDraftSchema = z
  .object({
    sessionId: z.uuid(),
    exerciseId: z.string().max(100),
    version: z.literal(1),
    answer: diagnosticAnswerSchema,
    updatedAt: z.iso.datetime(),
  })
  .strict()
export type DiagnosticDraft = z.infer<typeof diagnosticDraftSchema>
export function emptyDiagnosticAnswer(): DiagnosticAnswer {
  return { version: 1, actions: [], location: '', mechanism: '', hint: false }
}

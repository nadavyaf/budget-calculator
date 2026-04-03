import { z } from 'zod'

export const CreateSnapshotSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  is_draft: z.boolean().default(false),
})

export const ListSnapshotsSchema = z.object({
  year: z.coerce.number().int().optional(),
  draft: z.enum(['true', 'false']).optional(),
})

export type CreateSnapshot = z.infer<typeof CreateSnapshotSchema>
export type ListSnapshotsQuery = z.infer<typeof ListSnapshotsSchema>

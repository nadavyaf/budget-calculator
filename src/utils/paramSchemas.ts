import { z } from 'zod'

export const IdParam = z.object({ id: z.string().cuid() })
export const IdIidParam = z.object({ id: z.string().cuid(), iid: z.string().cuid() })
export const IdEidParam = z.object({ id: z.string().cuid(), eid: z.string().cuid() })
export const IdSidParam = z.object({ id: z.string().cuid(), sid: z.string().cuid() })

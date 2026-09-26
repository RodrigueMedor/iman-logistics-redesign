import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Parses req.body / req.query with a zod schema and returns a 400 on failure.
export function parse<T extends z.ZodType>(schema: T, value: unknown, message = 'Please check the submitted fields and try again.'): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new HttpError(400, issue?.message && !issue.message.startsWith('Invalid') ? issue.message : message)
  }
  return result.data
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found.' })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) return void res.status(error.status).json({ error: error.message })
  if (error?.type === 'entity.parse.failed') return void res.status(400).json({ error: 'Invalid JSON body.' })
  if (error?.type === 'entity.too.large') return void res.status(413).json({ error: 'Request body is too large.' })
  // Postgres permission errors from row-level security or column grants.
  if (error?.code === '42501') return void res.status(403).json({ error: error.message || 'You do not have permission to do this.' })
  console.error(error)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

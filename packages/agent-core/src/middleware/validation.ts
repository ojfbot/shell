import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: { message: 'Validation failed', statusCode: 400, details: error.errors },
        })
      } else {
        next(error)
      }
    }
  }
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: { message: 'Query validation failed', statusCode: 400, details: error.errors },
        })
      } else {
        next(error)
      }
    }
  }
}

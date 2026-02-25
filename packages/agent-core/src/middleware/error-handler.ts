import { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  details?: unknown
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  console.error('API Error:', {
    path: req.path,
    method: req.method,
    statusCode,
    message,
    stack: err.stack,
    details: err.details,
  })

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details,
      }),
    },
  })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
    },
  })
}

import rateLimit from 'express-rate-limit'

export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Rate limit exceeded for chat. Please try again later.',
    retryAfter: 'See Retry-After header',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
})

export const streamLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Streaming rate limit exceeded',
      retryAfter: res.getHeader('RateLimit-Reset'),
      limit: res.getHeader('RateLimit-Limit'),
      message: 'Streaming keeps connections open and is resource-intensive',
    })
  },
})

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

export const devLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Rate limit exceeded (dev mode)',
  standardHeaders: true,
  legacyHeaders: false,
})

export function getRateLimiter(type: 'standard' | 'chat' | 'stream' | 'strict') {
  if (process.env.NODE_ENV === 'development') {
    return devLimiter
  }
  switch (type) {
    case 'chat':    return chatLimiter
    case 'stream':  return streamLimiter
    case 'strict':  return strictLimiter
    case 'standard':
    default:        return standardLimiter
  }
}

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log server-side for diagnostics, but never leak internals to browser
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Server Error]:', err.message || err);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    res.status(400).json({
      success: false,
      message: messages[0] || 'Invalid input data.',
    });
    return;
  }

  // Handle JSON parse error (e.g. malformed body)
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload.',
    });
    return;
  }

  // Handle oversized entity
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'Request payload too large.',
    });
    return;
  }

  // Default fallback internal error
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.clientMessage || 'An unexpected error occurred. Please try again.',
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
};

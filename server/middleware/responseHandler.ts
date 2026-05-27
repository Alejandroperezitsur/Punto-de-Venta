import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Response {
      jsonResponse(data: any, meta?: any): void;
      jsonError(message: string, status?: number, code?: string | null): void;
    }
  }
}

export const responseHandler = (req: Request, res: Response, next: NextFunction) => {
  res.jsonResponse = (data: any, meta = {}) => {
    res.json({
      data,
      error: null,
      meta,
    });
  };

  res.jsonError = (message: string, status = 500, code: string | null = null) => {
    res.status(status).json({
      data: null,
      error: { message, code },
    });
  };

  next();
};

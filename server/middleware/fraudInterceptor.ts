import { Request, Response, NextFunction } from 'express';
const { evaluateSaleRisk, logFraudAlert } = require('../services/fraudDetectionService');

export const fraudInterceptor = (req: any, res: Response, next: NextFunction) => {
  // We only care about POST /api/sales
  if (req.method === 'POST' && req.user) {
    const originalJson = res.json.bind(res);
    
    // Override res.json to catch the response after the sale is created
    res.json = function (body: any) {
      if (res.statusCode === 201 || res.statusCode === 200) {
        const saleData = body?.data || body;
        
        // Non-blocking fraud evaluation
        evaluateSaleRisk(req.user.uid, req.user.storeId, req.body)
          .then((risk: any) => {
            if (risk.alert) {
              logFraudAlert(req.user.uid, req.user.storeId, risk);
            }
          })
          .catch(() => {
            // Silently fail to not affect user experience
          });
      }
      return originalJson(body);
    } as any;
  }
  next();
};

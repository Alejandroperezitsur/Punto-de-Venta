export interface ApiOptions {
  method?: string;
  body?: string | FormData;
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
}

export declare function api(path: string, options?: ApiOptions): Promise<any>;
export declare function get(path: string): Promise<any>;
export declare function getProducts(cursor?: string, take?: number): Promise<any>;
export declare function getCustomers(): Promise<any>;
export declare function getProductBySku(sku: string): Promise<any>;
export declare function createSale(payload: unknown): Promise<any>;
export declare function openCash(opening_balance?: number): Promise<any>;
export declare function closeCash(counted_cash: number): Promise<any>;
export declare function getCashSession(): Promise<any>;
export declare function getCashMovements(): Promise<any>;
export declare function getCashHistory(): Promise<any>;
export declare function getReport(kind: string, params?: Record<string, unknown>): Promise<any>;
export declare function getAudits(params?: Record<string, unknown>): Promise<any>;
export declare function getAuditEvents(): Promise<any>;
export declare function getMetrics(): Promise<any>;

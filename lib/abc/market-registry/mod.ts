export interface RegisterPdsResult {
  ok: boolean;
  error?: string;
}

export interface MarketRegistry {
  registerPds(hostname: string): Promise<RegisterPdsResult>;
}

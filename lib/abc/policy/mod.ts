export interface PolicyViolation {
  msg: string;
  policyId: string;
}

export interface PolicyResult {
  allow: boolean;
  violations: PolicyViolation[];
}

export interface PolicyHandler<T = Record<string, unknown>> {
  readonly name: string;
  evaluate(ctx: T): Promise<PolicyResult>;
}

export interface PolicyRegistry {
  get(name: string): PolicyHandler | undefined;
  names(): string[];
}

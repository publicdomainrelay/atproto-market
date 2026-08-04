export const POLICY_WORKER_TIMEOUT_MS = 30_000;

export type PolicyWorkerRpcMethod = "resolve" | "resolveOperatorDid" | "getVouchedDids";

export interface PolicyWorkerEvaluateMessage {
  type: "evaluate";
  policyName: string;
  args: Record<string, unknown>;
  perspective: "bidder" | "requester";
  selfDid: string;
  subjectDid: string;
  rootRequesterDid: string;
  counterpartyDid: string;
  policyRef?: { uri: string; cid: string };
  demand?: { rfpRef: { uri: string; cid: string }; payloadRef: { uri: string; cid: string }; payloadNsid: string; payload?: Record<string, unknown> };
  offer?: { bidRef: { uri: string; cid: string }; payloadRef: { uri: string; cid: string }; payloadNsid: string; payload?: Record<string, unknown> };
}

export interface PolicyWorkerRpcResultMessage {
  type: "rpc-result";
  id: number;
  ok: boolean;
  value?: unknown;
  error?: string;
}

export type PolicyWorkerInbound = PolicyWorkerEvaluateMessage | PolicyWorkerRpcResultMessage;

export interface PolicyWorkerRpcMessage {
  type: "rpc";
  id: number;
  method: PolicyWorkerRpcMethod;
  arg: unknown;
}

export interface PolicyWorkerLogMessage {
  type: "log";
  level: string;
  msg: string;
  meta?: Record<string, unknown>;
}

export interface PolicyWorkerResultMessage {
  type: "result";
  allow: boolean;
  violations: Array<{ msg: string; policyId: string | { uri: string; cid: string } }>;
}

export interface PolicyWorkerErrorMessage {
  type: "error";
  message: string;
}

export type PolicyWorkerOutbound =
  | PolicyWorkerRpcMessage
  | PolicyWorkerLogMessage
  | PolicyWorkerResultMessage
  | PolicyWorkerErrorMessage;

export interface TrustSetSnapshot {
  operators: string[];
  associated: Record<string, string[]>;
  vouches: Record<string, string[]>;
}

export interface PolicyHost {
  resolveOperator(did: string): Promise<string | null>;
  getVouchedDids(did: string): Promise<Set<string>>;
  getTrustSet(): Promise<TrustSetSnapshot>;
  getRecord(ref: { uri: string; cid: string }): Promise<Record<string, unknown>>;
  log(level: string, msg: string, meta?: Record<string, unknown>): void;
}

export const UNKNOWN_POLICY_ENGINE = "unknown-policy-engine";
export const LOCAL_EXEC_DISABLED = "local-policy-exec-disabled";
export const UNTRUSTED_EXEC_DISABLED = "untrusted-policy-exec-disabled";

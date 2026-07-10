export interface CallerIdentity {
  did: string;
}

export interface GatewayContractState {
  callerDid: string;
  rfpUri: string;
  rfpCid: string;
  winnerDid?: string;
  winnerBidUri?: string;
  winnerBidCid?: string;
  winnerBidConfig?: Record<string, unknown>;
  acceptUri?: string;
  acceptCid?: string;
  receiptUri?: string;
  receiptCid?: string;
  receiptOk?: boolean;
  bids: GatewayBidEntry[];
  events: GatewayEventEntry[];
  status: "bidding" | "winner_selected" | "accepted" | "receipt_verified" |
    "terminated";
}

export interface GatewayBidEntry {
  bidderDid: string;
  bidUri: string;
  bidCid: string;
  cost: number;
}

export interface GatewayEventEntry {
  type: string;
  timestamp: string;
}

export interface ComputeRequestVMInput {
  computeVm: Record<string, unknown>;
  sshPublicKey: string;
  bidWindowSec?: number;
  vmReadyTimeoutSec?: number;
  execProgram?: string;
  skipSsh?: boolean;
  keepVm?: boolean;
  policyMode?: "only-me" | "tangled-vouch" | "mutuals" | "dynamic";
  extraBidderDids?: string[];
  tokens: GatewayTokens;
}

export interface ComputeRequestWorkerInput {
  source: string;
  denoJson: string;
  denoLock?: string;
  persistent?: boolean;
  bidWindowSec?: number;
  extraBidderDids?: string[];
  tokens: GatewayTokens;
}

export interface GatewayTokens {
  submitRfp: string;
  submitAccept: string;
  createRecord: string;
  submitEvent?: string;
}

export interface GatewayComputeResponse {
  receiptUri?: string;
  receiptCid?: string;
  receiptOk?: boolean;
  sshReady?: boolean;
  sshExitCode?: number;
  websocatUrl?: string;
  vmFqdn?: string;
  winnerDid?: string;
  winnerBidUri?: string;
  winnerBidCid?: string;
  winnerBidConfig?: Record<string, unknown>;
  rfpUri?: string;
  rfpCid?: string;
  bids?: GatewayBidEntry[];
  error?: string;
}
import type {
  CallerIdentity,
  ComputeRequestVMInput,
  ComputeRequestWorkerInput,
  GatewayComputeResponse,
} from "@publicdomainrelay/compute-contract-gateway-common";

export interface ComputeContractGateway {
  did: string;
  beginServe(): Promise<void>;
  dispose(): Promise<void>;
  requestComputeVM(
    caller: CallerIdentity,
    input: ComputeRequestVMInput,
  ): Promise<GatewayComputeResponse>;
  requestComputeWorkerEphemeral(
    caller: CallerIdentity,
    input: ComputeRequestWorkerInput,
  ): Promise<GatewayComputeResponse>;
  requestComputeWorkerPersistent(
    caller: CallerIdentity,
    input: ComputeRequestWorkerInput,
  ): Promise<GatewayComputeResponse>;
  deleteCompute(
    caller: CallerIdentity,
    receiptUri: string,
    receiptCid: string,
    token: string,
  ): Promise<{ ok: boolean }>;
}
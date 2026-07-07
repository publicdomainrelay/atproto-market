import type {
  ComputeContractGateway,
} from "@publicdomainrelay/compute-contract-gateway-abc";
import type {
  CallerIdentity,
  ComputeRequestVMInput,
  ComputeRequestWorkerInput,
  GatewayComputeResponse,
} from "@publicdomainrelay/compute-contract-gateway-common";
import type { StructuredLoggerInterface } from "@publicdomainrelay/logger";
import type { RequesterPDS } from "@publicdomainrelay/requester-abc";
import type { ServeHandle } from "@publicdomainrelay/serve";

export interface GatewayOptions {
  logger: StructuredLoggerInterface;
  serve: ServeHandle;
  privateKeyHex?: string;
  plcDirectoryUrl?: string;
  dispatcherHost?: string;
  fedproxyHost?: string;
  label?: string;
  storagePath?: string;
  relayUrls?: string[];
}

export function createComputeContractGateway(
  opts: GatewayOptions,
): ComputeContractGateway {
  let pds: RequesterPDS | null = null;

  const gateway: ComputeContractGateway = {
    get did(): string {
      if (!pds) throw new Error("gateway not started");
      return pds.did;
    },

    async beginServe(): Promise<void> {
      const { createRequesterPDS } = await import(
        "@publicdomainrelay/requester-xrpc"
      );
      pds = await createRequesterPDS({
        logger: opts.logger,
        serve: opts.serve,
        privateKeyHex: opts.privateKeyHex,
        plcDirectoryUrl: opts.plcDirectoryUrl,
        dispatcherHost: opts.dispatcherHost,
        label: opts.label ?? "compute-contract-gateway",
        storagePath: opts.storagePath,
      });
      await pds.beginServe();
      opts.logger.info("gateway_ready", { did: pds.did });
    },

    async dispose(): Promise<void> {
      if (pds) await pds.dispose();
    },

    async requestComputeVM(
      _caller: CallerIdentity,
      input: ComputeRequestVMInput,
    ): Promise<GatewayComputeResponse> {
      if (!pds) throw new Error("gateway not started");

      const logger = opts.logger;
      const { runComputeContract, createSshSessionProvider } = await import(
        "@publicdomainrelay/requester-xrpc"
      );
      const { flattenLabel } = await import(
        "@publicdomainrelay/cloud-init-common"
      );

      const vmName = (input.computeVm.role as string) ||
        `compute-${crypto.randomUUID().slice(0, 8)}`;
      const fedproxyHost = opts.fedproxyHost ?? "fedproxy.com";

      const sshProvider = createSshSessionProvider(logger);

      const result = await runComputeContract(pds, {
        vmName,
        bidWindowSec: input.bidWindowSec,
        skipSsh: input.skipSsh ?? true,
        keepVm: input.keepVm ?? true,
        rbac: true,
        vmReadyTimeoutSec: input.vmReadyTimeoutSec,
        execProgram: input.execProgram,
        fedproxyHost,
        dispatcherHost: opts.dispatcherHost,
        sshProvider,
        logger,
        policyMode: input.policyMode,
        extraBidderDids: input.extraBidderDids,
        relayUrls: opts.relayUrls,
      });

      if (result.error) {
        return {
          error: result.error,
          rfpUri: result.rfpUri,
          rfpCid: result.rfpCid,
        };
      }

      const vmFqdn =
        `${flattenLabel(vmName)}--${flattenLabel(pds.did)}.${fedproxyHost}`;
      const websocatUrl = `wss://${vmFqdn}`;

      return {
        receiptUri: result.receiptUri,
        receiptCid: result.receiptCid,
        receiptOk: result.receiptOk,
        sshReady: result.sshReady,
        sshExitCode: result.sshExitCode,
        websocatUrl,
        vmFqdn,
        winnerDid: result.winnerDid,
        winnerBidUri: result.bidUri,
        winnerBidCid: result.bidCid,
        rfpUri: result.rfpUri,
        rfpCid: result.rfpCid,
        bids: (result.bids ?? 0) > 0
          ? [{
            bidderDid: result.winnerDid ?? "unknown",
            bidUri: result.bidUri ?? "",
            bidCid: result.bidCid ?? "",
            cost: 0,
          }]
          : [],
      };
    },

    async requestComputeWorkerEphemeral(
      _caller: CallerIdentity,
      input: ComputeRequestWorkerInput,
    ): Promise<GatewayComputeResponse> {
      if (!pds) throw new Error("gateway not started");

      const logger = opts.logger;
      const { runComputeContract, createSshSessionProvider } = await import(
        "@publicdomainrelay/requester-xrpc"
      );
      const { WORKER_MANIFEST_NSID } = await import(
        "@publicdomainrelay/compute-deno-common"
      );

      const vmName = `worker-${crypto.randomUUID().slice(0, 8)}`;
      const fedproxyHost = opts.fedproxyHost ?? "fedproxy.com";
      const sshProvider = createSshSessionProvider(logger);

      const result = await runComputeContract(pds, {
        vmName,
        bidWindowSec: input.bidWindowSec,
        skipSsh: true,
        keepVm: true,
        fedproxyHost,
        dispatcherHost: opts.dispatcherHost,
        sshProvider,
        logger,
        extraBidderDids: [],
        appliesToNsid: WORKER_MANIFEST_NSID,
      });

      if (result.error) {
        return { error: result.error, rfpUri: result.rfpUri, rfpCid: result.rfpCid };
      }

      return {
        receiptUri: result.receiptUri,
        receiptCid: result.receiptCid,
        receiptOk: result.receiptOk,
        winnerDid: result.winnerDid,
        rfpUri: result.rfpUri,
        rfpCid: result.rfpCid,
      };
    },

    async requestComputeWorkerPersistent(
      _caller: CallerIdentity,
      input: ComputeRequestWorkerInput,
    ): Promise<GatewayComputeResponse> {
      if (!pds) throw new Error("gateway not started");

      const logger = opts.logger;
      const { runComputeContract, createSshSessionProvider } = await import(
        "@publicdomainrelay/requester-xrpc"
      );
      const { WORKER_MANIFEST_NSID } = await import(
        "@publicdomainrelay/compute-deno-common"
      );

      const vmName = `worker-${crypto.randomUUID().slice(0, 8)}`;
      const fedproxyHost = opts.fedproxyHost ?? "fedproxy.com";
      const sshProvider = createSshSessionProvider(logger);

      const result = await runComputeContract(pds, {
        vmName,
        bidWindowSec: input.bidWindowSec,
        skipSsh: true,
        keepVm: true,
        fedproxyHost,
        dispatcherHost: opts.dispatcherHost,
        sshProvider,
        logger,
        extraBidderDids: [],
        appliesToNsid: WORKER_MANIFEST_NSID,
      });

      if (result.error) {
        return { error: result.error, rfpUri: result.rfpUri, rfpCid: result.rfpCid };
      }

      return {
        receiptUri: result.receiptUri,
        receiptCid: result.receiptCid,
        receiptOk: result.receiptOk,
        winnerDid: result.winnerDid,
        rfpUri: result.rfpUri,
        rfpCid: result.rfpCid,
      };
    },

    async deleteCompute(
      _caller: CallerIdentity,
      _receiptUri: string,
      _receiptCid: string,
      _token: string,
    ): Promise<{ ok: boolean }> {
      return { ok: true };
    },
  };

  return gateway;
}

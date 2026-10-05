# Context: test

Repository: `atproto-market`

This context exists so the atproto-market end-to-end and unit tests can exercise real local services under their production-shaped https URLs instead of hitting the public network. It provides exactly one shared piece of machinery, installFetchInterceptor, that every affected suite installs before starting its services and disposes afterwards, and it holds the suites that pin behaviour for each subsystem under test. Keeping the rewrite rules in one place is what lets dispatchers, bidders, gateways and fake PLCs bind to ephemeral localhost ports while the code under test still believes it is talking to plc.directory and to *.localhost hostnames, including TLS-terminating endpoints reached through a trusted self-signed CA.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

- `file:test/badge_blue_keys_binding_test.ts` file badge_blue_keys_binding_test.ts (test/badge_blue_keys_binding_test.ts)
- `file:test/bid_collector_test.ts` file bid_collector_test.ts (test/bid_collector_test.ts)
- `file:test/bidder_container_integration_test.ts` file bidder_container_integration_test.ts (test/bidder_container_integration_test.ts)
- `file:test/bidder_cross_platform_integration_test.ts` file bidder_cross_platform_integration_test.ts (test/bidder_cross_platform_integration_test.ts)
- `file:test/bidder_policy_only_me_integration_test.ts` file bidder_policy_only_me_integration_test.ts (test/bidder_policy_only_me_integration_test.ts)
- `file:test/bidder_prod_integration_test.ts` file bidder_prod_integration_test.ts (test/bidder_prod_integration_test.ts)
- `file:test/bidder_ssh_relay_test.ts` file bidder_ssh_relay_test.ts (test/bidder_ssh_relay_test.ts)
- `file:test/cloud_init_k3s_test.ts` file cloud_init_k3s_test.ts (test/cloud_init_k3s_test.ts)
- `file:test/cloud_init_snapshot_test.ts` file cloud_init_snapshot_test.ts (test/cloud_init_snapshot_test.ts)
- `file:test/defect1_gateway_did_test.ts` file defect1_gateway_did_test.ts (test/defect1_gateway_did_test.ts)
- `file:test/defect4_qr_session_test.ts` file defect4_qr_session_test.ts (test/defect4_qr_session_test.ts)
- `file:test/fetch-interceptor.ts` file fetch-interceptor.ts (test/fetch-interceptor.ts)
- `file:test/firehose_watcher_test.ts` file firehose_watcher_test.ts (test/firehose_watcher_test.ts)
- `file:test/gateway_caller_rbac_integration_test.ts` file gateway_caller_rbac_integration_test.ts (test/gateway_caller_rbac_integration_test.ts)
- `file:test/gateway_readme_smoke_test.ts` file gateway_readme_smoke_test.ts (test/gateway_readme_smoke_test.ts)
- `file:test/gateway_request_vm_integration_test.ts` file gateway_request_vm_integration_test.ts (test/gateway_request_vm_integration_test.ts)
- `file:test/gateway_ssh_integration_test.ts` file gateway_ssh_integration_test.ts (test/gateway_ssh_integration_test.ts)
- `file:test/gateway_worker_integration_test.ts` file gateway_worker_integration_test.ts (test/gateway_worker_integration_test.ts)
- `file:test/oauth_session_transfer_test.ts` file oauth_session_transfer_test.ts (test/oauth_session_transfer_test.ts)
- `file:test/offering_refresh_test.ts` file offering_refresh_test.ts (test/offering_refresh_test.ts)
- `file:test/registry_discovery_test.ts` file registry_discovery_test.ts (test/registry_discovery_test.ts)
- `file:test/secrets_capability_test.ts` file secrets_capability_test.ts (test/secrets_capability_test.ts)
- `function:c6f81957f952317eb0e87d2454b5add3` function installFetchInterceptor (test/fetch-interceptor.ts)
<!-- SPECD_MANAGED_END -->

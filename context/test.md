# Context: test

Repository: `atproto-market`

This context exists to hold the repository's verification surface: executable tests that pin down the behaviour of the bidder, gateway, and supporting subsystems against locally stood-up infrastructure instead of public network services. Its central mechanism is the shared fetch interceptor in test/fetch-interceptor.ts, which exists so that code under test that hardcodes public endpoints (plc.directory for identity resolution, https://*.localhost for per-service relays) can be driven against ephemeral local servers on arbitrary ports, and so that tests exercising TLS can trust a throwaway self-signed CA without touching the real certificate store. Keeping these tests in one context makes the assumptions they share — the host rewrite rules, the CA trust escape hatch, and the teardown contract — describable in one place, so a change to the interceptor's rewriting behaviour is visibly a change to every integration suite at once.

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
- `file:test/cloud_init_snapshot_test.ts` file cloud_init_snapshot_test.ts (test/cloud_init_snapshot_test.ts)
- `file:test/fetch-interceptor.ts` file fetch-interceptor.ts (test/fetch-interceptor.ts)
- `file:test/firehose_watcher_test.ts` file firehose_watcher_test.ts (test/firehose_watcher_test.ts)
- `file:test/gateway_caller_rbac_integration_test.ts` file gateway_caller_rbac_integration_test.ts (test/gateway_caller_rbac_integration_test.ts)
- `file:test/gateway_readme_smoke_test.ts` file gateway_readme_smoke_test.ts (test/gateway_readme_smoke_test.ts)
- `file:test/gateway_request_vm_integration_test.ts` file gateway_request_vm_integration_test.ts (test/gateway_request_vm_integration_test.ts)
- `file:test/gateway_ssh_integration_test.ts` file gateway_ssh_integration_test.ts (test/gateway_ssh_integration_test.ts)
- `file:test/gateway_worker_integration_test.ts` file gateway_worker_integration_test.ts (test/gateway_worker_integration_test.ts)
- `file:test/iroh_dumbpipe_install_test.ts` file iroh_dumbpipe_install_test.ts (test/iroh_dumbpipe_install_test.ts)
- `file:test/iroh_private_report_test.ts` file iroh_private_report_test.ts (test/iroh_private_report_test.ts)
- `file:test/iroh_transport_test.ts` file iroh_transport_test.ts (test/iroh_transport_test.ts)
- `file:test/oauth_session_transfer_test.ts` file oauth_session_transfer_test.ts (test/oauth_session_transfer_test.ts)
- `file:test/offering_refresh_test.ts` file offering_refresh_test.ts (test/offering_refresh_test.ts)
- `file:test/registry_discovery_test.ts` file registry_discovery_test.ts (test/registry_discovery_test.ts)
- `file:test/secrets_capability_test.ts` file secrets_capability_test.ts (test/secrets_capability_test.ts)
- `function:c6f81957f952317eb0e87d2454b5add3` function installFetchInterceptor (test/fetch-interceptor.ts)
- `function:e3d3a77238830bf93262540f2d74ffd6` function resolveDidKeyFromPlc (test/fetch-interceptor.ts)
<!-- SPECD_MANAGED_END -->

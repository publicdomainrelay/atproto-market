# Context: test

Repository: `atproto-market`

This context exists to hold the repository's verification surface: executable tests that pin down the behaviour of the bidder, gateway, and supporting subsystems against locally stood-up infrastructure instead of public network services. Its central mechanism is the shared fetch interceptor in test/fetch-interceptor.ts, which exists so that code under test that hardcodes public endpoints (plc.directory for identity resolution, https://*.localhost for per-service relays) can be driven against ephemeral local servers on arbitrary ports, and so that tests exercising TLS can trust a throwaway self-signed CA without touching the real certificate store. Keeping these tests in one context makes the assumptions they share — the host rewrite rules, the CA trust escape hatch, and the teardown contract — describable in one place, so a change to the interceptor's rewriting behaviour is visibly a change to every integration suite at once.

_The resolved code references are regenerated on every run. Cite the ids above rather than writing them here._

<!-- SPECD_MANAGED_BEGIN -->
## Resolved code references

_None yet._
<!-- SPECD_MANAGED_END -->

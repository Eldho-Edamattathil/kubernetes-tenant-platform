# Day 8 · Second tenant and namespace isolation

## Changes
- Created reporting-prod-demo with a Reporting Deployment and Service.
- Reused the local Node.js image with a small reporting responder.
- Added health probes, resource settings, and container security settings.
- Applied default-deny ingress and egress, with DNS egress allowed.

## Validation
User confirmed the expected results:
- Reporting health endpoint returned HTTP 200.
- A temporary test pod resolved Payments Service names across namespaces.
- Explicit egress permission was granted to the test pod for the targets.
- With app=payments-web, the Reporting test pod could not connect
  to the Payments API on TCP 8080.
- With app=payments-api, it could not connect to PostgreSQL on TCP 5432.
- Removed the temporary test pod and its egress policy.
- Payments retrieval and Reporting health checks passed afterward.

## Lessons
- A peer podSelector without namespaceSelector matches only pods
  in the NetworkPolicy's own namespace.
- Matching an app label in another namespace does not grant access.
- namespaceSelector and podSelector in one peer entry mean AND.
- Cross-namespace Service names include the destination namespace.
- DNS resolution can succeed while application connections are blocked.

## Limitations
- Tested Reporting-to-Payments isolation, not the reverse direction.
- No Cilium drop verdicts were captured.
- Reporting health was checked through localhost inside its container;
  normal Service ingress was not enabled or tested.
- Reporting currently reuses the Payments image with an overridden command.

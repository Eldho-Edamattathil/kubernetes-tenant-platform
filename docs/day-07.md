# Day 7 · NetworkPolicies

## Baseline
- Cilium was running.
- No standard or Cilium-specific network policies were present.
- A temporary network-test pod could connect to the API on TCP 8080
  and PostgreSQL on TCP 5432.

## Changes
- Added default-deny ingress and egress in payments-dev.
- Allowed DNS to CoreDNS in kube-system on TCP/UDP 53.
- Allowed frontend egress to the API and matching API ingress.
- Allowed API egress to PostgreSQL and matching PostgreSQL ingress.
- Kept ordinary frontend ingress blocked; local access uses port-forward.

## Validation
User confirmed the expected results:
- DNS resolution continued working from network-test.
- Connections from network-test to API and PostgreSQL were blocked.
- Frontend GET /payments returned successfully through the API.

## Lessons
- Ingress is incoming traffic; egress is outgoing traffic.
- Both source egress and destination ingress must permit a connection
  when both are restricted.
- Policies are additive and apply to existing pods without a rollout.
- Replies to allowed connections do not need separate reverse rules.
- Port-forward is not proof that ordinary frontend ingress is allowed.

## Limitations
- Combined restrictions were tested, not each direction independently.
- No Cilium drop verdicts were captured.
- Label-based rules assume permission to modify workload labels is controlled.

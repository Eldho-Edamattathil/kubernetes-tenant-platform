# Day 9 · Shared HTTP Gateway

## Setup
- Installed Gateway API v1.6.3 CRDs.
- Enabled Gateway API support in Cilium 1.20.4.
- Created shared-gateway in platform-gateway.
- Allowed HTTPRoutes from explicitly labelled tenant namespaces.
- Routed payments.local to payments-web:8080.
- Routed reporting.local to reporting:8080.
- Added Cilium policies allowing the ingress identity to reach
  the two frontends on TCP 8080.
- Installed cloud-provider-kind for local LoadBalancer access.

## Troubleshooting
- Gateway initially waited for a LoadBalancer address.
- cloud-provider-kind assigned 172.18.0.5 and mapped Mac port 32768.
- Requests from the Mac initially returned an empty reply.
- Gateway ClusterIP and node port 31981 returned HTTP 200.
- LoadBalancer configuration showed node health checks used
  /healthz on port 10256.
- Enabled Cilium kubeProxyReplacementHealthzBindAddr=0.0.0.0:10256.
- After restarting Cilium agents, node health and Mac access passed.

## Validation
User confirmed:
- Payments frontend: HTTP 200.
- Payments retrieval: HTTP 200.
- Reporting health: HTTP 200.
- Unknown hostname: HTTP 404.

## Local access
Keep cloud-provider-kind running:
sudo env DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock" \
  "$(command -v cloud-provider-kind)" \
  --gateway-channel=disabled --enable-lb-port-mapping

Find the current mapped port:
docker ps --filter name=kindccm \
  --format 'table {{.Names}}\t{{.Ports}}'

Example request using the port observed during this session:
curl -H 'Host: payments.local' http://127.0.0.1:32768/payments

## Limitations
- HTTP only; TLS is not configured.
- LoadBalancer addresses and mapped host ports may change.
- Mac DNS/hosts entries were not configured.
- Backend policies trust Cilium's ingress identity, not one named Gateway.
- Tenant isolation was not retested after adding Gateway access.
- Gateway CRDs must be installed separately when rebuilding the cluster.

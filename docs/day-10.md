# Day 10 · HTTPS on the shared Gateway

## What we achieved

Enabled HTTPS for payments.local and reporting.local using
cert-manager and our own local certificate authority (CA).

Both applications were already accessible through our shared
Cilium Gateway over HTTP. Today we added HTTPS.

## 1. Installed cert-manager

cert-manager manages certificate issuance and renewal.

```bash
helm --kubeconfig .lab/kubeconfig install \
  cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.21.3 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait --timeout=5m

kubectl --kubeconfig .lab/kubeconfig get pods -n cert-manager
```

The installation created three components:

- Controller: manages certificates.
- Webhook: validates cert-manager resources.
- CA injector: injects CA trust information into supported resources.

crds.enabled=true installs resource types such as Certificate and Issuer.

Saved installation values:

```bash
helm --kubeconfig .lab/kubeconfig get values cert-manager \
  -n cert-manager -o yaml > bootstrap/cert-manager-values.yaml
```

For a fresh cluster, install the same chart version using this values file.

## 2. Created a local CA

Configuration: platform/certificates/local-ca.yaml

This file defines:

- Issuer/local-selfsigned: bootstraps the self-signed CA certificate.
- Certificate/platform-local-ca: requests the CA certificate and key.
- Issuer/platform-local-ca: uses that CA to sign application certificates.

All three resources belong to platform-gateway.

```bash
kubectl --kubeconfig .lab/kubeconfig apply \
  -f platform/certificates/local-ca.yaml

kubectl --kubeconfig .lab/kubeconfig wait \
  -n platform-gateway \
  --for=condition=Ready certificate/platform-local-ca \
  --timeout=90s

kubectl --kubeconfig .lab/kubeconfig get issuers,certificates \
  -n platform-gateway
```

The CA certificate and private key are stored in the
platform-local-ca Secret.

## 3. Requested the application certificate

Configuration: platform/certificates/tenant-certificate.yaml

The Certificate resource requests one certificate covering:

- payments.local
- reporting.local

It uses Issuer/platform-local-ca and stores the resulting
certificate and private key in Secret/tenant-gateway-tls.

Configured validity: 90 days.
Configured renewal window: 15 days before expiry.

```bash
kubectl --kubeconfig .lab/kubeconfig apply \
  -f platform/certificates/tenant-certificate.yaml

kubectl --kubeconfig .lab/kubeconfig wait \
  -n platform-gateway \
  --for=condition=Ready certificate/tenant-gateway-tls \
  --timeout=90s

kubectl --kubeconfig .lab/kubeconfig get certificates \
  -n platform-gateway

kubectl --kubeconfig .lab/kubeconfig get secret tenant-gateway-tls \
  -n platform-gateway
```

The certificate became ready and its Secret type was kubernetes.io/tls.

## 4. Added HTTPS to the shared Gateway

Configuration: platform/gateway/shared-gateway.yaml

Retained the existing HTTP listener on port 80 and added:

```yaml
name: https
protocol: HTTPS
port: 443
tls:
  mode: Terminate
  certificateRefs:
    - kind: Secret
      name: tenant-gateway-tls
```

Terminate means that the Gateway handles TLS and decrypts the request.

The certificate Secret is in the same namespace as the Gateway.

The listener allows HTTPRoutes from namespaces labelled:

```yaml
shared-gateway-access: "true"
```

## 5. Attached both routes to HTTPS

Configuration: platform/gateway/tenant-routes.yaml

Added a second parent reference to each HTTPRoute:

```yaml
parentRefs:
  - name: shared-gateway
    namespace: platform-gateway
    sectionName: http
  - name: shared-gateway
    namespace: platform-gateway
    sectionName: https
```

Routing remains:

- payments.local → payments-web Service, port 8080.
- reporting.local → reporting Service, port 8080.

Applied both files:

```bash
kubectl --kubeconfig .lab/kubeconfig apply \
  -f platform/gateway/shared-gateway.yaml

kubectl --kubeconfig .lab/kubeconfig apply \
  -f platform/gateway/tenant-routes.yaml

kubectl --kubeconfig .lab/kubeconfig describe gateway \
  shared-gateway -n platform-gateway

kubectl --kubeconfig .lab/kubeconfig get service \
  -n platform-gateway
```

Both listeners reported Programmed=True with two attached routes.

## 6. Found the Mac HTTPS port

cloud-provider-kind remained running to provide the local LoadBalancer.

```bash
docker ps --filter name=kindccm \
  --format 'table {{.Names}}\t{{.Ports}}'
```

During this session:

| Mac port | Container port | Purpose |
|----------|----------------|---------|
| 32770 | 80 | HTTP |
| 32771 | 443 | HTTPS |
| 32772 | 10000 | LoadBalancer administration |

The generated Gateway Service exposed:

- HTTP: port 80, NodePort 31981.
- HTTPS: port 443, NodePort 32202.

Port mappings can change. Check them before repeating these tests.

## 7. Tested HTTPS with certificate verification

Exported only the public CA certificate:

```bash
kubectl --kubeconfig .lab/kubeconfig get secret platform-local-ca \
  -n platform-gateway \
  -o jsonpath='{.data.tls\.crt}' \
  | base64 -D > .lab/platform-local-ca.crt
```

base64 -D is the macOS decode option.

Payments frontend health:

```bash
curl --max-time 10 -i \
  --cacert .lab/platform-local-ca.crt \
  --resolve payments.local:32771:127.0.0.1 \
  https://payments.local:32771/healthz
```

Payments frontend → API → database:

```bash
curl --max-time 10 -i \
  --cacert .lab/platform-local-ca.crt \
  --resolve payments.local:32771:127.0.0.1 \
  https://payments.local:32771/payments
```

Reporting health:

```bash
curl --max-time 10 -i \
  --cacert .lab/platform-local-ca.crt \
  --resolve reporting.local:32771:127.0.0.1 \
  https://reporting.local:32771/healthz
```

All three tests were reported successful.

--cacert tells curl to trust our local CA while verifying the
server certificate.

--resolve connects to localhost while preserving the requested
hostname for TLS SNI, certificate verification, and HTTP routing.

We did not use -k to bypass certificate verification.

## What is encrypted?

Client-to-Gateway traffic uses HTTPS.

The Gateway terminates TLS and forwards HTTP to the application
on port 8080. Backend TLS was not configured.

## Limits and follow-up

- HTTP is still available; no HTTPS redirect was configured.
- Browsers do not automatically trust our local CA.
- Certificate renewal is configured but was not tested today.
- CA rotation and distribution of updated trust need separate planning.
- Generated private keys remain in Kubernetes Secrets, outside Git.
- Network isolation was not independently retested during this activity.

## Files saved

- bootstrap/cert-manager-values.yaml
- platform/certificates/local-ca.yaml
- platform/certificates/tenant-certificate.yaml
- platform/gateway/shared-gateway.yaml
- platform/gateway/tenant-routes.yaml
- docs/day-10.md

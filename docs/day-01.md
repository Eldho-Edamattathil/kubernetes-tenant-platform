# Day 1 · Local Kubernetes cluster setup

**Result:** Passed. The Kubernetes API returned `ok`, and all three nodes registered.

## Lab setup

- Host: Apple Silicon Mac (`arm64`), 16 GiB RAM
- Runtime: Colima with Docker, configured with 4 CPUs and 6 GiB RAM
- Cluster: `tenant-platform`, created with kind
- Kubernetes version: `v1.37.0`
- Context: `kind-tenant-platform`

## Node inventory

| Node | Role | Status at end of Day 1 | Internal IP |
|---|---|---|---|
| `tenant-platform-control-plane` | Control plane | `NotReady` | `172.18.0.3` |
| `tenant-platform-worker` | Worker | `NotReady` | `172.18.0.2` |
| `tenant-platform-worker2` | Worker | `NotReady` | `172.18.0.4` |

The cluster was created with kind’s default CNI disabled so Cilium can provide pod networking. `NotReady` is expected at this stage. On Day 2, I’ll install Cilium and verify that the nodes and CoreDNS become ready.

## Verification commands

```bash
kubectl --kubeconfig .lab/kubeconfig config current-context
kubectl --kubeconfig .lab/kubeconfig get --raw='/readyz'
kubectl --kubeconfig .lab/kubeconfig get nodes -o wide
```

## Troubleshooting note

Plain `kubectl get nodes` tried `localhost:8080` because it did not load the lab kubeconfig. Passing `--kubeconfig .lab/kubeconfig` selected the correct cluster. The `.lab/` directory is excluded from Git.

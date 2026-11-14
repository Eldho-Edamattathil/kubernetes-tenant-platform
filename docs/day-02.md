# Day 2 — Cilium and Kubernetes Service networking

**Result:** The client pod resolved the responder Service through CoreDNS,
received HTTP `200 OK` from NGINX, and Hubble showed the TCP traffic as `FORWARDED`.

## Test evidence

| Check | Observed result |
|---|---|
| CoreDNS server | `10.96.0.10:53` |
| Service DNS name | `responder.day-02.svc.cluster.local` |
| Service IP and port | `10.96.97.192:80` |
| Client pod IP | `10.244.1.102` |
| Backend IP in the EndpointSlice | `10.244.1.119` |
| HTTP response | `200 OK` from NGINX |
| Hubble verdict | `FORWARDED` from `day-02/client` to the responder pod on TCP port `80` |
| Node placement | Both pods ran on `tenant-platform-worker` |

## What I verified

The client used the Service DNS name, which resolved to the Service IP.
The EndpointSlice listed the responder pod IP, and Hubble showed traffic
reaching that pod. Both pods were on the same worker, so this test verified
same-node Service connectivity.

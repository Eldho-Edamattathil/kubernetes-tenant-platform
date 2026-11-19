# Day 4 · PostgreSQL persistence

- Deployed PostgreSQL in payments-dev using a StatefulSet and a 1 GiB PVC.
- Connected the Payments API to PostgreSQL using credentials from a Secret.
- Updated POST /payments to insert records and GET /payments to query them.
- Added readiness and liveness probes, resource requests and limits,
  and restricted security settings to the API.
- Created a payment through the frontend.
- Restarted the API and confirmed the same payment ID remained.
- Deleted postgres-0, waited for its replacement to become ready,
  and confirmed the same payment ID remained.

The database stores its data on the PVC. This test verified recovery
after pod replacement using the existing volume.

## Pending

- Add frontend health checks and resource settings.

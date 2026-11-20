# Day 5 · Frontend health checks and resources

## Changes
- Added GET /healthz to the Node.js frontend.
- Built payments-web:0.2.0 and loaded it into all kind nodes.
- Created environments/dev/payments-web.yaml.
- Added readiness and liveness probes using /healthz.
- Set requests: CPU 100m, memory 64Mi.
- Set limits: CPU 500m, memory 128Mi.
- Configured non-root execution, a read-only root filesystem,
  dropped capabilities, and disabled privilege escalation.

## Validation · 20 November 2026
- Deployment rolled out successfully.
- GET /healthz returned HTTP 200 with {"status":"ok"}.
- GET /payments through the frontend returned HTTP 200.
- Existing payment remained available.
- Created a new payment through the UI and confirmed it remained
  after refreshing.

## Lessons
- Readiness controls whether a pod receives Service traffic.
- Repeated liveness failures trigger a container restart.
- Frontend health checks run independently of the API and database.
- Resource values are initial lab settings, not load-tested sizing.
- kubectl apply automatically added the missing last-applied
  annotation to the previously created Deployment.

## Remaining validation
- Deliberately failing probes and observing recovery was not tested.

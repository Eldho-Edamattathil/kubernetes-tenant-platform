# Day 6 · Readiness and liveness failure exercises

## Readiness exercise
- Temporarily changed only the readiness path to /readiness-fail.
- Replacement pod stayed Running but unready, with zero restarts.
- EndpointSlice marked the replacement ready: false.
- Original pod remained ready and available for Service traffic.
- Restored the saved Deployment manifest.

## Liveness exercise
- Temporarily changed only the liveness path to /liveness-fail.
- Replacement initially passed readiness; original pod was removed.
- Three liveness HTTP 404 failures triggered a container restart.
- Restart count increased to 1 within the same pod.
- Readiness briefly reported connection refused during restart.
- Container subsequently passed readiness again.
- Restored the saved Deployment manifest.

## Lessons
- Readiness failure excludes a pod from normal Service traffic.
- Readiness failure alone does not restart the container.
- Liveness failure restarts the container after its failure threshold.
- Passing readiness does not guarantee future liveness.
- Fixing the probe configuration was necessary to stop repeated restarts.
- Exit code 137 alone does not establish an out-of-memory failure.

Both exercises were performed in the local payments-dev namespace.

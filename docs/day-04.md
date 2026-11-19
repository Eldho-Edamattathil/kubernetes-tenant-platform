Day 4 · PostgreSQL persistence
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
Incident · Database password mismatch (19 November 2026)
Symptoms and confirmed cause
The new payments-api:0.2.0 pod stayed Running but 0/1 Ready and
logged password authentication failed for user "payments".
The rollout timed out while the old 0.1.0 pod remained ready.

Both the API and PostgreSQL referenced postgres-credentials.
The PostgreSQL role's stored password did not match the
POSTGRES_PASSWORD environment value loaded into the PostgreSQL container.
The original action that introduced the mismatch was not established.
A Secret change after database initialization or reused database data
are possible explanations, not confirmed findings.
Why referencing the same Secret was insufficient
Location	Purpose and update behavior
Kubernetes Secret	Holds the configured credentials. Editing it does not execute SQL against PostgreSQL.
Container environment	Receives Secret values at container startup. Existing environment variables do not refresh automatically.
PostgreSQL role	Stores a password verifier in the database, persisted with database data on the PVC. Changing it requires a database operation.


The official PostgreSQL image uses POSTGRES_USER,
POSTGRES_PASSWORD, and POSTGRES_DB when initializing an empty data
directory. Starting with existing database data skips initialization;
changing those variables does not change an existing role's password.

Restarting the API reloaded the Secret but authentication still failed,
because the database password had not changed. Recreating a PostgreSQL
pod with the same data volume would not by itself reconcile that password.
Diagnosis
Commands below are for this local learning cluster, run from the repository
root. Pod names change after rollouts; obtain the current name first.
kubectl --kubeconfig .lab/kubeconfig get pods -n payments-dev
kubectl --kubeconfig .lab/kubeconfig logs -n payments-dev \
  -l app=payments-api --all-containers=true --prefix=true --tail=15
kubectl --kubeconfig .lab/kubeconfig get service postgres -n payments-dev -o wide
kubectl --kubeconfig .lab/kubeconfig get endpointslices \
  -n payments-dev -l kubernetes.io/service-name=postgres -o wide
kubectl --kubeconfig .lab/kubeconfig get pod postgres-0 -n payments-dev -o wide
The Service endpoint matched the PostgreSQL pod IP. A direct Node
pg.Client test from the API, explicitly using its PG* environment
variables, also failed authentication.

A connection inside PostgreSQL using -h 127.0.0.1 succeeded, but this
was insufficient evidence that the password was valid: localhost can
match a trust authentication rule. Testing through the Service failed
and the PostgreSQL logs identified a scram-sha-256 host rule:
kubectl --kubeconfig .lab/kubeconfig exec -n payments-dev postgres-0 -- \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT current_user, current_database();"'
This established that even PostgreSQL's own loaded credentials could
not authenticate through the Service. The database's pg_isready
probe had reported ready; that probe does not prove application
credentials can authenticate and execute a query.
Repair performed
We kept the Secret unchanged and updated the existing payments
database role to use PostgreSQL's loaded POSTGRES_PASSWORD.
This preserved the PVC and database data.

The following command used the local Unix socket connection, which was
available in this lab. It requires a permitted local login and a role
allowed to change its password; it is not a general authentication bypass.
kubectl --kubeconfig .lab/kubeconfig exec -i -n payments-dev postgres-0 -- \
  psql -X -v ON_ERROR_STOP=1 -U payments -d payments <<'SQL'
\getenv db_password POSTGRES_PASSWORD
SELECT format('ALTER ROLE %I PASSWORD %L', current_user, :'db_password')
\gexec
SQL
- \getenv reads the environment value into a psql variable.
- format quotes the role name as an identifier and the password as a literal.
- \gexec executes the generated SQL. Expected command output: ALTER ROLE.
- The quoted heredoc prevents the host shell from expanding the SQL.
  No password value is included in these notes.
Recovery and lessons
Repeat the Service-address authentication test above, then check:
kubectl --kubeconfig .lab/kubeconfig rollout status deployment/payments-api \
  -n payments-dev --timeout=90s
kubectl --kubeconfig .lab/kubeconfig get pods -n payments-dev
After the repair, the user confirmed the API was up. No measured
recovery duration or post-repair data-integrity test was captured for
this incident.

The API readiness check correctly blocked the replacement from becoming
ready while database authentication failed. The old API had no readiness
probe, so its 1/1 status did not establish database connectivity.
Kubernetes retained it while waiting for a ready replacement.

For future credential changes, coordinate the database role password
update, Secret update, and application rollout. Validate with a real
authenticated connection through the application network path.
Restarting pods alone is not database password rotation. Do not delete
the PVC to repair a credential mismatch.

References:
- Official PostgreSQL image initialization behavior
- Kubernetes Secret environment variables
- PostgreSQL pg_isready
Pending
- Add frontend health checks and resource settings.

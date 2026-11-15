# Day 3 · Payments frontend and API

- Deployed the Payments frontend and API in the `payments-dev` namespace.
- Tested the API with curl. POST /payments returned 201 Created and
  GET /payments returned the created record.
- Opened the frontend at http://localhost:8081 through kubectl port-forward.
- Submitted a test payment in the browser and verified the same payment
  ID appeared after refreshing the page.
- Request path: browser → frontend pod → payments-api Service → API pod.
- Storage: in memory. PostgreSQL persistence is planned for Day 4.


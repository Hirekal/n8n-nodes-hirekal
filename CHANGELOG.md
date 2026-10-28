# Changelog

## 0.2.0

- **Hirekal Trigger** (v2): **Events** multi-select — `NEW_APPLICATION`, `STAGE_CHANGE` (Stripe-style); API `events[]` on `PUT /integrations/n8n/webhook`.

## 0.1.0

- **Hirekal** action node: Job (Create, Get Many, Get, Get by Name, Get Applications) and Application (Get).
- **Hirekal Trigger**: organization webhook for `NEW_APPLICATION` events.
- **Hirekal OAuth2 API** credential (authorization code) against the Hirekal API.
- Webhook register/delete, workflow metadata, and test-trigger sample support on integration routes.

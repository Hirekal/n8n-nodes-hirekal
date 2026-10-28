# n8n-nodes-hirekal

This is an n8n community node. It lets you create and look up [Hirekal](https://hirekal.com) jobs and applications from an n8n workflow, and start a workflow when a candidate submits an application.

Hirekal is a hiring platform. This node calls the Hirekal API (`/api/v1`) with OAuth2. **Hirekal Trigger** is the only trigger node; use **Events** (multi-select) for application submitted and/or stage change. See [Hirekal Trigger](#hirekal-trigger).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

The node package calls the production Hirekal API at `https://api.hirekal.com/api/v1` by default. This package does not use an `.env` file; API host and OAuth URLs are set in the node source. **Client ID** and **Client Secret** are entered in the n8n credential UI.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Hirekal Trigger](#hirekal-trigger)
[Compatibility](#compatibility)
[Development](#development)
[Resources](#resources)
[Version history](#version-history)

## Installation

### In n8n

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/). Install `n8n-nodes-hirekal`.

### Local development

From this package directory, on Node.js 24 or newer:

```bash
nvm use
npm install
npm run dev
```

`npm run dev` builds the node and starts n8n with it loaded. The editor is at `http://localhost:5678`.

## Operations

All paths are under `https://api.hirekal.com/api/v1`.

### Job

| Operation | What it does | HTTP |
|-----------|----------------|------|
| Create | Create a job. Hirekal adds default questions, application fields, and pipeline stages. | `POST /integrations/n8n/jobs` |
| Get Many | List or search jobs. Supports status, search, sort, order, and pagination. | `GET /integrations/n8n/jobs` |
| Get | Get one job by UUID. | `GET /integrations/n8n/jobs/:id` |
| Get by Name | Search by title, then keep an exact or partial match from the first 50 results. There is no exact-name endpoint. | `GET /integrations/n8n/jobs?search={title}&limit=50` |
| Get Applications | List applications for a job. Supports stage, search, sort, and pagination. | `GET /integrations/n8n/jobs/:jobId/applications` |

**Create** requires **Title** and **Company**. Location, employment type, status, company website, and internal title are optional. Status values are `ACTIVE`, `PAUSED`, and `ARCHIVED`.

### Application

| Operation | What it does | HTTP |
|-----------|----------------|------|
| Get | Get one application by UUID, scoped to the signed-in organization. | `GET /integrations/n8n/applications/:id` |

A typical follow-up to the submit trigger is **Application → Get**, using `{{ $json.application.id }}` from the webhook body.

## Credentials

The node uses **Hirekal OAuth2 API** (authorization code).

### Client ID and Client Secret

Hirekal runs a single OAuth app for n8n. **Client ID** and **Client Secret** are issued by Hirekal (not by n8n). Use the values your Hirekal account or setup docs provide—the same pair configured on the Hirekal API as `N8N_OAUTH_CLIENT_ID` and `N8N_OAUTH_CLIENT_SECRET`.

### Setup in n8n

1. In n8n, create a **Hirekal OAuth2 API** credential.
2. Enter **Client ID** and **Client Secret**.
3. Click **Connect** and sign in to Hirekal. The token is scoped to the organization of the user who logs in.
4. Use the same credential on **Hirekal** and **Hirekal Trigger** nodes.

Hidden OAuth URLs in the credential (production):

- Authorize: `https://api.hirekal.com/api/v1/n8n/oauth/authorize`
- Token: `https://api.hirekal.com/api/v1/n8n/oauth/token`

n8n copies hidden defaults only when the credential is created. Recreate the credential after OAuth URL changes.

On the Hirekal API, `N8N_OAUTH_REDIRECT_URIS` must allow your n8n callback, for example:

- n8n Cloud: `https://oauth.n8n.cloud/oauth2/callback`
- Local n8n: `http://localhost:5678/rest/oauth2-credential/callback`

n8n does not call `POST /api/v1/n8n/oauth/revoke` when a credential is disconnected. In Hirekal, **Add-ons → Integrations → n8n → Disconnect** revokes OAuth tokens for your organization.

A recruiter login JWT and the n8n OAuth access token are different. If a node run returns `401`, the API rejected the OAuth token or OAuth is not configured on the server.

## Hirekal Trigger

Use **Hirekal Trigger** (**Triggers (1)** in the Hirekal panel). Choose one or more **Events** (same pattern as Stripe / GitHub triggers):

| Event | Hirekal `event` | When it runs |
|--------|-----------------|--------------|
| **Application Submitted** | `NEW_APPLICATION` | Candidate submits on any org job |
| **Stage Change** | `STAGE_CHANGE` | Application moves to another pipeline stage |

1. Add **Hirekal Trigger** as the first node.
2. Select **Events** and the **Hirekal OAuth2 API** credential.
3. Activate the workflow.

Activation registers this workflow URL (`PUT /integrations/n8n/webhook` with `events: [...]`). One URL can subscribe to multiple events. Deactivating clears only that URL.

**Include Payload Details** applies to **Application Submitted** when that event is selected.

Hirekal sends `event: "TEST"` while activating; the trigger ignores it. Live payloads include `event: "NEW_APPLICATION"` or `"STAGE_CHANGE"`.

### Test this trigger

**Test this trigger** POSTs a sample payload for each selected event to the n8n **webhook-test** URL.

The API must accept the n8n OAuth access token on `PUT /integrations/n8n/webhook`. If activation fails with 401, the credential is connected in n8n but Hirekal is still allowing only recruiter login JWTs.

## Compatibility

Tested with n8n 2.42. That n8n release requires Node.js `>=24`. Use the Node version in `.nvmrc` (`24`) for `npm run dev`.

## Development

To point the node at a local Hirekal API, change `HIREKAL_API_BASE_URL` in `nodes/Hirekal/constants.ts` and the OAuth defaults in `credentials/HirekalOAuth2Api.credentials.ts` to `http://localhost:3000/api/v1`, then rebuild. Set matching `N8N_OAUTH_*` values in your local `api-app-v2` environment and use the same Client ID and Secret in n8n.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Rebuild on change and run n8n with this node |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint the node package |
| `npm run lint:fix` | Lint and apply fixes |

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Hirekal](https://hirekal.com)

## Version history

See [CHANGELOG.md](./CHANGELOG.md).

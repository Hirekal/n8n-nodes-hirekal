# n8n-nodes-hirekal

This is an n8n community node. It lets you create and look up [Hirekal](https://hirekal.com) jobs and applications from an n8n workflow, and start a workflow when a candidate submits an application.

Hirekal is a hiring platform. This node calls the Hirekal API (`/api/v1`) with OAuth2. **Hirekal Trigger** subscribes every current job and receives `NEW_APPLICATION` events. See [Trigger: application submitted](#trigger-application-submitted).

The repository overview is in the [root README](../README.md).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Trigger: application submitted](#trigger-application-submitted)
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

This package does not use an `.env` file. API host and OAuth URLs are set in the node. Client ID and Client Secret are entered in the n8n credential.

## Operations

The node calls `http://localhost:3000/api/v1` during local development.

### Job

| Operation | What it does | HTTP |
|-----------|----------------|------|
| Create | Create a job. Hirekal adds default questions, application fields, and pipeline stages. | `POST /jobs` |
| Get Many | List or search jobs. Supports status, search, sort, order, and pagination. | `GET /jobs` |
| Get | Get one job by UUID. | `GET /jobs/:id` |
| Get by Name | Search by title, then keep an exact or partial match from the first 50 results. There is no exact-name endpoint. | `GET /jobs?search={title}&limit=50` |
| Get Applications | List applications for a job. Supports stage, search, sort, and pagination. | `GET /jobs/:jobId/applications` |

**Create** requires **Title** and **Company**. Location, employment type, status, company website, and internal title are optional. Status values are `ACTIVE`, `PAUSED`, and `ARCHIVED`.

### Application

| Operation | What it does | HTTP |
|-----------|----------------|------|
| Get | Get one application by UUID, scoped to the signed-in organization. | `GET /applications/:id` |

A typical follow-up to the submit trigger is **Application → Get**, using `{{ $json.application.id }}` from the webhook body.

## Credentials

The node uses **Hirekal OAuth2 API** (authorization code).

1. In the Hirekal API (`core/apps/api-app-v2/.env`), set the OAuth client. Restart the API after changing these:

   - `N8N_OAUTH_CLIENT_ID`
   - `N8N_OAUTH_CLIENT_SECRET`
   - `N8N_OAUTH_REDIRECT_URIS` — include `http://localhost:5678/rest/oauth2-credential/callback`

2. In n8n, create a **Hirekal OAuth2 API** credential.
3. Enter that same **Client ID** and **Client Secret**.
4. Click **Connect** and finish the Hirekal login.

The credential stores the access token. Hidden defaults point at:

- Authorize: `http://localhost:3000/api/v1/n8n/oauth/authorize`
- Token: `http://localhost:3000/api/v1/n8n/oauth/token`

Create the credential again if those URLs change. n8n copies hidden defaults only when the credential is created.

n8n does not call `POST /api/v1/n8n/oauth/revoke` when a credential is disconnected.

Protected Hirekal routes must accept this OAuth access token. A recruiter login JWT and the n8n OAuth token are different. If a node run returns `401` with "Authorization failed", the API rejected the OAuth token.

## Trigger: application submitted

Use **Hirekal Trigger**. It starts the workflow when a candidate submits an application for any current job in the organization.

1. Add **Hirekal Trigger** as the first node.
2. Select the same **Hirekal OAuth2 API** credential.
3. Activate the workflow.

Activation loads every job (`GET /jobs?status=ALL`) and saves this trigger's URL on each one (`PATCH /jobs/:jobId/webhook`). That replaces a webhook URL already stored on those jobs. Deactivating the workflow turns delivery off for every job it subscribed. Jobs created after activation are picked up the next time you activate the workflow.

The public apply page does not call n8n. After the trigger is active, a public submit makes Hirekal POST `NEW_APPLICATION` here. The body includes `job` and `application`. **Include Payload Details** also asks for answers, transcripts, and metrics. Hirekal may wait until AI processing finishes before sending that richer payload.

Hirekal checks each job URL with `event: "TEST"` while activating. The trigger answers that check and does not start a workflow run for it. A real submit arrives as `event: "NEW_APPLICATION"`.

The API must accept the n8n OAuth access token on `PATCH /jobs/:jobId/webhook`. If activation fails with 401, the credential is connected in n8n but Hirekal is still allowing only recruiter login JWTs.

## Compatibility

Tested with n8n 2.42. That n8n release requires Node.js `>=24`. Use the Node version in `.nvmrc` (`24`) for `npm run dev`.

## Development

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

### 0.1.0

* Job operations: Create, Get Many, Get, Get by Name, Get Applications.
* Application operation: Get.
* Hirekal Trigger for application submit.
* OAuth2 credential for the local Hirekal API.

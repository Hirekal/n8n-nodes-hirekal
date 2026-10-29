# n8n-nodes-hirekal

This is an n8n community node. It lets you use [Hirekal](https://hirekal.com) in your n8n workflows.

Hirekal is a hiring platform. Use this node to create and look up jobs and applications, and to start a workflow when Hirekal receives an application or an application moves to another stage.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Install the package `n8n-nodes-hirekal`.

## Operations

### Hirekal

#### Job

* **Create**: create a job. Hirekal adds default questions, application fields, and pipeline stages. Title and company are required. Location, employment type, status, company website, and internal title are optional. Status values are `ACTIVE`, `PAUSED`, and `ARCHIVED`.
* **Get Many**: list or search jobs. Supports status, search, sort, order, and a limit.
* **Get**: get one job by ID.
* **Get by Name**: search by title, then keep an exact or partial match from the first 50 results.
* **Get Applications**: list applications for a job. Supports stage, search, sort, and a limit.

#### Application

* **Get**: get one application by ID, for the organization that connected the credential.

### Hirekal Trigger

* **Application Received** (`NEW_APPLICATION`): Hirekal receives an application on any job in the organization.
* **Stage Change** (`STAGE_CHANGE`): an application moves to another pipeline stage.

Select one or both events on the same trigger. **Include Payload Details** applies only to **Application Received**. When it is on, the payload can include answers, transcripts, and metrics. Hirekal may wait until AI processing finishes before sending.

## Credentials

The nodes use **Hirekal OAuth2 API** (authorization code).

Each Hirekal organization has its own client ID and client secret. They are not created in n8n.

1. In the Hirekal console, open **Add-ons → Integrations → n8n → Connect**.
2. Copy the **Client ID** and **Client Secret**.
3. In n8n, create a **Hirekal OAuth2 API** credential and paste those values.
4. Click **Connect** and sign in to Hirekal. The token belongs to that user's organization.
5. Select the same credential on **Hirekal** and **Hirekal Trigger**.

Production OAuth URLs, set on the credential and not shown in the form:

* Authorization URL: `https://api.hirekal.com/api/v1/n8n/oauth/authorize`
* Access Token URL: `https://api.hirekal.com/api/v1/n8n/oauth/token`

n8n stores those URLs when the credential is created. If they change, create the credential again.

The Hirekal API must allow your n8n callback URL:

* n8n Cloud: `https://oauth.n8n.cloud/oauth2/callback`
* Local n8n: `http://localhost:5678/rest/oauth2-credential/callback`

Disconnecting the integration in Hirekal revokes that organization's n8n tokens. In n8n, open the credential and connect again. Disconnecting inside n8n only clears tokens stored in n8n. It does not revoke them in Hirekal.

## Compatibility

Tested with n8n 2.42.

## Usage

1. Add **Hirekal Trigger** as the first node.
2. Select **Events** and the **Hirekal OAuth2 API** credential.
3. Activate the workflow.

Activation registers this workflow's URL with Hirekal for the selected events. Deactivating removes that subscription. Per-job webhook settings in Hirekal are not changed.

**Test this trigger** sends one sample payload for each selected event. Live runs send `event` as `NEW_APPLICATION` or `STAGE_CHANGE`.

A common next step after **Application Received** is **Hirekal → Application → Get**, with the application ID `{{ $json.application.id }}`.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Hirekal](https://hirekal.com)

## Version history

See [CHANGELOG.md](./CHANGELOG.md).

## Development

From this package directory, on Node.js 24 or newer:

```bash
nvm use
npm install
npm run dev
```

`npm run dev` builds the node and starts n8n at `http://localhost:5678`.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Rebuild on change and run n8n with this node |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint the node package |
| `npm run lint:fix` | Lint and apply fixes |
| `npm run release` | Bump the version, tag, and push so GitHub Actions publishes to npm |

To point a local build at a local Hirekal API, set `HIREKAL_API_BASE_URL` in `nodes/Hirekal/constants.ts` and the OAuth URL defaults in `credentials/HirekalOAuth2Api.credentials.ts` to `http://localhost:3000/api/v1`, then rebuild. Create the n8n credential again after that change. The published package uses `https://api.hirekal.com/api/v1`.

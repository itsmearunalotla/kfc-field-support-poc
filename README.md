# EKFC Field Support API POC

A small Node.js API deployed to Azure Container Apps. This nonproduction proof of concept demonstrates Terraform, GitHub Actions, GitHub OIDC authentication, container image scanning, and Azure deployment.

The API includes a small in-memory ticket demo. Ticket data is lost when the app restarts or a new revision is deployed; this is not a production ticketing system.

## Architecture

```mermaid
flowchart TD
  client["API client"] --> app["Azure Container App"]
  actions["GitHub Actions"] -->|"OIDC"| azure["Azure"]
  actions -->|"Build, scan, push"| acr["Azure Container Registry"]
  terraform["Terraform"] --> app
  terraform --> acr
  terraform --> state["Azure Blob: Terraform state"]
  app -->|"Managed identity: AcrPull"| acr
```

Terraform manages the application resource group `ekfc-fs-dev-rg`, Azure Container Registry, Log Analytics workspace, Container Apps environment, user-assigned identity, ACR pull role assignment, and Container App.

Terraform state is kept in a separate Azure Storage account. The state account is bootstrapped separately because the remote backend must exist before the application Terraform can use it.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Returns `{"status":"ok"}` |
| `GET` | `/api/info` | Returns the API name, package version, deployed commit, and environment |
| `GET` | `/api/tickets` | Lists tickets held in memory |
| `POST` | `/api/tickets` | Creates a ticket held in memory |

Example ticket request:

```json
{
  "title": "Printer is offline",
  "description": "The warehouse printer is not responding.",
  "priority": "high"
}
```

A title and description are required. Priority is optional and can be `low`, `normal`, or `high`; it defaults to `normal`.

## CI/CD

The workflows are:

- `.github/workflows/build.yml` runs API tests, Terraform formatting and validation for both Terraform roots, Checkov, and Trivy configuration scanning. Pull requests run checks without Azure credentials.
- `.github/workflows/deploy-dev.yml` calls the checks, plans and applies Terraform from `infra/dev.tfvars`, builds and scans the API image, pushes it to ACR, deploys it, and checks the live API response.
- Images are tagged with the Git commit SHA. `/api/info` returns that commit, and the deployment workflow verifies it.
- GitHub Actions authenticates to Azure using OIDC. No Azure client secret is stored in the repository.

Trivy uses `exit-code: "0"` and Checkov uses `soft_fail: true`: both report findings but do not currently block the workflow. This is a known POC limitation, not a production security gate.

A push to `main` automatically applies Terraform and deploys the API. This POC has a dev environment only. Production deployment, approval gates, and production-specific controls are out of scope.

## One-time Azure and GitHub setup

Use a dedicated POC subscription or resource group. These commands bootstrap the state account once; they do not create the application resources.

```powershell
az login
az account set --subscription "<AZURE_SUBSCRIPTION_ID>"

terraform -chdir=infra/bootstrap-state init
terraform -chdir=infra/bootstrap-state validate
terraform -chdir=infra/bootstrap-state plan -var="subscription_id=<AZURE_SUBSCRIPTION_ID>"
```

Review the plan before creating the state account:

```powershell
terraform -chdir=infra/bootstrap-state apply -var="subscription_id=<AZURE_SUBSCRIPTION_ID>"
terraform -chdir=infra/bootstrap-state output -raw state_storage_account_name
```

Save the storage account name returned by the last command. Create or use a GitHub Actions identity with a federated credential for:

- Subject: `repo:<OWNER>/<REPO>:ref:refs/heads/main`
- Issuer: `https://token.actions.githubusercontent.com`
- Audience: `api://AzureADTokenExchange`

Assign the GitHub Actions identity these roles:

- `Contributor` on `ekfc-fs-dev-rg` to manage application resources.
- `User Access Administrator` on `ekfc-fs-dev-rg` so Terraform can create the `AcrPull` role assignment for the Container App identity.
- `AcrPush` on the Azure Container Registry to push the API image.
- `Storage Blob Data Contributor` on the state storage account to access Terraform state.

Keep each assignment scoped to the resource group or resource listed above.

Add these repository Actions variables under **Settings → Secrets and variables → Actions → Variables**:

| Variable | Purpose |
|---|---|
| `AZURE_CLIENT_ID` | Client ID of the GitHub deployment identity |
| `AZURE_TENANT_ID` | Microsoft Entra tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `TFSTATE_RESOURCE_GROUP` | Resource group containing the state account |
| `TFSTATE_STORAGE_ACCOUNT` | Name returned by the bootstrap Terraform output |

Dev application settings are in `infra/dev.tfvars`; it contains no credentials. The deployment workflow handles remote state initialization.

The state store lives under `infra/bootstrap-state`. Do not apply that configuration again unless you intend to manage the state store itself.

## Run locally

Requirements: Node.js 22 or later.

Start the API:

```bash
npm start
```

In another terminal:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/info
curl http://localhost:3000/api/tickets
```

Run the API tests:

```bash
npm test
```

Docker is optional for local development. To build and run the container, install Docker first:

```bash
docker build -t field-support-api:local .
docker run --rm -p 3000:3000 field-support-api:local
```

## Design decisions and limits

- The state store and application infrastructure use separate Terraform roots so the remote state backend exists before the main stack initializes.
- The Container App uses a user-assigned managed identity to pull images from ACR; the ACR admin account stays disabled.
- The app uses Consumption workload profiles, scales from zero to two replicas, and has an HTTP request scaling rule. Scale-to-zero reduces idle compute use but may make the first request after inactivity slower.
- Tickets are held in process memory to keep the example small. They are not persistent and may be lost on restart or scale-in.
- This demonstrates a dev deployment only. There is no production environment or approval workflow.

## Deployed API

Base URL:

[https://ekfc-fs-1klw0-api.blueground-f89c31e6.uaenorth.azurecontainerapps.io](https://ekfc-fs-1klw0-api.blueground-f89c31e6.uaenorth.azurecontainerapps.io)

- [Health](https://ekfc-fs-1klw0-api.blueground-f89c31e6.uaenorth.azurecontainerapps.io/health)
- [API info](https://ekfc-fs-1klw0-api.blueground-f89c31e6.uaenorth.azurecontainerapps.io/api/info)
- [Tickets](https://ekfc-fs-1klw0-api.blueground-f89c31e6.uaenorth.azurecontainerapps.io/api/tickets)

## Submission evidence

Deployment and API evidence is available in [docs/screenshots](docs/screenshots/README.md):

- [Successful main-branch deployment](docs/screenshots/actions-success.png)
- [Live /health response](docs/screenshots/api-health.png)
- [Live /api/info response](docs/screenshots/api-info.png)

The folder also contains screenshots of the Azure resources and Terraform state. Do not share screenshots that expose credentials or access tokens.

## Cost and cleanup

Container Apps can scale to zero, but ACR, Log Analytics, and Terraform state storage may still incur charges. Check Azure Cost Management while the POC is running.

When finished, destroy the application infrastructure using Terraform with the existing remote backend. The separate state resource group and storage account are not removed by the main Terraform configuration. Keep them while you need the Terraform state; remove them only when the POC is finished and the state is no longer needed.

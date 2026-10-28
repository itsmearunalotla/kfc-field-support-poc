# EKFC Field Support API POC

A small Node.js API deployed to Azure Container Apps. GitHub Actions uses OIDC to authenticate to Azure, Terraform provisions the infrastructure, and the workflow builds and deploys each commit to Azure Container Registry (ACR).

## Architecture

```text
GitHub Actions (OIDC)
  ├─ Terraform -> Resource Group, ACR, Log Analytics, Container Apps Environment, Container App
  └─ Build -> ACR -> update Container App

Terraform state -> Azure Storage (Blob)
```

The API exposes:

- `GET /health` -> `200` and `{"status":"ok"}`
- `GET /api/info` -> app name, version, and environment

The Container App uses a managed identity to pull from ACR. No application or Azure credentials are stored in the repository. Container Apps scale to zero when idle; Azure may still charge for the registry, logging, and storage resources.

## Run locally

Requirements: Node.js 20+ and Docker (optional).

```bash
npm start
curl -i http://localhost:3000/health
curl http://localhost:3000/api/info
```

Or run the container:

```bash
docker build -t field-support-api:local .
docker run --rm -p 3000:3000 field-support-api:local
```

## Azure and GitHub setup

Use a dedicated Azure subscription or resource group for the interview POC. The workflow's Terraform identity needs `Contributor` and `User Access Administrator` on the deployment scope because Terraform creates resources and an ACR role assignment. It also needs `Storage Blob Data Contributor` on the Terraform state storage account. Scope these roles as narrowly as your setup allows.

1. Create a public GitHub repository and push this project to its `main` branch.
2. Sign in to Azure CLI and select the subscription. Run the state bootstrap script once:

   ```bash
   az login
   az account set --subscription <subscription-id>
   ./scripts/bootstrap-state.sh
   ```

   Save the printed storage account name. The backend uses Entra ID authentication; no storage key is needed.
3. Create an Entra ID app registration or user-assigned identity for GitHub Actions, create a service principal if using an app registration, then add one federated credential for:
   - `repo:<OWNER>/<REPO>:ref:refs/heads/main` (deployments)
   - issuer: `https://token.actions.githubusercontent.com`
   - audience: `api://AzureADTokenExchange`

   No pull request federated credential is needed; PR checks do not authenticate to Azure.
4. Assign the Azure and Storage roles described above. The workflow identity needs resource-group-level rights for deployments; the initial setup may require a broader scope to create the resource group and role assignment. If you keep it restricted to a pre-created deployment resource group, adjust `infra/main.tf` to use that group.
5. In the GitHub repository, add these **Actions variables** (Settings -> Secrets and variables -> Actions -> Variables):

   | Variable | Value |
   | --- | --- |
   | `AZURE_CLIENT_ID` | Entra app or managed identity client ID |
   | `AZURE_TENANT_ID` | Entra tenant ID |
   | `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
   | `AZURE_LOCATION` | Azure region, default `uaenorth` |
   | `RESOURCE_PREFIX` | 3-12 lowercase letters/digits/hyphens, default `ekfc-fs` |
   | `TFSTATE_RESOURCE_GROUP` | State storage resource group, default `ekfc-poc-tfstate-rg` |
   | `TFSTATE_STORAGE_ACCOUNT` | Name printed by the bootstrap script |

6. Push to `main`. The workflow validates and applies Terraform, builds the API image in ACR, deploys it, and prints the public URL in the Actions run summary. Pull requests run Terraform formatting and validation without Azure credentials. Merges to `main` run the authenticated plan and apply, then build and deploy the API. This keeps deployment permissions out of untrusted pull request workflows.

No GitHub secrets are required for Azure login. Keep `main` protected and require review before merging if this repository will be public.

## Deployment evidence and URL

After the first successful `POC CI/CD` run, copy the public API URL from the run summary and verify `/health` and `/api/info`. Add the URL and screenshots of the successful workflow run here before submission:

- Deployed URL: `<add after deployment>`
- Pipeline screenshot: `<add successful run screenshot>`

The interview brief allows deleting Azure resources after capturing evidence. Run `terraform -chdir=infra destroy` from a trusted machine with the same backend configuration, or delete the deployment resource group in Azure. Keep or delete the separate state storage resource group based on whether you need to retain Terraform state.

## Cost and cleanup

This is a short-lived demo. Azure Container Apps can scale to zero, but Log Analytics ingestion/retention and the storage account can incur charges. The Terraform uses Standard ACR to match the current free-account offer for eligible new customers; confirm the free allowance in your subscription before deploying. Check current pricing for your region and delete resources after capturing the required evidence. The separately bootstrapped state store is not managed by the main Terraform configuration.

## Notes for the walkthrough

- Terraform manages resource creation; the Actions workflow orders infrastructure before application deployment.
- The initial Container App uses a public Microsoft placeholder image so Terraform can create the app before the first app image exists. The pipeline replaces it with the image built from this repository.
- Each deployed image is tagged with the commit SHA, making the deployed version traceable to source.
- State storage is bootstrapped once because Terraform cannot configure its own remote backend before that backend exists.

# POC evidence screenshots

These Azure screenshots show the resources used by the Field Support API POC. Account email and subscription IDs are redacted in the applicable images.

## Terraform remote state

The `tfstate` container contains the `dev.tfstate` state file.

![Terraform state blob](azure-terraform-state-blob.png)

## Container App revision

The Container App has an active revision and is scaled to zero while idle.

![Container App revision](azure-container-app-revisions.png)

## Azure resource groups

The subscription contains separate application and Terraform state resource groups.

![Azure resource groups](azure-resource-groups.png)

## Application resources

The application resource group contains the Container App, Container Apps environment, Log Analytics workspace, managed identity, and registry.

![Application resource group](azure-app-resource-group.png)

## Terraform state resources

The state resource group contains the managed identity and storage account.

![Terraform state resource group](azure-state-resource-group.png)

## GitHub Actions identity

This screenshot shows the User Access Administrator assignment for the GitHub Actions identity at the application resource group scope.

![User Access Administrator assignment](azure-github-identity-user-access-admin.png)

## Deployment and API evidence still needed

Add these genuine screenshots after the latest main-branch deployment succeeds:

- `actions-success.png` — successful GitHub Actions deployment and run summary.
- `api-health.png` — live `/health` response.
- `api-info.png` — live `/api/info` response showing the deployed commit.

Hide credentials before committing screenshots. Keep the deployment status and API responses unchanged.

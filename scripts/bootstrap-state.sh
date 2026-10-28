#!/usr/bin/env bash
set -euo pipefail

# One-time state-store bootstrap. Run after `az login` and selecting a subscription.
LOCATION="${LOCATION:-uaenorth}"
STATE_RG="${STATE_RG:-ekfc-poc-tfstate-rg}"
STATE_ACCOUNT="${STATE_ACCOUNT:-ekfcpocstate$(openssl rand -hex 4)}"

if [[ ! "$STATE_ACCOUNT" =~ ^[a-z0-9]{3,24}$ ]]; then
  echo "STATE_ACCOUNT must be 3-24 lowercase letters or digits." >&2
  exit 1
fi

az group create --name "$STATE_RG" --location "$LOCATION" --output none
az storage account create \
  --name "$STATE_ACCOUNT" \
  --resource-group "$STATE_RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2 \
  --output none
az storage container create \
  --name tfstate \
  --account-name "$STATE_ACCOUNT" \
  --auth-mode login \
  --output none

echo "State store ready: resource group=$STATE_RG storage account=$STATE_ACCOUNT container=tfstate"
echo "Grant the GitHub OIDC principal Storage Blob Data Contributor on this account."

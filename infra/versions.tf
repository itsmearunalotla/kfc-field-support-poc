terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "azurerm" {}
}

provider "azurerm" {
  features {
    storage {
      # The tickets account disables Shared Key; skip AzureRM's key-based readiness probe.
      data_plane_available = false
    }
  }

  resource_provider_registrations = "none"
}

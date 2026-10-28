resource "random_string" "suffix" {
  length  = 5
  lower   = true
  upper   = false
  numeric = true
  special = false
}

locals {
  base_name = "${var.name_prefix}-${random_string.suffix.result}"
  tags = {
    project     = "ekfc-field-support-poc"
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "poc" {
  name     = "${local.base_name}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_container_registry" "poc" {
  name                = replace("${var.name_prefix}${random_string.suffix.result}", "-", "")
  resource_group_name = azurerm_resource_group.poc.name
  location            = azurerm_resource_group.poc.location
  sku                 = "Standard"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_log_analytics_workspace" "poc" {
  name                = "${local.base_name}-law"
  location            = azurerm_resource_group.poc.location
  resource_group_name = azurerm_resource_group.poc.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_container_app_environment" "poc" {
  name                       = "${local.base_name}-cae"
  location                   = azurerm_resource_group.poc.location
  resource_group_name        = azurerm_resource_group.poc.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.poc.id
  tags                       = local.tags
}

resource "azurerm_user_assigned_identity" "pull" {
  name                = "${local.base_name}-pull"
  location            = azurerm_resource_group.poc.location
  resource_group_name = azurerm_resource_group.poc.name
  tags                = local.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.poc.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.pull.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_container_app" "api" {
  name                         = "${local.base_name}-api"
  container_app_environment_id = azurerm_container_app_environment.poc.id
  resource_group_name          = azurerm_resource_group.poc.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.pull.id]
  }

  registry {
    server   = azurerm_container_registry.poc.login_server
    identity = azurerm_user_assigned_identity.pull.id
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = 0
    max_replicas = 2

    container {
      name   = "api"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "APP_NAME"
        value = var.app_name
      }
      env {
        name  = "APP_VERSION"
        value = var.app_version
      }
      env {
        name  = "APP_ENV"
        value = var.environment
      }
      env {
        name  = "PORT"
        value = "3000"
      }
    }
  }

  depends_on = [azurerm_role_assignment.acr_pull]
}

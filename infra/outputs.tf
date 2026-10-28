output "resource_group_name" {
  value = azurerm_resource_group.poc.name
}

output "registry_name" {
  value = azurerm_container_registry.poc.name
}

output "registry_login_server" {
  value = azurerm_container_registry.poc.login_server
}
output "container_app_name" {
  value = azurerm_container_app.api.name
}

output "api_url" {
  value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}
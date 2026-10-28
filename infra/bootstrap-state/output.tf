output "state_resource_group_name" {
  value = azurerm_resource_group.state.name
}

output "state_storage_account_name" {
  value = azurerm_storage_account.state.name
}

output "state_storage_account_id" {
  value = azurerm_storage_account.state.id
}

output "state_container_name" {
  value = azurerm_storage_container.state.name
}
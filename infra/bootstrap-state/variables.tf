variable "subscription_id" {
  description = "Azure subscription used for the bootstrap."
  type        = string
}

variable "location" {
  description = "Azure region for the Terraform state resources."
  type        = string
  default     = "uaenorth"
}

variable "state_resource_group_name" {
  description = "Resource group that holds the Terraform state storage."
  type        = string
  default     = "ekfc-poc-tfstate-rg"
}

variable "storage_account_prefix" {
  description = "Lowercase prefix for the globally unique storage account name."
  type        = string
  default     = "ekfcpocstate"

  validation {
    condition     = can(regex("^[a-z0-9]{3,16}$", var.storage_account_prefix))
    error_message = "Use 3-16 lowercase letters or digits."
  }
}
variable "name_prefix" {
  description = "Short lowercase prefix for Azure resource names."
  type        = string
  default     = "ekfc-fs"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,12}$", var.name_prefix))
    error_message = "Use 3-12 lowercase letters, digits, or hyphens."
  }
}

variable "location" {
  description = "Azure region for the POC resources."
  type        = string
  default     = "uaenorth"
}

variable "environment" {
  description = "Environment label returned by the API."
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "API name exposed by /api/info."
  type        = string
  default     = "ekfc-field-support-api"
}

variable "resource_group_name" {
  description = "Resource group managed by Terraform for the POC resources."
  type        = string
  default     = "ekfc-fs-dev-rg"
}
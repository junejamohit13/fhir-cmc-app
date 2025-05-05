variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS (optional)"
  type        = string
  default     = ""
}

variable "cognito_user_pool_id" {
  description = "ID of the Cognito user pool for ALB authentication"
  type        = string
  default     = ""
}

variable "cognito_user_pool_client_id" {
  description = "ID of the Cognito user pool client for ALB authentication"
  type        = string
  default     = ""
}

variable "cognito_user_pool_client_secret" {
  description = "Client secret of the Cognito user pool client"
  type        = string
  default     = ""
}

variable "cognito_user_pool_domain" {
  description = "Domain name of the Cognito user pool"
  type        = string
  default     = ""
}

variable "fhir_domain_name" {
  description = "Domain name for the FHIR server (e.g., sponsor-fhir.example.com)"
  type        = string
  default     = ""
}

variable "api_fhir_domain_name" {
  description = "Domain name for the API FHIR server without authentication (e.g., api.sponsor-fhir.example.com)"
  type        = string
  default     = ""
}
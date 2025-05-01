variable "environment" {
  description = "The environment name (sponsor, regulator, cro)"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "The ARN of the Cognito user pool"
  type        = string
}

variable "fhir_client_secret" {
  description = "The FHIR client secret"
  type        = string
  sensitive   = true
}
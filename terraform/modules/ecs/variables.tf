variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ID of the ECS security group"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "fhir_domain_name" {
  description = "Domain name for the FHIR server"
  type        = string
  default     = ""
}

variable "api_fhir_domain_name" {
  description = "Domain name for the API FHIR server (service-to-service communication)"
  type        = string
  default     = ""
}

variable "db_endpoint" {
  description = "Endpoint of the RDS cluster"
  type        = string
}

variable "db_port" {
  description = "Port of the RDS cluster"
  type        = number
}

variable "db_name" {
  description = "Name of the database"
  type        = string
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}

variable "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  type        = string
  default     = ""
}

variable "backend_target_group_arn" {
  description = "ARN of the backend target group"
  type        = string
}

variable "fhir_target_group_arn" {
  description = "ARN of the FHIR target group"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  type        = string
}

variable "cognito_frontend_client_id" {
  description = "ID of the Cognito frontend client"
  type        = string
}

variable "cognito_backend_client_id" {
  description = "ID of the Cognito backend client"
  type        = string
}

variable "cognito_backend_client_secret" {
  description = "Secret of the Cognito backend client"
  type        = string
  sensitive   = true
}

variable "cognito_fhir_client_id" {
  description = "ID of the Cognito FHIR client"
  type        = string
}

variable "cognito_fhir_client_secret" {
  description = "Secret of the Cognito FHIR client"
  type        = string
  sensitive   = true
}

variable "api_gateway_key" {
  description = "API key for API Gateway authentication"
  type        = string
  sensitive   = true
  default     = ""
}

variable "fhir_image" {
  description = "Docker image for FHIR server"
  type        = string
  default     = "hapiproject/hapi:latest"
}

variable "frontend_image" {
  description = "Docker image for frontend"
  type        = string
  default     = "nginx:latest"
}

variable "backend_image" {
  description = "Docker image for backend"
  type        = string
  default     = "python:3.10-slim"
}

variable "has_frontend" {
  description = "Whether to deploy a frontend"
  type        = bool
  default     = true
}

variable "fhir_task_cpu" {
  description = "CPU units for FHIR task"
  type        = number
  default     = 1024
}

variable "fhir_task_memory" {
  description = "Memory for FHIR task in MiB"
  type        = number
  default     = 2048
}

variable "frontend_task_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 256
}

variable "frontend_task_memory" {
  description = "Memory for frontend task in MiB"
  type        = number
  default     = 512
}

variable "backend_task_cpu" {
  description = "CPU units for backend task"
  type        = number
  default     = 512
}

variable "backend_task_memory" {
  description = "Memory for backend task in MiB"
  type        = number
  default     = 1024
}

variable "fhir_service_count" {
  description = "Number of FHIR tasks to run"
  type        = number
  default     = 2
}

variable "frontend_service_count" {
  description = "Number of frontend tasks to run"
  type        = number
  default     = 2
}

variable "backend_service_count" {
  description = "Number of backend tasks to run"
  type        = number
  default     = 2
}

variable "fhir_min_count" {
  description = "Minimum number of FHIR tasks"
  type        = number
  default     = 2
}

variable "fhir_max_count" {
  description = "Maximum number of FHIR tasks"
  type        = number
  default     = 10
}

variable "frontend_min_count" {
  description = "Minimum number of frontend tasks"
  type        = number
  default     = 2
}

variable "frontend_max_count" {
  description = "Maximum number of frontend tasks"
  type        = number
  default     = 10
}

variable "backend_min_count" {
  description = "Minimum number of backend tasks"
  type        = number
  default     = 2
}

variable "backend_max_count" {
  description = "Maximum number of backend tasks"
  type        = number
  default     = 10
}
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name"
  type        = string
  default     = "fhir-cmc"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "sponsor"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "fhir_domain_name" {
  description = "Domain name for the FHIR server (e.g., sponsor-fhir.example.com)"
  type        = string
  default     = ""
}

variable "create_route53_zone" {
  description = "Whether to create a Route53 zone"
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Name for the database"
  type        = string
  default     = "hapifhir"
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

variable "postgres_version" {
  description = "Version of PostgreSQL to use"
  type        = string
  default     = "15.3"
}

variable "db_instance_count" {
  description = "Number of database instances"
  type        = number
  default     = 2
}

variable "db_min_capacity" {
  description = "Minimum capacity for Aurora Serverless v2 in ACU"
  type        = number
  default     = 0.5
}

variable "db_max_capacity" {
  description = "Maximum capacity for Aurora Serverless v2 in ACU"
  type        = number
  default     = 8
}

variable "fhir_image" {
  description = "Docker image for FHIR server"
  type        = string
  default     = "hapiproject/hapi:latest"
}

variable "frontend_image" {
  description = "Docker image for frontend"
  type        = string
  default     = ""
}

variable "backend_image" {
  description = "Docker image for backend"
  type        = string
  default     = ""
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
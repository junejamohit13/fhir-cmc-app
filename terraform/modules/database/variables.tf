variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "db_subnet_group_name" {
  description = "Name of the database subnet group"
  type        = string
}

variable "db_security_group_id" {
  description = "ID of the database security group"
  type        = string
}

variable "db_name" {
  description = "Name for the database"
  type        = string
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
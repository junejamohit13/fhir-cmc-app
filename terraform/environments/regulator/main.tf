provider "aws" {
  region = var.aws_region
}

terraform {
  backend "s3" {
    bucket         = "fhir-cmc-terraform-state-2"
    key            = "environments/regulator/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "fhir-cmc-terraform-locks"
    encrypt        = true
  }
}

data "aws_caller_identity" "current" {}

data "aws_acm_certificate" "domain" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

module "cognito" {
  source = "../../modules/cognito"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  domain_name = var.domain_name
}

module "network" {
  source = "../../modules/network"

  project            = var.project
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  certificate_arn    = data.aws_acm_certificate.domain.arn
  
  # Cognito parameters for ALB authentication
  cognito_user_pool_id            = module.cognito.user_pool_id
  cognito_user_pool_client_id     = module.cognito.frontend_client_id
  cognito_user_pool_client_secret = module.cognito.frontend_client_secret
  cognito_user_pool_domain        = module.cognito.user_pool_domain

  depends_on = [module.cognito]
}

module "database" {
  source = "../../modules/database"

  project              = var.project
  environment          = var.environment
  db_subnet_group_name = module.network.db_subnet_group_name
  db_security_group_id = module.network.database_security_group_id
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
  postgres_version     = var.postgres_version
  db_instance_count    = var.db_instance_count
  db_min_capacity      = var.db_min_capacity
  db_max_capacity      = var.db_max_capacity

  depends_on = [module.network]
}

module "ecs" {
  source = "../../modules/ecs"

  project                     = var.project
  environment                 = var.environment
  aws_region                  = var.aws_region
  aws_account_id              = data.aws_caller_identity.current.account_id
  domain_name                 = var.domain_name
  fhir_domain_name            = var.fhir_domain_name
  private_subnet_ids          = module.network.private_subnet_ids
  ecs_security_group_id       = module.network.ecs_security_group_id
  frontend_target_group_arn   = module.network.frontend_target_group_arn
  backend_target_group_arn    = module.network.backend_target_group_arn
  fhir_target_group_arn       = module.network.fhir_target_group_arn
  db_endpoint                 = module.database.cluster_endpoint
  db_port                     = module.database.db_port
  db_name                     = module.database.db_name
  db_username                 = var.db_username
  db_password                 = var.db_password
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_frontend_client_id  = module.cognito.frontend_client_id
  cognito_backend_client_id   = module.cognito.backend_client_id
  cognito_backend_client_secret = module.cognito.backend_client_secret
  cognito_fhir_client_id      = module.cognito.fhir_client_id
  cognito_fhir_client_secret  = module.cognito.fhir_client_secret
  has_frontend                = false
  fhir_image                  = var.fhir_image
  frontend_image              = var.frontend_image
  backend_image               = var.backend_image
  fhir_task_cpu               = var.fhir_task_cpu
  fhir_task_memory            = var.fhir_task_memory
  frontend_task_cpu           = var.frontend_task_cpu
  frontend_task_memory        = var.frontend_task_memory
  backend_task_cpu            = var.backend_task_cpu
  backend_task_memory         = var.backend_task_memory
  fhir_service_count          = var.fhir_service_count
  frontend_service_count      = var.frontend_service_count
  backend_service_count       = var.backend_service_count
  fhir_min_count              = var.fhir_min_count
  fhir_max_count              = var.fhir_max_count
  frontend_min_count          = var.frontend_min_count
  frontend_max_count          = var.frontend_max_count
  backend_min_count           = var.backend_min_count
  backend_max_count           = var.backend_max_count

  depends_on = [module.network, module.database, module.cognito]
}

# Get the parent domain by removing the subdomain
locals {
  # Extract the parent domain (e.g., "example.com" from "sub.example.com")
  parent_domain = replace(var.domain_name, "/^[^.]+\\./", "")
  
  # Ensure the domain has a trailing dot as required by Route53
  formatted_parent_domain = trimsuffix(local.parent_domain, ".") != "" ? "${trimsuffix(local.parent_domain, ".")}." : ""
}

# Create Route53 records
resource "aws_route53_zone" "main" {
  count = var.create_route53_zone ? 1 : 0
  name  = var.domain_name
}

data "aws_route53_zone" "selected" {
  name         = local.formatted_parent_domain
  private_zone = false
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.network.alb_dns_name
    zone_id                = module.network.alb_zone_id
    evaluate_target_health = true
  }
}

# Create DNS record for FHIR-specific subdomain
resource "aws_route53_record" "fhir" {
  count   = var.fhir_domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = var.fhir_domain_name
  type    = "A"

  alias {
    name                   = module.network.alb_dns_name
    zone_id                = module.network.alb_zone_id
    evaluate_target_health = true
  }
}

# Useful outputs for verification
output "alb_dns_name" {
  value       = module.network.alb_dns_name
  description = "The DNS name of the Application Load Balancer"
}

output "domain_name" {
  value       = var.domain_name
  description = "The domain name for the application"
}

output "route53_zone_name" {
  value       = data.aws_route53_zone.selected.name
  description = "The Route53 zone being used"
}

output "route53_record_created" {
  value       = "Created A record: ${aws_route53_record.app.name} -> ${module.network.alb_dns_name}"
  description = "The Route53 record that was created"
}

output "endpoints" {
  value = {
    fhir_api     = var.fhir_domain_name != "" ? "https://${var.fhir_domain_name}/fhir" : "https://${var.domain_name}/fhir"
    backend_api  = "https://${var.domain_name}/api"
    frontend_app = "https://${var.domain_name}"
  }
  description = "Endpoints for accessing the application"
}
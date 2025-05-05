output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.network.alb_dns_name
}

output "database_endpoint" {
  description = "Endpoint of the RDS Aurora cluster"
  value       = module.database.cluster_endpoint
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_frontend_client_id" {
  description = "ID of the Cognito frontend client"
  value       = module.cognito.frontend_client_id
}

output "cognito_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.cognito.user_pool_domain_fqdn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}
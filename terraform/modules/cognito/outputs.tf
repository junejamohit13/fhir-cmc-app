output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "frontend_client_id" {
  description = "ID of the frontend client"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "backend_client_id" {
  description = "ID of the backend client"
  value       = aws_cognito_user_pool_client.backend.id
}

output "backend_client_secret" {
  description = "Secret of the backend client"
  value       = aws_cognito_user_pool_client.backend.client_secret
  sensitive   = true
}

output "fhir_client_id" {
  description = "ID of the FHIR client"
  value       = aws_cognito_user_pool_client.fhir.id
}

output "fhir_client_secret" {
  description = "Secret of the FHIR client"
  value       = aws_cognito_user_pool_client.fhir.client_secret
  sensitive   = true
}

output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.id
}

output "user_pool_domain" {
  description = "Domain prefix of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "user_pool_domain_fqdn" {
  description = "Fully qualified domain name of the Cognito User Pool domain"
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "frontend_client_secret" {
  description = "Secret of the frontend client"
  value       = aws_cognito_user_pool_client.frontend.client_secret
  sensitive   = true
}

output "authenticated_role_arn" {
  description = "ARN of the authenticated role"
  value       = aws_iam_role.authenticated.arn
}
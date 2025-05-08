provider "aws" {
  region = var.aws_region
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.9"
    }
  }
  
  backend "s3" {
    bucket         = "fhir-cmc-terraform-state-2"
    key            = "environments/sponsor/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "fhir-cmc-terraform-locks"
    encrypt        = true
  }
}

data "aws_caller_identity" "current" {}

# Use a placeholder certificate ARN if domain_name is not provided
locals {
  use_certificate = var.domain_name != ""
  certificate_arn = local.use_certificate ? try(data.aws_acm_certificate.domain[0].arn, "") : ""
}

# Only look up the certificate if domain name is provided
data "aws_acm_certificate" "domain" {
  count        = local.use_certificate ? 1 : 0
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

module "cognito" {
  source = "../../modules/cognito"

  project          = var.project
  environment      = var.environment
  aws_region       = var.aws_region
  domain_name      = var.domain_name
  fhir_domain_name = var.fhir_domain_name
}

module "network" {
  source = "../../modules/network"

  project                      = var.project
  environment                  = var.environment
  vpc_cidr                     = var.vpc_cidr
  availability_zones           = var.availability_zones
  certificate_arn              = local.certificate_arn
  cognito_user_pool_id         = module.cognito.user_pool_id
  cognito_user_pool_client_id  = module.cognito.frontend_client_id
  cognito_user_pool_client_secret = module.cognito.frontend_client_secret
  cognito_user_pool_domain     = module.cognito.user_pool_domain
  fhir_domain_name             = var.fhir_domain_name
  api_fhir_domain_name         = var.api_fhir_domain_name

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
  api_fhir_domain_name        = var.api_fhir_domain_name
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
  api_gateway_key             = var.api_gateway_key
  has_frontend                = true
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
  fhir_nlb_target_group_arn = aws_lb_target_group.fhir_nlb_tg.arn


  depends_on = [module.network, module.database, module.cognito]
}

# Get the parent domain by removing the subdomain
locals {
  # Extract the parent domain (e.g., "example.com" from "sub.example.com")
  parent_domain = replace(var.domain_name, "/^[^.]+\\./", "")
  
  # Ensure the domain has a trailing dot as required by Route53
  formatted_parent_domain = trimsuffix(local.parent_domain, ".") != "" ? "${trimsuffix(local.parent_domain, ".")}." : ""
}

# Get the existing Route53 zone
data "aws_route53_zone" "existing" {
  name         = local.formatted_parent_domain
  private_zone = false
}

# Temporarily remove this resource and create it manually
/*
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.existing.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.network.alb_dns_name
    zone_id                = module.network.alb_zone_id
    evaluate_target_health = true
  }
  
  lifecycle {
    create_before_destroy = true
  }
}
*/

# Create DNS record for FHIR-specific subdomain
resource "aws_route53_record" "fhir" {
  count   = var.fhir_domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.existing.zone_id
  name    = var.fhir_domain_name
  type    = "A"

  alias {
    name                   = module.network.alb_dns_name
    zone_id                = module.network.alb_zone_id
    evaluate_target_health = true
  }
  
  lifecycle {
    ignore_changes = [
      name,
      zone_id
    ]
  }
}

# Handle API key conflict - update with lifecycle rules to handle existing resource
resource "aws_api_gateway_api_key" "fhir_api_key" {
  name    = "${var.project}-${var.environment}-fhir-api-key"
  enabled = true
  
  # Only set value if provided, otherwise let AWS generate it
  value   = var.api_gateway_key != "" ? var.api_gateway_key : null
  
  lifecycle {
    ignore_changes = [
      value,
      name,
      enabled
    ]
  }
}

# Network Load Balancer for direct FHIR access
resource "aws_lb" "fhir_nlb" {
  name               = "${var.project}-${var.environment}-fhir-nlb"
  internal           = false  # Public facing
  load_balancer_type = "network"
  subnets            = module.network.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name        = "${var.project}-${var.environment}-fhir-nlb"
    Environment = var.environment
    Project     = var.project
  }
}

# NLB Target Group for FHIR Service
resource "aws_lb_target_group" "fhir_nlb_tg" {
  name        = "${var.project}-${var.environment}-fhir-nlb-tg"
  port        = 8080  # FHIR server port
  protocol    = "TCP"  # NLB uses TCP
  vpc_id      = module.network.vpc_id
  target_type = "ip"  # Critical - must be "ip" for Fargate
  
  health_check {
    protocol            = "HTTP"  # Using HTTP health check for the FHIR server
    port                = "traffic-port"
    path                = "/fhir/metadata"  # Same path as your ALB health check
    interval            = 30
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200-299"  # Success codes for the health check
  }

  tags = {
    Name        = "${var.project}-${var.environment}-fhir-nlb-tg"
    Environment = var.environment
    Project     = var.project
  }
}

# NLB Listener on port 80
resource "aws_lb_listener" "fhir_nlb_http" {
  load_balancer_arn = aws_lb.fhir_nlb.arn
  port              = 80
  protocol          = "TCP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.fhir_nlb_tg.arn
  }
}

# Add a security group rule to allow NLB access to FHIR on port 8080
# This rule is critical for allowing traffic from the NLB to the FHIR container
resource "aws_security_group_rule" "ecs_fhir_nlb" {
  security_group_id = module.network.ecs_security_group_id
  type              = "ingress"
  from_port         = 8080
  to_port           = 8080
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]  # Can be restricted to VPC CIDR for better security
  description       = "Allow NLB access to FHIR service"
}

# NLB Listener is defined above as aws_lb_listener.fhir_nlb_http

# Register ECS FHIR service instances with the NLB target group
# This is a simpler approach without timeout and with better error handling
resource "null_resource" "register_fhir_service_with_nlb" {
  triggers = {
    fhir_service_count = var.fhir_service_count
    nlb_target_group_arn = aws_lb_target_group.fhir_nlb_tg.arn
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command = <<EOF
      # Get the task ARNs, with error handling
      TASK_ARNS=$(aws ecs list-tasks \
        --region ${var.aws_region} \
        --cluster ${var.project}-${var.environment} \
        --service-name ${var.project}-${var.environment}-fhir \
        --query 'taskArns[]' --output text || echo "")
      
      # Check if we got any tasks
      if [ -n "$TASK_ARNS" ]; then
        echo "Found tasks for service ${var.project}-${var.environment}-fhir"
        
        # For each task, try to get the ENI ID and register with target group
        for TASK in $TASK_ARNS; do
          echo "Processing task $TASK"
          
          # Get task details, safely
          TASK_DETAILS=$(aws ecs describe-tasks \
            --region ${var.aws_region} \
            --cluster ${var.project}-${var.environment} \
            --tasks $TASK || echo "{}")
          
          # Get the network interface ID, safely
          ENI=$(echo $TASK_DETAILS | jq -r '.tasks[0].attachments[0].details[] | select(.name=="networkInterfaceId") | .value' 2>/dev/null || echo "")
          
          if [ -n "$ENI" ]; then
            echo "Found ENI $ENI for task $TASK"
            
            # Get the private IP, safely
            IP=$(aws ec2 describe-network-interfaces \
              --region ${var.aws_region} \
              --network-interface-ids $ENI \
              --query 'NetworkInterfaces[0].PrivateIpAddress' \
              --output text 2>/dev/null || echo "")
            
            if [ -n "$IP" ]; then
              echo "Registering IP $IP with target group ${aws_lb_target_group.fhir_nlb_tg.arn}"
              
              # Register the IP with the target group, safely
              aws elbv2 register-targets \
                --region ${var.aws_region} \
                --target-group-arn ${aws_lb_target_group.fhir_nlb_tg.arn} \
                --targets Id=$IP,Port=8080 || echo "Failed to register target"
            else
              echo "Could not find IP for ENI $ENI, skipping"
            fi
          else
            echo "Could not find ENI for task $TASK, skipping"
          fi
        done
      else
        echo "No tasks found for service ${var.project}-${var.environment}-fhir, skipping target registration"
      fi
      
      echo "Target registration process completed"
    EOF
  }

  depends_on = [
    module.ecs,
    aws_lb_target_group.fhir_nlb_tg
  ]
}

# Create a REST API Gateway for API key authentication
resource "aws_api_gateway_rest_api" "fhir_rest_api" {
  name        = "${var.project}-${var.environment}-fhir-rest-api"
  description = "REST API for FHIR API key authentication"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Update the API Gateway stage to use the data source for the log group
resource "aws_api_gateway_stage" "fhir_rest_api_stage" {
  deployment_id = aws_api_gateway_deployment.fhir_rest_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.fhir_rest_api.id
  stage_name    = "prod"
  
  access_log_settings {
    destination_arn = data.aws_cloudwatch_log_group.rest_api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      path           = "$context.path"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationStatus = "$context.integrationStatus"
      integrationLatency = "$context.integrationLatency"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }
}

# Create method for the root resource
resource "aws_api_gateway_method" "root_method" {
  rest_api_id   = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id   = aws_api_gateway_rest_api.fhir_rest_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
  api_key_required = true
}

# Create integration for the root method - connect directly to NLB
resource "aws_api_gateway_integration" "root_integration" {
  rest_api_id             = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id             = aws_api_gateway_rest_api.fhir_rest_api.root_resource_id
  http_method             = aws_api_gateway_method.root_method.http_method
  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  
  # Connect to the NLB for direct FHIR service access (bypassing Cognito)
  uri                     = "http://${aws_lb.fhir_nlb.dns_name}/fhir"
  
  # Add timeout settings
  timeout_milliseconds    = 29000
}


# Create proxy resource for FHIR paths
resource "aws_api_gateway_resource" "fhir_proxy" {
  rest_api_id = aws_api_gateway_rest_api.fhir_rest_api.id
  parent_id   = aws_api_gateway_rest_api.fhir_rest_api.root_resource_id
  path_part   = "{proxy+}"
}

# Create method for the proxy resource
resource "aws_api_gateway_method" "fhir_proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id   = aws_api_gateway_resource.fhir_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
  api_key_required = true
  
  # This allows passing path parameters to the integration
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# Proxy method integration for paths with parameters
resource "aws_api_gateway_integration" "fhir_proxy_integration" {
  rest_api_id             = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id             = aws_api_gateway_resource.fhir_proxy.id
  http_method             = aws_api_gateway_method.fhir_proxy_method.http_method
  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  
  # Connect to the NLB for direct FHIR service access (bypassing Cognito)
  uri                     = "http://${aws_lb.fhir_nlb.dns_name}/fhir/{proxy}"
  
  # Pass path parameters
  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
  
  # Add timeout settings
  timeout_milliseconds = 29000
}

# Enable CORS on the API Gateway
resource "aws_api_gateway_method" "fhir_proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id   = aws_api_gateway_resource.fhir_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "fhir_proxy_options_integration" {
  rest_api_id      = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id      = aws_api_gateway_resource.fhir_proxy.id
  http_method      = aws_api_gateway_method.fhir_proxy_options.http_method
  type             = "MOCK"
  request_templates = {
    "application/json" = jsonencode({"statusCode": 200})
  }
}

resource "aws_api_gateway_method_response" "fhir_proxy_options_response" {
  rest_api_id   = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id   = aws_api_gateway_resource.fhir_proxy.id
  http_method   = aws_api_gateway_method.fhir_proxy_options.http_method
  status_code   = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "fhir_proxy_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.fhir_rest_api.id
  resource_id   = aws_api_gateway_resource.fhir_proxy.id
  http_method   = aws_api_gateway_method.fhir_proxy_options.http_method
  status_code   = aws_api_gateway_method_response.fhir_proxy_options_response.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Create a simple deployment for the REST API
resource "aws_api_gateway_deployment" "fhir_rest_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.fhir_rest_api.id
  
  lifecycle {
    create_before_destroy = true
  }
  
  depends_on = [
    aws_api_gateway_method.fhir_proxy_method,
    aws_api_gateway_integration.fhir_proxy_integration,
    aws_api_gateway_method.root_method,
    aws_api_gateway_integration.root_integration,
    aws_api_gateway_method.fhir_proxy_options,
    aws_api_gateway_integration.fhir_proxy_options_integration,
    aws_api_gateway_method_response.fhir_proxy_options_response,
    aws_api_gateway_integration_response.fhir_proxy_options_integration_response
  ]
}

# Create usage plan for API key
resource "aws_api_gateway_usage_plan" "fhir_api_usage_plan" {
  name        = "${var.project}-${var.environment}-fhir-api-usage-plan"
  description = "Usage plan for FHIR API"
  
  api_stages {
    api_id = aws_api_gateway_rest_api.fhir_rest_api.id
    stage  = aws_api_gateway_stage.fhir_rest_api_stage.stage_name
  }
  
  quota_settings {
    limit  = 1000000  # High limit to avoid reaching quota in normal usage
    period = "MONTH"
  }
  
  throttle_settings {
    burst_limit = 5000
    rate_limit  = 10000
  }
}

# Associate API key with usage plan
resource "aws_api_gateway_usage_plan_key" "fhir_api_usage_plan_key" {
  key_id        = aws_api_gateway_api_key.fhir_api_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.fhir_api_usage_plan.id
}

# Get the API domain certificate
data "aws_acm_certificate" "api_domain" {
  domain      = var.api_fhir_domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

# Create a domain name for the REST API Gateway
resource "aws_api_gateway_domain_name" "fhir_api_domain" {
  domain_name              = var.api_fhir_domain_name
  regional_certificate_arn = data.aws_acm_certificate.api_domain.arn
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Create an API mapping for the custom domain
resource "aws_api_gateway_base_path_mapping" "fhir_api_mapping" {
  api_id      = aws_api_gateway_rest_api.fhir_rest_api.id
  domain_name = aws_api_gateway_domain_name.fhir_api_domain.domain_name
  stage_name  = aws_api_gateway_stage.fhir_rest_api_stage.stage_name
}

# Create DNS record for API FHIR subdomain
resource "aws_route53_record" "api_fhir" {
  zone_id = data.aws_route53_zone.existing.zone_id
  name    = var.api_fhir_domain_name
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.fhir_api_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.fhir_api_domain.regional_zone_id
    evaluate_target_health = false
  }
  
  lifecycle {
    ignore_changes = [
      name,
      zone_id
    ]
  }
}

# For the CloudWatch Log Group error, use data source instead
data "aws_cloudwatch_log_group" "rest_api_logs" {
  name = "/aws/apigateway/${var.project}-${var.environment}-rest-api"
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

output "fhir_domain_name" {
  value       = var.fhir_domain_name
  description = "The FHIR domain name (with Cognito authentication for browser access)"
}

output "api_fhir_domain_name" {
  value       = var.api_fhir_domain_name
  description = "The API FHIR domain name (with API key authentication, for service calls)"
}

output "route53_zone_name" {
  value       = data.aws_route53_zone.existing.name
  description = "The Route53 zone being used"
}

output "route53_record_created" {
  value       = "Created records: ${var.domain_name} (manual) and ${var.fhir_domain_name != "" ? aws_route53_record.fhir[0].name : ""} and ${var.api_fhir_domain_name != "" ? aws_route53_record.api_fhir.name : ""}"
  description = "The Route53 records that were created"
}

output "certificate_arn" {
  value       = local.certificate_arn
  description = "The ARN of the certificate being used"
}

output "endpoints" {
  value = {
    fhir_api     = var.fhir_domain_name != "" ? "https://${var.fhir_domain_name}/fhir" : "https://${var.domain_name}/fhir"
    backend_api  = "https://${var.domain_name}/api"
    frontend_app = "https://${var.domain_name}"
    api_fhir     = var.api_fhir_domain_name != "" ? "https://${var.api_fhir_domain_name}" : null
  }
  description = "Endpoints for accessing the application"
}

output "api_gateway" {
  value = {
    api_id       = aws_api_gateway_rest_api.fhir_rest_api.id
    api_endpoint = "${aws_api_gateway_stage.fhir_rest_api_stage.invoke_url}"
    domain_name  = var.api_fhir_domain_name
    api_key_id   = aws_api_gateway_api_key.fhir_api_key.id
    api_key      = var.api_gateway_key
  }
  description = "API Gateway information"
  sensitive   = true
}

output "cognito_machine_to_machine_auth" {
  value = {
    token_url = "https://cognito-idp.${var.aws_region}.amazonaws.com/${module.cognito.user_pool_id}/oauth2/token"
    client_id = module.cognito.backend_client_id
    client_secret = "Use AWS Secrets Manager or environment variables to manage this secret"
    grant_type = "client_credentials"
  }
  description = "Information for machine-to-machine authentication"
  sensitive = true
}
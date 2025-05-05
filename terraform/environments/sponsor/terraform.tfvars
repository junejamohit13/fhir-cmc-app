aws_region       = "us-east-1"
project          = "fhir-cmc"
environment      = "sponsor"
vpc_cidr         = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
# Using your existing domain and certificate
domain_name      = "sponsor.cmc-fhir-demo.com"
# Dedicated FHIR server domain
fhir_domain_name = "sponsor-fhir.cmc-fhir-demo.com"
# API FHIR domain with API key authentication for service-to-service calls
api_fhir_domain_name = "api.sponsor-fhir.cmc-fhir-demo.com"
# API key for authenticating with API Gateway
api_gateway_key = "dMSiK0sO9g2KEmXVCy5Ai6xffpbZA9xZ5dvRwXdf"
# Set to false because you already created the Route53 zone manually
create_route53_zone = false

# Database - reduced for cost savings
db_name          = "hapifhir"
db_username      = "dbadmin"  # Changed from "admin" as it's a reserved word
db_password      = "YourStrongPasswordHere123!"  # Change this to a strong password
postgres_version = "15.3"
db_instance_count = 1         # Reduced from 2 to 1
db_min_capacity  = 0.5
db_max_capacity  = 2          # Reduced from 8 to 2

# Docker images with your account number
fhir_image       = "505609109431.dkr.ecr.us-east-1.amazonaws.com/fhir-cmc-hapi-fhir:latest"
frontend_image   = "505609109431.dkr.ecr.us-east-1.amazonaws.com/fhir-cmc-sponsor-frontend:latest"
backend_image    = "505609109431.dkr.ecr.us-east-1.amazonaws.com/fhir-cmc-sponsor-backend:latest"

# ECS task sizing - reduced for cost savings
fhir_task_cpu      = 512      # Reduced from 1024 to 512
fhir_task_memory   = 1024     # Reduced from 2048 to 1024
frontend_task_cpu  = 256      # Kept the same (already minimum)
frontend_task_memory = 512    # Kept the same (already minimum)
backend_task_cpu   = 256      # Reduced from 512 to 256
backend_task_memory = 512     # Reduced from 1024 to 512

# Service counts - reduced for cost savings
fhir_service_count     = 1    # Reduced from 2 to 1
frontend_service_count = 1    # Reduced from 2 to 1
backend_service_count  = 1    # Reduced from 2 to 1

# Auto scaling - reduced for cost savings
fhir_min_count     = 1        # Reduced from 2 to 1
fhir_max_count     = 2        # Reduced from 10 to 2
frontend_min_count = 1        # Reduced from 2 to 1
frontend_max_count = 2        # Reduced from 10 to 2
backend_min_count  = 1        # Reduced from 2 to 1
backend_max_count  = 2        # Reduced from 10 to 2
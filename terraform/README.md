# FHIR-CMC AWS Infrastructure

This directory contains Terraform code to deploy the FHIR-CMC application to AWS, with separate environments for Sponsor, CRO, and Regulator entities.

## Architecture

The infrastructure consists of:

- **Network**: VPC, subnets, security groups, load balancers
- **Database**: Amazon Aurora PostgreSQL for the HAPI FHIR server
- **Authentication**: AWS Cognito for authenticating FHIR Server and frontend applications
- **Containers**: AWS ECS Fargate for running containerized applications
- **DNS**: Route53 for DNS management (optional)

Each environment (sponsor, cro, regulator) is completely isolated with its own VPC, database, Cognito user pool, and ECS cluster.

## Pre-requisites

1. AWS Account
2. AWS CLI configured with appropriate credentials
3. Terraform (version >= 1.0.0)
4. Domain name and ACM certificate (for HTTPS) or use AWS default domains
5. Docker images published to ECR (for frontend and backend applications)

## Getting Started

### Important: Setup S3 and DynamoDB first

The S3 bucket and DynamoDB table for Terraform state must be created **before** running Terraform:

```bash
cd terraform
chmod +x setup-terraform-state.sh
./setup-terraform-state.sh
```

This will create:
- S3 bucket: `fhir-cmc-terraform-state-2`
- DynamoDB table: `fhir-cmc-terraform-locks`

**Do not** try to manage these resources with Terraform itself, as this creates a circular dependency.

### Deploy environment

1. Create environment-specific variable files:

```bash
cd environments/sponsor
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values
```

2. Deploy the sponsor environment:

```bash
terraform init
terraform plan
terraform apply
```

3. Repeat for CRO and regulator environments if needed.

## Environment Structure

Each environment includes:

- **HAPI FHIR Server** - Running in ECS with Aurora PostgreSQL backend
- **Backend API** - FastAPI-based REST API for application-specific functionality
- **Frontend** - React-based web application (Sponsor and CRO only, Regulator has no frontend)
- **Cognito** - Authentication for both FHIR Server and frontend applications
- **Load Balancer** - Single ALB with path-based routing for frontend, backend API, and FHIR server

## Sensitive Values

Store sensitive values like database passwords in AWS Secrets Manager or use Terraform's `sensitive` functionality to prevent them from being exposed in logs. 

For production use, consider using:

```bash
export TF_VAR_db_username="admin"
export TF_VAR_db_password="your-secure-password"
```

## Using AWS Default Domains vs Custom Domains

### Custom Domains (recommended for production)
1. Create ACM certificates for your domains
2. Update the `domain_name` variable for each environment 
3. Set `create_route53_zone` to `true` if you need to create new hosted zones

### AWS Default Domains (simpler for testing)
1. Update your `terraform.tfvars` file:
   - Set `create_route53_zone = false`
2. Comment out or modify the Route53 resources in `main.tf`
3. After deployment, use the AWS-provided domain names for your services:
   - ALB URL: `your-alb-name.region.elb.amazonaws.com`

Note: When using AWS default domains, you'll need to update the CORS settings and environment variables for services to communicate properly.

## Cleanup

To destroy the infrastructure:

```bash
cd terraform/environments/sponsor
terraform destroy
```

Repeat for other environments if needed.

Note: The S3 bucket and DynamoDB table for state management must be removed manually after all environments are destroyed.
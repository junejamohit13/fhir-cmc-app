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
4. Domain name and ACM certificate (for HTTPS)
5. Docker images published to ECR (for frontend and backend applications)

## Getting Started

1. First, set up the Terraform state management:

```bash
cd terraform
terraform init
terraform apply -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_locks
```

2. Create environment-specific variable files:

```bash
cd environments/sponsor
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values
```

3. Deploy the sponsor environment:

```bash
terraform init
terraform plan
terraform apply
```

4. Repeat for CRO and regulator environments:

```bash
cd ../cro
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars
terraform init
terraform plan
terraform apply

cd ../regulator
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars
terraform init
terraform plan
terraform apply
```

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

## Custom Domain Names

To use custom domain names, you need to:

1. Create ACM certificates for your domains
2. Update the `domain_name` variable for each environment
3. Set `create_route53_zone` to `true` if you need to create new hosted zones

## Cleanup

To destroy the infrastructure:

```bash
cd terraform/environments/sponsor
terraform destroy

cd ../cro
terraform destroy

cd ../regulator
terraform destroy
```

Finally, destroy the state management resources:

```bash
cd ../../
terraform destroy -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_locks
```
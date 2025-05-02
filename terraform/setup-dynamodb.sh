#!/bin/bash
# Create DynamoDB table for Terraform state locking

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Create the DynamoDB table for terraform locking
aws dynamodb create-table \
    --table-name fhir-cmc-terraform-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

echo "DynamoDB table 'fhir-cmc-terraform-locks' created successfully."
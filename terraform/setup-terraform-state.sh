#!/bin/bash
# Script to create the S3 bucket and DynamoDB table for Terraform state management
# Run this BEFORE initializing Terraform

set -e

BUCKET_NAME="fhir-cmc-terraform-state-2"
DYNAMODB_TABLE="fhir-cmc-terraform-locks"
REGION="us-east-1"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Create S3 bucket
echo "Creating S3 bucket: $BUCKET_NAME"
if aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null; then
    echo "Bucket already exists"
else
    aws s3api create-bucket \
        --bucket $BUCKET_NAME \
        --region $REGION
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket $BUCKET_NAME \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket $BUCKET_NAME \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket $BUCKET_NAME \
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    echo "S3 bucket created and configured"
fi

# Create DynamoDB table
echo "Creating DynamoDB table: $DYNAMODB_TABLE"
if aws dynamodb describe-table --table-name $DYNAMODB_TABLE --region $REGION 2>/dev/null; then
    echo "DynamoDB table already exists"
else
    aws dynamodb create-table \
        --table-name $DYNAMODB_TABLE \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION
    
    echo "DynamoDB table created"
fi

echo "Terraform state backend resources created successfully!"
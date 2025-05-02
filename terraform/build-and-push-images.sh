#!/bin/bash
# Script to build and push Docker images to Amazon ECR

set -e

# Configure these variables
AWS_REGION="us-east-1"
PROJECT="fhir-cmc"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Repository names
HAPI_REPOSITORY="$PROJECT-hapi-fhir"
SPONSOR_FRONTEND_REPOSITORY="$PROJECT-sponsor-frontend"
SPONSOR_BACKEND_REPOSITORY="$PROJECT-sponsor-backend"
CRO_FRONTEND_REPOSITORY="$PROJECT-cro-frontend"
CRO_BACKEND_REPOSITORY="$PROJECT-cro-backend"

# Image tags
TAG=$(date +%Y%m%d%H%M%S)

echo "Building and pushing Docker images to ECR in $AWS_REGION..."

# Log in to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Function to create repository if it doesn't exist
create_repository() {
    local repo_name=$1
    echo "Creating repository $repo_name if it doesn't exist..."
    aws ecr describe-repositories --repository-names $repo_name --region $AWS_REGION || \
    aws ecr create-repository --repository-name $repo_name --region $AWS_REGION
}

# Create repositories
create_repository $HAPI_REPOSITORY
create_repository $SPONSOR_FRONTEND_REPOSITORY
create_repository $SPONSOR_BACKEND_REPOSITORY
create_repository $CRO_FRONTEND_REPOSITORY
create_repository $CRO_BACKEND_REPOSITORY

# Build and push HAPI FHIR Server
echo "Building and pushing HAPI FHIR Server..."
cd "$(dirname "$0")/../hapi-server"

# Build the image
docker build -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:$TAG .
docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:latest

# Push the image
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:latest

echo "HAPI FHIR Server image pushed to: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:latest"

# Build and push Sponsor Frontend
echo "Building and pushing Sponsor Frontend..."
cd "$(dirname "$0")/../sponsor-app/frontend"

# Build the image
docker build -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:$TAG .
docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:latest

# Push the image
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:latest

echo "Sponsor Frontend image pushed to: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:latest"

# Build and push Sponsor Backend
echo "Building and pushing Sponsor Backend..."
cd "$(dirname "$0")/../sponsor-app/backend"

# Build the image
docker build -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:$TAG .
docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:latest

# Push the image
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:latest

echo "Sponsor Backend image pushed to: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:latest"

# Build and push CRO Frontend
echo "Building and pushing CRO Frontend..."
cd "$(dirname "$0")/../cro-app/frontend"

# Build the image
docker build -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:$TAG .
docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:latest

# Push the image
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:latest

echo "CRO Frontend image pushed to: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:latest"

# Build and push CRO Backend
echo "Building and pushing CRO Backend..."
cd "$(dirname "$0")/../cro-app/backend"

# Build the image
docker build -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:$TAG .
docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:latest

# Push the image
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:latest

echo "CRO Backend image pushed to: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:latest"

echo ""
echo "All images have been built and pushed to ECR."
echo ""
echo "Update your terraform.tfvars files with:"
echo ""
echo "fhir_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:latest\""
echo "frontend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:latest\""
echo "backend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:latest\""
echo ""
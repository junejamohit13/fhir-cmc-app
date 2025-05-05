#!/bin/bash
# Script to build and push Docker images to Amazon ECR

set -e

# Store the base project directory
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Base project directory: $BASE_DIR"

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

# Function to build and push an image if directory exists
build_and_push() {
    local dir="$1"
    local repo="$2"
    local name="$3"
    
    echo "Building and pushing $name..."
    echo "Directory: $dir"
    
    if [ ! -d "$dir" ]; then
        echo "Error: Directory $dir does not exist."
        echo "Skipping $name build..."
        echo ""
        return 1
    fi
    
    cd "$dir"
    
    # Build the image with explicit platform for compatibility with AWS ECS (which uses amd64/x86_64)
    echo "Building Docker image for linux/amd64 platform..."
    docker build --platform linux/amd64 -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repo:$TAG .
    docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repo:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repo:latest
    
    # Push the image
    echo "Pushing to ECR..."
    docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repo:$TAG
    docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repo:latest
    
    echo "$name image pushed to: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repo:latest"
    echo ""
    return 0
}

# Build and push HAPI FHIR Server
HAPI_SUCCESS=0
build_and_push "$BASE_DIR/hapi-server" "$HAPI_REPOSITORY" "HAPI FHIR Server" && HAPI_SUCCESS=1

# Build and push Sponsor Frontend
SPONSOR_FRONTEND_SUCCESS=0
build_and_push "$BASE_DIR/sponsor-app/frontend" "$SPONSOR_FRONTEND_REPOSITORY" "Sponsor Frontend" && SPONSOR_FRONTEND_SUCCESS=1

# Build and push Sponsor Backend
SPONSOR_BACKEND_SUCCESS=0
build_and_push "$BASE_DIR/sponsor-app/backend" "$SPONSOR_BACKEND_REPOSITORY" "Sponsor Backend" && SPONSOR_BACKEND_SUCCESS=1

# Build and push CRO Frontend
CRO_FRONTEND_SUCCESS=0
build_and_push "$BASE_DIR/cro-app/frontend" "$CRO_FRONTEND_REPOSITORY" "CRO Frontend" && CRO_FRONTEND_SUCCESS=1

# Build and push CRO Backend
CRO_BACKEND_SUCCESS=0
build_and_push "$BASE_DIR/cro-app/backend" "$CRO_BACKEND_REPOSITORY" "CRO Backend" && CRO_BACKEND_SUCCESS=1

echo "========================================================"
echo "All available images have been built and pushed to ECR."
echo "========================================================"
echo ""
echo "Update your terraform.tfvars files with:"
echo ""

if [ $HAPI_SUCCESS -eq 1 ]; then
  echo "fhir_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:latest\""
else
  echo "# HAPI image build failed or directory not found"
  echo "# fhir_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HAPI_REPOSITORY:latest\""
fi

if [ $SPONSOR_FRONTEND_SUCCESS -eq 1 ]; then
  echo "frontend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:latest\""
else
  echo "# Sponsor Frontend image build failed or directory not found"
  echo "# frontend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_FRONTEND_REPOSITORY:latest\""
fi

if [ $SPONSOR_BACKEND_SUCCESS -eq 1 ]; then
  echo "backend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:latest\""
else
  echo "# Sponsor Backend image build failed or directory not found"
  echo "# backend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$SPONSOR_BACKEND_REPOSITORY:latest\""
fi

echo ""
echo "For CRO environment:"
echo ""

if [ $CRO_FRONTEND_SUCCESS -eq 1 ]; then
  echo "frontend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:latest\""
else
  echo "# CRO Frontend image build failed or directory not found"
  echo "# frontend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_FRONTEND_REPOSITORY:latest\""
fi

if [ $CRO_BACKEND_SUCCESS -eq 1 ]; then
  echo "backend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:latest\""
else
  echo "# CRO Backend image build failed or directory not found"
  echo "# backend_image = \"$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CRO_BACKEND_REPOSITORY:latest\""
fi

echo ""
echo "========================================================"
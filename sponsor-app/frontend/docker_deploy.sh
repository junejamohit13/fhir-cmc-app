# 1) Handy variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
TAG=latest            # or v1.0.0, etc.
REPO_NAME=sponsor_frontend     # <-- your chosen name

# 2) Create (or confirm) the ECR repo
aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION \
|| aws ecr create-repository \
       --repository-name $REPO_NAME \
       --image-scanning-configuration scanOnPush=true \
       --region $REGION

# 3) Log in Docker to ECR
aws ecr get-login-password --region $REGION \
| docker login --username AWS --password-stdin \
  $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# 4) Build & tag locally
docker build -t sponsor:$TAG .
docker tag $REPO_NAME:$TAG \
  $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:$TAG

# 5) Push to ECR
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:$TAG

# 6) Quick check
aws ecr list-images --repository-name $REPO_NAME --region $REGION \
        --query 'imageIds[*].imageTag'



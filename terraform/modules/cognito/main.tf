resource "aws_cognito_user_pool" "main" {
  name                     = "${var.project}-${var.environment}-user-pool"
  username_attributes      = ["email"]
  auto_verify_attributes   = ["email"]
  mfa_configuration        = "OFF"
  deletion_protection      = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your verification code"
    email_message        = "Your verification code is {####}"
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "organization"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-user-pool"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_cognito_user_pool_client" "frontend" {
  name                                 = "${var.project}-${var.environment}-frontend-client"
  user_pool_id                         = aws_cognito_user_pool.main.id
  generate_secret                      = false
  refresh_token_validity               = 30
  prevent_user_existence_errors        = "ENABLED"
  callback_urls                        = ["https://${var.domain_name}", "http://localhost:3000"]
  logout_urls                          = ["https://${var.domain_name}", "http://localhost:3000"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"]
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_user_pool_client" "backend" {
  name                                 = "${var.project}-${var.environment}-backend-client"
  user_pool_id                         = aws_cognito_user_pool.main.id
  generate_secret                      = true
  refresh_token_validity               = 30
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = ["${var.project}/${var.environment}/backend-api.read", "${var.project}/${var.environment}/backend-api.write"]
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_user_pool_client" "fhir" {
  name                                 = "${var.project}-${var.environment}-fhir-client"
  user_pool_id                         = aws_cognito_user_pool.main.id
  generate_secret                      = true
  refresh_token_validity               = 30
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = ["${var.project}/${var.environment}/fhir-api.read", "${var.project}/${var.environment}/fhir-api.write"]
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_resource_server" "backend" {
  identifier   = "${var.project}/${var.environment}/backend-api"
  name         = "${var.project}-${var.environment}-backend-api"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access to backend API"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access to backend API"
  }
}

resource "aws_cognito_resource_server" "fhir" {
  identifier   = "${var.project}/${var.environment}/fhir-api"
  name         = "${var.project}-${var.environment}-fhir-api"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access to FHIR API"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access to FHIR API"
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Create identity pool for authenticated and unauthenticated access if needed
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project}${var.environment}IdentityPool"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.frontend.id
    provider_name           = "cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
    server_side_token_check = false
  }

  tags = {
    Name        = "${var.project}-${var.environment}-identity-pool"
    Environment = var.environment
    Project     = var.project
  }
}

# Create roles for Cognito identity pool
resource "aws_iam_role" "authenticated" {
  name = "${var.project}-${var.environment}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-cognito-authenticated"
    Environment = var.environment
    Project     = var.project
  }
}

# Attach policy to authenticated role
resource "aws_iam_role_policy" "authenticated" {
  name = "${var.project}-${var.environment}-authenticated-policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach roles to identity pool
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.authenticated.arn
  }
}
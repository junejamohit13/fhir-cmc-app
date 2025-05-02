terraform {
  backend "s3" {
    bucket         = "fhir-cmc-terraform-state-2"
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "fhir-cmc-terraform-locks"
    encrypt        = true
  }
}
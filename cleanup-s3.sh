#!/bin/bash

# Delete all object versions
aws s3api delete-objects --bucket fhir-cmc-terraform-state-2 --delete "$(aws s3api list-object-versions --bucket fhir-cmc-terraform-state-2 --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output=json)"

# Delete all delete markers
aws s3api delete-objects --bucket fhir-cmc-terraform-state-2 --delete "$(aws s3api list-object-versions --bucket fhir-cmc-terraform-state-2 --query='{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output=json)"

# Now delete the bucket
aws s3 rb s3://fhir-cmc-terraform-state-2

# Delete the DynamoDB table for Terraform locks
aws dynamodb delete-table --table-name fhir-cmc-terraform-locks
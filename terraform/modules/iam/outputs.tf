output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution_role.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task_role.arn
}

output "fhir_client_secret_arn" {
  value = aws_secretsmanager_secret.fhir_client_secret.arn
}
output "cluster_endpoint" {
  description = "Endpoint of the RDS Aurora cluster"
  value       = aws_rds_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "Reader endpoint of the RDS Aurora cluster"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "db_name" {
  description = "Name of the database"
  value       = aws_rds_cluster.main.database_name
}

output "db_username" {
  description = "Master username for the database"
  value       = aws_rds_cluster.main.master_username
  sensitive   = true
}

output "db_port" {
  description = "Port the database is listening on"
  value       = aws_rds_cluster.main.port
}
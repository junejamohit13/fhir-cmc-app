resource "aws_rds_cluster" "main" {
  cluster_identifier              = "${var.project}-${var.environment}-aurora-cluster"
  engine                          = "aurora-postgresql"
  engine_mode                     = "provisioned"
  engine_version                  = var.postgres_version
  database_name                   = var.db_name
  master_username                 = var.db_username
  master_password                 = var.db_password
  backup_retention_period         = 7
  preferred_backup_window         = "03:00-05:00"
  preferred_maintenance_window    = "sun:01:00-sun:03:00"
  db_subnet_group_name            = var.db_subnet_group_name
  vpc_security_group_ids          = [var.db_security_group_id]
  enabled_cloudwatch_logs_exports = ["postgresql"]
  storage_encrypted               = true
  apply_immediately               = true
  skip_final_snapshot             = var.environment != "prod"
  final_snapshot_identifier       = var.environment != "prod" ? null : "${var.project}-${var.environment}-final-snapshot"
  
  serverlessv2_scaling_configuration {
    max_capacity = var.db_max_capacity
    min_capacity = var.db_min_capacity
  }

  tags = {
    Name        = "${var.project}-${var.environment}-aurora-cluster"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_rds_cluster_instance" "main" {
  count                = var.db_instance_count
  identifier           = "${var.project}-${var.environment}-instance-${count.index + 1}"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  db_subnet_group_name = var.db_subnet_group_name
  
  tags = {
    Name        = "${var.project}-${var.environment}-instance-${count.index + 1}"
    Environment = var.environment
    Project     = var.project
  }
}
# =============================================================================
# Partition-Aware Data Sources
# =============================================================================
data "aws_partition" "current" {}

locals {
  partition  = data.aws_partition.current.partition
  dns_suffix = data.aws_partition.current.dns_suffix
}

# Create PR Lambda
module "create_pr_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.0"

  function_name = "${var.project_name}-create-pr-${var.environment}"
  handler       = "create-pr.handler"
  runtime       = "nodejs24.x"
  timeout       = 30

  source_path = [
    {
      path             = "${path.module}/../../../lambda/create-pr"
      npm_requirements = true
    }
  ]

  create_role = false
  lambda_role = aws_iam_role.create_pr.arn

  tags = var.tags
}

resource "aws_iam_role" "create_pr" {
  name = "${var.project_name}-create-pr-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.${local.dns_suffix}" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "create_pr" {
  name = "create-pr-policy"
  role = aws_iam_role.create_pr.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:${local.partition}:logs:*:*:*"
      }
    ]
  })
}

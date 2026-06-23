# =============================================================================
# Partition-Aware Data Sources
# =============================================================================
data "aws_partition" "current" {}

locals {
  partition  = data.aws_partition.current.partition
  dns_suffix = data.aws_partition.current.dns_suffix
}

# Get Agent Output Lambda
module "get_agent_output_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.0"

  function_name = "${var.project_name}-get-agent-output-${var.environment}"
  handler       = "get-agent-output.handler"
  runtime       = "nodejs24.x"
  timeout       = 10

  source_path = [
    {
      path = "${path.module}/../../../lambda/get-agent-output"
      commands = [
        "cd ../.. && npm run build -w get-agent-output",
        ":zip lambda/get-agent-output/.build",
      ]
    }
  ]

  create_role = false
  lambda_role = aws_iam_role.get_agent_output.arn

  environment_variables = {
    AGENT_OUTPUTS_TABLE = var.agent_outputs_table_name
  }

  tags = var.tags
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

resource "aws_iam_role" "get_agent_output" {
  name = "${var.project_name}-get-agent-output-${var.environment}"

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

resource "aws_iam_role_policy" "get_agent_output" {
  name = "get-agent-output-policy"
  role = aws_iam_role.get_agent_output.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = var.agent_outputs_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:${local.partition}:logs:*:*:*"
      }
    ]
  })
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



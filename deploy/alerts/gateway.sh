#!/bin/bash
# Prerequisites: set these for your environment
API_NAME="first10-api"
STAGE="prod"
AWS_REGION="us-east-1"
ALERT_EMAIL="you@example.com"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='${API_NAME}'].id" \
  --output text --region $AWS_REGION)

echo "Targeting API ID: $API_ID"

# ── 1. SNS topic for notifications ──────────────────────────────────────────
TOPIC_ARN=$(aws sns create-topic \
  --name "first10-alerts-critical" \
  --region $AWS_REGION \
  --query TopicArn --output text)

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint $ALERT_EMAIL \
  --region $AWS_REGION

echo "SNS topic: $TOPIC_ARN"
echo "Confirm the subscription email before alarms can fire."

# ── 2. Alarm: 5xx count (absolute threshold) ────────────────────────────────
# Fires if any 5xx errors occur — good for low-traffic apps where
# even 1-2 errors per minute is significant
aws cloudwatch put-metric-alarm \
  --alarm-name "first10-apigw-5xx-count" \
  --alarm-description "API Gateway 5xx errors on ${API_NAME}/${STAGE}" \
  --namespace "AWS/ApiGateway" \
  --metric-name "5XXError" \
  --dimensions Name=ApiName,Value=$API_NAME Name=Stage,Value=$STAGE \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

# ── 3. Alarm: 5xx error rate (percentage) ───────────────────────────────────
# More meaningful at higher traffic — fires when 5xx exceeds 1% of all requests.
# Uses a metric expression to compute (5xx / total) * 100
aws cloudwatch put-metric-alarm \
  --alarm-name "first10-apigw-5xx-rate" \
  --alarm-description "API Gateway 5xx error rate > 1% on ${API_NAME}/${STAGE}" \
  --metrics '[
    {
      "Id": "errors",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApiGateway",
          "MetricName": "5XXError",
          "Dimensions": [
            {"Name": "ApiName", "Value": "'"$API_NAME"'"},
            {"Name": "Stage",   "Value": "'"$STAGE"'"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "requests",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApiGateway",
          "MetricName": "Count",
          "Dimensions": [
            {"Name": "ApiName", "Value": "'"$API_NAME"'"},
            {"Name": "Stage",   "Value": "'"$STAGE"'"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "error_rate",
      "Expression": "(errors / requests) * 100",
      "Label": "5XX Error Rate %",
      "ReturnData": true
    }
  ]' \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2 \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

echo "Done. Two alarms created:"
echo "  first10-apigw-5xx-count — fires on >= 5 errors in 5 min"
echo "  first10-apigw-5xx-rate  — fires when error rate >= 1% over 10 min"

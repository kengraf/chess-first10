#!/bin/bash
# ── Config ────────────────────────────────────────────────────────────────────
TABLE_NAME="chess-first10"
AWS_REGION="us-east-2"
TOPIC_CRITICAL="arn:aws:sns:us-east-1:ACCOUNT_ID:first10-alerts-critical"
TOPIC_HIGH="arn:aws:sns:us-east-1:ACCOUNT_ID:first10-alerts-high"
FUNCTION_NAME_DB="first10-DatabaseItems"

# ── 1. SystemErrors (AWS-side 5xx from DynamoDB) ──────────────────────────────
# Internal AWS failures — not your code, not throttling. These are rare but
# when they happen every PutItem/GetItem fails. Zero tolerance threshold.
# Covers: userSave(), sendBeacon() on tab close, fetchJSON() on login.
aws cloudwatch put-metric-alarm \
  --alarm-name "critical-dynamodb-system-errors" \
  --alarm-description "DynamoDB returning 5xx — AWS-side failure, all session saves failing" \
  --namespace "AWS/DynamoDB" \
  --metric-name "SystemErrors" \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_CRITICAL \
  --ok-actions $TOPIC_CRITICAL \
  --region $AWS_REGION

# ── 2. SystemErrors per operation (PutItem vs GetItem) ────────────────────────
# Breaks down which operation is failing so the runbook path is immediate.
# PutItem = session saves broken. GetItem = login/history load broken.
for OPERATION in PutItem GetItem; do
  aws cloudwatch put-metric-alarm \
    --alarm-name "critical-dynamodb-system-errors-${OPERATION,,}" \
    --alarm-description "DynamoDB ${OPERATION} returning 5xx on ${TABLE_NAME}" \
    --namespace "AWS/DynamoDB" \
    --metric-name "SystemErrors" \
    --dimensions \
        Name=TableName,Value=$TABLE_NAME \
        Name=Operation,Value=$OPERATION \
    --statistic Sum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching \
    --alarm-actions $TOPIC_CRITICAL \
    --ok-actions $TOPIC_CRITICAL \
    --region $AWS_REGION
done

# ── 3. UserErrors (client-side 4xx — bad requests from Lambda) ────────────────
# Catches malformed requests from the databaseItems Lambda — wrong key schema,
# missing required attributes, or a conditional check failure. These won't
# appear in SystemErrors but will silently drop user saves.
aws cloudwatch put-metric-alarm \
  --alarm-name "high-dynamodb-user-errors" \
  --alarm-description "DynamoDB rejecting requests — Lambda sending malformed writes" \
  --namespace "AWS/DynamoDB" \
  --metric-name "UserErrors" \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_HIGH \
  --ok-actions $TOPIC_HIGH \
  --region $AWS_REGION

# ── 4. Write throttles ────────────────────────────────────────────────────────
# On-demand tables auto-scale but can still throttle on sudden traffic spikes.
# userSave() queues saves with a 1-minute delay — a burst of simultaneous
# tab-closes (visibilitychange) via sendBeacon could spike writes.
aws cloudwatch put-metric-alarm \
  --alarm-name "high-dynamodb-write-throttles" \
  --alarm-description "DynamoDB write throttling — session saves being dropped" \
  --namespace "AWS/DynamoDB" \
  --metric-name "WriteThrottleEvents" \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_HIGH \
  --ok-actions $TOPIC_HIGH \
  --region $AWS_REGION

# ── 5. Read throttles ─────────────────────────────────────────────────────────
# GetItem on login — if a user logs in and their history fetch is throttled
# they land on a default anonymous state silently. Separate from write
# throttles because the fix path is different (read vs write capacity).
aws cloudwatch put-metric-alarm \
  --alarm-name "high-dynamodb-read-throttles" \
  --alarm-description "DynamoDB read throttling — user history not loading on login" \
  --namespace "AWS/DynamoDB" \
  --metric-name "ReadThrottleEvents" \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_HIGH \
  --ok-actions $TOPIC_HIGH \
  --region $AWS_REGION

# ── 6. PutItem latency p99 > 1s ───────────────────────────────────────────────
# Normal DynamoDB PutItem is under 10ms. p99 > 1s means the table is under
# stress before throttling kicks in. Early warning ahead of alarm 4.
aws cloudwatch put-metric-alarm \
  --alarm-name "high-dynamodb-putitem-latency" \
  --alarm-description "DynamoDB PutItem p99 > 1s — table under stress, throttles likely incoming" \
  --namespace "AWS/DynamoDB" \
  --metric-name "SuccessfulRequestLatency" \
  --dimensions \
      Name=TableName,Value=$TABLE_NAME \
      Name=Operation,Value=PutItem \
  --extended-statistic p99 \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 1000 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_HIGH \
  --ok-actions $TOPIC_HIGH \
  --region $AWS_REGION

# ── 7. Item size growth — metric filter on Lambda logs ────────────────────────
# The sessions array grows unboundedly (unshift on every save, never trimmed).
# DynamoDB hard cap is 400KB per item. This filter watches for the AWS SDK
# error thrown when an item exceeds the limit, before it starts silently
# dropping saves entirely.
# Emitted by the AWS SDK: "Item size has exceeded the maximum allowed size"
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/$FUNCTION_NAME_DB" \
  --filter-name "dynamodb-item-size-exceeded" \
  --filter-pattern '"Item size has exceeded"' \
  --metric-transformations \
    metricName="ItemSizeExceeded",\
metricNamespace="first10/dynamodb",\
metricValue="1",\
defaultValue="0" \
  --region $AWS_REGION

aws cloudwatch put-metric-alarm \
  --alarm-name "critical-dynamodb-item-size-exceeded" \
  --alarm-description "DynamoDB item over 400KB — sessions array not being trimmed, saves failing" \
  --namespace "first10/dynamodb" \
  --metric-name "ItemSizeExceeded" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_CRITICAL \
  --ok-actions $TOPIC_CRITICAL \
  --region $AWS_REGION

# ── 8. Consumed write capacity trending toward limit ──────────────────────────
# On-demand tables have an initial burst limit before auto-scaling kicks in.
# This doesn't alarm on absolute units (varies by traffic) but on a
# sudden spike — 10x the trailing average in a 5-minute window —
# using a metric math expression.
aws cloudwatch put-metric-alarm \
  --alarm-name "med-dynamodb-write-capacity-spike" \
  --alarm-description "DynamoDB write capacity 10x spike — possible runaway save loop" \
  --metrics '[
    {
      "Id": "writes",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/DynamoDB",
          "MetricName": "ConsumedWriteCapacityUnits",
          "Dimensions": [{"Name": "TableName", "Value": "'"$TABLE_NAME"'"}]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": true
    }
  ]' \
  --threshold 1000 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_HIGH \
  --ok-actions $TOPIC_HIGH \
  --region $AWS_REGION

echo "Alarms created:"
echo "  critical-dynamodb-system-errors              — AWS-side 5xx"
echo "  critical-dynamodb-system-errors-putitem      — PutItem 5xx specifically"
echo "  critical-dynamodb-system-errors-getitem      — GetItem 5xx specifically"
echo "  high-dynamodb-user-errors                    — malformed client requests"
echo "  high-dynamodb-write-throttles                — write capacity exceeded"
echo "  high-dynamodb-read-throttles                 — read capacity exceeded"
echo "  high-dynamodb-putitem-latency                — p99 latency early warning"
echo "  critical-dynamodb-item-size-exceeded         — 400KB cap hit (log filter)"
echo "  med-dynamodb-write-capacity-spike            — runaway write loop"

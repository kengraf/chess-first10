#!/bin/bash
# ── Config ────────────────────────────────────────────────────────────────────
FUNCTION_NAME="chess-first10-VerifyToken"
AWS_REGION="us-east-2"
TOPIC_ARN="arn:aws:sns:us-east-1:ACCOUNT_ID:first10-alerts-critical"

# ── 1. Lambda errors (unhandled exceptions / timeouts / OOM) ─────────────────
# These are infrastructure failures — the function crashed before returning
# anything. Covers: Secrets Manager unreachable, IAM denied, cold start OOM,
# function timeout waiting on Google's API.
aws cloudwatch put-metric-alarm \
  --alarm-name "critical-verifyToken-lambda-errors" \
  --alarm-description "verifyToken Lambda throwing unhandled errors — auth is broken" \
  --namespace "AWS/Lambda" \
  --metric-name "Errors" \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 3 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

# ── 2. Lambda duration p95 > 5s ───────────────────────────────────────────────
# verifyToken makes two external calls: Secrets Manager + Google's tokeninfo
# endpoint. Normal p95 should be under 1s. Sustained p95 > 5s means one of
# those dependencies is slow — users are hanging on login.
aws cloudwatch put-metric-alarm \
  --alarm-name "high-verifyToken-duration-p95" \
  --alarm-description "verifyToken p95 latency > 5s — Secrets Manager or Google API slow" \
  --namespace "AWS/Lambda" \
  --metric-name "Duration" \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --extended-statistic p95 \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5000 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

# ── 3. Lambda throttles ───────────────────────────────────────────────────────
# If concurrent logins hit the Lambda concurrency limit, Google's callback
# gets a 429 and the user sees a silent auth failure. Low threshold because
# verifyToken should rarely if ever throttle.
aws cloudwatch put-metric-alarm \
  --alarm-name "high-verifyToken-throttles" \
  --alarm-description "verifyToken Lambda being throttled — logins silently failing" \
  --namespace "AWS/Lambda" \
  --metric-name "Throttles" \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

# ── 4. Application-level 401s via metric filter ───────────────────────────────
# Lambda errors (alarm 1) only catch crashes. A valid token that fails
# Google verification returns a 401 cleanly — Lambda succeeds, no AWS error
# is recorded. This filter catches the log line from the Lambda code:
#   console.error("verifyToken error:", error.message)
# where the message contains "Invalid token" or "Token used too late".
# Creates a custom metric we can alarm on separately from infra failures.
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --filter-name "verifyToken-auth-failures" \
  --filter-pattern '"Invalid token" OR "Token used too late" OR "Wrong recipient"' \
  --metric-transformations \
    metricName="AuthFailures",\
metricNamespace="first10/auth",\
metricValue="1",\
defaultValue="0" \
  --region $AWS_REGION

aws cloudwatch put-metric-alarm \
  --alarm-name "high-verifyToken-auth-failures" \
  --alarm-description "Sustained Google token rejections — possible replay attack or clock skew" \
  --namespace "first10/auth" \
  --metric-name "AuthFailures" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

# ── 5. Secrets Manager access failures via metric filter ──────────────────────
# If the Lambda's IAM role loses permission to read first10/google-oauth
# (e.g. after a policy change or deploy), every login attempt fails with a
# 500. This is distinct from a token error and needs a different fix.
# Matches: AccessDeniedException from the AWS SDK in the Lambda logs.
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --filter-name "verifyToken-secrets-access-denied" \
  --filter-pattern '"AccessDeniedException"' \
  --metric-transformations \
    metricName="SecretsAccessDenied",\
metricNamespace="first10/auth",\
metricValue="1",\
defaultValue="0" \
  --region $AWS_REGION

aws cloudwatch put-metric-alarm \
  --alarm-name "critical-verifyToken-secrets-access-denied" \
  --alarm-description "Lambda cannot read Secrets Manager — IAM misconfigured, all logins failing" \
  --namespace "first10/auth" \
  --metric-name "SecretsAccessDenied" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $AWS_REGION

echo "Alarms created:"
echo "  critical-verifyToken-lambda-errors          — unhandled crashes"
echo "  high-verifyToken-duration-p95               — slow external deps"
echo "  high-verifyToken-throttles                  — concurrency limit hit"
echo "  high-verifyToken-auth-failures              — bad tokens (log filter)"
echo "  critical-verifyToken-secrets-access-denied  — IAM broken (log filter)"

aws cloudwatch put-dashboard \
  --dashboard-name "first10-operations" \
  --region us-east-2 \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "title": "API Gateway — requests & errors",
          "metrics": [
            ["AWS/ApiGateway", "Count",    "ApiName", "first10-api", "Stage", "prod", {"label": "Total requests", "stat": "Sum"}],
            ["AWS/ApiGateway", "5XXError", "ApiName", "first10-api", "Stage", "prod", {"label": "5xx errors",     "stat": "Sum", "color": "#d13212"}],
            ["AWS/ApiGateway", "4XXError", "ApiName", "first10-api", "Stage", "prod", {"label": "4xx errors",     "stat": "Sum", "color": "#ff9900"}],
            ["AWS/ApiGateway", "Latency",  "ApiName", "first10-api", "Stage", "prod", {"label": "p95 latency",    "stat": "p95",  "yAxis": "right"}]
          ],
          "period": 300,
          "view": "timeSeries",
          "stacked": false,
          "width": 12, "height": 6
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "Lambda — duration & errors",
          "metrics": [
            ["AWS/Lambda", "Errors",   "FunctionName", "first10-verifyToken",    {"stat": "Sum",  "color": "#d13212"}],
            ["AWS/Lambda", "Errors",   "FunctionName", "first10-databaseItems",  {"stat": "Sum",  "color": "#ff9900"}],
            ["AWS/Lambda", "Duration", "FunctionName", "first10-verifyToken",    {"stat": "p95",  "yAxis": "right"}],
            ["AWS/Lambda", "Duration", "FunctionName", "first10-databaseItems",  {"stat": "p95",  "yAxis": "right"}],
            ["AWS/Lambda", "Throttles","FunctionName", "first10-verifyToken",    {"stat": "Sum",  "color": "#7f7f7f"}]
          ],
          "period": 300,
          "view": "timeSeries",
          "width": 12, "height": 6
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "DynamoDB — reads, writes & errors",
          "metrics": [
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "first10-users", {"stat": "Sum"}],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits",  "TableName", "first10-users", {"stat": "Sum"}],
            ["AWS/DynamoDB", "SystemErrors",               "TableName", "first10-users", {"stat": "Sum", "color": "#d13212"}],
            ["AWS/DynamoDB", "SuccessfulRequestLatency",   "TableName", "first10-users", "Operation", "PutItem", {"stat": "p95", "yAxis": "right"}]
          ],
          "period": 300,
          "view": "timeSeries",
          "width": 12, "height": 6
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "CloudFront — traffic & cache",
          "metrics": [
            ["AWS/CloudFront", "Requests",      "DistributionId", "YOUR_DIST_ID", "Region", "Global", {"stat": "Sum"}],
            ["AWS/CloudFront", "BytesDownloaded","DistributionId", "YOUR_DIST_ID", "Region", "Global", {"stat": "Sum"}],
            ["AWS/CloudFront", "5xxErrorRate",  "DistributionId", "YOUR_DIST_ID", "Region", "Global", {"stat": "Average", "color": "#d13212", "yAxis": "right"}],
            ["AWS/CloudFront", "CacheHitRate",  "DistributionId", "YOUR_DIST_ID", "Region", "Global", {"stat": "Average", "yAxis": "right"}]
          ],
          "period": 300,
          "view": "timeSeries",
          "width": 12, "height": 6
        }
      },
      {
        "type": "alarm",
        "properties": {
          "title": "Alarm status",
          "alarms": [
            "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:first10-apigw-5xx-count",
            "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:first10-apigw-5xx-rate",
            "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:first10-verifyToken-errors",
            "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:first10-dynamodb-system-errors",
            "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:first10-lambda-throttles",
            "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:first10-log-ingest"
          ],
          "width": 24, "height": 4
        }
      }
    ]
  }'
  

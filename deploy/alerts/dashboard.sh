aws cloudwatch put-dashboard \
  --dashboard-name "first10-operations" \
  --region us-east-2 \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "width": 12, "height": 6,
        "properties": {
          "title": "API Gateway — requests & errors",
          "metrics": [
            ["AWS/ApiGateway", "Count",    "ApiName", "chess-frist10", "Stage", "prod", {"label": "Total requests", "stat": "Sum"}],
            ["AWS/ApiGateway", "5XXError", "ApiName", "chess-frist10", "Stage", "prod", {"label": "5xx errors",     "stat": "Sum", "color": "#d13212"}],
            ["AWS/ApiGateway", "4XXError", "ApiName", "chess-frist10", "Stage", "prod", {"label": "4xx errors",     "stat": "Sum", "color": "#ff9900"}],
            ["AWS/ApiGateway", "Latency",  "ApiName", "chess-frist10", "Stage", "prod", {"label": "p95 latency",    "stat": "p95",  "yAxis": "right"}]
          ],
          "period": 300,
          "region": "us-east-2",
          "view": "timeSeries",
          "stacked": false
        }
      },
      {
        "type": "metric",
        "width": 12, "height": 6,
        "properties": {
          "title": "Lambda — duration & errors",
          "metrics": [
            ["AWS/Lambda", "Errors",   "FunctionName", "chess-first10-VerifyToken",    {"stat": "Sum",  "color": "#d13212"}],
            ["AWS/Lambda", "Errors",   "FunctionName", "chess-first10-DatabaseItemss",  {"stat": "Sum",  "color": "#ff9900"}],
            ["AWS/Lambda", "Duration", "FunctionName", "chess-first10-VerifyToken",    {"stat": "p95",  "yAxis": "right"}],
            ["AWS/Lambda", "Duration", "FunctionName", "chess-first10-DatabaseItems",  {"stat": "p95",  "yAxis": "right"}],
            ["AWS/Lambda", "Throttles","FunctionName", "chess-first10-VerifyToken",    {"stat": "Sum",  "color": "#7f7f7f"}],
            ["AWS/Lambda", "Throttles","FunctionName", "chess-first10-DatabaseItems",    {"stat": "Sum",  "color": "#7f7f7f"}]
          ],
          "period": 300,
          "region": "us-east-2",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "width": 12, "height": 6,
        "properties": {
          "title": "DynamoDB — reads, writes & errors",
          "metrics": [
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "chess-first10", {"stat": "Sum"}],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits",  "TableName", "chess-first10", {"stat": "Sum"}],
            ["AWS/DynamoDB", "SystemErrors",               "TableName", "chess-first10", {"stat": "Sum", "color": "#d13212"}],
            ["AWS/DynamoDB", "SuccessfulRequestLatency",   "TableName", "chess-first10", "Operation", "PutItem", {"stat": "p95", "yAxis": "right"}]
          ],
          "period": 300,
          "region": "us-east-2",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "CloudFront — traffic & cache",
          "metrics": [
            ["AWS/CloudFront", "Requests",      "DistributionId", "E11ZUO4X7QTOF0", "Region", "Global", {"stat": "Sum"}],
            ["AWS/CloudFront", "BytesDownloaded","DistributionId", "E11ZUO4X7QTOF0", "Region", "Global", {"stat": "Sum"}],
            ["AWS/CloudFront", "5xxErrorRate",  "DistributionId", "E11ZUO4X7QTOF0", "Region", "Global", {"stat": "Average", "color": "#d13212", "yAxis": "right"}],
            ["AWS/CloudFront", "CacheHitRate",  "DistributionId", "E11ZUO4X7QTOF0", "Region", "Global", {"stat": "Average", "yAxis": "right"}]
          ],
          "period": 300,
          "region": "us-east-2",
          "view": "timeSeries"
        }
      },
      {
        "type": "alarm",
        "width": 12, "height": 6,
        "properties": {
          "title": "Alarm status",
          "alarms": [
            "arn:aws:cloudwatch:us-east-1:788715698479:alarm:first10-apigw-5xx-count",
            "arn:aws:cloudwatch:us-east-1:788715698479:alarm:first10-apigw-5xx-rate",
            "arn:aws:cloudwatch:us-east-1:788715698479:alarm:first10-verifyToken-errors",
            "arn:aws:cloudwatch:us-east-1:788715698479:alarm:first10-dynamodb-system-errors",
            "arn:aws:cloudwatch:us-east-1:788715698479:alarm:first10-lambda-throttles",
            "arn:aws:cloudwatch:us-east-1:788715698479:alarm:first10-log-ingest"
          ]
        }
      }
    ]
  }'
  

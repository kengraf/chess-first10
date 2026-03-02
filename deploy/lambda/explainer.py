import json
import boto3

def handler(event, context):
    # Get prompt from event or use default
    prompt = event.get("prompt", "What is the capital of France?")

    bedrock = boto3.client(
        service_name="bedrock-runtime",
        region_name="us-east-2"  # Change to your region
    )

    # Using Claude on Bedrock
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    })
    model_id = "us.anthropic.claude-3-haiku-20240307-v1:0"
# "anthropic.claude-3-5-sonnet-20241022-v2:0"
    response = bedrock.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
        accept="application/json"
    )

    result = json.loads(response["body"].read())
    output_text = result["content"][0]["text"]

    return {
        "statusCode": 200,
        "body": json.dumps({
            "prompt": prompt,
            "response": output_text
        })
    }
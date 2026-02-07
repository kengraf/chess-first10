import os
import json
import boto3
import uuid
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as Grequests

CLIENT_ID = "1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com"

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'chess-first10')
table = dynamodb.Table(TABLE_NAME) 

def handler(event, context):
    print(event)
    try:
        # Parse JSON body
        body = json.loads(event["body"])
        token = body.get("idToken")
        
        if not token:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "idToken: is required in body"})
            }
        
        # Call Google service to validate JWT
        idinfo = id_token.verify_oauth2_token(token, Grequests.Request(), CLIENT_ID)
        sub = idinfo['sub']
        user_uuid = str(uuid.uuid4())
       
        # Update the table       
        response = table.update_item(
                Key={'sub': sub},
                UpdateExpression="""
                    SET #it = :id_info,
                        sessions = list_append(if_not_exists(sessions, :empty_list), :s),
                        missed = :m
                """,
                ExpressionAttributeNames={
                    '#it': 'idInfo'  # Use alias because 'idInfo' might be fine, but safe practice
                    },
                ExpressionAttributeValues={
                    ':idInfo': id_info,
                    ':s': new_sessions,
                    ':m': new_missed,
                    ':empty_list': []
                    },
                ReturnValues="UPDATED_NEW"
            )
        
        body = json.dumps({"message": "Session created", "idInfo": idinfo, "uuid":user_uuid})
        return {
            "cookies": [
                f"session={user_uuid}; Secure=true; SameSite=Lax; Path=/",
                f"user={sub}; Secure=true; SameSite=Lax; Path=/; Max-Age=31536000"
            ],
            "isBase64Encoded": False,
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Cache-Control": 'no-cache="Set-Cookie"'
            },
            "body": body
            }


    except ValueError as e:
        print(f"Error {e}")
        return {
            "statusCode": 401,
            "headers": { "Content-Type": "application/json" },
            "body": f"Error: {e}"
        } 

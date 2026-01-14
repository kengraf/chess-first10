import os
import json
import boto3
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests

CLIENT_ID = "1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com"

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['TABLE_NAME'] # set by cloudformation
table = dynamodb.Table(table_name)

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
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)
        sub = idinfo['sub']
        email = idinfo['email']
        user_uuid = str(uuid.uuid4())

        # Update the database
        table.put_item(Item={"email": email, "uuid": user_uuid})

        # TODO/FIX the cookie options
        return {
            "statusCode": 200,
            "headers": { "Content-Type": "application/json",
                       "Set-Cookie": "session="+user_uuid+"; Secure=true; SameSite=Lax; Path=/" },
            "body": json.dumps({"message": "Session created", "idToken": token})
        }
    
    except ValueError as e:
        print(f"Error {e}")
        return {
            "statusCode": 401,
            "headers": { "Content-Type": "application/json" },
            "body": f"Error: {e}"
        } 

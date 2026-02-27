import os
import json
import boto3
import uuid
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as Grequests
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)
	
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
        response = table.get_item(Key={'sub': sub})
        user_uuid = str(uuid.uuid4())
        idinfo['session'] = user_uuid 
        item = response.get('Item')
        
        # Save new user
        if item is None:
            item = {}
            item["sessions"] = [{"blue":0, "green":0, "yellow":0, "red":0, "date":0}]
            item["missed"] = []
            item["controls"] = {
                "preferColor": "random",
                "minimumTurns": 1,
                "maximumTurns": 10,
                "ecoCode": "", ""
                "showBestArrow": False,
                "playSounds": False,
                "replay": "never",
                "showHighlights": False,
                "theme": "classic",
                "animation": False
            }

        item['idInfo'] = idinfo  # recent auth data supercedes db
        item.pop('sub', None)    
        print(item)
        update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in item.keys())
        attr_names   = {f"#{k}": k for k in item.keys()}
        attr_values  = {f":{k}": v for k, v in item.items()}

        response = table.update_item(
            Key={'sub': sub},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values,
            ReturnValues='UPDATED_NEW'
        )

        # Eturn what is now in table
        response = {
            "cookies": [
                f"session={idinfo['session']}; Secure=true; SameSite=Lax; Path=/",
                f"user={sub}; Secure=true; SameSite=Lax; Path=/; Max-Age=31536000"
            ],
            "isBase64Encoded": False,
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Cache-Control": 'no-cache="Set-Cookie"'
            },
            "body": json.dumps(item, cls=DecimalEncoder)
            }
        print(response)
        return response

    except ValueError as e:
        print(f"Error {e}")
        return {
            "statusCode": 401,
            "headers": { "Content-Type": "application/json" },
            "body": f"Error: {e}"
        } 

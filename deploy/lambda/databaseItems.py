import json
import boto3
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)
	
# Initialize outside the handler for connection re-use
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('chess-first10')

def respond(status_code, body):
	response = {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(body, cls=DecimalEncoder)
    }
	print(response)
	return response

def handle_get(event, sub):
	try:
		response = table.get_item(Key={'sub': sub})
		if 'Item' in response:
			return respond(200, response['Item'])
	except Exception:
		return respond(404, {"error": "User data not found"})	
	
def handle_post(event, sub):
	try:
		data = event["body"]
		if isinstance(data, str):
			data = json.loads(data)
			if('sub' in data):
				del data['sub']
		print("Received body:", json.dumps(data))

		update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in data)
		attr_names   = {f"#{k}": k for k in data}
		attr_values  = {f":{k}": v for k, v in data.items()}

		response = table.update_item(
			Key={'sub': sub},
			UpdateExpression=update_expr,
			ExpressionAttributeNames=attr_names,
			ExpressionAttributeValues=attr_values,
			ReturnValues='UPDATED_NEW'
		)

		return {
			"statusCode": 200,
			"body": json.dumps(response, cls=DecimalEncoder)
		}

	except Exception as e:
		print(f"Error: {str(e)}")
		return {
			"statusCode": 500,
			"body": json.dumps({"error": "Internal Server Error", "details": str(e)})
		}

def authCookie(event):
	try:
		cookies = event.get('cookies', [])
		sub = next(
			(c.split('=', 1)[1] for c in cookies if c.startswith('user=')),None)
		if sub:
			response = table.get_item(Key={'sub': sub})
			if 'Item' in response:
				return sub
	except Exception:
		None
	return respond(401, {'error': f'Invalid user cookie: {sub}'})

def handler(event, context):
	print(event)
	sub = authCookie(event)
	if not sub:
		return {"statusCode": 401, "body": json.dumps({"error": "Unauthorized", "message": "Missing user cookie"})}

	method = event.get('requestContext', {}).get('http', {}).get('method')

	if method == 'GET':
		return handle_get(event, sub)
	elif method == 'POST':
		return handle_post(event, sub)
	else:
		return respond(405, {'error': f'Method {method} not allowed'})

if __name__ == "__main__":
	try:
		event = {}
		print( handler(event, 0) )
		event = {"cookies": ['user=test'], "requestContext":{"http":{"method":"GET"}}}
		print( handler(event, 0) )
	except Exception as e:
		print( str(e) )

"""  CLI examples
curl https://chess-first10.kengraf.com/api/databaseItems -b 'user=test'

curl -X POST https://chess-first10.kengraf.com/api/databaseItems \
     -H 'Content-Type: application/json' -b 'user=115804770028255050984' \
	-d '{"controls":{"playSounds":false,"showHighlights":false,"minimumTurns":1,"theme":"classic","replay":"never","preferColor":"random","maximumTurns":10,"ecoCode":"","showBestArrow":false,"animation":false},"idInfo":{"sub":"115804770028255050984","email_verified":true,"session":"f665bc64-cd37-402b-ad03-252b39cc0215","iss":"https://accounts.google.com","given_name":"Ken","nonce":"not_provided","picture":"https://lh3.googleusercontent.com/a/ACg8ocLQ3brj76ujujP8i5s21BMGS4w4p3_tzTperrtJdtTNQlJKIc9a=s96-c","aud":"1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com","nbf":1774208198,"azp":"1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com","name":"Ken Graf","exp":1774212098,"family_name":"Graf","iat":1774208498,"email":"kengraf57@gmail.com","jti":"d29826d895a6bc54e867eb587b99cbba9cc53877"},"missed":["1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5 5. Bg5 "],"sessions":[{"yellow":0,"red":0,"date":1774262305289,"green":0,"blue":0},{"yellow":0,"red":1,"date":1774261550347,"green":0,"blue":0},{"yellow":0,"red":0,"date":1774208492480,"green":0,"blue":0}],"sub":"115804770028255050984"}'

"""

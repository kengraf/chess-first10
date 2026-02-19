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
curl https://chess-first10.kengraf.com/v1/databaseItems -b 'user=test'

curl -X POST https://chess-first10.kengraf.com/v1/databaseItems \
     -H 'Content-Type: application/json' -b 'user=test' \
     -d '{ "controls": {"preferColor": "random","minimumTurns": 1,"maximumTurns": 10,"ecoCode": "","showBestArrow": false,"playSounds": true,"replay": "never","showHighlights": true,"theme": "classic","animation": false,"showArrows": true}, "idInfo": {"picture": "/images/login.png"},"sessions": [{"blue": 7,"green": 2,"yellow": 1,"red": 3,"date": 1771468093926}],"missed": ["1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 "] }'
"""
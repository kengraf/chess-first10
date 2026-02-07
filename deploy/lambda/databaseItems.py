import json
import boto3
import os

# Initialize outside the handler for connection re-use
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'chess-first10')
table = dynamodb.Table(TABLE_NAME)

def handler(event, context):
	print("Received event:", json.dumps(event, indent=2))
	try:
		# 1. Parse the incoming body
		body = event.get('body', '{}')
		sub = body.get('sub')
		id_info = body.get('idInfo')
		new_sessions = body.get('sessions', [])
		new_missed = body.get('missed', [])

		if not sub:
			return {"statusCode": 400, "body": json.dumps("Missing 'sub' key")}

		# 2. Update the item
		# We use list_append combined with if_not_exists to handle new vs existing items
		response = table.update_item(
			Key={'sub': sub},
			UpdateExpression="""
				SET #it = :idInfo,
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

		return {
			"statusCode": 200,
			"body": json.dumps({"message": "Update successful", "updated": response.get('Attributes')})
		}

	except Exception as e:
		print(f"Error: {str(e)}")
		return {
			"statusCode": 500,
			"body": json.dumps({"error": "Internal Server Error", "details": str(e)})
		}

if __name__ == "__main__":
	try:
		event = { "body": { "sub": "123abc", "idInfo": { "name": "bob", "email": "bob@bob.com"}, "sessions": [ {"date": "11111", "blue": "10", "green": "20",   "yellow": "30", "red": "40" }],  "missed": ["1.e4 e5", "1.d4 d5"] }}
		print( handler(event, 0) )
	except Exception as e:
		print( str(e) )

"""  CLI example
curl -X POST https://chess-first10.kengraf.com/v1/databaseItems \
     -H 'Content-Type: application/json' \
     -d '{ "body": { "sub": "123abc", "idInfo": { "name": "bob", "email": "bob@bob.com"}, "sessions": [ {"date": "11111", "blue": "10", "green": "20",   "yellow": "30", "red": "40" }],  "missed": ["1.e4 e5", "1.d4 d5"] }}'

"""

import json
import boto3
import re

def valid_simple_pgn(text):
	pattern = re.compile(r'^(\d+\.\s\S{1,5}\s\S{1,5}\s){1,10}$')
    return bool(pattern.fullmatch(text))

def buildPrompt(event):
	# Chekcks to prevent attacher fromusing this features for their own prompts
	move = event.get("move")
	if( len(movr) > 7) return null
	pgn = event.get("pgn")
	if( not valid_simple_pgn(pgn) ) return null
		
	prompt = f"Analyze the chess move {move} move after: {pgn}. Be as detailed and specific as possible."
	prompt += """
Please provide:
1. Why this move was played — tactical and strategic reasoning
2. What threats it creates or prevents
3. Alternative moves and why they are better or worse
4. How both sides should continue from this position
5. Any relevant opening theory or named variations
"""
	return prompt

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",           # or your specific domain
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
	"Content-Type": "application/json"
}

def handler(event, context):
	print(event)
	method = (
		event.get("requestContext", {})
			.get("http", {})
            .get("method")
    )
	
	if method == "OPTIONS":
		return {
    		"statusCode": 200,
			"headers": CORS_HEADERS
        }

	body = json.loads(event.get("body"))
#	modelId = recommendedModels[body.get("model")]
	modelId = body.get("model")
	prompt = buildPrompt( body )
	bedrock = boto3.client(
		service_name="bedrock-runtime",
		region_name="us-east-2"
	)

	try:
		response = bedrock.converse(
			modelId=modelId,
			messages=[
				{"role": "user", "content": [{"text": prompt}]}
			],
			inferenceConfig={
				"maxTokens": 2048,        # max output tokens
				"temperature": 0.7,       # 0.0 - 1.0
				"topP": 0.9               # optional
			}
		)

		stop_reason = response["stopReason"]
		if stop_reason == "max_tokens":
			logger.warning(f"Response truncated — hit maxTokens limit for {model_id}")
		elif stop_reason == "content_filtered":
			return error_response(400, "Response blocked by content filter", stop_reason)


		print(response)
		output_text = response["output"]["message"]["content"][0]["text"]

		body = {
			"modelId": modelId,
			"usage": response["usage"],
			"metrics": response["metrics"],
			"body": f"""<div class="response">{output_text}</div>"""
		}
		retval = {		
			"statusCode": 200,
			"headers": CORS_HEADERS,
			"body": json.dumps(body)
		}
		print(retval)
		return retval
	except Exception as e:
		print(e)
		return {
    	    "statusCode": 500,
			"headers": CORS_HEADERS,
            "body": json.dumps({
                "error": "Unable to handle Request",
                "message": str(e)
            })
    	}

if __name__ == "__main__":
	try:
		event = {"model":"A3","move":"Ngf6", "good":True,
		   "pgn":"1. Nf3 d5 2. g3 c6 3. Bg2 Bg4 4. O-O Nd7 5. h3 Bxf3 6. Bxf3 e5 7. d3"}
		print( handler(event, 0) )
	except Exception as e:
		print( str(e) )

"""  CLI examples
curl https://chess-first10.kengraf.com/api/databaseItems -b 'user=test'

"""
import json
import boto3


allModels = {
	"A1":"us.amazon.nova-2-lite-v1:0",
	"A2":"us.amazon.nova-lite-v1:0",
	"A3":"us.amazon.nova-micro-v1:0",
	"A4":"us.amazon.nova-premier-v1:0",
	"A5":"us.amazon.nova-pro-v1:0",
	"C1":"us.anthropic.claude-3-5-haiku-20241022-v1:0",
	"C2":"us.anthropic.claude-3-5-sonnet-20240620-v1:0",
	"C3":"us.anthropic.claude-3-5-sonnet-20241022-v2:0",
	"C4":"us.anthropic.claude-3-7-sonnet-20250219-v1:0",
	"C5":"us.anthropic.claude-3-haiku-20240307-v1:0",
	"C6":"us.anthropic.claude-haiku-4-5-20251001-v1:0",
	"C7":"us.anthropic.claude-opus-4-1-20250805-v1:0",
	"C8":"us.anthropic.claude-opus-4-20250514-v1:0",
	"C9":"us.anthropic.claude-opus-4-5-20251101-v1:0",
	"CA":"us.anthropic.claude-opus-4-6-v1",
	"CB":"us.anthropic.claude-sonnet-4-20250514-v1:0",
	"CC":"us.anthropic.claude-sonnet-4-5-20250929-v1:0",
	"CD":"us.anthropic.claude-sonnet-4-6",
	"D1":"us.deepseek.r1-v1:0",
	"M1":"us.meta.llama3-1-405b-instruct-v1:0",
	"M2":"us.meta.llama3-1-70b-instruct-v1:0",
	"M3":"us.meta.llama3-1-8b-instruct-v1:0",
	"M4":"us.meta.llama3-2-11b-instruct-v1:0",
	"M5":"us.meta.llama3-2-1b-instruct-v1:0",
	"M6":"us.meta.llama3-2-3b-instruct-v1:0",
	"M7":"us.meta.llama3-2-90b-instruct-v1:0",
	"M8":"us.meta.llama3-3-70b-instruct-v1:0",
	"M9":"us.meta.llama4-maverick-17b-instruct-v1:0",
	"MA":"us.meta.llama4-scout-17b-instruct-v1:0",
	"P1":"us.mistral.pixtral-large-2502-v1:0",
	"S1":"us.stability.stable-conservative-upscale-v1:0",
	"S2":"us.stability.stable-creative-upscale-v1:0",
	"S3":"us.stability.stable-fast-upscale-v1:0",
	"S4":"us.stability.stable-image-control-sketch-v1:0",
	"S5":"us.stability.stable-image-control-structure-v1:0",
	"S6":"us.stability.stable-image-erase-object-v1:0",
	"S7":"us.stability.stable-image-inpaint-v1:0",
	"S8":"us.stability.stable-image-remove-background-v1:0",
	"S9":"us.stability.stable-image-search-recolor-v1:0",
	"SA":"us.stability.stable-image-search-replace-v1:0",
	"SB":"us.stability.stable-image-style-guide-v1:0",
	"SC":"us.stability.stable-outpaint-v1:0",
	"SD":"us.stability.stable-style-transfer-v1:0",
	"T1":"us.twelvelabs.pegasus-1-2-v1:0",
	"W1":"us.writer.palmyra-x4-v1:0",
	"W2":"us.writer.palmyra-x5-v1:0",
	"X1":"google.gemma-3-27b-it",
	"X2":"minimax.minimax-m2.1",
	"X3":"moonshotai.kimi-k2.5",
	"X4":"nvidia.nemotron-nano-3-30b",
	"X5":"openai.gpt-oss-120b-1:0",
	"X6":"qwen.qwen3-235b-a22b-2507-v1:0",
	"X7":"zai.glm-4.7"
}

recommendedModels = {
"A3":"us.amazon.nova-micro-v1:0",
"C1":"us.anthropic.claude-3-5-haiku-20241022-v1:0",
"CC":"us.anthropic.claude-sonnet-4-5-20250929-v1:0",
"C9":"us.anthropic.claude-opus-4-5-20251101-v1:0",
"X1":"google.gemma-3-27b-it",
"X5":"openai.gpt-oss-120b-1:0",
}

def buildPrompt(event):
	move = event.get("move")
	pgn = event.get("pgn")
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
	
def handler(event, context):
	modelId = recommendedModels[event.get("model")]
	prompt = buildPrompt( event )
	bedrock = boto3.client(
		service_name="bedrock-runtime",
		region_name="us-east-2"
	)

	response = bedrock.converse(
		modelId=modelId,
		system=[{"text":"""You are an expert chess analyst with grandmaster-level knowledge. 
When analyzing a chess move or position, provide:
- A clear evaluation of the move (tactical, strategic, or both)
- Specific variations and continuations (use algebraic notation)
- Positional themes and plans for both sides
- Any tactical motifs, threats, or traps present
- Historical or opening theory context where relevant
Be thorough, specific, and use precise chess terminology.
Format your response in clear sections with headers."""],
		messages=[
			{"role": "user", "content": [{"text": prompt}]}
		],
		inferenceConfig={
        	"maxTokens": 4096,        # max output tokens
        	"temperature": 0.7,       # 0.0 - 1.0
        	"topP": 0.9               # optional
    	}
	)
	
	output_text = response["output"]["message"]["content"][0]["text"]
	formatted_text = output_text.replace("\n", "<br>")


	html = f"""<div class="response">{formatted_text}</div>"""
	return {
	
		"statusCode": 200,
		"headers": {
			"Content-Type": "text/html"
		},
		"modelId": modelId,
		"usage": response["usage"],
		"metrics": response["metrics"],
		"body": html
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

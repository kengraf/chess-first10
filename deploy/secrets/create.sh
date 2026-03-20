aws secretsmanager create-secret \
  --name "first10/google-oauth" \
  --region us-east-1 \
  --secret-string '{
    "client_id": "1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com"
  }'

# New poilcy to attach to lambda
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:first10/google-oauth*"
    }
  ]
}

# new verifyToken.py
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { OAuth2Client } from "google-auth-library";

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Cached per warm Lambda container — avoids a Secrets Manager call on every invocation
let cachedSecret = null;

async function getSecret() {
  if (cachedSecret) return cachedSecret;

  const command = new GetSecretValueCommand({
    SecretId: "first10/google-oauth",
  });

  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

export const handler = async (event) => {
  try {
    // Handle both JSON body and sendBeacon text/plain
    let body;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch {
      return errorResponse(400, "Invalid request body");
    }

    const { idToken } = body;
    if (!idToken) {
      return errorResponse(400, "Missing idToken");
    }

    // Fetch CLIENT_ID from Secrets Manager
    const secret = await getSecret();
    const client = new OAuth2Client(secret.client_id);

    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: secret.client_id,
    });

    const payload = ticket.getPayload();

    // Return only what the frontend needs (matches what sidebar.js expects)
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        sub:        payload.sub,
        given_name: payload.given_name,
        picture:    payload.picture,
        email:      payload.email,
      }),
    };

  } catch (error) {
    // Distinguish token errors from infrastructure errors
    const isTokenError = error.message?.includes("Token used too late") ||
                         error.message?.includes("Invalid token signature") ||
                         error.message?.includes("Wrong recipient");

    console.error("verifyToken error:", error.message);
    return errorResponse(isTokenError ? 401 : 500, isTokenError ? "Invalid token" : "Verification failed");
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://chess-first10.kengraf.com",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}


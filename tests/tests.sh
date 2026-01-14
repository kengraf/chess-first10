# Various tests as componeents deploy
curl -X POST https://it718lab7.kengraf.com/v1/verifyToken \

curl -X POST https://d3obdogsmpp9uy.cloudfront.net/v1/verifyToken \

curl -v -X POST https://l5zptxu87l.execute-api.us-east-2.amazonaws.com/v1/verifyToken \

curl -v -X POST https://d1mvssppd7zkjp.cloudfront.net/v1/verifyToken \
  -H "Content-Type: application/json" \
  -d '{"idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRkMTI1ZDVmNDYyZmJjNjAxNGFlZGFiODFkZGYzYmNlZGFiNzA4NDciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIxMDMwNDM1NzcxNTUxLXFuaWtmNTRiNGpobGJkbW00Ymtoc3QwaW8yOHUxMXM0LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiMTAzMDQzNTc3MTU1MS1xbmlrZjU0YjRqaGxiZG1tNGJraHN0MGlvMjh1MTFzNC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjExNTgwNDc3MDAyODI1NTA1MDk4NCIsImVtYWlsIjoia2VuZ3JhZjU3QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYmYiOjE3MzcwMzU1MTMsIm5hbWUiOiJLZW4gR3JhZiIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMUTNicmo3NnVqdWpQOGk1czIxQk1HUzR3NHAzX3R6VHBlcnJ0SmR0VE5RbEpLSWM5YT1zOTYtYyIsImdpdmVuX25hbWUiOiJLZW4iLCJmYW1pbHlfbmFtZSI6IkdyYWYiLCJpYXQiOjE3MzcwMzU4MTMsImV4cCI6MTczNzAzOTQxMywianRpIjoiOTQyMDAwYzQxYmExYzAyYzFmMzdiZGQwZjNjYjQ1ZmI2YzA4OWU1YSJ9.SOnR-1mKHMF2gWnr_Ucomv9M9mm2u1hv3Ffp0jJrluZZDwitH9npMoy_FZ-gRrFV3SN6M6Q_WYW7xUMC-BLWSBd-8BcRB73Gx138V3tCLchyHw9QoDXXl3RT5mENcTkp1KwrmPKdlHhtVICJcvYLVzRIc_jBuzV86_izSA_hGwpOZL-Sme1ZYJQ7ylBRYtyL4xgfBqgsoQPD30wSsutOdBgoKLKJzXX5a6h-r5rsK8sNftE_v51uR1JVbfsl_mNIqV-0nicZRfmZEKULvF46Etv29p_YbvIrdWwa9_jGvk3sIlkUK40TGCqQR8m1LyN4yfhkXY6g_PSGNLs0plcfBg"}'


# S3 URL
# Lambda URL
# API Gateway URL
# CloudFront URL
# Customized domain

# /index.html redirects to /login.html if "session" cookie; else display query parameters and session cookie
# /v1/verifyToken
# POST with jwt in body, jwt is sent to Google for verification


# S3 endpoint
https://it718lab7.s3.us-east-2.amazonaws.com/login.html

https://kvyedg0ezb.execute-api.us-east-2.amazonaws.com/v1/verifyToken

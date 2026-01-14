#!/bin/bash

if [ -z "$1" ]
  then
    echo "No DEPLOY_NAME argument supplied"
    exit 1
fi

DeployName=$1
DomainName=$DeployName.kengraf.com
S3BUCKET=$DeployName  # Needs to be globally unique and lowercase

# Ideally the CloudFormation stacks would be combined into one.
# This appoach allows students to alter steps as needed

STACK_NAME="$DeployName-storage"
echo "Creating stack... $STACK_NAME"
aws cloudformation deploy --stack-name ${STACK_NAME} \
  --template-file storage.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      S3bucketName=${S3BUCKET} \
      DeployName=${DeployName} \
  --output text
echo "Waiting on ${STACK_NAME} create completion..."
aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME}
aws cloudformation describe-stacks --stack-name ${STACK_NAME} | jq .Stacks[0].Outputs

echo "Packaging and uploading the lambda function"
cd lambda
if [ ! -e "function.zip" ]; then
    echo "Add required library to zip."
    mkdir package
    pip install --target ./package google-auth
    pip install --target ./package requests
    cd package/
    zip -r ../function.zip .
    cd ..
fi
zip function.zip verifyToken.py
aws s3 cp function.zip s3://${S3BUCKET}
cd ..

echo "Uploading website content"
cd ../website
aws s3 sync . s3://${S3BUCKET}
cd ../deploy

echo "Deploying backend components (apigatewayv2, lambda, dynamodb)"
STACK_NAME="$DeployName-backend"
aws cloudformation deploy --stack-name ${STACK_NAME} \
  --template-file backend.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      S3bucketName=${S3BUCKET} \
      DeployName=${DeployName} \
  --output text
echo "Waiting on ${STACK_NAME} create completion..."
aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME}
aws cloudformation describe-stacks --stack-name ${STACK_NAME} | jq .Stacks[0].Outputs

# Configure a Route53 sub-domian to be used
CertificateArn="arn:aws:acm:us-east-1:788715698479:certificate/68670ae0-d9bf-4552-b5e4-594f0c1cf74c"
DomainName="${DeployName}.kengraf.com"
HostedZoneId="Z04154431JUEDZVN0IZ8F"

# Uncomment the next line if you do NOT have a Route53 hosted zone, previous settings will be ignored
HostedZoneId=""  

echo "Deploy a CloudFront distribution"
STACK_NAME="$DeployName-distribution"
aws cloudformation deploy --stack-name ${STACK_NAME} \
  --template-file distribution.json \
  --parameter-overrides \
      DeployName=${DeployName} \
      HostedZoneId=${HostedZoneId} \
      DomainName=${DomainName} \
      CertificateArn=${CertificateArn} \
  --capabilities CAPABILITY_NAMED_IAM
aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME}
aws cloudformation describe-stacks --stack-name ${STACK_NAME} | jq .Stacks[0].Outputs

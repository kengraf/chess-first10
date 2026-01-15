#!/bin/bash

# Read the deployment variables
export $(grep -v '^#' .env | xargs -I {} echo {} | tr -d '\r')

# Define the functions
zips() {
    echo "Packaging and uploading the lambda functions"
    cd lambda
    if [ ! -e "google-package.zip" ]; then
        echo "Add required libraries to verifyToken.zip"
        mkdir package
        pip install --target ./package google-auth
        pip install --target ./package requests
        cd package/
        zip -r ../google-package.zip .
        cd ..
    fi
    cp google-package.zip verifyToken.zip
    
    declare -a arr=("databaseItems" "verifyToken")
    for i in "${arr[@]}"
    do
      zip $i.zip $i.py
      aws s3 cp $i.zip s3://${S3BUCKET}/v1/
    done
    cd ..
}

s3() {
    if aws s3api head-bucket --bucket "$S3BUCKET" 2>/dev/null; then
        echo "Bucket '$S3BUCKET' exists."
    else
        echo "Creating bucket '$S3BUCKET'."
        aws cloudformation deploy --stack-name ${DEPLOYNAME}-s3 --template-file s3.yaml \
            --capabilities CAPABILITY_NAMED_IAM --output text \
            --parameter-overrides  S3BUCKET=$S3BUCKET DEPLOYNAME=$DEPLOYNAME \
                DOMAINNAME=$DOMAINNAME
    fi
}

website() {
    echo "Uploading website content"
    cd ../website
    aws s3 sync . s3://$S3BUCKET/
    cd ..
}

invalidation() {
    FRONT_ID=`aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?contains(DomainName, 'chess-first10.s3.us-east-2.amazonaws.com')]].Id" --output text`
    aws cloudfront create-invalidation --distribution-id ${FRONT_ID} --paths "/*"
}

cf() {
    echo "Deploy CloudFormation(CF) Stack=$DEPLOYNAME..."
    aws cloudformation deploy --stack-name ${DEPLOYNAME}-distribution \
      --template-file ${DEPLOYNAME}.yaml --disable-rollback \
      --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND CAPABILITY_IAM \
      --force-upload --output text --parameter-overrides \
          S3BUCKET=$S3BUCKET DEPLOYNAME=$DEPLOYNAME DOMAINNAME=$DOMAINNAME \
          HOSTEDZONEID=$HOSTEDZONEID CERTARN=$CERTARN 

    aws cloudformation describe-stacks --stack-name ${DEPLOYNAME} | jq .Stacks[0].Outputs

    echo "Update Gateway CORS settings"
    API_ID=`aws apigatewayv2 get-apis --query "Items[?Name=='nadialin'].ApiId" --output text`

    aws apigatewayv2 update-api --api-id ${API_ID} \
        --cors-configuration '{
            "AllowOrigins": ["https://yourdomain.com"],
            "AllowMethods": ["GET", "POST", "OPTIONS"],
            "AllowHeaders": ["Content-Type"],
            "AllowCredentials": true
            }'
    NOW=`date -u +%FT%TZ`
    aws dynamodb put-item --table-name "$DEPLOYNAME-events" \
        --item "{\"name\": {\"S\": \"$DEPLOYNAME\"},\"startTime\": {\"S\": \"$NOW\"} }"
}

tests() {
    echo "Executing Test functions..."
    pushd ../tests
    python3 fullTest.py
    popd
}

backend() {
  echo "Deploying backend components (apigatewayv2, lambda, dynamodb)"
  STACK_NAME="$DeployName-backend"
  aws cloudformation deploy --stack-name ${DEPLOYNAME}-backend \
    --template-file backend.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides \
        S3bucketName=${S3BUCKET} \
        DeployName=${DeployName} \
    --output text
  echo "Waiting on ${STACK_NAME} create completion..."
  aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME}
  aws cloudformation describe-stacks --stack-name ${STACK_NAME} | jq .Stacks[0].Outputs
}

build() {
    echo "Executing BUild functions..."
    s3
    website
    zips
    backend
    cf
}

setup() {
    echo "setup"
}

run() {
    echo "run"
}

# If no arguments are provided, execute all functions
if [ $# -eq 0 ]; then
    build
    tests
    setup
    run
else
    # Loop through provided arguments and execute matching functions
    for arg in "$@"; do
        case "$arg" in
            zips) zips ;;
            website) website ;;
            invalidation) invalidation ;;
            s3) s3 ;;
            backend) backend ;;
            cf) cf ;;
            tests) tests ;;
            setup) setup ;;
            run) run ;;
            build) build ;;
            *) echo "Invalid argument: $arg" ;;
        esac
    done
fi




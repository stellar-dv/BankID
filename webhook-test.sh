#!/bin/bash

# BankID Webhook API Test Script
# This script demonstrates how to use the BankID webhook API endpoints

# API base URL for webhook endpoints
BASE_URL="http://localhost:5000/api/webhook/bankid"

# Test personal number - Use a valid format for the BankID test environment
# For the BankID test environment, you can use any of the test personal numbers
# documented in the BankID documentation
TEST_PERSONAL_NUMBER="190000000000"

# Callback URL for testing webhook callbacks - Replace with your own webhook URL
# You can use services like webhook.site to get a temporary webhook URL for testing
CALLBACK_URL="https://webhook.site/your-unique-webhook-site-id"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}BankID Webhook API Test Script${NC}"
echo "======================================="
echo ""

# Function to make API requests and display results
function call_api {
    local endpoint=$1
    local data=$2
    local description=$3
    
    echo -e "${YELLOW}$description${NC}"
    echo "Endpoint: $BASE_URL/$endpoint"
    echo "Request data: $data"
    echo "--------------------------------------"
    
    response=$(curl -s -X POST "$BASE_URL/$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    echo "Response:"
    echo "$response" | jq '.'
    echo ""
    
    # Extract orderRef for further operations
    if [[ $endpoint == "sign" || $endpoint == "auth" ]]; then
        ORDER_REF=$(echo "$response" | jq -r '.orderRef')
        if [[ $ORDER_REF != "null" && $ORDER_REF != "" ]]; then
            echo -e "${GREEN}Order reference: $ORDER_REF${NC}"
        else
            echo -e "${RED}Failed to get orderRef${NC}"
        fi
    fi
}

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for this script to work properly.${NC}"
    echo "Please install jq with your package manager:"
    echo "  apt-get install jq (Debian/Ubuntu)"
    echo "  brew install jq (macOS)"
    echo "  chocolatey install jq (Windows)"
    exit 1
fi

# 1. Initiate an authentication request with callback
echo "=== Step 1: Initiating a BankID authentication request with callback ==="
call_api "auth" "{\"personalNumber\": \"$TEST_PERSONAL_NUMBER\", \"callbackUrl\": \"$CALLBACK_URL\"}" "Initiating a BankID authentication request with callback"

if [[ -z $ORDER_REF || $ORDER_REF == "null" ]]; then
    echo -e "${RED}Failed to initiate authentication request. Exiting.${NC}"
    exit 1
fi

# 2. Check the status (collect)
echo "=== Step 2: Checking the status of the authentication request ==="
call_api "collect" "{\"orderRef\": \"$ORDER_REF\"}" "Checking authentication status"

echo "Note: The authentication request will remain pending until approved in the BankID app."
echo "The system will automatically send status updates to $CALLBACK_URL."

# 3. Initiate a signing request with callback
echo "=== Step 3: Initiating a BankID signing request with callback ==="
call_api "sign" "{\"personalNumber\": \"$TEST_PERSONAL_NUMBER\", \"userVisibleData\": \"This is a test signing request\", \"callbackUrl\": \"$CALLBACK_URL\"}" "Initiating a BankID signing request with callback"

if [[ -z $ORDER_REF || $ORDER_REF == "null" ]]; then
    echo -e "${RED}Failed to initiate signing request. Exiting.${NC}"
    exit 1
fi

# 4. Check the status (collect)
echo "=== Step 4: Checking the status of the signing request ==="
call_api "collect" "{\"orderRef\": \"$ORDER_REF\"}" "Checking signing status"

echo "Note: The signing request will remain pending until approved in the BankID app."
echo "The system will automatically send status updates to $CALLBACK_URL."

# 5. Cancel the request
echo "=== Step 5: Canceling the signing request ==="
call_api "cancel" "{\"orderRef\": \"$ORDER_REF\"}" "Canceling signing request"

echo -e "${GREEN}Test completed${NC}"
echo "Check your webhook URL ($CALLBACK_URL) for callback notifications."
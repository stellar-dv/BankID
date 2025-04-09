# Synchronous BankID API Endpoints

This document describes the synchronous BankID API endpoints that wait for the collect operation to complete before responding.

## Overview

The synchronous endpoints are designed to simplify integration with BankID by handling the entire authentication or signing flow in a single request. Instead of making separate calls to initiate the operation and then poll for the result, these endpoints will handle the polling internally and only return when the operation is complete, has failed, or has timed out.

## Available Endpoints

### Direct API Endpoints

#### 1. Authentication with Wait

```
POST /api/bankid/auth/wait
```

This endpoint initiates a BankID authentication request and waits for completion.

**Request Body:**
```json
{
  "personNummer": "YYYYMMDDNNNN", // Optional: Swedish personal number
  "endUserIp": "192.168.1.1",     // Required: IP address of the end user
  "waitTime": 90000               // Optional: Maximum wait time in milliseconds (default: 90000)
}
```

**Response:**
```json
{
  "success": true,
  "auth": {
    // The original auth response
    "success": true,
    "orderRef": "a-unique-order-reference",
    "autoStartToken": "token-for-app-launch",
    "qrStartToken": "token-for-qr-code",
    "qrStartSecret": "secret-for-qr-code"
  },
  "collect": {
    // The collect operation result
    "status": "complete",
    "orderRef": "a-unique-order-reference",
    "completionData": {
      "user": {
        "personNummer": "YYYYMMDDNNNN",
        "name": "Name Nameson",
        "givenName": "Name",
        "surname": "Nameson"
      },
      // Additional completion data
    }
  },
  "completed": true // Boolean indicating if the operation completed successfully
}
```

#### 2. Signing with Wait

```
POST /api/bankid/sign/wait
```

This endpoint initiates a BankID signing request and waits for completion.

**Request Body:**
```json
{
  "personNummer": "YYYYMMDDNNNN", // Optional: Swedish personal number
  "endUserIp": "192.168.1.1",     // Required: IP address of the end user
  "userVisibleData": "Data to sign", // Required: Data to be signed
  "userNonVisibleData": "Hidden data", // Optional: Data that will not be shown to the user
  "waitTime": 90000               // Optional: Maximum wait time in milliseconds (default: 90000)
}
```

**Response:** Same structure as the auth/wait endpoint, but with sign data.

### Webhook Endpoints

#### 3. Webhook Authentication with Wait

```
POST /api/webhook/bankid/auth/wait
```

This endpoint initiates a BankID authentication request through a webhook and waits for completion.

**Request Body:**
```json
{
  "personNummer": "YYYYMMDDNNNN", // Optional: Swedish personal number
  "endUserIp": "192.168.1.1",     // Required: IP address of the end user
  "callbackUrl": "https://example.com/callback", // Required: URL to receive the callback
  "waitTime": 90000               // Optional: Maximum wait time in milliseconds (default: 90000)
}
```

**Response:**
```json
{
  "success": true,
  "webhook": {
    // The original webhook response
    "success": true,
    "webhookId": "unique-webhook-id",
    "orderRef": "a-unique-order-reference",
    "autoStartToken": "token-for-app-launch",
    "qrStartToken": "token-for-qr-code",
    "qrStartSecret": "secret-for-qr-code"
  },
  "collect": {
    // The collect operation result (same structure as direct API)
  },
  "completed": true // Boolean indicating if the operation completed successfully
}
```

#### 4. Webhook Signing with Wait

```
POST /api/webhook/bankid/sign/wait
```

This endpoint initiates a BankID signing request through a webhook and waits for completion.

**Request Body:**
```json
{
  "personNummer": "YYYYMMDDNNNN", // Optional: Swedish personal number
  "endUserIp": "192.168.1.1",     // Required: IP address of the end user
  "userVisibleData": "Data to sign", // Required: Data to be signed
  "userNonVisibleData": "Hidden data", // Optional: Data that will not be shown to the user
  "callbackUrl": "https://example.com/callback", // Required: URL to receive the callback
  "waitTime": 90000               // Optional: Maximum wait time in milliseconds (default: 90000)
}
```

**Response:** Same structure as the webhook auth/wait endpoint, but with sign data.

## Timeout Handling

If the operation does not complete within the specified `waitTime`, the response will include a timeout status:

```json
{
  "success": true,
  "auth": {
    // Original auth response
  },
  "collect": {
    "status": "timeout",
    "orderRef": "a-unique-order-reference",
    "message": "Operation timed out after waiting for the maximum allowed time"
  },
  "completed": false
}
```

## Notes

1. Even if the synchronous operation times out, the auto-polling mechanism will continue to poll for the result in the background and send the callback when the operation completes.

2. The `waitTime` parameter allows you to control how long the request will wait for completion. If not specified, it defaults to 90 seconds (90000 milliseconds).

3. These endpoints are useful for server-to-server integrations where you want to wait for the complete result in a single request, especially in scenarios where you need to process the result immediately.

4. For client-facing applications, the non-wait endpoints may be more appropriate to provide a better user experience.
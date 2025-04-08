# BankID Auto-Polling Feature

The BankID integration now includes an automatic status polling system that provides seamless status tracking for authentication and signing operations.

## Overview

The auto-polling feature periodically checks the status of a BankID operation (authentication or signing) by making requests to the BankID collect endpoint at regular intervals. When the operation completes or fails, the system automatically updates the session status and sends a callback notification if a callback URL was provided.

## How It Works

1. When a BankID authentication or signing operation is initiated, the system can automatically start polling for status updates.
2. The polling continues until one of the following occurs:
   - The BankID operation completes successfully
   - The BankID operation fails
   - The maximum polling time is reached (default: 90 seconds)
   - The polling is manually stopped

## Auto-Polling Features

### Automatic Start

Auto-polling starts automatically when:
- A BankID authentication request is made through `/api/bankid/auth` (unless `autoCollect: false` is specified)
- A BankID signing request is made through `/api/bankid/sign` (unless `autoCollect: false` is specified)
- A webhook BankID authentication request is made through `/api/webhook/bankid/auth`
- A webhook BankID signing request is made through `/api/webhook/bankid/sign`

### Automatic Stop

Auto-polling stops automatically when:
- The BankID operation completes successfully
- The BankID operation fails
- The maximum polling time is reached (default: 90 seconds)
- A cancellation request is made through `/api/bankid/cancel` or `/api/webhook/bankid/cancel`

## Configuration

The auto-polling system can be configured with the following parameters:

- `maxTime`: Maximum time to poll in milliseconds (default: 90000ms or 90 seconds)
- `interval`: Polling interval in milliseconds (default: 2000ms or 2 seconds)

## API Usage

### Direct API

When making a request to the BankID authentication or signing endpoints, you can control the auto-polling feature using the `autoCollect` parameter:

```json
{
  "personNummer": "199207113201",
  "autoCollect": true  // Set to false to disable auto-polling
}
```

The response will include an `autoCollect` field indicating whether auto-polling is enabled:

```json
{
  "success": true,
  "sessionId": "c6f64dfd-0e93-4c7d-a38c-af9e37d300b0",
  "orderRef": "0196168c-699a-7123-a8d3-3342ff66a04f",
  "autoStartToken": "5c89000f-388e-49ff-a208-f76f058bc6ac",
  "qrStartToken": "34420cf2-34a1-47b1-bae3-fc7f7a31d8b0",
  "qrStartSecret": "3ac8ffc8-ca1c-4daf-9267-6f1205a72734",
  "autoCollect": true
}
```

### Webhook API

For the webhook endpoints, auto-polling is always enabled by default. The response will include an `autoPolling` field:

```json
{
  "success": true,
  "webhookId": "e6687763-df81-43c8-8f9b-cebf6b15f3af",
  "orderRef": "0196168f-cc5c-7467-8902-5ffc6419d088",
  "autoStartToken": "4e899508-9f97-4eaf-a8fa-a7c409fb31c1",
  "qrStartToken": "2ac05a36-a9a4-48c0-ba38-ddddcb8596b3",
  "qrStartSecret": "c034fe0b-e07d-4f24-a2b0-e3d48150f49c",
  "autoPolling": true
}
```

## Callbacks

When auto-polling is active and a callback URL has been provided, the system will automatically send status updates to the specified URL. The callback data includes:

### For successful completion:

```json
{
  "status": "complete",
  "orderRef": "0196168f-cc5c-7467-8902-5ffc6419d088",
  "operation": "bankid",
  "completionData": {
    "user": {
      "personNummer": "199207113201",
      "name": "Karl Karlsson",
      "givenName": "Karl",
      "surname": "Karlsson"
    },
    "device": {
      "ipAddress": "192.168.0.1"
    },
    "cert": {
      "notBefore": "2023-01-01T00:00:00Z",
      "notAfter": "2025-01-01T00:00:00Z"
    },
    "signature": "BASE64_ENCODED_SIGNATURE",
    "ocspResponse": "BASE64_ENCODED_OCSP_RESPONSE"
  },
  "timestamp": "2025-04-08T18:00:00.225Z"
}
```

### For failure:

```json
{
  "status": "failed",
  "orderRef": "0196168f-cc5c-7467-8902-5ffc6419d088",
  "operation": "bankid",
  "hintCode": "userCancel",
  "timestamp": "2025-04-08T18:00:00.225Z"
}
```

### For cancellation:

```json
{
  "status": "cancelled",
  "orderRef": "0196168f-cc5c-7467-8902-5ffc6419d088",
  "operation": "bankid",
  "timestamp": "2025-04-08T18:00:00.225Z"
}
```

### For timeout:

```json
{
  "status": "timeout",
  "orderRef": "0196168f-cc5c-7467-8902-5ffc6419d088",
  "operation": "bankid",
  "timestamp": "2025-04-08T18:00:00.225Z"
}
```

## Error Handling

The auto-polling system includes robust error handling:

- If a polling request fails, it will retry at the next interval
- If a critical error occurs or the maximum polling time is reached, polling will stop
- If the session already has a status of "complete" or "failed", polling will stop automatically

## Logs

The auto-polling system provides detailed logs about its operation:

```
🔄 Starting auto polling for auth orderRef: 0196168c-699a-7123-a8d3-3342ff66a04f
🔍 Auto polling collecting status for orderRef: 0196168c-699a-7123-a8d3-3342ff66a04f
⏳ Auto polling: BankID session status pending for orderRef: 0196168c-699a-7123-a8d3-3342ff66a04f
✅ Auto polling: BankID session completed for orderRef: 0196168c-699a-7123-a8d3-3342ff66a04f
```
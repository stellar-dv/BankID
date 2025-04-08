import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { storage } from './storage';
import { AUTH_METHODS } from '@shared/schema';
import * as bankid from 'bankid';

// Import the bankidClient from bankid.ts
import { getBankidClient } from './bankid';

// Helper function to send webhook callback
async function sendCallback(callbackUrl: string, data: any) {
  try {
    console.log(`Sending callback to ${callbackUrl}`, data);
    const response = await axios.post(callbackUrl, data);
    console.log(`Callback successful: ${response.status}`);
    return true;
  } catch (error: any) {
    console.error(`Callback failed: ${error.message}`);
    return false;
  }
}

// Webhook endpoint for BankID sign operation
export async function handleWebhookSign(req: Request, res: Response) {
  try {
    // Get data from request body
    const { 
      personNummer, 
      userVisibleData,
      callbackUrl
    } = req.body;

    if (!personNummer) {
      return res.status(400).json({
        success: false,
        message: 'personNummer is required',
      });
    }

    // Create a unique webhook ID
    const webhookId = uuidv4();
    
    // Get client IP from request
    const endUserIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    // Encode the user visible data in base64 format (required by BankID)
    const encodedUserVisibleData = Buffer.from(userVisibleData || 'Test av BankID').toString('base64');

    console.log('Webhook: Sending sign request to BankID API:', { personNummer, endUserIp });

    // Get the BankID client
    const bankidClient = getBankidClient();
    
    // Make request to BankID API
    const response = await bankidClient.sign({
      personalNumber: personNummer, // BankID library uses personalNumber, but our API uses personNummer
      endUserIp,
      userVisibleData: encodedUserVisibleData,
      requirement: {
        allowFingerprint: true
      }
    });
    
    console.log('Webhook: BankID API sign response:', response);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: AUTH_METHODS.THIS_DEVICE,
      personNummer: personNummer,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      callbackUrl // Store the callback URL for later use
    });

    // Return successful response with webhook ID and BankID data
    return res.json({
      success: true,
      webhookId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
    });
  } catch (error: any) {
    console.error('Webhook: BankID Sign Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to sign with BankID',
      errorCode: error.errorCode,
    });
  }
}

// Webhook endpoint for BankID auth operation
export async function handleWebhookAuth(req: Request, res: Response) {
  try {
    // Get data from request body
    const { 
      personNummer,
      callbackUrl
    } = req.body;

    // Create a unique webhook ID
    const webhookId = uuidv4();
    
    // Get client IP from request
    const endUserIp = req.ip || req.connection.remoteAddress || '127.0.0.1';

    console.log('Webhook: Sending auth request to BankID API:', { personNummer, endUserIp });

    // Get the BankID client
    const bankidClient = getBankidClient();
    
    // Make request to BankID API
    const response = await bankidClient.authenticate({
      personalNumber: personNummer, // BankID library uses personalNumber, but our API uses personNummer
      endUserIp,
      requirement: {
        allowFingerprint: true
      }
    });
    
    console.log('Webhook: BankID API auth response:', response);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: AUTH_METHODS.THIS_DEVICE,
      personNummer: personNummer || '',
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      callbackUrl // Store the callback URL for later use
    });

    // Return successful response with webhook ID and BankID data
    return res.json({
      success: true,
      webhookId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
    });
  } catch (error: any) {
    console.error('Webhook: BankID Auth Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to authenticate with BankID',
      errorCode: error.errorCode,
    });
  }
}

// Webhook endpoint for collecting BankID status
export async function handleWebhookCollect(req: Request, res: Response) {
  try {
    const { orderRef } = req.body;

    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Get the session from our database
    const session = await storage.getBankidSessionByOrderRef(orderRef);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    console.log('Webhook: Sending collect request to BankID API:', { orderRef });
    
    // Get the BankID client
    const bankidClient = getBankidClient();
    
    const response = await bankidClient.collect({ orderRef });
    console.log('Webhook: BankID API collect response:', response);
    
    // Update session status based on BankID response
    if (response.status === 'complete') {
      await storage.completeBankidSessionByOrderRef(orderRef);
      
      // If the session has a callback URL, send a callback notification
      if (session.callbackUrl) {
        // Send callback with completion data
        await sendCallback(session.callbackUrl, {
          status: 'complete',
          orderRef,
          operation: 'bankid',
          completionData: response.completionData,
          timestamp: new Date().toISOString()
        });
      }
    } else if (response.status === 'failed') {
      await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');
      
      // Send failure notification if callback URL exists
      if (session.callbackUrl) {
        await sendCallback(session.callbackUrl, {
          status: 'failed',
          orderRef,
          operation: 'bankid',
          hintCode: response.hintCode,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      await storage.updateBankidSessionStatusByOrderRef(orderRef, response.status);
    }

    // Return the collect response to client
    return res.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error('Webhook: BankID Collect Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to collect BankID status',
      errorCode: error.errorCode,
    });
  }
}

// Webhook endpoint for canceling BankID operations
export async function handleWebhookCancel(req: Request, res: Response) {
  try {
    const { orderRef } = req.body;

    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Get the session to retrieve the callback URL if it exists
    const session = await storage.getBankidSessionByOrderRef(orderRef);
    
    // Make request to BankID to cancel the order
    console.log('Webhook: Sending cancel request to BankID API:', { orderRef });
    
    // Get the BankID client
    const bankidClient = getBankidClient();
    
    await bankidClient.cancel({ orderRef });
    console.log('Webhook: BankID API cancel successful');
    
    // Update our session
    await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');

    // If the session has a callback URL, send a cancellation notification
    if (session && session.callbackUrl) {
      await sendCallback(session.callbackUrl, {
        status: 'cancelled',
        orderRef,
        operation: 'bankid',
        timestamp: new Date().toISOString()
      });
    }

    // Return successful response to client
    return res.json({
      success: true,
      message: 'BankID operation cancelled',
    });
  } catch (error: any) {
    console.error('Webhook: BankID Cancel Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to cancel BankID operation',
      errorCode: error.errorCode,
    });
  }
}
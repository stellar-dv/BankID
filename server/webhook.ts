import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { storage } from './storage';
import { AUTH_METHODS } from '@shared/schema';
import * as bankid from 'bankid';
import logger from './logger';

// Import the bankidClient from bankid.ts
import { getBankidClient } from './bankid';
import { startAutoPolling, stopAutoPolling, isOrderBeingPolled } from './auto-poller';

// Helper function to send webhook callback
async function sendCallback(callbackUrl: string, data: any) {
  try {
    logger.log(`🚀 Webhook sending callback to ${callbackUrl}`, 'webhook');
    const response = await axios.post(callbackUrl, data);
    logger.log(`✅ Webhook callback successful: ${response.status}`, 'webhook');
    return true;
  } catch (error: any) {
    logger.error(`❌ Webhook callback failed: ${error.message}`, 'webhook');
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
      logger.warn('🔍 Webhook: Missing personNummer in sign request', 'webhook');
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

    logger.log(`✍️ Webhook: Sending sign request to BankID API for ${personNummer}`, 'webhook');

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
    
    logger.logBankIdEvent('webhook-sign', response);
    
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

    // Always start auto polling for webhook endpoints
    if (!isOrderBeingPolled(response.orderRef)) {
      logger.log(`🔄 Webhook: Starting auto polling for sign orderRef: ${response.orderRef}`, 'webhook');
      startAutoPolling(response.orderRef, 90000, 2000, sendCallback);
    }

    // Return successful response with webhook ID and BankID data
    return res.json({
      success: true,
      webhookId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      autoPolling: true, // Indicate that auto polling is enabled
    });
  } catch (error: any) {
    logger.error(`🔴 Webhook: BankID Sign Error: ${error.details || error.message}`, 'webhook');
    
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

    logger.log(`🔐 Webhook: Sending auth request to BankID API for ${personNummer || 'unknown user'}`, 'webhook');

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
    
    logger.logBankIdEvent('webhook-auth', response);
    
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

    // Always start auto polling for webhook endpoints
    if (!isOrderBeingPolled(response.orderRef)) {
      logger.log(`🔄 Webhook: Starting auto polling for auth orderRef: ${response.orderRef}`, 'webhook');
      startAutoPolling(response.orderRef, 90000, 2000, sendCallback);
    }

    // Return successful response with webhook ID and BankID data
    return res.json({
      success: true,
      webhookId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      autoPolling: true, // Indicate that auto polling is enabled
    });
  } catch (error: any) {
    logger.error(`🔴 Webhook: BankID Auth Error: ${error.details || error.message}`, 'webhook');
    
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
      logger.warn('🔍 Webhook: Missing orderRef in collect request', 'webhook');
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Get the session from our database
    const session = await storage.getBankidSessionByOrderRef(orderRef);
    
    if (!session) {
      logger.warn(`📛 Webhook: Session not found for orderRef: ${orderRef}`, 'webhook');
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    logger.log(`📋 Webhook: Sending collect request to BankID API for orderRef: ${orderRef}`, 'webhook');
    
    // Get the BankID client
    const bankidClient = getBankidClient();
    
    const response = await bankidClient.collect({ orderRef });
    logger.logBankIdEvent('webhook-collect', response);
    
    // Update session status based on BankID response
    if (response.status === 'complete') {
      await storage.completeBankidSessionByOrderRef(orderRef);
      logger.log(`✅ Webhook: BankID session completed for orderRef: ${orderRef}`, 'webhook');
      
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
      logger.warn(`❌ Webhook: BankID session failed for orderRef: ${orderRef}, hint: ${response.hintCode}`, 'webhook');
      
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
      logger.log(`⏳ Webhook: BankID session status ${response.status} for orderRef: ${orderRef}`, 'webhook');
    }

    // Return the collect response to client
    return res.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    logger.error(`🔴 Webhook: BankID Collect Error: ${error.details || error.message}`, 'webhook');
    
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
      logger.warn('🔍 Webhook: Missing orderRef in cancel request', 'webhook');
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Stop auto polling for this orderRef if it's active
    if (isOrderBeingPolled(orderRef)) {
      stopAutoPolling(orderRef);
      logger.log(`⏹️ Webhook: Stopped auto polling for orderRef: ${orderRef}`, 'webhook');
    }

    // Get the session to retrieve the callback URL if it exists
    const session = await storage.getBankidSessionByOrderRef(orderRef);
    
    // Make request to BankID to cancel the order
    logger.log(`🛑 Webhook: Sending cancel request to BankID API for orderRef: ${orderRef}`, 'webhook');
    
    // Get the BankID client
    const bankidClient = getBankidClient();
    
    await bankidClient.cancel({ orderRef });
    logger.log('✅ Webhook: BankID API cancel successful', 'webhook');
    
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
    logger.error(`🔴 Webhook: BankID Cancel Error: ${error.details || error.message}`, 'webhook');
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to cancel BankID operation',
      errorCode: error.errorCode,
    });
  }
}
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as bankid from 'bankid';
import { storage } from './storage';
import { AUTH_METHODS } from '@shared/schema';
import logger from './logger';
// Auto-polling functionality has been disabled
// import { startAutoPolling, stopAutoPolling, isOrderBeingPolled } from './auto-poller';
import crypto from 'crypto';

// Enable fancy logging
logger.enableFancyLogs();

// Helper function to send webhook callback
async function sendCallback(callbackUrl: string, data: any) {
  try {
    logger.log(`🚀 Sending callback to ${callbackUrl}`, 'webhook');
    const response = await axios.post(callbackUrl, data);
    logger.log(`✅ Callback successful: ${response.status}`, 'webhook');
    return true;
  } catch (error: any) {
    logger.error(`❌ Callback failed: ${error.message}`, 'webhook');
    return false;
  }
}

// BankID configuration
const BANKID_API_URL = process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0';
const BANKID_CERT_PASSWORD = process.env.BANKID_CERT_PASSWORD || '';

logger.log(`🏦 Connecting to BankID API at: ${BANKID_API_URL}`, 'bankid');

// Initialize BankID client
let bankidClient: bankid.BankIdClient;

try {
  // Check if custom certificates are provided via environment variables
  if (process.env.BANKID_CERT && process.env.BANKID_KEY && process.env.BANKID_CA) {
    logger.log("🔒 Using certificate files from environment variables", 'bankid');
    
    // The bankid library doesn't directly support cert/key/ca properties
    // We'll instead write these to temporary files in memory and use them
    try {
      // Create a temporary pfx certificate using openssl
      logger.log("🔐 Attempting to create PFX from provided certificates", 'bankid');
      const tempFolderPath = path.resolve('./certs');
      
      // Make sure the folder exists
      if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath, { recursive: true });
      }
      
      // Write certificate files
      const certPath = path.join(tempFolderPath, 'cert.pem');
      const keyPath = path.join(tempFolderPath, 'key.pem');
      const caPath = path.join(tempFolderPath, 'ca.pem');
      const pfxPath = path.join(tempFolderPath, 'cert.pfx');
      
      fs.writeFileSync(certPath, Buffer.from(process.env.BANKID_CERT, 'base64'));
      fs.writeFileSync(keyPath, Buffer.from(process.env.BANKID_KEY, 'base64'));
      fs.writeFileSync(caPath, Buffer.from(process.env.BANKID_CA, 'base64'));
      
      // Create BankID client using the certificate
      bankidClient = new bankid.BankIdClient({
        pfx: fs.readFileSync(pfxPath),
        passphrase: BANKID_CERT_PASSWORD,
        production: BANKID_API_URL.includes('test.bankid.com') ? false : true,
        refreshInterval: 0, // Disable refresh interval
      });
    } catch (err) {
      logger.error("⚠️ Error creating PFX from environment variables: " + err, 'bankid');
      logger.log("⚙️ Falling back to attached test certificate", 'bankid');
      
      // Fall back to the attached test certificate if there's an error
      const P12_CERT_PATH = path.resolve('./attached_assets/FPTestcert5_20240610.p12');
      
      bankidClient = new bankid.BankIdClient({
        pfx: fs.readFileSync(P12_CERT_PATH),
        passphrase: BANKID_CERT_PASSWORD,
        production: false,
        refreshInterval: 0,
      });
    }
  } else {
    // Fall back to the attached test certificates
    logger.log("📄 Using attached test certificate files", 'bankid');
    
    // Read the certificate file from attached assets
    const P12_CERT_PATH = path.resolve('./attached_assets/FPTestcert5_20240610.p12');
    
    // Initialize BankID client with the certificate
    bankidClient = new bankid.BankIdClient({
      pfx: fs.readFileSync(P12_CERT_PATH),
      passphrase: BANKID_CERT_PASSWORD,
      production: false, // Use test environment
      refreshInterval: 0, // Disable refresh interval
    });
  }
  
  logger.log("✅ BankID client initialized successfully", 'bankid');
} catch (error) {
  logger.error(`🔥 Failed to initialize BankID client: ${error}`, 'bankid');
}

// Export the BankID client for use in other modules
export function getBankidClient(): bankid.BankIdClient {
  return bankidClient;
}

// Helper function to get client IP
function getClientIp(req: Request): string {
  // In a real production environment, you would need to handle this more carefully
  return req.ip || req.connection.remoteAddress || '127.0.0.1';
}

// BANKID AUTH endpoint
export async function handleBankidAuth(req: Request, res: Response) {
  try {
    // Get personal number from request body (optional)
    const { personNummer, authMethod, callbackUrl, autoCollect } = req.body;

    // Create session ID
    const sessionId = uuidv4();
    const endUserIp = getClientIp(req);

    logger.logBankIdEvent('auth', { personNummer, endUserIp });

    // Make request to BankID API
    const response = await bankidClient.authenticate({
      personalNumber: personNummer, // BankID library uses personalNumber, but our API uses personNummer
      endUserIp,
      requirement: {
        allowFingerprint: true
      }
    });
    
    logger.logBankIdEvent('auth', response);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: authMethod || AUTH_METHODS.THIS_DEVICE,
      personNummer: personNummer || '',
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      callbackUrl
    });

    // Auto-polling has been disabled

    // Return successful response to client
    return res.json({
      success: true,
      sessionId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      qrStartSecret: response.qrStartSecret
    });
  } catch (error: any) {
    logger.error(`🔴 BankID Auth Error: ${error.details || error.message}`, 'bankid');
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to authenticate with BankID',
      errorCode: error.errorCode,
    });
  }
}

// BANKID COLLECT endpoint
export async function handleBankidCollect(req: Request, res: Response) {
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
      logger.warn(`📛 Session not found for orderRef: ${orderRef}`, 'bankid');
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    logger.logBankIdEvent('collect', { orderRef });
    const response = await bankidClient.collect({ orderRef });
    logger.logBankIdEvent('collect', response);
    
    // Update session status based on BankID response
    if (response.status === 'complete') {
      await storage.completeBankidSessionByOrderRef(orderRef);
      logger.log(`✅ BankID session completed for orderRef: ${orderRef}`, 'bankid');
      
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
      logger.warn(`❌ BankID session failed for orderRef: ${orderRef}, hint: ${response.hintCode}`, 'bankid');
      
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
      logger.log(`⏳ BankID session status ${response.status} for orderRef: ${orderRef}`, 'bankid');
    }

    // Return the collect response to client
    return res.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    logger.error(`🔴 BankID Collect Error: ${error.details || error.message}`, 'bankid');
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to collect BankID status',
      errorCode: error.errorCode,
    });
  }
}

// BANKID CANCEL endpoint
export async function handleBankidCancel(req: Request, res: Response) {
  try {
    const { orderRef } = req.body;

    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Auto-polling has been disabled
    logger.log(`⏹️ Cancel operation for orderRef: ${orderRef}`, 'bankid');

    // Get the session to retrieve the callback URL if it exists
    const session = await storage.getBankidSessionByOrderRef(orderRef);
    
    // Make request to BankID to cancel the order
    logger.logBankIdEvent('cancel', { orderRef });
    await bankidClient.cancel({ orderRef });
    logger.log(`🛑 BankID authentication cancelled for orderRef: ${orderRef}`, 'bankid');
    
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
      message: 'BankID authentication cancelled',
    });
  } catch (error: any) {
    logger.error(`🔴 BankID Cancel Error: ${error.details || error.message}`, 'bankid');
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to cancel BankID authentication',
      errorCode: error.errorCode,
    });
  }
}

// Generate a dynamic QR code based on time and session data
export async function handleQrCode(req: Request, res: Response) {
  try {
    const { orderRef, qrStartToken, qrStartSecret } = req.body;

    if (!orderRef || !qrStartToken || !qrStartSecret) {
      logger.warn('🔍 Missing required parameters for QR code generation', 'bankid');
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    // Calculate the QR code based on BankID algorithm
    // This implements the QR code algorithm from BankID documentation
    const time = Math.floor(Date.now() / 1000);
    const qrAuthCode = calculateAuthCode(qrStartToken, qrStartSecret, time);
    
    logger.log(`🔄 Generated QR auth code for orderRef: ${orderRef} at time: ${time}`, 'bankid');
    
    // Return the QR auth code to the client
    return res.json({
      success: true,
      qrAuthCode,
    });
  } catch (error: any) {
    logger.error(`🔴 QR Code Error: ${error.message}`, 'bankid');
    
    // Return error response to client
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
    });
  }
}

// BANKID SIGN endpoint
export async function handleBankidSign(req: Request, res: Response) {
  try {
    // Get personal number from request body
    const { personNummer, userVisibleData, callbackUrl, autoCollect } = req.body;

    if (!personNummer) {
      return res.status(400).json({
        success: false,
        message: 'personNummer is required',
      });
    }

    // Create session ID
    const sessionId = uuidv4();
    const endUserIp = getClientIp(req);
    
    // Encode the user visible data in base64 format
    const encodedUserVisibleData = Buffer.from(userVisibleData || 'Test av BankID').toString('base64');

    logger.logBankIdEvent('sign', { personNummer, endUserIp, userVisibleData: '(BASE64 encoded)' });

    // Make request to BankID API
    const response = await bankidClient.sign({
      personalNumber: personNummer, // BankID library uses personalNumber, but our API uses personNummer 
      endUserIp,
      userVisibleData: encodedUserVisibleData,
      requirement: {
        allowFingerprint: true
      }
    });
    
    logger.logBankIdEvent('sign', response);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: AUTH_METHODS.THIS_DEVICE,
      personNummer: personNummer,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      callbackUrl
    });

    // Auto-polling has been disabled

    // Return successful response to client
    return res.json({
      success: true,
      sessionId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
      qrStartSecret: response.qrStartSecret
    });
  } catch (error: any) {
    logger.error(`🔴 BankID Sign Error: ${error.details || error.message}`, 'bankid');
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to sign with BankID',
      errorCode: error.errorCode,
    });
  }
}

// Helper function to calculate QR auth code based on BankID specification
function calculateAuthCode(qrStartToken: string, qrStartSecret: string, time: number) {
  const hmac = crypto.createHmac('sha256', qrStartSecret);
  hmac.update(qrStartToken + time.toString());
  const hash = hmac.digest('hex');
  
  return qrStartToken + time.toString() + hash;
}
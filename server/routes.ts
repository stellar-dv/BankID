import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertBankidSessionSchema, 
  SESSION_STATUS, 
  AuthMethod,
  AUTH_METHODS
} from "@shared/schema";
import { 
  handleBankidAuth, 
  handleBankidCollect, 
  handleBankidCancel, 
  handleQrCode,
  handleBankidSign
} from "./bankid";
import {
  handleWebhookAuth,
  handleWebhookCollect,
  handleWebhookCancel,
  handleWebhookSign
} from "./webhook";

// Import the wait-for-collect functionality
import { waitForCollect } from "./wait-for-collect";

// Custom response type for capturing responses
interface CaptureResponse {
  json: (data: any) => CaptureResponse;
  status: (code: number) => CaptureResponse;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // BankID API routes - Old demo routes (keeping for compatibility)
  app.post("/api/bankid/init", async (req, res) => {
    try {
      const schema = z.object({
        personalNumber: z.string().regex(/^\d{8}-\d{4}$/).optional(),
        authMethod: z.enum([AUTH_METHODS.THIS_DEVICE, AUTH_METHODS.OTHER_DEVICE, AUTH_METHODS.QR_CODE])
      });

      const validatedData = schema.parse(req.body);
      
      // Create a new BankID session
      const sessionData = {
        personalNumber: validatedData.personalNumber,
        authMethod: validatedData.authMethod as AuthMethod,
        status: SESSION_STATUS.INITIATED
      };
      
      const session = await storage.createBankidSession(sessionData);
      
      res.status(200).json({
        success: true,
        sessionId: session.sessionId,
        message: "BankID session initiated"
      });
    } catch (error) {
      console.error("Error initializing BankID:", error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to initiate BankID session"
      });
    }
  });

  // Check BankID session status
  app.get("/api/bankid/status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getBankidSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found"
        });
      }
      
      res.status(200).json({
        success: true,
        status: session.status,
        sessionId: session.sessionId
      });
    } catch (error) {
      console.error("Error checking BankID status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check BankID status"
      });
    }
  });

  // Update BankID session status (for demo purposes)
  app.post("/api/bankid/update-status", async (req, res) => {
    try {
      const schema = z.object({
        sessionId: z.string().uuid(),
        status: z.enum([
          SESSION_STATUS.PENDING,
          SESSION_STATUS.INITIATED,
          SESSION_STATUS.AUTHENTICATING,
          SESSION_STATUS.COMPLETED,
          SESSION_STATUS.FAILED,
          SESSION_STATUS.CANCELLED
        ])
      });

      const { sessionId, status } = schema.parse(req.body);
      
      const updatedSession = await storage.updateBankidSessionStatus(sessionId, status);
      
      if (!updatedSession) {
        return res.status(404).json({
          success: false,
          message: "Session not found"
        });
      }
      
      res.status(200).json({
        success: true,
        sessionId: updatedSession.sessionId,
        status: updatedSession.status
      });
    } catch (error) {
      console.error("Error updating BankID status:", error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update BankID status"
      });
    }
  });

  // Complete a BankID session (for demo purposes)
  app.post("/api/bankid/complete", async (req, res) => {
    try {
      const schema = z.object({
        sessionId: z.string().uuid()
      });

      const { sessionId } = schema.parse(req.body);
      
      const completedSession = await storage.completeBankidSession(sessionId);
      
      if (!completedSession) {
        return res.status(404).json({
          success: false,
          message: "Session not found"
        });
      }
      
      res.status(200).json({
        success: true,
        sessionId: completedSession.sessionId,
        status: completedSession.status,
        completedAt: completedSession.completedAt
      });
    } catch (error) {
      console.error("Error completing BankID session:", error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to complete BankID session"
      });
    }
  });

  // --- NEW REAL BANKID ROUTES ---
  
  // Auth with real BankID
  app.post("/api/bankid/auth", handleBankidAuth);
  
  // Collect status from real BankID
  app.post("/api/bankid/collect", handleBankidCollect);
  
  // Cancel BankID auth
  app.post("/api/bankid/cancel", handleBankidCancel);
  
  // Generate QR code for BankID
  app.post("/api/bankid/qrcode", handleQrCode);
  
  // Sign with BankID
  app.post("/api/bankid/sign", handleBankidSign);

  // --- SYNCHRONOUS WAIT FOR COMPLETION API ROUTES ---
  
  // Auth with BankID and wait for completion
  app.post("/api/bankid/auth/wait", async (req, res) => {
    try {
      // First, handle the auth request like normal
      let authResponse: any = null;
      
      // Create temporary response object to capture the auth response
      const tempRes: CaptureResponse = {
        json: (data: any) => {
          authResponse = data;
          return tempRes;
        },
        status: (code: number) => tempRes
      };
      
      // Call the standard auth handler
      await handleBankidAuth(req, tempRes as any);
      
      // Check if auth was successful
      if (!authResponse.success) {
        return res.status(400).json(authResponse);
      }
      
      // Wait for collection to complete
      const orderRef = authResponse.orderRef;
      
      // Verify orderRef exists before proceeding
      if (!orderRef) {
        return res.status(400).json({
          success: false,
          message: 'No orderRef was returned from the auth operation',
          auth: authResponse
        });
      }
      
      const waitTime = req.body.waitTime || 90000; // Allow custom wait time
      
      const collectResult = await waitForCollect(orderRef, waitTime);
      
      // Return a combined response with both auth and collect data
      return res.json({
        success: true,
        auth: authResponse,
        collect: collectResult,
        completed: collectResult.status === 'complete'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred during auth/wait operation',
        error: error.details || error.message
      });
    }
  });
  
  // Sign with BankID and wait for completion
  app.post("/api/bankid/sign/wait", async (req, res) => {
    try {
      // First, handle the sign request like normal
      let signResponse: any = null;
      
      // Create temporary response object to capture the sign response
      const tempRes: CaptureResponse = {
        json: (data: any) => {
          signResponse = data;
          return tempRes;
        },
        status: (code: number) => tempRes
      };
      
      // Call the standard sign handler
      await handleBankidSign(req, tempRes as any);
      
      // Check if sign was successful
      if (!signResponse.success) {
        return res.status(400).json(signResponse);
      }
      
      // Wait for collection to complete
      const orderRef = signResponse.orderRef;
      
      // Verify orderRef exists before proceeding
      if (!orderRef) {
        return res.status(400).json({
          success: false,
          message: 'No orderRef was returned from the sign operation',
          sign: signResponse
        });
      }
      
      const waitTime = req.body.waitTime || 90000; // Allow custom wait time
      
      const collectResult = await waitForCollect(orderRef, waitTime);
      
      // Return a combined response with both sign and collect data
      return res.json({
        success: true,
        sign: signResponse,
        collect: collectResult,
        completed: collectResult.status === 'complete'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred during sign/wait operation',
        error: error.details || error.message
      });
    }
  });
  
  // --- WEBHOOK API ROUTES ---
  
  // Webhook for BankID authentication
  app.post("/api/webhook/bankid/auth", handleWebhookAuth);
  
  // Webhook for BankID signing
  app.post("/api/webhook/bankid/sign", handleWebhookSign);
  
  // Webhook for BankID collect
  app.post("/api/webhook/bankid/collect", handleWebhookCollect);
  
  // Webhook for BankID cancel
  app.post("/api/webhook/bankid/cancel", handleWebhookCancel);
  
  // Webhook auth with wait for completion
  app.post("/api/webhook/bankid/auth/wait", async (req, res) => {
    try {
      // First, handle the webhook auth request like normal
      let webhookResponse: any = null;
      
      // Create temporary response object to capture the webhook response
      const tempRes: CaptureResponse = {
        json: (data: any) => {
          webhookResponse = data;
          return tempRes;
        },
        status: (code: number) => tempRes
      };
      
      // Call the standard webhook auth handler
      await handleWebhookAuth(req, tempRes as any);
      
      // Check if auth was successful
      if (!webhookResponse.success) {
        return res.status(400).json(webhookResponse);
      }
      
      // Wait for collection to complete
      const orderRef = webhookResponse.orderRef;
      const waitTime = req.body.waitTime || 90000; // Allow custom wait time
      
      const collectResult = await waitForCollect(orderRef, waitTime);
      
      // Return a combined response with both webhook and collect data
      return res.json({
        success: true,
        webhook: webhookResponse,
        collect: collectResult,
        completed: collectResult.status === 'complete'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred during webhook auth/wait operation',
        error: error.details || error.message
      });
    }
  });
  
  // Webhook sign with wait for completion
  app.post("/api/webhook/bankid/sign/wait", async (req, res) => {
    try {
      // First, handle the webhook sign request like normal
      let webhookResponse: any = null;
      
      // Create temporary response object to capture the webhook response
      const tempRes: CaptureResponse = {
        json: (data: any) => {
          webhookResponse = data;
          return tempRes;
        },
        status: (code: number) => tempRes
      };
      
      // Call the standard webhook sign handler
      await handleWebhookSign(req, tempRes as any);
      
      // Check if sign was successful
      if (!webhookResponse.success) {
        return res.status(400).json(webhookResponse);
      }
      
      // Wait for collection to complete
      const orderRef = webhookResponse.orderRef;
      const waitTime = req.body.waitTime || 90000; // Allow custom wait time
      
      const collectResult = await waitForCollect(orderRef, waitTime);
      
      // Return a combined response with both webhook and collect data
      return res.json({
        success: true,
        webhook: webhookResponse,
        collect: collectResult,
        completed: collectResult.status === 'complete'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred during webhook sign/wait operation',
        error: error.details || error.message
      });
    }
  });

  return httpServer;
}

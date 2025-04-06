import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertBankidSessionSchema, 
  SESSION_STATUS, 
  AuthMethod,
  AUTH_METHODS
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // BankID API routes
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

  return httpServer;
}

import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bankidSessions = pgTable("bankid_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull().unique(),
  personalNumber: varchar("personal_number", { length: 13 }),
  authMethod: varchar("auth_method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBankidSessionSchema = createInsertSchema(bankidSessions).pick({
  sessionId: true,
  personalNumber: true,
  authMethod: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBankidSession = z.infer<typeof insertBankidSessionSchema>;
export type BankidSession = typeof bankidSessions.$inferSelect;

// Auth method types
export const AUTH_METHODS = {
  THIS_DEVICE: "bankid-app",
  OTHER_DEVICE: "bankid-other",
  QR_CODE: "bankid-qr",
} as const;

// Session status types
export const SESSION_STATUS = {
  PENDING: "pending",
  INITIATED: "initiated",
  AUTHENTICATING: "authenticating",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type AuthMethod = typeof AUTH_METHODS[keyof typeof AUTH_METHODS];
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

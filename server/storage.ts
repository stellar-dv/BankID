import { v4 as uuidv4 } from 'uuid';
import { 
  users, type User, type InsertUser,
  bankidSessions, type BankidSession, type InsertBankidSession,
  SESSION_STATUS, type SessionStatus
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // BankID session methods
  createBankidSession(session: Omit<InsertBankidSession, "sessionId">): Promise<BankidSession>;
  getBankidSession(sessionId: string): Promise<BankidSession | undefined>;
  updateBankidSessionStatus(sessionId: string, status: SessionStatus): Promise<BankidSession | undefined>;
  completeBankidSession(sessionId: string): Promise<BankidSession | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bankidSessions: Map<string, BankidSession>;
  currentId: number;
  currentSessionId: number;

  constructor() {
    this.users = new Map();
    this.bankidSessions = new Map();
    this.currentId = 1;
    this.currentSessionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createBankidSession(sessionData: Omit<InsertBankidSession, "sessionId">): Promise<BankidSession> {
    const id = this.currentSessionId++;
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: BankidSession = {
      id,
      sessionId,
      ...sessionData,
      createdAt: now,
      completedAt: null
    };
    
    this.bankidSessions.set(sessionId, session);
    return session;
  }

  async getBankidSession(sessionId: string): Promise<BankidSession | undefined> {
    return this.bankidSessions.get(sessionId);
  }

  async updateBankidSessionStatus(sessionId: string, status: SessionStatus): Promise<BankidSession | undefined> {
    const session = this.bankidSessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, status };
    this.bankidSessions.set(sessionId, updatedSession);
    
    return updatedSession;
  }

  async completeBankidSession(sessionId: string): Promise<BankidSession | undefined> {
    const session = this.bankidSessions.get(sessionId);
    if (!session) return undefined;
    
    const now = new Date();
    const updatedSession = { 
      ...session, 
      status: SESSION_STATUS.COMPLETED as SessionStatus,
      completedAt: now 
    };
    
    this.bankidSessions.set(sessionId, updatedSession);
    
    return updatedSession;
  }
}

export const storage = new MemStorage();

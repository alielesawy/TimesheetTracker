import { users, timesheets, sessions, notifications, companySettings, type User, type InsertUser, type Timesheet, type InsertTimesheet, type Session, type InsertSession, type Notification, type InsertNotification, type CompanySettings, type InsertCompanySettings } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Timesheet management
  getTimesheetsByUserId(userId: number, month?: string): Promise<Timesheet[]>;
  getTimesheetByUserIdAndDate(userId: number, date: string): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet>;
  
  // Session management
  getSessionsByTimesheetId(timesheetId: number): Promise<Session[]>;
  getSessionsByUserId(userId: number, month?: string): Promise<Session[]>;
  getActiveSessionByUserId(userId: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<Session>): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  
  // Notification management
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Company settings
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings>;
  
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getTimesheetsByUserId(userId: number, month?: string): Promise<Timesheet[]> {
    let query = db.select().from(timesheets).where(eq(timesheets.userId, userId));
    
    if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      query = query.where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      );
    }
    
    return await query.orderBy(desc(timesheets.date));
  }

  async getTimesheetByUserIdAndDate(userId: number, date: string): Promise<Timesheet | undefined> {
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.userId, userId), eq(timesheets.date, date)));
    return timesheet || undefined;
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db
      .insert(timesheets)
      .values(insertTimesheet)
      .returning();
    return timesheet;
  }

  async updateTimesheet(id: number, updateTimesheet: Partial<Timesheet>): Promise<Timesheet> {
    const [timesheet] = await db
      .update(timesheets)
      .set(updateTimesheet)
      .where(eq(timesheets.id, id))
      .returning();
    return timesheet;
  }

  async getSessionsByTimesheetId(timesheetId: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.timesheetId, timesheetId))
      .orderBy(desc(sessions.startAt));
  }

  async getSessionsByUserId(userId: number, month?: string): Promise<Session[]> {
    let query = db.select().from(sessions).where(eq(sessions.userId, userId));
    
    if (month) {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(`${month}-31`);
      endDate.setMonth(endDate.getMonth() + 1);
      query = query.where(
        and(
          eq(sessions.userId, userId),
          gte(sessions.startAt, startDate),
          lte(sessions.startAt, endDate)
        )
      );
    }
    
    return await query.orderBy(desc(sessions.startAt));
  }

  async getActiveSessionByUserId(userId: number): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.isActive, true)));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateSession(id: number, updateSession: Partial<Session>): Promise<Session> {
    const [session] = await db
      .update(sessions)
      .set(updateSession)
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }

  async deleteSession(id: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const [settings] = await db.select().from(companySettings);
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db
        .insert(companySettings)
        .values({})
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateCompanySettings(updateSettings: Partial<CompanySettings>): Promise<CompanySettings> {
    const existingSettings = await this.getCompanySettings();
    const [settings] = await db
      .update(companySettings)
      .set(updateSettings)
      .where(eq(companySettings.id, existingSettings.id))
      .returning();
    return settings;
  }
}

export const storage = new DatabaseStorage();

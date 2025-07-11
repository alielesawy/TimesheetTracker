import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertSessionSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Timer routes
  app.post("/api/timer/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if there's already an active session
      const activeSession = await storage.getActiveSessionByUserId(userId);
      if (activeSession) {
        return res.status(400).json({ message: "A session is already active" });
      }
      
      // Get or create timesheet for today
      let timesheet = await storage.getTimesheetByUserIdAndDate(userId, today);
      if (!timesheet) {
        timesheet = await storage.createTimesheet({
          userId,
          date: today,
          totalHours: 0
        });
      }
      
      // Create new session
      const session = await storage.createSession({
        timesheetId: timesheet.id,
        userId,
        startAt: now,
        endAt: null,
        duration: null,
        isActive: true
      });
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to start timer" });
    }
  });

  app.post("/api/timer/stop", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const now = new Date();
      
      // Find active session
      const activeSession = await storage.getActiveSessionByUserId(userId);
      if (!activeSession) {
        return res.status(400).json({ message: "No active session found" });
      }
      
      // Calculate duration
      const duration = Math.floor((now.getTime() - activeSession.startAt.getTime()) / 60000); // in minutes
      
      // Update session
      const session = await storage.updateSession(activeSession.id, {
        endAt: now,
        duration,
        isActive: false
      });
      
      // Update timesheet total hours
      const timesheet = await storage.getTimesheetByUserIdAndDate(userId, activeSession.startAt.toISOString().split('T')[0]);
      if (timesheet) {
        await storage.updateTimesheet(timesheet.id, {
          totalHours: timesheet.totalHours + duration
        });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to stop timer" });
    }
  });

  app.get("/api/timer/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const activeSession = await storage.getActiveSessionByUserId(userId);
      
      res.json({
        isActive: !!activeSession,
        session: activeSession || null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get timer status" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheet", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const month = req.query.month as string;
      
      const timesheets = await storage.getTimesheetsByUserId(userId, month);
      const sessions = await storage.getSessionsByUserId(userId, month);
      
      res.json({
        timesheets,
        sessions
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheet" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const users = await storage.getAllUsers();
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      // Get all active sessions
      const allActiveSessions = [];
      for (const user of users) {
        const activeSession = await storage.getActiveSessionByUserId(user.id);
        if (activeSession) {
          allActiveSessions.push(activeSession);
        }
      }
      
      // Get monthly hours for all users
      let totalMonthlyHours = 0;
      for (const user of users) {
        const sessions = await storage.getSessionsByUserId(user.id, currentMonth);
        const userHours = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
        totalMonthlyHours += userHours;
      }
      
      const stats = {
        totalUsers: users.length,
        activeSessions: allActiveSessions.length,
        monthlyHours: Math.round(totalMonthlyHours / 60), // Convert minutes to hours
        avgHours: users.length > 0 ? Math.round(totalMonthlyHours / 60 / users.length) : 0,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  app.get("/api/admin/user/:id/sessions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const userId = parseInt(req.params.id);
      const month = req.query.month as string;
      
      const sessions = await storage.getSessionsByUserId(userId, month);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user sessions" });
    }
  });

  app.post("/api/admin/session", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const sessionData = req.body;
      
      // Convert ISO strings to Date objects and validate
      const createData = {
        ...sessionData,
        startAt: sessionData.startAt ? new Date(sessionData.startAt) : new Date(),
        endAt: sessionData.endAt ? new Date(sessionData.endAt) : null,
        userId: parseInt(sessionData.userId),
        timesheetId: parseInt(sessionData.timesheetId),
        duration: sessionData.duration || 0,
        isActive: sessionData.isActive || false,
      };
      
      console.log('Creating session:', createData);
      
      const session = await storage.createSession(createData);
      
      // Create notification
      await storage.createNotification({
        userId: createData.userId,
        title: "Session Added",
        message: `A new session was added to your timesheet by admin`
      });
      
      res.json(session);
    } catch (error) {
      console.error('Session create error:', error);
      res.status(500).json({ message: "Failed to create session", error: error.message });
    }
  });

  app.put("/api/admin/session/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const sessionId = parseInt(req.params.id);
      const sessionData = req.body;
      
      // Convert ISO strings to Date objects
      const updateData = {
        ...sessionData,
        startAt: sessionData.startAt ? new Date(sessionData.startAt) : undefined,
        endAt: sessionData.endAt ? new Date(sessionData.endAt) : undefined,
      };
      
      console.log('Updating session:', sessionId, updateData);
      
      const session = await storage.updateSession(sessionId, updateData);
      
      // Create notification
      await storage.createNotification({
        userId: session.userId,
        title: "Session Updated",
        message: `Your session has been updated by admin`
      });
      
      res.json(session);
    } catch (error) {
      console.error('Session update error:', error);
      res.status(500).json({ message: "Failed to update session", error: error.message });
    }
  });

  app.delete("/api/admin/session/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const sessionId = parseInt(req.params.id);
      
      // Get session data first to find the user ID
      const allUsers = await storage.getAllUsers();
      let sessionToDelete = null;
      
      for (const user of allUsers) {
        const userSessions = await storage.getSessionsByUserId(user.id);
        const session = userSessions.find(s => s.id === sessionId);
        if (session) {
          sessionToDelete = session;
          break;
        }
      }
      
      if (!sessionToDelete) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      console.log('Deleting session:', sessionId, sessionToDelete);
      
      await storage.deleteSession(sessionId);
      
      // Create notification
      await storage.createNotification({
        userId: sessionToDelete.userId,
        title: "Session Deleted",
        message: `A session was deleted from your timesheet by admin`
      });
      
      res.sendStatus(204);
    } catch (error) {
      console.error('Session delete error:', error);
      res.status(500).json({ message: "Failed to delete session", error: error.message });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Company settings routes
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    try {
      const settingsData = req.body;
      const settings = await storage.updateCompanySettings(settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

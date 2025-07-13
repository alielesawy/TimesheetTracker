import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";

// --- START: إضافة دالة مساعدة لتنسيق الوقت ---
const formatTimeForNotification = (date: Date | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
// --- END: إضافة دالة مساعدة لتنسيق الوقت ---

// --- START: إضافة دالة مساعدة لإعادة حساب الإجمالي اليومي ---
async function recalculateDailyTotal(userId: number, date: string) {
    const timesheet = await storage.getTimesheetByUserIdAndDate(userId, date);
    if (timesheet) {
        const sessionsForDay = await storage.getSessionsByTimesheetId(timesheet.id);
        const newTotalHours = sessionsForDay.reduce((sum, s) => sum + (s.duration || 0), 0);
        await storage.updateTimesheet(timesheet.id, { totalHours: newTotalHours });
    }
}
// --- END: إضافة دالة مساعدة لإعادة حساب الإجمالي اليومي ---

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);
  const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(import.meta.dirname, "..", "public");
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, 'logo' + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage: storageConfig });
  // Timer routes
  app.post("/api/timer/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const activeSession = await storage.getActiveSessionByUserId(userId);
      if (activeSession) {
        return res.status(400).json({ message: "A session is already active" });
      }
      
      let timesheet = await storage.getTimesheetByUserIdAndDate(userId, today);
      if (!timesheet) {
        timesheet = await storage.createTimesheet({
          userId,
          date: today,
          totalHours: 0
        });
      }
      
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
      
      const activeSession = await storage.getActiveSessionByUserId(userId);
      if (!activeSession) {
        return res.status(400).json({ message: "No active session found" });
      }
      
      const startTime = new Date(activeSession.startAt);
      const duration = Math.floor((now.getTime() - startTime.getTime()) / 60000);
      
      const session = await storage.updateSession(activeSession.id, {
        endAt: now,
        duration,
        isActive: false
      });
      
      await recalculateDailyTotal(userId, startTime.toISOString().split('T')[0]);
      
      res.json(session);
    } catch (error) {
      console.error('Stop timer error:', error);
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
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const activeSessionsPromises = users.map(user => storage.getActiveSessionByUserId(user.id));
      const allActiveSessions = (await Promise.all(activeSessionsPromises)).filter(Boolean);
      
      let totalMonthlyHours = 0;
      const monthlyHoursPromises = users.map(async (user) => {
        const sessions = await storage.getSessionsByUserId(user.id, currentMonth);
        return sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      });
      totalMonthlyHours = (await Promise.all(monthlyHoursPromises)).reduce((sum, hours) => sum + hours, 0);
      
      const stats = {
        totalUsers: users.length,
        activeSessions: allActiveSessions.length,
        monthlyHours: Math.round(totalMonthlyHours / 60),
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
      const userId = parseInt(sessionData.userId);
      const startAt = new Date(sessionData.startAt);
      const date = startAt.toISOString().split('T')[0];

      // --- START: إصلاح مشكلة إنشاء الجلسة ---
      let timesheet = await storage.getTimesheetByUserIdAndDate(userId, date);
      if (!timesheet) {
          timesheet = await storage.createTimesheet({ userId, date, totalHours: 0 });
      }
      
      const createData = {
        ...sessionData,
        startAt: startAt,
        endAt: sessionData.endAt ? new Date(sessionData.endAt) : null,
        userId: userId,
        timesheetId: timesheet.id, // استخدام الـ ID الصحيح
        modifiedByAdmin: true,
      };
      // --- END: إصلاح مشكلة إنشاء الجلسة ---
      
      const session = await storage.createSession(createData);
      
      await recalculateDailyTotal(userId, date);
      
      // --- START: تعديل رسالة الإشعار ---
      const sessionDate = new Date(session.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const startTime = formatTimeForNotification(session.startAt);
      const endTime = formatTimeForNotification(session.endAt);
      await storage.createNotification({
        userId: createData.userId,
        title: "Session Added",
        message: `Admin ${req.user.firstName} added a session for you on ${sessionDate} from ${startTime} to ${endTime}.`
      });
      // --- END: تعديل رسالة الإشعار ---
      
      res.json(session);
    } catch (error) {
      console.error('Session create error:', error);
      res.status(500).json({ message: "Failed to create session", error: (error as Error).message });
    }
  });

  app.put("/api/admin/session/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    try {
      const sessionId = parseInt(req.params.id);
      const sessionData = req.body;

      const oldSession = await storage.getSession(sessionId);
      if (!oldSession) {
        return res.status(404).json({ message: "Session not found." });
      }

      const updateData = {
        ...sessionData,
        startAt: new Date(sessionData.startAt),
        endAt: sessionData.endAt ? new Date(sessionData.endAt) : undefined,
        modifiedByAdmin: true,
      };
      
      const updatedSession = await storage.updateSession(sessionId, updateData);
      
      await recalculateDailyTotal(updatedSession.userId, new Date(updatedSession.startAt).toISOString().split('T')[0]);
      
      const changes = [];
      if (formatTimeForNotification(oldSession.startAt) !== formatTimeForNotification(updatedSession.startAt)) {
        changes.push(`start time from ${formatTimeForNotification(oldSession.startAt)} to ${formatTimeForNotification(updatedSession.startAt)}`);
      }
      if (formatTimeForNotification(oldSession.endAt) !== formatTimeForNotification(updatedSession.endAt)) {
        changes.push(`end time from ${formatTimeForNotification(oldSession.endAt)} to ${formatTimeForNotification(updatedSession.endAt)}`);
      }
      
      const sessionDate = new Date(updatedSession.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const message = changes.length > 0
        ? `Admin ${req.user.firstName} updated your session on ${sessionDate}: changed ${changes.join(' and ')}.`
        : `Admin ${req.user.firstName} updated your session on ${sessionDate}.`;

      await storage.createNotification({
        userId: updatedSession.userId,
        title: "Session Updated",
        message: message,
      });

      res.json(updatedSession);
    } catch (error) {
      console.error('Session update error:', error);
      res.status(500).json({ message: "Failed to update session", error: (error as Error).message });
    }
  });

  app.delete("/api/admin/session/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    try {
      const sessionId = parseInt(req.params.id);
      const sessionToDelete = await storage.getSession(sessionId);
      if (!sessionToDelete) {
        return res.status(404).json({ message: "Session not found." });
      }
      
      const date = new Date(sessionToDelete.startAt).toISOString().split('T')[0];
      const userId = sessionToDelete.userId;
      
      await storage.deleteSession(sessionId);
      
      await recalculateDailyTotal(userId, date);

      const sessionDate = new Date(sessionToDelete.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const startTime = formatTimeForNotification(sessionToDelete.startAt);
      const endTime = formatTimeForNotification(sessionToDelete.endAt);

      await storage.createNotification({
        userId: sessionToDelete.userId,
        title: "Session Deleted",
        message: `Admin ${req.user.firstName} deleted your session from ${sessionDate} (${startTime} - ${endTime}).`
      });

      res.sendStatus(204);
    } catch (error) {
      console.error('Session delete error:', error);
      res.status(500).json({ message: "Failed to delete session", error: (error as Error).message });
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

  app.post("/api/upload/logo", upload.single('logo'), async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isStaff) return res.sendStatus(403);
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    try {
      const logoUrl = `/logo${path.extname(req.file.originalname)}`;
      
      await storage.updateCompanySettings({ logoUrl });
      
      res.json({ logoUrl, message: "Logo uploaded successfully" });
    } catch (error) {
      console.error("Failed to upload logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Extend Express Request to include dbUser
declare global {
  namespace Express {
    interface Request {
      dbUser?: {
        id: string;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        profileImageUrl: string | null;
        role: "manager" | "staff";
        venueId: string | null;
        homeVenueId: string | null;
      };
    }
  }
}

// Middleware to attach database user to request
// This runs AFTER isAuthenticated, preserving the passport user on req.user
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Replit Auth stores user claims on req.user from passport
    const passportUser = req.user as any;
    
    if (passportUser?.claims?.sub) {
      const userId = passportUser.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user) {
        // Store database user on a separate property to preserve passport data
        req.dbUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          venueId: user.venueId,
          homeVenueId: user.homeVenueId,
        };
      }
    }
    
    next();
  } catch (error) {
    console.error("Error attaching user:", error);
    next();
  }
}

// Middleware to require authentication (checks dbUser)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to require manager role
export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.dbUser.role !== "manager") {
    return res.status(403).json({ message: "Forbidden - Manager access required" });
  }
  
  next();
}

// Middleware to require staff role
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.dbUser.role !== "staff") {
    return res.status(403).json({ message: "Forbidden - Staff access required" });
  }
  
  next();
}

// Middleware that allows either role (authenticated only)
export function requireAnyRole(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

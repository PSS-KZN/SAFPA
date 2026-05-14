import 'express';

declare global {
  namespace Express {
    interface SessionActor {
      userId: string;
      userName: string;
      role: string;
      parlourId?: string;
      branchId?: string;
      memberId?: string;
      isAuthenticated: boolean;
    }

    interface Request {
      actor?: SessionActor;
    }
  }
}

export {};

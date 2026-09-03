declare global {
  namespace Express {
    interface Request {
      id: string;
      validated: {
        params?: unknown;
        query?: unknown;
        body?: unknown;
      };
    }
  }
}

export {};

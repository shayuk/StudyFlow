declare global {
  namespace Express {
    interface Request {
      user?: any; // או JwtUser אם יש טיפוס
    }
  }
}
export {};

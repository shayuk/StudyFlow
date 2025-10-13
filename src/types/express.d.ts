declare global {
  namespace Express {
    interface Request {
      user?: unknown; // או טיפוס JwtUser ייעודי בפרויקט
    }
  }
}
export {};

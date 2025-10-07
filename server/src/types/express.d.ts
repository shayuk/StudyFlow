declare global {
  namespace Express {
    interface Request {
      user?: any; // אם יש לך טיפוס JwtUser - אפשר לשים אותו במקום any
    }
  }
}
export {};

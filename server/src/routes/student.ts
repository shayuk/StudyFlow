import { Router, Request, Response } from "express";
import { handleStudentTurn } from "../controllers/studentController";

const router = Router();

// אם אין לך אוגמנטציה גלובלית ל-Request.user, אפשר להשתמש בטיפוס מקומי פשוט:
type AuthedRequest = Request & {
  user?: { id?: string };
};

/**
 * POST /api/student/chat
 * תזכורת: הקובץ הזה מולבן תחת /api ב-index.ts,
 * לכן כאן מגדירים רק /student/chat (בלי /api).
 */
router.post("/student/chat", async (req: AuthedRequest, res: Response) => {
  try {
    const bodyUnknown = req.body as unknown;
    const body = (bodyUnknown && typeof bodyUnknown === 'object' ? bodyUnknown : {}) as {
      message?: string;
      courseId?: string;
      moduleId?: string;
    };

    const message = String(body.message ?? "").trim();
    if (!message) {
      return res.status(400).json({ error: "bad_request", message: "message is required" });
    }

    const ctx = {
      userId: req.user?.id ?? "dev-user",
      courseId: String(body.courseId ?? "dev-course"),
      moduleId: String(body.moduleId ?? "default"),
    };

    const result = await handleStudentTurn(ctx, message);
    return res.json(result);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.stack || err.message : String(err);
    console.error("student/chat error:", detail);
    return res.status(500).json({ error: "student_bot_error", message: "Internal error" });
  }
});

export default router;

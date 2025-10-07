import { Router } from "express";
import { handleStudentTurn } from "../controllers/studentController";

const router = Router();

/**
 * POST /api/student/chat
 * תזכורת: הקובץ הזה מולבן תחת /api ב-index.ts,
 * לכן כאן מגדירים רק /student/chat (בלי /api).
 */
router.post("/student/chat", async (req, res) => {
  try {
    const body = req.body ?? {};
    const ctx = {
      userId: (req as any).user?.id ?? "dev-user",
      courseId: String(body.courseId ?? "dev-course"),
      moduleId: String(body.moduleId ?? "default"),
    };
    const message = String(body.message ?? "");
    const result = await handleStudentTurn(ctx, message);
    res.json(result);
  } catch (err: any) {
    console.error("student/chat error:", err?.stack || err);
    res.status(500).json({ error: "student_bot_error", message: "Internal error" });
  }
});

export default router;

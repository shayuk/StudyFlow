# Definition of Done (DoD)

This document defines measurable, quick checklists to decide when a change is Done.
It is split between a minimal, fast checklist for a single feature (Feature-Lite), and a staging readiness checklist (Release).

---

### DoD — Feature (Lite)
- [ ] קוד: `pnpm run backend:lint`  ירוק
- [ ] בדיקות: `pnpm run backend:test`  ירוק; נוספו טסטים ל־400/401/403/404/409 הרלוונטיים
- [ ] API: עודכן `docs/api/openapi.yaml`; Swagger ב־`/docs` נטען ללא שגיאות + דוגמה ל־request/response
- [ ] ולידציה: Zod מחזיר 400 עם הודעה ברורה
- [ ] לוגים: `info` בהצלחה, `warn/error` בכשל, בלי סודות
- [ ] UI (אם רלוונטי): מציג Loading/Error/Success עקביים (RTL/עברית תקינים)
- [ ] Smoke ידני: קריאה אחת מוצלחת (201/200) + אחת נכשלת בכוונה (400) עוברות
- [ ] PR: תיאור קצר + “איך לבדוק” + קישור ל־`/docs`; CI ירוק

---

### DoD — Release (Staging)
- [ ] CI ירוק (lint + unit + smoke)
- [ ] ENV בסביבת Staging מעודכן; CORS מאפשר רק את דומיין ה־Preview/Prod כנדרש
- [ ] אבטחה בסיסית: `helmet` פעיל; אין הדפסה של סודות בלוגים
- [ ] Observability: אין `ERROR` חריג בלוגים בזמן ה־smoke
- [ ] מיגרציות: `prisma migrate deploy` ירוק; אם יש seed — רץ בירוק
- [ ] Smoke על ה־Staging:
  - [ ] Create Bot → 201
  - [ ] Create Course → 201
  - [ ] Planner conflict → החזרת conflicts/409 או 200 עם פירוט חפיפות (לפי ההגדרה)
- [ ] PR Release: קישור ל־Preview + ל־`/docs` + הערות ידועות (Known Issues)

---

## PR Template (short)
- What changed: …
- How to test locally: commands/steps + expected statuses (201/200/409/400)
- Links: `/docs` (Swagger), preview URL (if exists)
- Notes/Known issues: …

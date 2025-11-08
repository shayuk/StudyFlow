# 🚨 הוראות תיקון השרת ב-Vercel

## הבעיה
השרת לא עולה כמו שצריך ב-Vercel. מחזיר 404 על כל הבקשות.

## הפתרון - צעד אחרי צעד

### 1. **הוסף משתני סביבה לשרת ב-Vercel**

לך ל-Vercel Dashboard → **study-flow-server-one** → **Settings** → **Environment Variables**

הוסף את המשתנים הבאים:

```
DATABASE_URL = [הערך מהקובץ server/.env שלך]
DIRECT_URL = [הערך מהקובץ server/.env שלך]
JWT_SECRET = MySecretKey123456789!@#$%^&*
DEFAULT_ADMIN_EMAIL = krimishay68@gmail.com
SINGLE_ORG_NAME = Ariel University
ALLOWED_ORIGINS = https://studyflow-ui.vercel.app,https://studyflow-38rqaf6t6-shays-projects-ac266b98.vercel.app,https://studyflow-puiukdlob-shays-projects-ac266b98.vercel.app
```

**חשוב:** ב-ALLOWED_ORIGINS תוסיף את כל הכתובות של ה-Preview deployments שלך!

### 2. **בדוק את ההגדרות של הפרויקט**

בעמוד Settings → General → Build & Development Settings:

צריך להיות:
- **Framework Preset:** Other
- **Root Directory:** server (או ריק)
- **Build Command:** (ריק)
- **Output Directory:** (ריק)
- **Install Command:** npm install או pnpm install

### 3. **פרוס מחדש**

1. לך ל-**Deployments**
2. לחץ על שלוש הנקודות (...) ליד הפריסה האחרונה
3. לחץ **Redeploy**
4. חכה שהפריסה תסתיים

### 4. **בדוק את ה-Endpoints**

אחרי הפריסה, נסה לגשת ל:

```
https://study-flow-server-one.vercel.app/api/ping
https://study-flow-server-one.vercel.app/api/health
```

אתה אמור לקבל JSON תשובה.

### 5. **אם עדיין לא עובד**

#### בדוק את הלוגים:
1. לך ל-Functions בתפריט השמאלי
2. לחץ על Logs
3. חפש שגיאות אדומות

#### בדיקות נוספות:

**בדוק שהקבצים קיימים:**
- `server/api/index.ts`
- `server/api/health.ts`
- `server/api/ping.ts`

**בדוק את vercel.json:**
צריך להיות פשוט:
```json
{
  "version": 2,
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 6. **בדיקה עם curl**

פתח CMD וכתוב:
```cmd
curl https://study-flow-server-one.vercel.app/api/ping
```

אם מקבל תשובה - השרת עובד!

### 7. **בדיקה עם הקובץ test-vercel-connection.html**

עדכן את השורה בקובץ:
```javascript
const SERVER_URL = 'https://study-flow-server-one.vercel.app';
```

ונסה שוב את הבדיקות.

---

## אם כלום לא עובד

### אופציה א: צור פרויקט חדש
1. מחק את study-flow-server-one
2. צור פרויקט חדש
3. חבר את הריפו
4. בחר את התיקייה `server` כ-Root Directory
5. הוסף את כל משתני הסביבה

### אופציה ב: פרוס רק את ה-API
צור פרויקט חדש שמכיל רק את תיקיית `server/api` ללא Express.

---

## טיפים
- תמיד בדוק את הלוגים ב-Vercel
- ודא שכל משתני הסביבה מוגדרים
- השתמש ב-`/api/ping` לבדיקה ראשונית - הוא לא צריך משתני סביבה
- אם יש בעיה עם CORS, הוסף את הכתובת החדשה ל-ALLOWED_ORIGINS

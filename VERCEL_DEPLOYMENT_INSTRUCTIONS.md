# הוראות פריסה מלאות ב-Vercel

## 🚀 סטטוס נוכחי
- **UI (Frontend)**: https://studyflow-ui.vercel.app/ 
- **Server (Backend)**: https://study-flow-server-one.vercel.app/
- **Firebase (ישן)**: https://studyflow-b6265.web.app (לא בשימוש יותר)

## 📝 הוראות עבורך - שלב אחרי שלב

### שלב 1: הגדרת משתני סביבה ב-Vercel Dashboard

#### א. עבור הפרונט-אנד (studyflow-ui)
1. פתח את הדפדפן שלך
2. לך לכתובת: https://vercel.com
3. התחבר עם החשבון שלך
4. מצא את הפרויקט **studyflow-ui** (או השם שנתת לו)
5. לחץ על הפרויקט
6. לחץ על הכרטיסייה **Settings** למעלה
7. בתפריט השמאלי, לחץ על **Environment Variables**
8. הוסף את המשתנה הבא:
   - **Name**: VITE_API_BASE_URL
   - **Value**: https://study-flow-server-one.vercel.app
   - סמן את כל הסביבות: ☑ Production ☑ Preview ☑ Development
   - לחץ **Save**

#### ב. עבור השרת (study-flow-server-one)
1. חזור לרשימת הפרויקטים שלך ב-Vercel
2. מצא את הפרויקט **study-flow-server-one**
3. לחץ על הפרויקט
4. לחץ על הכרטיסייה **Settings**
5. לחץ על **Environment Variables**
6. הוסף את כל המשתנים הבאים (אחד אחד):

##### משתנים חובה:
```
DATABASE_URL = [הכתובת מהקובץ server/.env שלך]
DIRECT_URL = [הכתובת מהקובץ server/.env שלך]
JWT_SECRET = [צור מחרוזת אקראית של 32 תווים לפחות]
DEFAULT_ADMIN_EMAIL = krimishay68@gmail.com
SINGLE_ORG_NAME = Ariel University
ALLOWED_ORIGINS = https://studyflow-ui.vercel.app
```

##### ליצירת JWT_SECRET:
- השתמש באתר: https://randomkeygen.com/
- או הרץ ב-CMD: `echo %RANDOM%%RANDOM%%RANDOM%%RANDOM%`
- העתק את התוצאה

##### משתנים אופציונליים (לבוטים):
```
OPENAI_API_KEY = [המפתח שלך מ-OpenAI אם יש]
ANTHROPIC_API_KEY = [המפתח שלך מ-Anthropic אם יש]
```

7. אחרי שהוספת את כל המשתנים, לחץ **Save**

### שלב 2: פריסה מחדש (Redeploy)

#### א. פריסת השרת מחדש:
1. בפרויקט **study-flow-server-one**
2. לחץ על הכרטיסייה **Deployments**
3. מצא את הפריסה האחרונה ברשימה
4. לחץ על שלוש הנקודות (...) מימין
5. לחץ על **Redeploy**
6. אשר את הפריסה
7. חכה שהפריסה תסתיים (כ-2-3 דקות)

#### ב. פריסת הפרונט מחדש:
1. בפרויקט **studyflow-ui**
2. לחץ על **Deployments**
3. לחץ על שלוש הנקודות (...) בפריסה האחרונה
4. לחץ על **Redeploy**
5. אשר את הפריסה
6. חכה שהפריסה תסתיים

### שלב 3: בדיקת החיבור

1. פתח את: https://studyflow-ui.vercel.app/
2. נסה להירשם עם האימייל שלך
3. אם הכל עובד - מצוין! 🎉
4. אם לא עובד, המשך לשלב 4

### שלב 4: פתרון בעיות

#### בדיקת השרת:
1. פתח את: https://study-flow-server-one.vercel.app/health
2. אתה אמור לראות: `{"status":"ok","service":"studyflow-server","version":"0.1.0"}`
3. אם לא רואה, השרת לא עולה כמו שצריך

#### בדיקת CORS:
1. פתח את Console בדפדפן (F12)
2. חפש שגיאות CORS
3. אם יש שגיאות CORS, צור issue חדש ב-GitHub

#### בדיקת Logs ב-Vercel:
1. לך לפרויקט ב-Vercel
2. לחץ על **Functions** בתפריט השמאלי
3. לחץ על **Logs**
4. חפש שגיאות אדומות

### שלב 5: עדכון הקוד המקומי שלך

אחרי שהכל עובד ב-Vercel, עדכן את הקבצים המקומיים שלך:

1. פתח את הקובץ `.env` בתיקייה הראשית
2. ודא שיש בו:
```
VITE_API_BASE_URL=https://study-flow-server-one.vercel.app
```

3. כדי לעבוד מקומית מול השרת ב-Vercel:
```cmd
pnpm dev
```

4. כדי לעבוד עם שרת מקומי, שנה ל:
```
VITE_API_BASE_URL=http://localhost:4000
```

### שלב 6: אימות סופי

#### בדוק את הפעולות הבאות:
- [ ] רישום משתמש חדש
- [ ] התחברות עם משתמש קיים
- [ ] גישה לדאשבורד
- [ ] התחלת שיחה עם בוט (אם יש API keys)

## 🔑 מפתחות API לבוטים

אם אתה רוצה שהבוטים יעבדו, תצטרך:

### OpenAI API Key:
1. לך ל: https://platform.openai.com/api-keys
2. צור מפתח חדש
3. העתק אותו
4. הוסף ל-Vercel כ: OPENAI_API_KEY

### Anthropic API Key:
1. לך ל: https://console.anthropic.com/
2. צור מפתח חדש
3. העתק אותו
4. הוסף ל-Vercel כ: ANTHROPIC_API_KEY

## 📱 בדיקה מהטלפון

אחרי שהכל עובד:
1. פתח בטלפון: https://studyflow-ui.vercel.app/
2. נסה להתחבר
3. בדוק שהכל עובד גם במובייל

## ❌ אם משהו לא עובד

1. צלם את השגיאה
2. העתק את הטקסט של השגיאה
3. תגיד לי בדיוק מה ניסית לעשות
4. תן לי לראות את ה-Console (F12) בדפדפן

## ✅ סיכום

אחרי כל השלבים האלה, האפליקציה שלך אמורה לעבוד ב:
- **UI**: https://studyflow-ui.vercel.app/
- **API**: https://study-flow-server-one.vercel.app/

שמור את המסמך הזה - תצטרך אותו כל פעם שתרצה לעדכן משהו!

---

### נתונים טכניים לידע כללי:
- השרת משתמש ב-PostgreSQL (Neon)
- Authentication עובד עם JWT
- הפרונט בנוי עם React + Vite
- השרת בנוי עם Express + TypeScript
- CORS מוגדר לאפשר רק את הדומיינים הספציפיים

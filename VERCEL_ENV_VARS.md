# Vercel Environment Variables

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### Database
- `DATABASE_URL` - PostgreSQL connection string (e.g., from Supabase, Neon, or Railway)
- `DIRECT_URL` - Direct database URL for migrations (optional, same as DATABASE_URL if not using connection pooling)

### Authentication
- `JWT_SECRET` - Secret key for JWT tokens (generate a random string, e.g., using `openssl rand -base64 32`)
- `JWT_ISSUER` - studyflow-server (optional)
- `JWT_AUDIENCE` - studyflow-client (optional)

### Admin Configuration
- `ADMIN_EMAIL` - krimishay68@gmail.com (your admin email)
- `SINGLE_ORG_NAME` - Ariel University

### CORS
- `ALLOWED_ORIGINS` - Your Vercel app URL (e.g., https://studyflow-tau.vercel.app)

### AI/LLM (Optional for now)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `ANTHROPIC_API_KEY` - Anthropic API key for AI features

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Navigate to "Environment Variables"
4. Add each variable with its value
5. Make sure to select the appropriate environments (Production/Preview/Development)
6. Click "Save"
7. Redeploy your application for changes to take effect

## Example Values

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-here-32-chars-min
ADMIN_EMAIL=krimishay68@gmail.com
SINGLE_ORG_NAME=Ariel University
ALLOWED_ORIGINS=https://studyflow-tau.vercel.app
```

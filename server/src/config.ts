export const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_VERCEL = process.env.VERCEL === '1';
export const SINGLE_ORG_NAME = process.env.SINGLE_ORG_NAME || 'Ariel University';
export const JWT_ISSUER = process.env.JWT_ISSUER || 'studyflow-server';
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'studyflow-client';

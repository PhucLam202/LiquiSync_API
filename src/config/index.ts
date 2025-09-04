import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV,
  apiVersion: process.env.API_VERSION,
  
  // External APIs
  bifrostApiUrl: process.env.BIFROST_API_URL || 'https://dapi.bifrost.io/api',

  // Security
  jwtSecret: process.env.JWT_SECRET,
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '10000'),
  
  // Monitoring
  logLevel: process.env.LOG_LEVEL ,
  
  // Cache TTL (seconds)
  cacheTtl: {
    yields: 300, // 5 minutes
    overview: 600, // 10 minutes
    prices: 60 // 1 minute
  }
} as const;
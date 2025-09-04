import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { openapiSpecification } from './config/swagger.config.js';
import v1Routes from './routes/v1/index.js';

const app: Express = express();

// Security middleware with Scalar-specific CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // Required for Scalar
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Scalar
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "http://localhost:*",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://*.railway.app",
        "https://*.up.railway.app",
        "wss:",
        "ws:"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));

// CORS configuration - Railway deployment compatible 
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        /\.railway\.app$/,
        /\.up\.railway\.app$/,
        /^https:\/\/.*\.railway\.app$/,
        'https://api.liquidsync.dev',
        'https://app.liquidsync.dev'
      ]
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://localhost:5173'
      ],
  credentials: true, // Enable credentials for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cookie'],
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===== CLEAN OPENAPI ENDPOINT =====
// Serve OpenAPI specification as JSON (required for Scalar)
app.get("/openapi.json", (_, res) => {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    
    // Cache control: In development, disable caching to prevent stale server URLs
    // In production, allow 5-minute caching for performance
    const cacheControl = process.env.NODE_ENV === 'production' 
      ? "public, max-age=300" 
      : "no-cache, no-store, must-revalidate, max-age=0";
    
    res.setHeader("Cache-Control", cacheControl);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Add timestamp header to help with debugging and cache busting
    res.setHeader("X-OpenAPI-Generated", new Date().toISOString());
    
    // Clean JSON serialization
    res.status(200).json(openapiSpecification);
  } catch (error) {
    console.error("Error serving OpenAPI spec:", error);
    res.status(500).json({ 
      error: "Failed to serve OpenAPI specification",
      message: "Internal server error"
    });
  }
});

// ===== SCALAR API REFERENCE =====
// Official Scalar implementation following their Express documentation
app.use('/docs', apiReference({
  // Official Scalar configuration as per their documentation
  theme: 'default',
  url: '/openapi.json',
  
  // Additional configuration for better performance
  layout: 'modern',
  showSidebar: true,
  hideDownloadButton: false,
  hideTestRequestButton: false,
  
  // Metadata for better SEO
  metaData: {
    title: 'LiquidSync API - Interactive Documentation',
    description: 'Comprehensive DeFi data aggregation API with real-time yields and exchange rates',
    ogTitle: 'LiquidSync API Documentation',
    ogDescription: 'Next-generation DeFi data aggregation bridging Polkadot & Ethereum ecosystems',
  },
  
  // Custom styling for professional appearance
  customCss: `
    :root {
      --scalar-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --scalar-radius: 6px;
      --scalar-border-width: 1px;
      --scalar-color-1: #1e293b;
      --scalar-color-2: #334155;
      --scalar-color-3: #64748b;
    }
    
    .scalar-app {
      font-family: var(--scalar-font);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .scalar-card {
      border-radius: var(--scalar-radius);
      border-width: var(--scalar-border-width);
    }
    
    /* Fix any potential rendering issues */
    * {
      box-sizing: border-box;
    }
    
    /* Ensure proper text encoding */
    body, html {
      font-family: var(--scalar-font);
      text-rendering: optimizeLegibility;
    }
  `
}));
  // src/routes/v1/index.ts
app.get('/health', (_, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "LiquidSync API Server is running!",
    documentation: `${req.protocol}://${req.get("host")}/docs`,
    openapi: `${req.protocol}://${req.get("host")}/openapi.json`,
    version: "1.0.0",
    status: "operational"
  });
});

// API Routes
app.use('/api/v1', v1Routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
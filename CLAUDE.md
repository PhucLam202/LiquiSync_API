# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DeFi Data API** is a TypeScript/Node.js authentication-enabled DeFi data aggregation platform that provides unified access to Bifrost protocol data, including yields, exchange rates, and token conversions across Polkadot parachains with comprehensive user management and API key authentication.

## Development Commands

### Essential Commands
- `pnpm run dev` - Start development server with hot reload using nodemon
- `pnpm run start:debug` - Start development server with debugging on port 9229
- `pnpm run build` - Compile TypeScript and prepare for production
- `pnpm start` - Run production server from dist/
- `pnpm run railway:build` - Railway platform specific build command

### Database Operations
- `pnpm run db:generate` - Generate Prisma client from schema
- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:migrate` - Deploy database migrations
- `pnpm run db:studio` - Open Prisma Studio for database management
- `pnpm run db:seed` - Seed database with initial data

### Documentation & Development
- `pnpm run docs:generate` - Generate API documentation using ts-node scripts
- `pnpm run docs:serve` - Serve documentation (alias for dev)
- `pnpm run memory:update` - Update project memory files
- Visit `/docs` endpoint for interactive Scalar documentation (replaces Swagger UI)

### Docker Development
```bash
docker build -t defi-data-api .
docker run -p 3000:3000 defi-data-api
```

### Technology Stack
- **Backend**: Node.js, Express.js framework, Scalar API documentation, MongoDB with Prisma ORM
- **Authentication**: JWT tokens, API key authentication, Redis session management
- **Email**: Brevo integration for notifications and verification
- **Security**: Helmet, CORS, rate limiting, comprehensive validation layers
- **Infrastructure**: Docker, Railway deployment platform

## Architecture & Code Organization

### Core Architecture Pattern
The project follows **Domain-Driven Design with Layered Architecture**:
- **Routes** (`/src/routes/v1/`) - API endpoint definitions with versioning (auth, users, apikeys, bifrost, etc.)
- **Controllers** (`/src/controllers/`) - Request handling and validation (authController, userController, bifrostController, etc.)
- **Services** (`/src/services/`) - External API integration and business logic (authService, bifrostService, email services)
- **Middleware** (`/src/middleware/`) - Security, error handling, rate limiting, authentication
- **Types** (`/src/types/`) - TypeScript interfaces and domain models
- **Database** - MongoDB with Prisma ORM for user management, API keys, roles, permissions, and usage tracking

### Key Architectural Decisions

**Full ESM Module System**: The project uses ES2020 modules exclusively. All imports must use `.js` extensions in TypeScript files for proper ESM compatibility.

**Path Aliases**: Use `@/` prefix for clean imports (configured in tsconfig.json):
```typescript
import { config } from '@/config/environment'
import type { BifrostYield } from '@/types/bifrost'
```

**Authentication & Authorization**: Comprehensive user management system with JWT tokens, API key authentication, role-based permissions, and usage tracking.

**Security-First Design**: Multi-layer security including rate limiting, input validation, error sanitization, and comprehensive authentication middleware.

**Database Integration**: MongoDB with Prisma ORM providing type-safe database operations, user management, subscription tracking, and audit logging.

## Domain-Specific Context

### Primary Data Sources
- **Bifrost Protocol API** - Main source for yields, exchange rates, conversions
- **Chain Data APIs** - Real-time blockchain data
- **Market Intelligence** - TVL analytics and DeFi ecosystem data

### Supported Token Ecosystems
- **Polkadot parachains**: Bifrost, Moonbeam, Acala, Astar
- **Liquid staking tokens**: vDOT, vKSM, vBNC, vETH, vMOVR, etc.
- **Cross-chain infrastructure**: Unified data layer for multi-chain DeFi

### Request Flow Pattern
```
HTTP Request → CORS/Security → Rate Limiting → Authentication → 
Route Handler → Controller (Validation) → Service (Business Logic/External API) → 
Database Operations → Response Formatting → Error Handling → HTTP Response
```

### Authentication Flow
```
Registration: User Input → Email Verification → Account Activation
Login: Credentials → JWT Token + Refresh Token → User Session
API Access: API Key → Permission Validation → Resource Access
```

## Critical Implementation Details

### Error Handling Strategy
The project implements enterprise-grade error handling with:
- **Error sanitization**: Removes file paths, IPs, and sensitive data from error messages
- **Environment-aware responses**: Different error detail levels for development vs production
- **Centralized error handler**: All errors flow through `/src/middleware/errorHandler.ts`

### Security Implementation
- **Authentication**: JWT tokens with refresh token rotation, API key management with permissions
- **Authorization**: Role-based access control (RBAC) with granular permissions
- **Rate limiting**: 100 requests per 15 minutes with burst protection
- **CSP headers**: Scalar-specific Content Security Policy configuration
- **Multi-layer validation**: Input sanitization at route, controller, and service levels
- **Attack pattern detection**: XSS, SQL injection, and path traversal prevention
- **Database Security**: Prisma ORM with parameterized queries, secure password hashing with bcrypt/argon2

### Performance Targets
- **< 200ms average response time**
- **Gzip compression** for all responses
- **Smart caching** with configurable TTL based on data type
- **Parallel processing** for multiple external API calls

## Environment & Configuration

### Required Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - MongoDB connection string for Prisma
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_REFRESH_SECRET` - Secret key for refresh token signing
- `REDIS_URL` - Redis connection string for session management
- `BREVO_API_KEY` - Brevo email service API key
- `CORS_ORIGIN` - Allowed CORS origins (environment-specific)
- `BIFROST_API_URL` - Primary Bifrost protocol API endpoint (if needed)

### TypeScript Configuration
- **Strict mode enabled** with comprehensive type checking
- **ES2020 target** with full ESM module support
- **Path mapping** configured for `@/*` aliases
- **Declaration files** generated for potential SDK usage

## Deployment Context

### Railway Platform Deployment
The project is optimized for Railway deployment with:
- **Multi-stage Docker build** (dependencies → build → production)
- **Health check endpoint**: `/health` for monitoring
- **Zero-downtime deployment** capability
- **Automated restart** on failure

### Container Architecture
- **Alpine Linux base** for minimal attack surface
- **Non-root user** for security
- **Health monitoring** built into container
- **Environment-aware configuration**

## Development Workflow Notes

### Code Patterns to Follow
- **Controller fat, service thin**: Controllers handle validation and formatting, services focus on business logic and external integration
- **Defensive programming**: Always validate inputs and sanitize outputs
- **Database-first operations**: Use Prisma ORM for all database operations with proper error handling
- **Authentication patterns**: Always validate authentication before accessing protected resources
- **Comprehensive logging**: Structure logs for observability without exposing sensitive data
- **Email integration**: Use Brevo service for all email communications (verification, notifications)

### Testing Strategy
- **Authentication testing**: Verify JWT token validation, API key authentication, and permission checks
- **Database testing**: Test Prisma operations, data validation, and constraint enforcement
- **Input validation testing**: Verify security layers work correctly across all endpoints
- **Error response testing**: Confirm sanitization prevents information disclosure
- **Email integration testing**: Verify Brevo email service functionality
- **Health check validation**: Ensure `/health` endpoint functionality

### Documentation Standards
- **OpenAPI 3.0 compliance**: All endpoints documented with JSDoc comments
- **TypeScript interfaces**: Comprehensive type definitions for all data structures
- **Scalar integration**: Modern interactive documentation over traditional Swagger UI
- **Example responses**: Include realistic sample data in API documentation
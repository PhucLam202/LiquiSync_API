/// # API v1 Routes Index
/// 
/// Main routing configuration for API version 1. Organizes and delegates
/// requests to specialized route modules based on resource type.
/// 
/// ## Route Organization:
/// - **Modular Design**: Each resource type has its own route module
/// - **Namespace Isolation**: Clear separation between different API endpoints
/// - **Version Control**: Isolated v1 routing for API versioning strategy
/// - **Middleware Integration**: Each route module can define its own middleware
/// 
/// ## Available Route Modules:
/// - **/bifrost**: Unified Bifrost protocol endpoints (yields + exchange rates)
/// - **/stablecoins**: Stablecoin ecosystem data endpoints (stablecoinRoutes)  
/// - **/defi/tvl**: TVL intelligence endpoints (marketIntelligenceRoutes)
/// 
/// ## Security Considerations:
/// - All routes inherit middleware from parent router
/// - Individual route modules implement their own validation
/// - Rate limiting and authentication applied at middleware level
/// - CORS and security headers configured globally
/// 
/// ## API Endpoint Structure:
/// ```
/// /api/v1/bifrost/*         - Unified Bifrost protocol (yields + exchange rates)
/// /api/v1/stablecoins/*     - Stablecoin market data
/// /api/v1/defi/tvl/*        - TVL intelligence endpoints
/// ```

import express, { Router } from "express";
import stablecoinRoutes from "./stablecoin.js";
import bifrostRoutes from "./bifrost.js";
import marketIntelligenceRoutes from "./marketIntelligence.js";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import apiKeyRoutes from "./apikeys.js";

/// ## Main V1 Router Configuration
/// 
/// Creates the main router instance for API version 1 and delegates
/// requests to appropriate resource-specific route modules.
/// 
/// ### Route Delegation Strategy:
/// - **bifrost**: Complete Bifrost protocol including yields and exchange rates
/// - **stablecoins**: Comprehensive stablecoin ecosystem analytics
/// - **defi/tvl**: Intelligent TVL analysis with insights and recommendations
/// 
/// ### Router Middleware Chain:
/// 1. Global middleware (applied by parent)
/// 2. V1-specific middleware (if any)
/// 3. Resource-specific middleware (in individual route modules)
/// 4. Controller functions
const router: express.Router = Router();

/// ROUTE DELEGATION: Bifrost endpoints (PRIORITY)
/// Handles all Bifrost protocol requests including yields and exchange rates
/// **Base Path**: /api/v1/bifrost/*
/// **Endpoints**: /yields, /yields/{symbol}, /exchange-rates/{token}, /convert, /supported-tokens
router.use("/bifrost", bifrostRoutes);

/// ROUTE DELEGATION: Stablecoin endpoints
/// Handles all stablecoin ecosystem data requests
/// **Base Path**: /api/v1/stablecoins/*
router.use("/stablecoins", stablecoinRoutes);

/// ROUTE DELEGATION: TVL Intelligence endpoints  
/// Handles intelligent TVL analysis with insights and recommendations
/// **Base Path**: /api/v1/defi/tvl/*
/// **Endpoints**: /overview, /dominance, /trending, /movers, /health
router.use("/defi/tvl", marketIntelligenceRoutes);

/// ROUTE DELEGATION: Authentication endpoints
router.use("/auth", authRoutes);

/// ROUTE DELEGATION: User endpoints
router.use("/users", userRoutes);

/// ROUTE DELEGATION: API Key endpoints
router.use("/apikeys", apiKeyRoutes);

export default router;

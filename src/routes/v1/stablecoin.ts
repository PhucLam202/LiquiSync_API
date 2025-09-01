/// # Stablecoin Ecosystem Routes [SECURED]
/// 
/// Comprehensive route definitions for stablecoin ecosystem data endpoints.
/// Provides access to market analytics, risk assessment, and cross-chain
/// stablecoin circulation data with enterprise-grade security.
/// 
/// ## SECURITY IMPLEMENTATION:
/// - **🔐 API Key Authentication**: All endpoints require valid API keys
/// - **📊 Subscription-Based Rate Limiting**: Usage tracked by subscription tier  
/// - **🛡️ Multi-Layer Protection**: API key auth + general rate limiting
/// - **📝 Usage Tracking**: Comprehensive request logging and analytics
/// 
/// ## Route Responsibilities:
/// - **Market Data Access**: Comprehensive stablecoin market information
/// - **Risk Assessment**: Stability metrics and depegging monitoring
/// - **Cross-Chain Analytics**: Blockchain-specific circulation data
/// - **Market Intelligence**: Top performers and ecosystem analytics
/// 
/// ## Security Features:
/// - API key authentication required for all endpoints
/// - Rate limiting on all endpoints to prevent API abuse
/// - Comprehensive input validation and sanitization
/// - Parameter bounds checking and format validation
/// - DoS protection through result set limits
/// 
/// ## Performance Optimizations:
/// - Intelligent caching with 5-minute TTL
/// - Conditional data inclusion (chain data optional)
/// - Optimized sorting and filtering algorithms
/// - Pagination support for large datasets
/// 
/// ## Endpoint Categories:
/// 
/// ### Core Data Access:
/// ```
/// GET /                   - List all stablecoins with filtering
/// GET /symbol/{symbol}    - Get stablecoin by symbol
/// GET /id/{id}           - Get stablecoin by ID
/// ```
/// 
/// ### Analytics & Intelligence:
/// ```
/// GET /analytics         - Market analytics and breakdowns
/// GET /top              - Top stablecoins by market cap
/// GET /depegged         - Risk monitoring for depegged tokens
/// ```
/// 
/// ### Cross-Chain Analysis:
/// ```
/// GET /chain/{chain}     - Blockchain-specific stablecoin data
/// ```

import express from 'express';
import { stablecoinController } from '../../controllers/stablecoinController.js';
import { rateLimitMiddleware } from '../../middleware/rateLimiter.js';
import { apiKeyAuth } from '../../middleware/auth/apiKeyAuth.js';

/// ## Stablecoin Router Configuration
/// 
/// Creates router instance for stablecoin ecosystem endpoints with
/// rate limiting, controller delegation, and comprehensive Swagger documentation.
/// 
/// ### Middleware Stack:
/// 1. **Rate Limiting**: Applied to all endpoints for API protection
/// 2. **Input Validation**: Handled by individual controllers
/// 3. **Error Handling**: Centralized error middleware
/// 4. **Response Formatting**: Standardized API responses
const router: express.Router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     StablecoinAsset:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the stablecoin
 *         name:
 *           type: string
 *           description: Full name of the stablecoin
 *         symbol:
 *           type: string
 *           description: Symbol of the stablecoin
 *         geckoId:
 *           type: string
 *           description: CoinGecko ID for the stablecoin
 *         pegType:
 *           type: string
 *           description: Type of peg (USD, EUR, GBP)
 *         pegMechanism:
 *           type: string
 *           description: Mechanism used to maintain peg
 *         marketCap:
 *           type: number
 *           description: Market capitalization in USD
 *         price:
 *           type: number
 *           description: Current price in USD
 *         pegStability:
 *           type: number
 *           description: Stability percentage (0-100)
 *         circulation:
 *           type: object
 *           properties:
 *             current:
 *               type: number
 *             prevDay:
 *               type: number
 *             prevWeek:
 *               type: number
 *             prevMonth:
 *               type: number
 *         chains:
 *           type: array
 *           items:
 *             type: string
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 *         growthRates:
 *           type: object
 *           properties:
 *             daily:
 *               type: number
 *             weekly:
 *               type: number
 *             monthly:
 *               type: number
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *         timestamp:
 *           type: string
 *           format: date-time
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: number
 *             limit:
 *               type: number
 *             total:
 *               type: number
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *         code:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/stablecoins:
 *   get:
 *     summary: Get all stablecoins with optional filtering
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: query
 *         name: pegType
 *         schema:
 *           type: string
 *         description: Filter by peg type (USD, EUR, GBP)
 *       - in: query
 *         name: mechanism
 *         schema:
 *           type: string
 *         description: Filter by peg mechanism
 *       - in: query
 *         name: minMarketCap
 *         schema:
 *           type: number
 *         description: Minimum market cap filter
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *         description: Filter by blockchain
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, marketCap, stability, growth, name]
 *           default: id
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: includeChainData
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include chain circulation data
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of stablecoins
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StablecoinAsset'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /**
/// Retrieves all stablecoins with advanced filtering and pagination
/// - **Security**: Rate limiting, comprehensive input validation
/// - **Features**: Filter by peg type, mechanism, market cap, chain
/// - **Performance**: Optimized sorting, conditional chain data inclusion
/// - **Pagination**: Configurable limits (1-100) with bounds checking
router.get('/', apiKeyAuth, rateLimitMiddleware, stablecoinController.getStablecoins);

/**
 * @swagger
 * /api/v1/stablecoins/symbol/{symbol}:
 *   get:
 *     summary: Get stablecoin by symbol
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stablecoin symbol
 *         example: USDT
 *     responses:
 *       200:
 *         description: Stablecoin details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StablecoinAsset'
 *       404:
 *         description: Stablecoin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid symbol format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /symbol/{symbol}**
/// Retrieves stablecoin data by symbol with format validation
/// - **Security**: Symbol sanitization, alphanumeric validation
/// - **Features**: Case-insensitive symbol matching
/// - **Validation**: 20-character limit, injection protection
/// - **Response**: Complete stablecoin asset with risk metrics
router.get('/symbol/:symbol', apiKeyAuth, rateLimitMiddleware, stablecoinController.getStablecoinBySymbol);

/**
 * @swagger
 * /api/v1/stablecoins/id/{id}:
 *   get:
 *     summary: Get stablecoin by ID
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stablecoin ID
 *         example: tether
 *     responses:
 *       200:
 *         description: Stablecoin details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StablecoinAsset'
 *       404:
 *         description: Stablecoin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /id/{id}**
/// Retrieves stablecoin data by unique identifier
/// - **Security**: ID sanitization, 50-character limit
/// - **Features**: Supports complex IDs (e.g., "dai-dai-stablecoin")
/// - **Validation**: Alphanumeric validation, injection protection
/// - **Response**: Complete stablecoin asset with all metadata
router.get('/id/:id', apiKeyAuth, rateLimitMiddleware, stablecoinController.getStablecoinById);

/**
 * @swagger
 * /api/v1/stablecoins/chain/{chain}:
 *   get:
 *     summary: Get stablecoins by blockchain with chain-focused data structure
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: path
 *         name: chain
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain name
 *         example: ethereum
 *     responses:
 *       200:
 *         description: Chain-focused stablecoin data showing circulation on the specified chain
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         chain:
 *                           type: string
 *                           description: The blockchain name
 *                           example: ethereum
 *                         totalStablecoins:
 *                           type: number
 *                           description: Total number of stablecoins on this chain
 *                           example: 25
 *                         totalCirculation:
 *                           type: number
 *                           description: Total circulation on this chain in USD
 *                           example: 45000000000
 *                         stablecoins:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: tether
 *                               name:
 *                                 type: string
 *                                 example: Tether USD
 *                               symbol:
 *                                 type: string
 *                                 example: USDT
 *                               marketCap:
 *                                 type: number
 *                                 description: Total market cap across all chains
 *                                 example: 83000000000
 *                               circulation:
 *                                 type: number
 *                                 description: Circulation specifically on this chain
 *                                 example: 40000000000
 *                               price:
 *                                 type: number
 *                                 example: 1.001
 *                               pegStability:
 *                                 type: number
 *                                 example: 99.9
 *                               riskLevel:
 *                                 type: string
 *                                 enum: [low, medium, high]
 *                                 example: low
 *       400:
 *         description: Invalid chain format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /chain/{chain}**
/// Retrieves stablecoins on specific blockchain with chain-focused analytics
/// - **Security**: Chain name sanitization and validation
/// - **Features**: Multi-level chain name matching, circulation totals
/// - **Analytics**: Chain-specific metrics, sorted by circulation
/// - **Response**: Simplified format focused on chain relevance
router.get('/chain/:chain', apiKeyAuth, rateLimitMiddleware, stablecoinController.getStablecoinsByChain);

/**
 * @swagger
 * /api/v1/stablecoins/analytics:
 *   get:
 *     summary: Get stablecoin market analytics
 *     tags: [Stablecoins]
 *     responses:
 *       200:
 *         description: Comprehensive stablecoin market analytics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalMarketCap:
 *                           type: number
 *                         totalStablecoins:
 *                           type: number
 *                         mechanismBreakdown:
 *                           type: object
 *                         chainBreakdown:
 *                           type: object
 *                         stabilityMetrics:
 *                           type: object
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /analytics**
/// Comprehensive stablecoin ecosystem analytics and market intelligence
/// - **Security**: Read-only endpoint, no user input validation needed
/// - **Features**: Market cap breakdown, mechanism analysis, chain distribution
/// - **Analytics**: Stability metrics, risk distribution, growth rates
/// - **Performance**: Cached calculations with intelligent aggregation
router.get('/analytics', apiKeyAuth, rateLimitMiddleware, stablecoinController.getAnalytics);

/**
 * @swagger
 * /api/v1/stablecoins/top:
 *   get:
 *     summary: Get top stablecoins by market cap
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *           maximum: 50
 *         description: Number of top stablecoins to return
 *     responses:
 *       200:
 *         description: Top stablecoins by market capitalization
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StablecoinAsset'
 *       400:
 *         description: Invalid limit parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /top**
/// Top stablecoins ranked by market capitalization
/// - **Security**: Limit validation (1-50), bounds checking
/// - **Features**: Automatic market cap sorting, clean response format
/// - **Performance**: Optimized for ranking, removes chain data
/// - **Use Cases**: Dashboard widgets, market overview displays
router.get('/top', apiKeyAuth, rateLimitMiddleware, stablecoinController.getTopStablecoins);

/**
 * @swagger
 * /api/v1/stablecoins/depegged:
 *   get:
 *     summary: Get depegged stablecoins
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 99
 *           minimum: 0
 *           maximum: 100
 *         description: Stability threshold percentage
 *     responses:
 *       200:
 *         description: List of depegged stablecoins
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StablecoinAsset'
 *       400:
 *         description: Invalid threshold parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /depegged**
/// Risk monitoring endpoint for stablecoins that have lost their peg
/// - **Security**: Threshold validation (0-100%), parameter sanitization
/// - **Features**: Configurable stability threshold, worst-first sorting
/// - **Risk Management**: Optimized for monitoring and alert systems
/// - **Use Cases**: Risk dashboards, depegging alerts, portfolio analysis
router.get('/depegged', apiKeyAuth, rateLimitMiddleware, stablecoinController.getDepeggedStablecoins);

export default router;
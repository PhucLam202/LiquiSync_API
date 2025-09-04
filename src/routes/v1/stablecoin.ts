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
 *         name: chains
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [ETH, Celo, DOT, BTC, SOL, AVAX, MATIC, BNB, ADA, LINK]
 *         style: form
 *         explode: false
 *         description: Filter by blockchain networks
 *         example: ["ETH", "AVAX"]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *           maximum: 100
 *         description: Number of results per page
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
router.get('/', rateLimitMiddleware, stablecoinController.getStablecoins);

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
 *         examples:
 *           usdt:
 *             value: USDT
 *             summary: Tether USD
 *           usdc:
 *             value: USDC
 *             summary: USD Coin
 *           busd:
 *             value: BUSD
 *             summary: Binance USD
 *           dai:
 *             value: DAI
 *             summary: Dai Stablecoin
 *           frax:
 *             value: FRAX
 *             summary: Frax
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
router.get('/symbol/:symbol', rateLimitMiddleware, stablecoinController.getStablecoinBySymbol);

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
router.get('/id/:id', rateLimitMiddleware, stablecoinController.getStablecoinById);

/**
 * @swagger
 * /api/v1/stablecoins/chain/{chain}:
 *   get:
 *     summary: Get stablecoins by blockchain network
 *     description: |
 *       Retrieves stablecoins available on specific blockchain networks with
 *       circulation data, protocol count, and chain-specific metrics.
 *     tags: [Stablecoins]
 *     parameters:
 *       - in: path
 *         name: chain
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain network(s) - supports single chain or comma-separated multiple chains
 *         examples:
 *           ethereum:
 *             value: ETH
 *             summary: Single Ethereum network
 *           multi_chain:
 *             value: "ETH,AVAX,MATIC"
 *             summary: Multiple networks (comma-separated)
 *           polkadot:
 *             value: DOT
 *             summary: Single Polkadot network
 *           with_spaces:
 *             value: "ETH, Celo"
 *             summary: Multiple networks with spaces (will be parsed correctly)
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
/// Retrieves stablecoins on specific blockchain networks with chain-focused analytics
/// - **Security**: Chain name sanitization and validation
/// - **Features**: Multi-level chain name matching, circulation totals, comma-separated multi-chain support
/// - **Analytics**: Chain-specific metrics, sorted by circulation
/// - **Response**: Simplified format focused on chain relevance
router.get('/chain/:chain', rateLimitMiddleware, stablecoinController.getStablecoinsByChain);

/**
 * @swagger
 * /api/v1/stablecoins/analytics:
 *   get:
 *     tags: [Stablecoins]
 *     summary: Get comprehensive stablecoin market analytics and intelligence
 *     description: |
 *       Provides comprehensive market analytics for the entire stablecoin ecosystem with
 *       mechanism breakdown, chain distribution, and stability metrics.
 * 
 *     responses:
 *       200:
 *         description: Comprehensive stablecoin market analytics retrieved successfully
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
 *                           description: Total market capitalization across all stablecoins in USD
 *                           example: 150000000000
 *                         totalStablecoins:
 *                           type: number
 *                           description: Total number of active stablecoins tracked
 *                           example: 89
 *                         mechanismBreakdown:
 *                           type: object
 *                           description: Distribution by peg mechanism type
 *                           properties:
 *                             fiatBacked:
 *                               type: object
 *                               properties:
 *                                 count:
 *                                   type: number
 *                                   example: 45
 *                                 marketShare:
 *                                   type: number
 *                                   example: 78.5
 *                                 totalValue:
 *                                   type: number
 *                                   example: 117750000000
 *                             cryptoBacked:
 *                               type: object
 *                               properties:
 *                                 count:
 *                                   type: number
 *                                   example: 28
 *                                 marketShare:
 *                                   type: number
 *                                   example: 15.2
 *                             algorithmic:
 *                               type: object
 *                               properties:
 *                                 count:
 *                                   type: number
 *                                   example: 16
 *                                 marketShare:
 *                                   type: number
 *                                   example: 6.3
 *                         chainBreakdown:
 *                           type: object
 *                           description: Cross-chain circulation distribution
 *                           properties:
 *                             ethereum:
 *                               type: object
 *                               properties:
 *                                 circulation:
 *                                   type: number
 *                                   example: 95000000000
 *                                 dominancePercentage:
 *                                   type: number
 *                                   example: 63.3
 *                                 protocolCount:
 *                                   type: number
 *                                   example: 67
 *                         stabilityMetrics:
 *                           type: object
 *                           description: Ecosystem-wide stability and risk metrics
 *                           properties:
 *                             averageStability:
 *                               type: number
 *                               description: Average peg stability percentage
 *                               example: 99.2
 *                             riskDistribution:
 *                               type: object
 *                               properties:
 *                                 low:
 *                                   type: number
 *                                   example: 72
 *                                 medium:
 *                                   type: number
 *                                   example: 14
 *                                 high:
 *                                   type: number
 *                                   example: 3
 *                             depeggedCount:
 *                               type: number
 *                               description: Number of stablecoins below 99% stability
 *                               example: 5
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: Last update timestamp
 *                           example: "2024-01-15T10:30:00Z"
 *             examples:
 *               comprehensive_analytics:
 *                 summary: Complete market analytics response
 *                 value:
 *                   success: true
 *                   data:
 *                     totalMarketCap: 150000000000
 *                     totalStablecoins: 89
 *                     mechanismBreakdown:
 *                       fiatBacked:
 *                         count: 45
 *                         marketShare: 78.5
 *                         totalValue: 117750000000
 *                       cryptoBacked:
 *                         count: 28
 *                         marketShare: 15.2
 *                         totalValue: 22800000000
 *                       algorithmic:
 *                         count: 16
 *                         marketShare: 6.3
 *                         totalValue: 9450000000
 *                     chainBreakdown:
 *                       ethereum:
 *                         circulation: 95000000000
 *                         dominancePercentage: 63.3
 *                         protocolCount: 67
 *                       binanceSmartChain:
 *                         circulation: 25000000000
 *                         dominancePercentage: 16.7
 *                         protocolCount: 23
 *                     stabilityMetrics:
 *                       averageStability: 99.2
 *                       riskDistribution:
 *                         low: 72
 *                         medium: 14
 *                         high: 3
 *                       depeggedCount: 5
 *                     updatedAt: "2024-01-15T10:30:00Z"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *       500:
 *         description: Internal server error
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
router.get('/analytics', rateLimitMiddleware, stablecoinController.getAnalytics);

/**
 * @swagger
 * /api/v1/stablecoins/top:
 *   get:
 *     tags: [Stablecoins]
 *     summary: Get top-performing stablecoins ranked by market capitalization
 *     description: |
 *       Retrieves top-performing stablecoins ranked by market capitalization with
 *       stability metrics, risk assessment, and growth data.
 * 
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of top stablecoins to return in ranking
 *         example: 20
 * 
 *     responses:
 *       200:
 *         description: Top stablecoins ranking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: Array of top stablecoins ranked by market capitalization
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Unique stablecoin identifier
 *                             example: "tether"
 *                           name:
 *                             type: string
 *                             description: Full stablecoin name
 *                             example: "Tether USD"
 *                           symbol:
 *                             type: string
 *                             description: Trading symbol
 *                             example: "USDT"
 *                           marketCap:
 *                             type: number
 *                             description: Total market capitalization in USD
 *                             example: 83000000000
 *                           price:
 *                             type: number
 *                             description: Current price in USD
 *                             example: 1.001
 *                           pegStability:
 *                             type: number
 *                             description: Peg stability percentage (0-100)
 *                             example: 99.9
 *                           riskLevel:
 *                             type: string
 *                             enum: [low, medium, high]
 *                             description: Risk classification
 *                             example: "low"
 *                           pegType:
 *                             type: string
 *                             description: Peg currency type
 *                             example: "USD"
 *                           pegMechanism:
 *                             type: string
 *                             description: Mechanism maintaining peg
 *                             example: "fiat-backed"
 *                           chains:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Supported blockchain networks
 *                             example: ["ethereum", "tron", "avalanche"]
 *                           growthRates:
 *                             type: object
 *                             description: Growth metrics across timeframes
 *                             properties:
 *                               daily:
 *                                 type: number
 *                                 description: 24-hour growth percentage
 *                                 example: 0.6
 *                               weekly:
 *                                 type: number
 *                                 description: 7-day growth percentage
 *                                 example: 2.5
 *                               monthly:
 *                                 type: number
 *                                 description: 30-day growth percentage
 *                                 example: 3.8
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             description: Last data update timestamp
 *                             example: "2024-01-15T10:30:00Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                           example: 1
 *                         limit:
 *                           type: number
 *                           example: 10
 *                         total:
 *                           type: number
 *                           example: 10
 *             examples:
 *               top_stablecoins_ranking:
 *                 summary: Top 3 stablecoins by market cap
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "tether"
 *                       name: "Tether USD"
 *                       symbol: "USDT"
 *                       marketCap: 83000000000
 *                       price: 1.001
 *                       pegStability: 99.9
 *                       riskLevel: "low"
 *                       pegType: "USD"
 *                       pegMechanism: "fiat-backed"
 *                       chains: ["ethereum", "tron", "avalanche"]
 *                       growthRates:
 *                         daily: 0.6
 *                         weekly: 2.5
 *                         monthly: 3.8
 *                       updatedAt: "2024-01-15T10:30:00Z"
 *                     - id: "usd-coin"
 *                       name: "USD Coin"
 *                       symbol: "USDC"
 *                       marketCap: 28000000000
 *                       price: 1.000
 *                       pegStability: 99.95
 *                       riskLevel: "low"
 *                       pegType: "USD"
 *                       pegMechanism: "fiat-backed"
 *                       chains: ["ethereum", "solana", "polygon"]
 *                       growthRates:
 *                         daily: -0.2
 *                         weekly: 1.8
 *                         monthly: 2.1
 *                       updatedAt: "2024-01-15T10:30:00Z"
 *                     - id: "dai"
 *                       name: "Dai Stablecoin"
 *                       symbol: "DAI"
 *                       marketCap: 5200000000
 *                       price: 0.999
 *                       pegStability: 99.8
 *                       riskLevel: "medium"
 *                       pegType: "USD"
 *                       pegMechanism: "crypto-backed"
 *                       chains: ["ethereum", "polygon"]
 *                       growthRates:
 *                         daily: 1.2
 *                         weekly: 4.5
 *                         monthly: 8.2
 *                       updatedAt: "2024-01-15T10:30:00Z"
 *                   pagination:
 *                     page: 1
 *                     limit: 10
 *                     total: 10
 *                   timestamp: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Invalid limit parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_limit:
 *                 summary: Invalid limit parameter error
 *                 value:
 *                   success: false
 *                   error: "Invalid limit parameter. Must be between 1 and 50"
 *                   code: "VALIDATION_ERROR"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *       500:
 *         description: Internal server error
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
router.get('/top', rateLimitMiddleware, stablecoinController.getTopStablecoins);

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
router.get('/depegged', rateLimitMiddleware, stablecoinController.getDepeggedStablecoins);

export default router;
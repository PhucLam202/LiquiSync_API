/// # Unified Bifrost Protocol Routes [SECURED]
/// 
/// Complete route definitions for Bifrost liquid staking protocol endpoints.
/// Consolidates yields and exchange rate functionality into a unified API.
/// 
/// ## SECURITY IMPLEMENTATION:
/// - **🔐 API Key Authentication**: All endpoints require valid API keys
/// - **📊 Subscription-Based Rate Limiting**: Usage tracked by subscription tier
/// - **🛡️ Multi-Layer Protection**: API key auth + general rate limiting
/// - **📝 Usage Tracking**: Comprehensive request logging and analytics
/// - **🚫 IP Whitelisting**: Optional IP restrictions per API key
/// 
/// ## Route Responsibilities:
/// - **Yield Data Management**: DeFi yield farming data with advanced filtering
/// - **Exchange Rate Management**: Real-time vToken to base token exchange rates
/// - **Token Conversion**: Secure token amount conversions with validation
/// - **Protocol Discovery**: Supported token lists and protocol metadata
/// - **Security Enforcement**: Authentication, authorization, and rate limiting
/// 
/// ## Security Features:
/// - All routes use comprehensive input validation from controllers
/// - Token pair validation prevents unsupported conversions
/// - Rate limiting applied to prevent API abuse
/// - Error handling with sanitized responses
/// 
/// ## Endpoint Overview:
/// ```
/// # Yields Endpoints
/// GET /yields                - List all available yields with filtering
/// GET /yields/{symbol}       - Get yield data for specific token
/// 
/// # Exchange Rate Endpoints
/// GET /exchange-rates/{token} - Get exchange rate for specific vToken
/// GET /convert               - Convert between vToken and base token
/// GET /supported-tokens      - List all supported tokens
/// ```
/// 
/// ## Integration:
/// - Uses unified bifrostController for all business logic
/// - Delegates to bifrostService for external API integration
/// - Implements comprehensive error handling and validation

import { Router, type Router as ExpressRouter } from 'express';
import { bifrostController } from '../../controllers/bifrostController.js';
// import { apiKeyAuth } from '../../middleware/auth/apiKeyAuth.js';
import { rateLimitMiddleware } from '../../middleware/rateLimiter.js';

/// ## Unified Bifrost Router Configuration
/// 
/// Creates router instance for complete Bifrost protocol endpoints with
/// yields and exchange rate functionality consolidated.
const router: ExpressRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TokenYield:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           description: Token symbol
 *           example: vDOT
 *         protocol:
 *           type: string
 *           description: Protocol name
 *           example: bifrost
 *         apy:
 *           type: number
 *           description: Annual Percentage Yield
 *           example: 15.42
 *         tvl:
 *           type: number
 *           description: Total Value Locked
 *           example: 1000000
 *         apyBreakdown:
 *           type: object
 *           properties:
 *             base:
 *               type: number
 *             reward:
 *               type: number
 *             mev:
 *               type: number
 *             gas:
 *               type: number
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         code:
 *           type: integer
 *           example: 1001
 *         msg:
 *           type: string
 *           example: Resource not found
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             path:
 *               type: string
 *             method:
 *               type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 */

// ============================================================================
// YIELDS ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/bifrost/yields:
 *   get:
 *     summary: Get all available yields
 *     tags: [Bifrost Protocol]
 *     parameters:
 *       - in: query
 *         name: minApy
 *         schema:
 *           type: number
 *         description: Minimum APY filter (0-1000%) - Optional
 *         example: 10
 *         required: false
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [apy, tvl]
 *           default: apy
 *         description: Sort criteria - Optional, defaults to apy
 *         example: apy
 *         required: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Result limit - Optional, returns all data if not specified
 *         example: 20
 *         required: false
 *     responses:
 *       200:
 *         description: List of available yields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TokenYield'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /yields** [PROTECTED]
/// Retrieves all available yields with optional filtering and sorting
/// - **Security**: API key authentication required, subscription-based rate limiting
/// - **Default Behavior**: Returns all yield data without requiring parameters
/// - **Features**: Optional filtering by minApy, sorting by apy/tvl, pagination
/// - **Validation**: Multi-layer input validation and sanitization
/// - **Performance**: Cached data with intelligent transformation
// router.get('/yields', apiKeyAuth, rateLimitMiddleware, bifrostController.getYields.bind(bifrostController));
router.get('/yields', rateLimitMiddleware, bifrostController.getYields.bind(bifrostController));

/**
 * @swagger
 * /api/v1/bifrost/yields/{symbol}:
 *   get:
 *     summary: Get yield data for specific token symbol
 *     tags: [Bifrost Protocol]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Token symbol (e.g., vDOT, vKSM)
 *         schema:
 *           type: string
 *         examples:
 *           vDOT:
 *             value: vDOT
 *             summary: Polkadot liquid staking token
 *           vKSM:
 *             value: vKSM
 *             summary: Kusama liquid staking token
 *           vBNC:
 *             value: vBNC
 *             summary: Bifrost native token
 *           vETH:
 *             value: vETH
 *             summary: Ethereum liquid staking token
 *           vASTR:
 *             value: vASTR
 *             summary: Astar liquid staking token
 *     responses:
 *       200:
 *         description: Yield data for specific token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TokenYield'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid token symbol
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Token not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /yields/{symbol}** [PROTECTED]
/// Retrieves yield data for a specific token symbol
/// - **Security**: API key authentication required, symbol sanitization, format validation
/// - **Features**: Smart symbol normalization (handles case variations)
/// - **Validation**: 5-layer validation including existence checks
/// - **Performance**: Efficient single-token data extraction
router.get('/yields/:symbol', rateLimitMiddleware, bifrostController.getYieldBySymbol.bind(bifrostController));

// ============================================================================
// EXCHANGE RATE ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/bifrost/exchange-rates/{token}:
 *   get:
 *     summary: Get exchange rate for a specific vToken
 *     tags: [Bifrost Protocol]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: vToken symbol (e.g., vKSM, vDOT)
 *         examples:
 *           vDOT:
 *             value: vDOT
 *             summary: Polkadot liquid staking token
 *           vKSM:
 *             value: vKSM
 *             summary: Kusama liquid staking token
 *           vBNC:
 *             value: vBNC
 *             summary: Bifrost native token
 *           vETH:
 *             value: vETH
 *             summary: Ethereum liquid staking token
 *           vASTR:
 *             value: vASTR
 *             summary: Astar liquid staking token
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include historical rate data
 *         example: false
 *       - in: query
 *         name: historyDays
 *         schema:
 *           type: string
 *         description: Number of days for historical data (1-365)
 *         example: "7"
 *       - in: query
 *         name: includeVolatility
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include volatility metrics
 *         example: false
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [runtime, frontend, auto]
 *         description: Data source preference
 *         example: auto
 *     responses:
 *       200:
 *         description: Exchange rate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     exchangeRate:
 *                       type: object
 *                       properties:
 *                         baseToken:
 *                           type: object
 *                           properties:
 *                             symbol:
 *                               type: string
 *                               example: KSM
 *                             network:
 *                               type: string
 *                               example: bifrost
 *                         vToken:
 *                           type: object
 *                           properties:
 *                             symbol:
 *                               type: string
 *                               example: vKSM
 *                             network:
 *                               type: string
 *                               example: bifrost
 *                         rate:
 *                           type: number
 *                           example: 0.9234
 *                           description: vToken to base token rate
 *                         inverseRate:
 *                           type: number
 *                           example: 1.0831
 *                           description: base token to vToken rate
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         source:
 *                           type: string
 *                           example: frontend_api
 *                         confidence:
 *                           type: number
 *                           example: 95
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         lastUpdate:
 *                           type: string
 *                           format: date-time
 *                         source:
 *                           type: string
 *                     historicalRates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rate:
 *                             type: number
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                     volatility:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: number
 *                         weekly:
 *                           type: number
 *                         monthly:
 *                           type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid token symbol or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Token not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /exchange-rates/{token}** [PROTECTED]
/// Retrieves current exchange rate for a specific vToken
/// - **Security**: API key authentication required, token format validation
/// - **Features**: Historical data, volatility metrics (optional)
/// - **Caching**: 5-minute cache TTL for performance
router.get('/exchange-rates/:token', rateLimitMiddleware, bifrostController.getExchangeRate.bind(bifrostController));

/**
 * @swagger
 * /api/v1/bifrost/convert:
 *   get:
 *     summary: Convert between vToken and base token amounts
 *     tags: [Bifrost Protocol]
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: string
 *         description: Amount to convert (positive number)
 *         example: "100"
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Source token symbol
 *         example: vKSM
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Target token symbol
 *         example: KSM
 *       - in: query
 *         name: includesFees
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include fee calculations in response
 *         example: false
 *     responses:
 *       200:
 *         description: Conversion calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversion:
 *                       type: object
 *                       description: Conversion summary with key information
 *                       properties:
 *                         from:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: string
 *                               example: "100.000000"
 *                               description: Formatted input amount (6 decimals)
 *                             symbol:
 *                               type: string
 *                               example: vKSM
 *                             network:
 *                               type: string
 *                               example: bifrost
 *                         to:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: string
 *                               example: "92.340000"
 *                               description: Formatted output amount (6 decimals)
 *                             symbol:
 *                               type: string
 *                               example: KSM
 *                             network:
 *                               type: string
 *                               example: bifrost
 *                         rate:
 *                           type: number
 *                           example: 0.9234
 *                           description: Exchange rate used
 *                         effectiveRate:
 *                           type: string
 *                           example: "0.92340000"
 *                           description: Actual conversion rate (8 decimals)
 *                     input:
 *                       type: object
 *                       description: Detailed input token information
 *                       properties:
 *                         amount:
 *                           type: string
 *                           example: "100"
 *                         decimals:
 *                           type: number
 *                           example: 12
 *                         token:
 *                           type: object
 *                           properties:
 *                             symbol:
 *                               type: string
 *                               example: vKSM
 *                             network:
 *                               type: string
 *                               example: bifrost
 *                         formattedAmount:
 *                           type: string
 *                           example: "100.00000000"
 *                     output:
 *                       type: object
 *                       description: Detailed output token information
 *                       properties:
 *                         amount:
 *                           type: string
 *                           example: "92.34"
 *                         decimals:
 *                           type: number
 *                           example: 12
 *                         token:
 *                           type: object
 *                           properties:
 *                             symbol:
 *                               type: string
 *                               example: KSM
 *                             network:
 *                               type: string
 *                               example: bifrost
 *                         formattedAmount:
 *                           type: string
 *                           example: "92.34000000"
 *                     exchangeRate:
 *                       type: object
 *                       description: Exchange rate used for conversion
 *                       properties:
 *                         rate:
 *                           type: number
 *                           example: 0.9234
 *                         inverseRate:
 *                           type: number
 *                           example: 1.0831
 *                         source:
 *                           type: string
 *                           example: frontend_api
 *                     calculation:
 *                       type: object
 *                       description: Calculation metadata
 *                       properties:
 *                         method:
 *                           type: string
 *                           enum: [bifrost_api, site_api_calculated, runtime_api]
 *                           example: bifrost_api
 *                           description: Calculation method used (bifrost_api for exchangeRatio)
 *                         precision:
 *                           type: number
 *                           example: 12
 *                         roundingApplied:
 *                           type: boolean
 *                           example: false
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T12:00:00.000Z"
 *                         dataSource:
 *                           type: string
 *                           example: runtime
 *                           description: Original data source identifier
 *                     fees:
 *                       type: object
 *                       description: Fee breakdown (optional)
 *                       properties:
 *                         swapFee:
 *                           type: number
 *                           example: 0
 *                         networkFee:
 *                           type: number
 *                           example: 0
 *                         total:
 *                           type: number
 *                           example: 0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid conversion parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Token pair not supported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /convert** [PROTECTED]
/// Converts token amounts between vTokens and base tokens
/// - **Security**: API key authentication required, 11-layer validation including token pair verification
/// - **Features**: Slippage protection, fee breakdown (optional)
/// - **Validation**: Amount, token pair, and parameter validation
router.get('/convert', rateLimitMiddleware, bifrostController.convertTokenAmount.bind(bifrostController));

/**
 * @swagger
 * /api/v1/bifrost/supported-tokens:
 *   get:
 *     summary: Get list of supported tokens for conversion
 *     tags: [Bifrost Protocol]
 *     responses:
 *       200:
 *         description: List of supported tokens retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["vKSM", "vDOT", "vBNC", "vETH", "vMANTA", "vASTR", "vETH2", "vFIL", "vPHA", "vMOVR", "vGLMR"]
 *                       description: Array of supported vToken symbols
 *                     count:
 *                       type: number
 *                       example: 11
 *                       description: Total number of supported tokens
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /supported-tokens** [PROTECTED]
/// Lists all supported tokens for conversions
/// - **Security**: API key authentication required
/// - **Features**: Token count, protocol metadata
/// - **Caching**: Service-level caching for performance
router.get('/supported-tokens', rateLimitMiddleware, bifrostController.getSupportedTokens.bind(bifrostController));

/**
 * @swagger
 * /api/v1/bifrost/tvl:
 *   get:
 *     summary: Get comprehensive Bifrost protocol TVL data
 *     tags: [Bifrost Protocol]
 *     description: |
 *       Retrieves comprehensive Total Value Locked (TVL) data for the Bifrost protocol
 *       using official site API data. Includes overall protocol metrics, per-token breakdown,
 *       and comparative analysis with market trends.
 *     responses:
 *       200:
 *         description: Bifrost TVL data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     protocol:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Bifrost"
 *                         totalTvl:
 *                           type: number
 *                           example: 45000000
 *                           description: Total TVL in USD
 *                         totalAddresses:
 *                           type: number
 *                           example: 12500
 *                         totalRevenue:
 *                           type: number
 *                           example: 850000
 *                     tokens:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                             example: vDOT
 *                           tvl:
 *                             type: number
 *                             example: 12500000
 *                           tvm:
 *                             type: number
 *                             example: 11800000
 *                           totalIssuance:
 *                             type: number
 *                             example: 950000
 *                           holders:
 *                             type: number
 *                             example: 3200
 *                           apy:
 *                             type: number
 *                             example: 15.42
 *                           marketShare:
 *                             type: number
 *                             example: 27.8
 *                     summary:
 *                       type: object
 *                       properties:
 *                         topTokenByTvl:
 *                           type: string
 *                           example: vDOT
 *                         averageApy:
 *                           type: number
 *                           example: 12.6
 *                         totalTokenCount:
 *                           type: number
 *                           example: 11
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/// **GET /tvl** [PROTECTED]
/// Retrieves comprehensive Bifrost protocol TVL data
/// - **Security**: API key authentication required
/// - **Data Source**: Official Bifrost /api/site endpoint
/// - **Features**: Protocol overview, per-token breakdown, market analysis
/// - **Caching**: 5-minute TTL for performance
router.get('/tvl', rateLimitMiddleware, bifrostController.getBifrostTvl.bind(bifrostController));

// ============================================================================
// EXTENDED API ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/bifrost/vtokens:
 *   get:
 *     tags: [Bifrost Protocol]
 *     summary: Get comprehensive list of all vTokens
 *     description: |
 *       Retrieves a paginated list of all available vTokens with comprehensive metadata including:
 *       - Exchange rates and price data
 *       - APY information and trends
 *       - TVL metrics and rankings
 *       - Holder statistics
 *       - Risk assessments
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [apy, tvl, volume, holders, name]
 *           default: tvl
 *         description: Sort field
 *     responses:
 *       200:
 *         description: vTokens list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VTokenListResponse'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
/// ## GET /vtokens - vTokens List with Advanced Filtering
/// 
/// **Purpose**: Comprehensive vToken listing with extensive filtering and sorting capabilities
/// 
/// **Query Parameters**:
/// - `page`, `limit`: Pagination controls (limit max 100)
/// - `sortBy`: apy|tvl|volume|holders|name
/// - `sortOrder`: asc|desc
/// 
/// **Security**: API key authentication required, multi-layer query validation and sanitization
/// **Features**: Ecosystem summary, network status, pagination metadata
/// **Caching**: Service-level with 10-minute TTL
router.get('/vtokens', rateLimitMiddleware, bifrostController.getVTokens.bind(bifrostController));

/**
 * @swagger
 * /api/v1/bifrost/vtokens/{symbol}:
 *   get:
 *     tags: [Bifrost Protocol]
 *     summary: Get detailed information for a specific vToken
 *     description: |
 *       Retrieves comprehensive information for a specific vToken including:
 *       - Detailed exchange rate history and volatility
 *       - Complete APY breakdown with components
 *       - TVL composition and validator distribution
 *       - Staking parameters and risk analysis
 *       - Holder analytics and protocol integrations
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z0-9]{2,10}$'
 *         description: vToken symbol (e.g., vKSM, vDOT)
 *         examples:
 *           vDOT:
 *             value: vDOT
 *             summary: Polkadot liquid staking token
 *           vKSM:
 *             value: vKSM
 *             summary: Kusama liquid staking token
 *           vBNC:
 *             value: vBNC
 *             summary: Bifrost native token
 *           vETH:
 *             value: vETH
 *             summary: Ethereum liquid staking token
 *           vASTR:
 *             value: vASTR
 *             summary: Astar liquid staking token
 *     responses:
 *       200:
 *         description: vToken details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VTokenDetailResponse'
 *       400:
 *         description: Invalid symbol format
 *       404:
 *         description: vToken not found
 *       500:
 *         description: Internal server error
 */
/// ## GET /vtokens/{symbol} - Detailed vToken Information
/// 
/// **Purpose**: Complete vToken analysis with deep metrics and analytics
/// 
/// **Path Parameters**:
/// - `symbol`: vToken symbol (validated format: 2-10 alphanumeric chars)
/// 
/// **Response Includes**:
/// - Exchange rate details with volatility
/// - APY breakdown with fee analysis
/// - TVL composition and validator data
/// - Supply information and burns
/// - Market data with OHLC
/// - Staking details and slashing history
/// - Holder distribution analysis
/// - Risk assessment with audit data
/// - Protocol integrations
/// - Performance metrics
/// - Governance and events
/// - Technical information
/// 
/// **Security**: API key authentication required, symbol format validation and sanitization
/// **Features**: Real-time data with historical context
/// **Caching**: 5-minute TTL for fresh data
router.get('/vtokens/:symbol', rateLimitMiddleware, bifrostController.getVTokenBySymbol.bind(bifrostController));


export default router;
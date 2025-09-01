/**
 * Market Intelligence API Routes [SECURED]
 * 
 * RESTful API routes for DeFi market intelligence endpoints with comprehensive
 * documentation, validation, authentication, and error handling.
 * 
 * SECURITY: All endpoints require API key authentication and rate limiting.
 */

import { Router } from 'express';
import { 
  createMarketIntelligenceController
} from '../../controllers/marketIntelligenceController.js';
import { marketIntelligenceService } from '../../services/marketIntelligenceService.js';
import { ValidationHelper } from '../../utils/validationHelper.js';
import { createCacheManager } from '../../utils/intelligentCacheManager.js';
import { logger } from '../../utils/logger.js';
import { apiKeyAuth } from '../../middleware/auth/apiKeyAuth.js';
import { rateLimitMiddleware } from '../../middleware/rateLimiter.js';

const router:Router = Router();

// Initialize dependencies
const cacheManager = createCacheManager();
const validationHelper = ValidationHelper;

// Create controller instance
const controller = createMarketIntelligenceController(
  marketIntelligenceService,
  validationHelper,
  cacheManager
);

/**
 * @swagger
 * components:
 *   schemas:
 *     IntelligentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *         data:
 *           type: object
 *           description: The main response data
 *         intelligence:
 *           type: object
 *           properties:
 *             insights:
 *               type: array
 *               items:
 *                 type: string
 *               description: Key market insights
 *             recommendations:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recommendation'
 *               description: Actionable recommendations
 *             context:
 *               $ref: '#/components/schemas/MarketContext'
 *         benchmarks:
 *           $ref: '#/components/schemas/BenchmarkData'
 *         metadata:
 *           $ref: '#/components/schemas/ResponseMetadata'
 * 
 *     Recommendation:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [opportunity, warning, strategy, timing]
 *         description:
 *           type: string
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         category:
 *           type: string
 *         timeframe:
 *           type: string
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 * 
 *     MarketContext:
 *       type: object
 *       properties:
 *         marketPhase:
 *           type: string
 *         volatility:
 *           type: string
 *         innovationAreas:
 *           type: array
 *           items:
 *             type: string
 * 
 *     BenchmarkData:
 *       type: object
 *       properties:
 *         sectorAverage:
 *           type: object
 *           properties:
 *             tvl:
 *               type: number
 *             growth7d:
 *               type: number
 *             protocolsPerChain:
 *               type: number
 *         chainComparison:
 *           type: array
 *           items:
 *             type: object
 *         historicalContext:
 *           type: object
 * 
 *     ResponseMetadata:
 *       type: object
 *       properties:
 *         requestId:
 *           type: string
 *         responseTime:
 *           type: number
 *         dataSource:
 *           type: string
 *         calculatedAt:
 *           type: string
 *           format: date-time
 *         dataFreshness:
 *           type: number
 *         methodology:
 *           type: string
 *         coverage:
 *           type: number
 */

/**
 * @swagger
 * /api/v1/defi/tvl/overview:
 *   get:
 *     tags:
 *       - TVL
 *     summary: Get comprehensive market overview
 *     description: |
 *       Provides a dashboard-ready market snapshot with total TVL, top protocols,
 *       growth metrics, and intelligent insights. Perfect for market dashboards
 *       and overview screens.
 * 
 *       **Features:**
 *       - Pre-calculated market insights and trends
 *       - Top protocols with dominance analysis
 *       - Growth rates and momentum indicators
 *       - Competitive benchmarking data
 *       - Intelligent recommendations
 * 
 *     parameters:
 *       - in: query
 *         name: detail
 *         schema:
 *           type: string
 *           enum: [minimal, basic, full]
 *           default: basic
 *         description: Response detail level
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 7d
 *         description: Analysis timeframe for growth calculations
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of DeFi categories to filter
 *         example: "dex,lending,liquid-staking"
 *       - in: query
 *         name: chains
 *         schema:
 *           type: string
 *         description: Comma-separated list of blockchain networks to filter
 *         example: "ethereum,arbitrum,optimism"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of top protocols to include
 * 
 *     responses:
 *       200:
 *         description: Market overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/IntelligentResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalTvl:
 *                           type: number
 *                           description: Total Value Locked across all protocols
 *                         totalProtocols:
 *                           type: integer
 *                           description: Total number of protocols
 *                         dominantChain:
 *                           type: string
 *                           description: Chain with highest TVL
 *                         topProtocols:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               tvl:
 *                                 type: number
 *                               marketShare:
 *                                 type: number
 *                               rank:
 *                                 type: integer
 *                               growth7d:
 *                                 type: number
 *                               growth_1d:
 *                                 type: number
 *                               chains:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               chainTvls:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     chain:
 *                                       type: string
 *                                     tvl:
 *                                       type: number
 *                                     percentage:
 *                                       type: number
 *                               dominanceReason:
 *                                 type: string
 *                         trends:
 *                           type: object
 *                           properties:
 *                             tvlGrowth7d:
 *                               type: number
 *                             protocolsAdded7d:
 *                               type: integer
 *                             dominanceShift:
 *                               type: string
 *             examples:
 *               success:
 *                 summary: Successful market overview response
 *                 value:
 *                   success: true
 *                   data:
 *                     totalTvl: 240500000000
 *                     totalProtocols: 1057
 *                     dominantChain: "ethereum"
 *                     topProtocols:
 *                       - id: "lido"
 *                         name: "Lido"
 *                         tvl: 32500000000
 *                         marketShare: 13.5
 *                         rank: 1
 *                         growth7d: 2.8
 *                         dominanceReason: "liquid_staking_leader"
 *                     trends:
 *                       tvlGrowth7d: 5.2
 *                       protocolsAdded7d: 8
 *                       dominanceShift: "ethereum_to_l2_migration"
 *                   intelligence:
 *                     insights:
 *                       - "market_experiencing_strong_growth"
 *                       - "ethereum_dominance_stable"
 *                     recommendations:
 *                       - type: "opportunity"
 *                         description: "Strong market growth presents expansion opportunities"
 *                         confidence: 0.85
 *                     context:
 *                       marketPhase: "growth"
 *                       volatility: "moderate"
 *                       innovationAreas: ["real_world_assets", "cross_chain_protocols"]
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/overview', apiKeyAuth, rateLimitMiddleware, controller.getMarketOverview);

/**
 * @swagger
 * /api/v1/defi/tvl/dominance:
 *   get:
 *     tags:
 *       - TVL
 *     summary: Get market dominance analysis
 *     description: |
 *       Provides comprehensive market dominance analysis with protocol, chain,
 *       and category breakdowns. Includes concentration metrics and diversity
 *       scores for risk assessment.
 * 
 *       **Features:**
 *       - Protocol dominance percentages
 *       - Chain distribution analysis
 *       - Category dominance breakdown
 *       - Concentration risk metrics (HHI, Shannon Index)
 *       - Competitive health assessment
 * 
 *     parameters:
 *       - in: query
 *         name: detail
 *         schema:
 *           type: string
 *           enum: [minimal, basic, full]
 *           default: basic
 *         description: Response detail level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of entries per dominance section
 * 
 *     responses:
 *       200:
 *         description: Market dominance analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/IntelligentResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         protocolDominance:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               tvl:
 *                                 type: number
 *                               dominancePercentage:
 *                                 type: number
 *                               category:
 *                                 type: string
 *                               chain:
 *                                 type: string
 *                               chains:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                         chainDominance:
 *                           type: array
 *                           items:
 *                             type: object
 *                         categoryDominance:
 *                           type: array
 *                           items:
 *                             type: object
 *                         concentrationIndex:
 *                           type: number
 *                           description: Top 5 protocols concentration percentage
 *                         diversity:
 *                           type: object
 *                           properties:
 *                             herfindahlIndex:
 *                               type: number
 *                               description: Market concentration index
 *                             shannonIndex:
 *                               type: number
 *                               description: Market diversity index
 */
router.get('/dominance', apiKeyAuth, rateLimitMiddleware, controller.getMarketDominance);

/**
 * @swagger
 * /api/v1/defi/tvl/trending:
 *   get:
 *     tags:
 *       - TVL
 *     summary: Get trending protocols analysis
 *     description: |
 *       Provides growth-based trending analysis with momentum scoring across
 *       multiple timeframes. Identifies emerging protocols and acceleration
 *       patterns.
 * 
 *       **Features:**
 *       - Multi-timeframe trending analysis (24h, 7d, 30d)
 *       - Momentum-based scoring algorithm
 *       - Emerging protocol identification
 *       - Acceleration/deceleration tracking
 *       - Sustainability scoring
 * 
 *     parameters:
 *       - in: query
 *         name: timeframes
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [24h, 7d, 30d]
 *           default: ["7d"]
 *         style: form
 *         explode: false
 *         description: Array of timeframes for analysis
 *       - in: query
 *         name: minTvl
 *         schema:
 *           type: number
 *           minimum: 0
 *           default: 1000000
 *         description: Minimum TVL threshold for inclusion
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories to filter
 *       - in: query
 *         name: chains
 *         schema:
 *           type: string
 *         description: Comma-separated list of chains to filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 20
 *         description: Number of trending protocols per timeframe
 * 
 *     responses:
 *       200:
 *         description: Trending protocols analysis retrieved successfully
 */
router.get('/trending', apiKeyAuth, rateLimitMiddleware, controller.getTrendingProtocols);

/**
 * @swagger
 * /api/v1/defi/tvl/movers:
 *   get:
 *     tags:
 *       - TVL
 *     summary: Get market movers analysis
 *     description: |
 *       Provides comprehensive analysis of biggest gainers and losers with
 *       movement reasons and volatility assessment.
 * 
 *       **Features:**
 *       - TVL and price movement analysis
 *       - Automated reason identification
 *       - Volatility classification
 *       - Correlation analysis between TVL and price
 *       - Risk level assessment
 * 
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *         description: Analysis timeframe
 *       - in: query
 *         name: detail
 *         schema:
 *           type: string
 *           enum: [minimal, basic, full]
 *           default: basic
 *         description: Response detail level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 25
 *           default: 10
 *         description: Number of movers per category (gainers/losers)
 * 
 *     responses:
 *       200:
 *         description: Market movers analysis retrieved successfully
 */
router.get('/movers', apiKeyAuth, rateLimitMiddleware, controller.getMarketMovers);

/**
 * @swagger
 * /api/v1/defi/tvl/chainTVL:
 *   get:
 *     tags:
 *       - TVL
 *     summary: Get overview of all blockchain ecosystems
 *     description: |
 *       Retrieves lightweight overview of all supported blockchain ecosystems with
 *       TVL, protocol count, and market dominance metrics.
 * 
 *     parameters:
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [tvl, name, protocolCount, dominance]
 *           default: tvl
 *         description: Sort chains by specified metric
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of chains to return
 * 
 *     responses:
 *       200:
 *         description: Chains overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     chains:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           tvl:
 *                             type: number
 *                           protocolCount:
 *                             type: integer
 *                           dominancePercentage:
 *                             type: number
 *                           growth_7d:
 *                             type: number
 *                           nativeToken:
 *                             type: string
 *                     totalTvl:
 *                       type: number
 *                     totalChains:
 *                       type: integer
 *                     marketDistribution:
 *                       type: object
 *                       properties:
 *                         topChainDominance:
 *                           type: number
 *                         top3ChainsDominance:
 *                           type: number
 *                         diversityIndex:
 *                           type: number
 *             examples:
 *               chains_overview:
 *                 summary: Chains overview response
 *                 value:
 *                   success: true
 *                   data:
 *                     chains:
 *                       - name: "ethereum"
 *                         displayName: "Ethereum"
 *                         tvl: 50000000000
 *                         protocolCount: 284
 *                         dominancePercentage: 65.2
 *                         growth_7d: 2.4
 *                         nativeToken: "ETH"
 *                       - name: "solana"
 *                         displayName: "Solana"
 *                         tvl: 5200000000
 *                         protocolCount: 67
 *                         dominancePercentage: 6.8
 *                         growth_7d: 8.2
 *                         nativeToken: "SOL"
 *                     totalTvl: 76800000000
 *                     totalChains: 15
 *                     marketDistribution:
 *                       topChainDominance: 65.2
 *                       top3ChainsDominance: 78.9
 *                       diversityIndex: 0.42
 */
router.get('/chains/overview', apiKeyAuth, rateLimitMiddleware, controller.getChainsOverview);

/**
 * @swagger
 * /api/v1/defi/tvl/chains/{chain}/ecosystem:
 *   get:
 *     tags:
 *       - TVL
 *     summary: Get DeFi ecosystem data for specific blockchain
 *     description: |
 *       Retrieves comprehensive DeFi protocol data for a specific blockchain ecosystem.
 *       Includes protocol rankings, chain-specific metrics, and comparative analysis.
 * 
 *       **Supported Chains**: ethereum, solana, binance-smart-chain, polygon, avalanche, 
 *                            arbitrum, optimism, fantom, cronos, aurora
 * 
 *       **Chain Aliases**: eth (ethereum), sol (solana), bsc (binance-smart-chain), 
 *                        poly (polygon), avax (avalanche)
 * 
 *     parameters:
 *       - name: chain
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             [
 *               ethereum,
 *               solana,
 *               binance-smart-chain,
 *               polygon,
 *               avalanche,
 *               arbitrum,
 *             ]
 *         example: ethereum
 *         description: Blockchain identifier or alias
 * 
 *       - name: detail
 *         in: query
 *         schema:
 *           type: string
 *           enum: [minimal, basic, full]
 *           default: basic
 *         description: Response detail level
 * 
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of protocols to return
 * 
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [tvl, growth, marketShare, name]
 *           default: tvl
 *         description: Sort order for protocols
 * 
 *     responses:
 *       200:
 *         description: Chain ecosystem data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/IntelligentResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         chainInfo:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             displayName:
 *                               type: string
 *                             totalTvl:
 *                               type: number
 *                             protocolCount:
 *                               type: integer
 *                             dominancePercentage:
 *                               type: number
 *                             nativeToken:
 *                               type: string
 *                             explorer:
 *                               type: string
 *                             growth7d:
 *                               type: number
 *                         protocols:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               tvl:
 *                                 type: number
 *                               chainSpecificTvl:
 *                                 type: number
 *                               chainSpecificRank:
 *                                 type: integer
 *                               chainDominancePercentage:
 *                                 type: number
 *                               category:
 *                                 type: string
 *                         chainMetrics:
 *                           type: object
 *                           properties:
 *                             averageTvlPerProtocol:
 *                               type: number
 *                             topCategory:
 *                               type: string
 *                             diversityScore:
 *                               type: number
 *                             concentrationIndex:
 *                               type: number
 *             examples:
 *               ethereum_basic:
 *                 summary: Ethereum ecosystem (basic detail)
 *                 value:
 *                   success: true
 *                   data:
 *                     chainInfo:
 *                       name: "ethereum"
 *                       displayName: "Ethereum"
 *                       totalTvl: 50000000000
 *                       protocolCount: 284
 *                       dominancePercentage: 65.2
 *                       nativeToken: "ETH"
 *                       growth7d: 2.4
 *                     protocols: [...]
 *                     chainMetrics:
 *                       averageTvlPerProtocol: 176056338
 *                       topCategory: "Lending"
 *                       diversityScore: 0.72
 *                       concentrationIndex: 0.45
 * 
 *       400:
 *         description: Invalid chain name or parameters
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Unsupported chain: bitcoin. Supported: ethereum, solana, binance-smart-chain, polygon, avalanche, arbitrum, optimism, fantom, cronos, aurora"
 * 
 *       404:
 *         description: Chain not found
 * 
 *       500:
 *         description: Internal server error
 */
router.get('/chains/:chain/ecosystem', apiKeyAuth, rateLimitMiddleware, controller.getChainEcosystem);

// Add request logging middleware
router.use((req, _res, next) => {
  logger.info('Market Intelligence API request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Add response time tracking
router.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Market Intelligence API response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
  });
  
  next();
});

// Error handling middleware specific to market intelligence routes
router.use((error: any, req: any, res: any, _next: any) => {
  logger.error('Market Intelligence API error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    query: req.query
  });
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

export default router;
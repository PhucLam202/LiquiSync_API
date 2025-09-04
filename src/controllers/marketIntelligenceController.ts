import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { 
  IntelligentResponse,
  MarketOverviewData,
  MarketDominanceData, 
  TrendingProtocolsData,
  MarketMoversData,
  ChainEcosystemData,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { MarketIntelligenceService } from '../services/marketIntelligenceService.js';
import { ValidationHelper } from '../utils/validationHelper.js';
import { IntelligentCacheManager } from '../utils/intelligentCacheManager.js';
/**
 * Market Intelligence Controller Class
 * 
 * Handles HTTP requests for market intelligence endpoints with comprehensive
 * validation, security, and performance optimization.
 */
export class MarketIntelligenceController {
  
  private marketService: MarketIntelligenceService;
  private validationHelper: ValidationHelper;
  private cacheHelper: IntelligentCacheManager;

  constructor(
    marketService: MarketIntelligenceService,
    validationHelper: ValidationHelper,
    cacheHelper: IntelligentCacheManager
  ) {
    this.marketService = marketService;
    this.validationHelper = validationHelper;
    this.cacheHelper = cacheHelper;
  }

  /**
   * GET /v1/defi/market/overview
   * Dashboard-ready market snapshot with total TVL, top protocols, growth metrics
   * 
   * Query Parameters:
   * - detail: minimal|basic|full (default: basic)
   * - timeframe: 24h|7d|30d (default: 7d)
   * - categories: comma-separated list of DeFi categories
   * - chains: comma-separated list of blockchain networks
   * - limit: number of top protocols to include (max 50)
   */
  async getMarketOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      const startTime = performance.now();
      
      logger.info('Processing market overview request', { 
        requestId, 
        query: req.query,
        ip: req.ip 
      });

      // Validation Layer
      const validatedQuery = await ValidationHelper.validateMarketOverviewQuery(req.query);
      
      // Check cache first
      const cacheKey = this.cacheHelper.generateCacheKey('market_overview', validatedQuery);
      let data = await this.cacheHelper.get<any>(cacheKey);
      
      if (!data) {
        // Fetch and process data
        data = await this.marketService.getMarketOverview(validatedQuery);
        await this.cacheHelper.set(cacheKey, data, 300); // 5 minute TTL
      }
      
      const responseTime = Math.round(performance.now() - startTime);
      
      const response: IntelligentResponse<MarketOverviewData> = {
        success: true,
        data: data.overview,
        intelligence: data.intelligence,
        benchmarks: data.benchmarks,
        metadata: {
          requestId,
          responseTime,
          dataSource: 'defillama',
          calculatedAt: new Date().toISOString(),
          dataFreshness: data.metadata.dataAge,
          methodology: 'tvl_weighted_analysis',
          coverage: data.metadata.coverage
        }
      };
      
      logger.info('Market overview request completed', { 
        requestId, 
        responseTime,
        cacheHit: !!data.fromCache
      });
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in getMarketOverview', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  }

  /**
   * GET /v1/defi/market/dominance
   * Market share distribution with protocol/chain/category dominance percentages
   * 
   * Query Parameters:
   * - detail: minimal|basic|full (default: basic)
   * - limit: number of entries per section (max 50)
   */
  async getMarketDominance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      const startTime = performance.now();
      
      logger.info('Processing market dominance request', { 
        requestId, 
        query: req.query,
        ip: req.ip 
      });

      const validatedQuery = await ValidationHelper.validateDominanceQuery(req.query);
      
      const cacheKey = this.cacheHelper.generateCacheKey('market_dominance', validatedQuery);
      let data = await this.cacheHelper.get<any>(cacheKey);
      
      if (!data) {
        data = await this.marketService.getMarketDominance(validatedQuery);
        await this.cacheHelper.set(cacheKey, data, 600); // 10 minute TTL
      }
      
      const responseTime = Math.round(performance.now() - startTime);
      
      const response: IntelligentResponse<MarketDominanceData> = {
        success: true,
        data: data.dominance,
        intelligence: data.intelligence,
        benchmarks: data.benchmarks,
        metadata: {
          requestId,
          responseTime,
          dataSource: 'defillama',
          calculatedAt: new Date().toISOString(),
          dataFreshness: data.metadata.dataAge,
          methodology: 'market_cap_weighted',
          coverage: data.metadata.coverage
        }
      };
      
      logger.info('Market dominance request completed', { 
        requestId, 
        responseTime,
        cacheHit: !!data.fromCache
      });
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in getMarketDominance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  }

  /**
   * GET /v1/defi/market/trending
   * Growth-based trending analysis with 24h/7d/30d growth leaders
   * 
   * Query Parameters:
   * - timeframes: array of timeframes (default: ['7d'])
   * - minTvl: minimum TVL threshold (default: 1000000)
   * - categories: comma-separated list of DeFi categories
   * - chains: comma-separated list of blockchain networks
   * - limit: number of trending protocols per timeframe (max 30)
   */
  async getTrendingProtocols(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      const startTime = performance.now();
      
      logger.info('Processing trending protocols request', { 
        requestId, 
        query: req.query,
        ip: req.ip 
      });

      const validatedQuery = await ValidationHelper.validateTrendingQuery(req.query);
      
      const cacheKey = this.cacheHelper.generateCacheKey('market_trending', validatedQuery);
      let data = await this.cacheHelper.get<any>(cacheKey);
      
      if (!data) {
        data = await this.marketService.getTrendingProtocols(validatedQuery);
        await this.cacheHelper.set(cacheKey, data, 900); // 15 minute TTL
      }
      
      const responseTime = Math.round(performance.now() - startTime);
      
      const response: IntelligentResponse<TrendingProtocolsData> = {
        success: true,
        data: data.trending,
        intelligence: data.intelligence,
        benchmarks: data.benchmarks,
        metadata: {
          requestId,
          responseTime,
          dataSource: 'defillama',
          calculatedAt: new Date().toISOString(),
          dataFreshness: data.metadata.dataAge,
          methodology: 'momentum_analysis',
          coverage: data.metadata.coverage
        }
      };
      
      logger.info('Trending protocols request completed', { 
        requestId, 
        responseTime,
        cacheHit: !!data.fromCache
      });
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in getTrendingProtocols', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  }

  /**
   * GET /v1/defi/market/movers
   * Biggest gainers and losers with price/TVL movement analysis
   * 
   * Query Parameters:
   * - timeframe: 24h|7d|30d (default: 24h)
   * - detail: minimal|basic|full (default: basic)
   * - limit: number of movers per category (max 25)
   */
  async getMarketMovers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      const startTime = performance.now();
      
      logger.info('Processing market movers request', { 
        requestId, 
        query: req.query,
        ip: req.ip 
      });

      const validatedQuery = await ValidationHelper.validateMoversQuery(req.query);
      
      const cacheKey = this.cacheHelper.generateCacheKey('market_movers', validatedQuery);
      let data = await this.cacheHelper.get<any>(cacheKey);
      
      if (!data) {
        data = await this.marketService.getMarketMovers(validatedQuery);
        await this.cacheHelper.set(cacheKey, data, 300); // 5 minute TTL
      }
      
      const responseTime = Math.round(performance.now() - startTime);
      
      const response: IntelligentResponse<MarketMoversData> = {
        success: true,
        data: data.movers,
        intelligence: data.intelligence,
        benchmarks: data.benchmarks,
        metadata: {
          requestId,
          responseTime,
          dataSource: 'defillama',
          calculatedAt: new Date().toISOString(),
          dataFreshness: data.metadata.dataAge,
          methodology: 'percentage_change_analysis',
          coverage: data.metadata.coverage
        }
      };
      
      logger.info('Market movers request completed', { 
        requestId, 
        responseTime,
        cacheHit: !!data.fromCache
      });
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in getMarketMovers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  }

  /**
   * GET /v1/defi/market/chains/:chain/ecosystem
   * Get detailed ecosystem data for a specific blockchain
   * 
   * Path Parameters:
   * - chain: blockchain identifier (ethereum, solana, polygon, etc.)
   * 
   * Query Parameters:
   * - detail: minimal|basic|full (default: basic)
   * - limit: max protocols to return (default: 50, max: 100)
   * - sortBy: tvl|growth|marketShare|name (default: tvl)
   * - categories: comma-separated list of DeFi categories
   */
  async getChainEcosystem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      const startTime = performance.now();

      logger.info('Processing chain ecosystem request', {
        requestId,
        params: req.params,
        query: req.query,
        ip: req.ip,
      });

      // Validate and extract parameters
      const validatedQuery = await ValidationHelper.validateChainEcosystemQuery({
        ...req.query,
        chain: req.params.chain,
      });

      // Check cache
      const cacheKey = this.cacheHelper.generateCacheKey('chain_ecosystem', validatedQuery);
      let data = await this.cacheHelper.get<any>(cacheKey);

      if (!data) {
        data = await this.marketService.getChainEcosystem(validatedQuery);
        await this.cacheHelper.set(cacheKey, data, 900); // 15 minute TTL
      }

      const responseTime = Math.round(performance.now() - startTime);

      const response: IntelligentResponse<ChainEcosystemData> = {
        success: true,
        data: data.ecosystem,
        intelligence: data.intelligence,
        benchmarks: data.benchmarks,
        metadata: {
          requestId,
          responseTime,
          dataSource: 'defillama',
          calculatedAt: new Date().toISOString(),
          dataFreshness: data.metadata.dataAge,
          methodology: 'chain_filtered_analysis',
          coverage: data.metadata.coverage,
        },
      };

      logger.info('Chain ecosystem request completed', {
        requestId,
        responseTime,
        chain: validatedQuery.chain,
        protocolCount: data.ecosystem.protocols.length,
        cacheHit: !!data.fromCache,
      });

      res.json(response);
    } catch (error) {
      logger.error('Error in getChainEcosystem', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        chain: req.params.chain,
      });
      next(error);
    }
  }

  /**
   * GET /v1/defi/market/chainTVL
   * Get lightweight overview of all chains
   * 
   * Query Parameters:
   * - sortBy: tvl|name|protocolCount|dominance (default: tvl)
   * - limit: max chains to return (default: 20, max: 50)
   */
  async getChainsOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = this.generateRequestId();
      const startTime = performance.now();

      logger.info('Processing chains overview request', {
        requestId,
        query: req.query,
        ip: req.ip,
      });

      const validatedQuery = await ValidationHelper.validateChainsOverviewQuery(req.query);

      const cacheKey = this.cacheHelper.generateCacheKey('chains_overview', validatedQuery);
      let data = await this.cacheHelper.get<any>(cacheKey);

      if (!data) {
        data = await this.marketService.getChainsOverview(validatedQuery);
        await this.cacheHelper.set(cacheKey, data, 1800); // 30 minute TTL
      }

      const responseTime = Math.round(performance.now() - startTime);

      const response = {
        success: true,
        data: data.overview,
        metadata: {
          requestId,
          responseTime,
          dataSource: 'defillama',
          calculatedAt: new Date().toISOString(),
          dataFreshness: data.metadata.dataAge,
          methodology: 'chain_aggregation',
          coverage: data.metadata.coverage,
        },
      };

      logger.info('Chains overview request completed', {
        requestId,
        responseTime,
        chainCount: data.overview.chains.length,
        cacheHit: !!data.fromCache,
      });

      res.json(response);
    } catch (error) {
      logger.error('Error in getChainsOverview', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Bind controller methods to preserve 'this' context
   */
  bindMethods() {
    this.getMarketOverview = this.getMarketOverview.bind(this);
    this.getMarketDominance = this.getMarketDominance.bind(this);
    this.getTrendingProtocols = this.getTrendingProtocols.bind(this);
    this.getMarketMovers = this.getMarketMovers.bind(this);
    this.getChainEcosystem = this.getChainEcosystem.bind(this);
    this.getChainsOverview = this.getChainsOverview.bind(this);
  }
}

/**
 * Factory function to create controller instance with dependencies
 */
export function createMarketIntelligenceController(
  marketService: MarketIntelligenceService,
  validationHelper: ValidationHelper,
  cacheHelper: IntelligentCacheManager
): MarketIntelligenceController {
  const controller = new MarketIntelligenceController(
    marketService,
    validationHelper,
    cacheHelper
  );
  
  controller.bindMethods();
  return controller;
}

// Export singleton instance placeholder - will be initialized in route setup
export let marketIntelligenceController: MarketIntelligenceController;
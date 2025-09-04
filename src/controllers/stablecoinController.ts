import { Request, Response, NextFunction } from 'express';
import { stablecoinService } from '../services/stablecoinService.js';
import { ApiResponse, StablecoinAsset, StablecoinFilters, StablecoinAnalytics, ChainStablecoinResponse } from '../types/index.js';
import { AppError } from '../middleware/e/AppError.js';
import { ErrorCode } from '../middleware/e/ErrorCode.js';
import { InputValidator } from '../utils/inputValidator.js';


export class StablecoinController {
  
  /**
   * @swagger
   * components:
   *   schemas:
   *     StablecoinAsset:
   *       type: object
   *       required:
   *         - id
   *         - name
   *         - symbol
   *         - pegType
   *         - pegMechanism
   *         - marketCap
   *         - price
   *         - pegStability
   *         - chains
   *         - riskLevel
   *         - updatedAt
   *       properties:
   *         id:
   *           type: string
   *           description: Unique identifier for the stablecoin
   *           example: "tether"
   *         name:
   *           type: string
   *           description: Full name of the stablecoin
   *           example: "Tether USD"
   *         symbol:
   *           type: string
   *           description: Symbol of the stablecoin
   *           example: "USDT"
   *         geckoId:
   *           type: string
   *           description: CoinGecko ID for the stablecoin
   *           example: "tether"
   *         pegType:
   *           type: string
   *           description: Type of peg (USD, EUR, GBP)
   *           example: "peggedUSD"
   *         pegMechanism:
   *           type: string
   *           description: Mechanism used to maintain peg
   *           example: "fiat-backed"
   *         marketCap:
   *           type: number
   *           description: Market capitalization in USD
   *           example: 83000000000
   *         price:
   *           type: number
   *           description: Current price in USD
   *           example: 1.001
   *         pegStability:
   *           type: number
   *           description: Stability percentage (0-100)
   *           example: 99.9
   *         circulation:
   *           type: object
   *           properties:
   *             current:
   *               type: number
   *               example: 83000000000
   *             prevDay:
   *               type: number
   *               example: 82500000000
   *             prevWeek:
   *               type: number
   *               example: 81000000000
   *             prevMonth:
   *               type: number
   *               example: 80000000000
   *         chains:
   *           type: array
   *           items:
   *             type: string
   *           example: ["ethereum", "tron", "bsc"]
   *         riskLevel:
   *           type: string
   *           enum: [low, medium, high]
   *           example: "low"
   *         growthRates:
   *           type: object
   *           properties:
   *             daily:
   *               type: number
   *               example: 0.6
   *             weekly:
   *               type: number
   *               example: 2.5
   *             monthly:
   *               type: number
   *               example: 3.8
   *         updatedAt:
   *           type: string
   *           format: date-time
   *           example: "2023-12-01T10:30:00Z"
   */

  /// ## Get All Stablecoins Endpoint
  /// 
  /// Retrieves comprehensive stablecoin data with blockchain filtering and sorting.
  /// Streamlined endpoint focused on essential filtering capabilities.
  /// 
  /// **@param {Request} req** - Express request object with query parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning paginated stablecoin data
  /// 
  /// ### Supported Query Parameters:
  /// - **chains**: Filter by blockchain networks (array of: ETH, Celo, DOT, BTC, SOL, AVAX, MATIC, BNB, ADA, LINK)
  /// - **sortOrder**: Sort direction ("asc" or "desc", default: "asc")
  /// - **limit**: Result limit (1-100, default: 50)
  /// 
  /// ### Validation Layers:
  /// 1. **Parameter Type Validation**: Ensures correct data types
  /// 2. **Chains Validation**: Validates against supported blockchain enums
  /// 3. **Range Validation**: Limit within bounds
  /// 4. **Input Sanitization**: Prevents injection attacks
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": [{
  ///     "id": "tether",
  ///     "symbol": "USDT",
  ///     "marketCap": 83000000000,
  ///     "pegStability": 99.9,
  ///     "riskLevel": "low"
  ///   }],
  ///   "pagination": {...},
  ///   "timestamp": "2024-01-01T00:00:00.000Z"
  /// }
  /// ```
  /// 
  /// **@route** GET /api/v1/stablecoins
  async getStablecoins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        chains,
        sortOrder = 'asc',
        limit = '50'
      } = req.query;
      
      /// VALIDATION LAYER 1: Core Parameter Validation
      /// Uses InputValidator for comprehensive security validation
      const validatedSortOrder = InputValidator.validateSortOrder(sortOrder as string);
      const validatedLimit = InputValidator.validateInteger(limit as string, 'limit', 1, 100);
      
      /// VALIDATION LAYER 2: Chains Parameter Validation
      /// Validate chains array if provided
      let validatedChains: string[] | undefined;
      if (chains) {
        // Handle both array and comma-separated string formats
        const chainsArray = Array.isArray(chains) ? chains : [chains as string];
        const validChainEnums = ['ETH', 'Celo', 'DOT', 'BTC', 'SOL', 'AVAX', 'MATIC', 'BNB', 'ADA', 'LINK'];
        
        validatedChains = chainsArray
          .map(chain => String(chain).trim())
          .filter(chain => validChainEnums.includes(chain));
        
        if (validatedChains.length === 0) {
          throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Invalid chains parameter. Must be one of: ETH, Celo, DOT, BTC, SOL, AVAX, MATIC, BNB, ADA, LINK');
        }
      }

      const filters: StablecoinFilters = {
        chain: validatedChains && validatedChains.length > 0 ? validatedChains[0] : undefined,
        sortBy: 'id', // Fixed sort by ID
        sortOrder: validatedSortOrder,
        limit: validatedLimit,
        offset: 0 // Fixed offset
      };

      const stablecoins = await stablecoinService.getStablecoins(filters);

      /// DATA TRANSFORMATION: Always exclude chain circulation data for clean response
      const responseData = stablecoins.map(({ chainCirculating, ...rest }) => rest);

      const response: ApiResponse<any[]> = {
        success: true,
        data: responseData,
        pagination: {
          page: 1,
          limit: validatedLimit,
          total: stablecoins.length
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Stablecoin by Symbol Endpoint
  /// 
  /// Retrieves detailed stablecoin data for a specific token symbol with
  /// comprehensive validation and sanitization.
  /// 
  /// **@param {Request} req** - Express request object with path parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning single stablecoin data
  /// 
  /// ### Path Parameters:
  /// - **symbol**: Stablecoin symbol (e.g., "USDT", "USDC", "DAI")
  /// 
  /// ### Security Features:
  /// 1. **Input Sanitization**: Removes special characters and limits length
  /// 2. **Format Validation**: Ensures alphanumeric-only symbols
  /// 3. **Length Limits**: Prevents DoS via oversized inputs
  /// 4. **Existence Validation**: Verifies stablecoin exists in dataset
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": {
  ///     "id": "tether",
  ///     "symbol": "USDT",
  ///     "marketCap": 83000000000,
  ///     "pegStability": 99.9,
  ///     "riskLevel": "low",
  ///     "chains": ["ethereum", "tron", "bsc"]
  ///   },
  ///   "timestamp": "2024-01-01T00:00:00.000Z"
  /// }
  /// ```
  /// 
  /// **@route** GET /api/v1/stablecoins/{symbol}
  async getStablecoinBySymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract symbol parameter from URL path
      const { symbol } = req.params;
      
      /// VALIDATION: Input sanitization and format validation
      /// Prevents injection attacks and ensures reasonable input size
      const validatedSymbol = InputValidator.sanitizeAlphanumeric(symbol, 20);
      
      const stablecoin = await stablecoinService.getStablecoinBySymbol(validatedSymbol);

      if (!stablecoin) {
        throw AppError.newError404(ErrorCode.NOT_FOUND, `Stablecoin with symbol ${symbol} not found`);
      }

      const response: ApiResponse<StablecoinAsset> = {
        success: true,
        data: stablecoin,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Stablecoin by ID Endpoint
  /// 
  /// Retrieves detailed stablecoin data for a specific unique identifier.
  /// 
  /// **@param {Request} req** - Express request object with path parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning single stablecoin data
  /// 
  /// ### Path Parameters:
  /// - **id**: Unique stablecoin identifier (e.g., "tether", "usd-coin")
  /// 
  /// ### Security Features:
  /// 1. **Input Sanitization**: Removes special characters and limits length
  /// 2. **Format Validation**: Ensures alphanumeric-only IDs
  /// 3. **Length Limits**: Prevents DoS via oversized inputs (max 50 chars)
  /// 4. **Existence Validation**: Verifies ID exists in dataset
  /// 
  /// **@route** GET /api/v1/stablecoins/{id}
  async getStablecoinById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract ID parameter from URL path
      const { id } = req.params;
      
      /// VALIDATION: Input sanitization with longer length limit for IDs
      /// IDs can be longer than symbols (e.g., "dai-dai-stablecoin")
      const validatedId = InputValidator.sanitizeAlphanumeric(id, 50);
      
      const stablecoin = await stablecoinService.getStablecoinById(validatedId);

      if (!stablecoin) {
        throw AppError.newError404(ErrorCode.NOT_FOUND, `Stablecoin with ID ${id} not found`);
      }

      const response: ApiResponse<StablecoinAsset> = {
        success: true,
        data: stablecoin,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Stablecoins by Chain Endpoint
  /// 
  /// Retrieves all stablecoins available on a specific blockchain network
  /// with chain-specific circulation metrics and analytics.
  /// 
  /// **@param {Request} req** - Express request object with path parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning chain-specific stablecoin data
  /// 
  /// ### Path Parameters:
  /// - **chain**: Blockchain network name (e.g., "ethereum", "polygon", "bsc")
  /// 
  /// ### Response Features:
  /// 1. **Chain-Specific Metrics**: Total circulation on the specified chain
  /// 2. **Sorted Results**: Ordered by circulation amount on that chain
  /// 3. **Network Analytics**: Total stablecoins and circulation summaries
  /// 4. **Risk Assessment**: Stability and risk metrics per stablecoin
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": {
  ///     "chain": "ethereum",
  ///     "totalStablecoins": 25,
  ///     "totalCirculation": 95000000000,
  ///     "stablecoins": [{
  ///       "symbol": "USDT",
  ///       "circulation": 45000000000,
  ///       "pegStability": 99.9
  ///     }]
  ///   }
  /// }
  /// ```
  /// 
  /// **@route** GET /api/v1/stablecoins/chain/{chain}
  async getStablecoinsByChain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract chain parameter from URL path
      const { chain } = req.params;
      
      /// VALIDATION: Chain parameter validation
      if (!chain || typeof chain !== 'string') {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Chain parameter is required');
      }
      
      /// MULTI-CHAIN PARSING: Handle comma-separated chains like "ETH,AVAX" or "ETH, Celo"
      const chainArray = chain.split(',').map(c => c.trim()).filter(c => c.length > 0);
      if (chainArray.length === 0) {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'At least one valid chain must be provided');
      }
      
      /// CHAIN VALIDATION: Validate each chain against supported enums
      const validChainEnums = ['ETH', 'Celo', 'DOT', 'BTC', 'SOL', 'AVAX', 'MATIC', 'BNB', 'ADA', 'LINK'];
      const validatedChains = chainArray.filter(c => validChainEnums.includes(c.toUpperCase()));
      
      if (validatedChains.length === 0) {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 
          `Invalid chain(s). Supported chains: ${validChainEnums.join(', ')}`);
      }
      
      /// For now, use the first validated chain to maintain existing service compatibility
      /// TODO: Update service to handle multiple chains
      const primaryChain = validatedChains[0];
      const validatedChain = InputValidator.sanitizeChainName(primaryChain);
      
      const stablecoins = await stablecoinService.getStablecoinsByChain(validatedChain);

      /// ANALYTICS CALCULATION: Chain-specific circulation metrics
      /// Calculates total stablecoin circulation on the specified blockchain
      const totalCirculation = stablecoins.reduce((sum, stablecoin) => {
        /// CHAIN DATA LOOKUP: Multi-level fallback for chain name matching
        /// Handles variations in chain naming (case sensitivity, abbreviations)
        const chainData = stablecoin.chainCirculating[validatedChain] || 
                         stablecoin.chainCirculating[chain.toLowerCase()] ||
                         stablecoin.chainCirculating[Object.keys(stablecoin.chainCirculating).find(key => 
                           key.toLowerCase().includes(validatedChain.toLowerCase())
                         ) || ''];
        
        return sum + (chainData?.current?.peggedUSD || 0);
      }, 0);

      /// DATA TRANSFORMATION: Convert to chain-focused format
      /// Simplifies response structure and highlights chain-specific metrics
      const chainStablecoins = stablecoins.map(stablecoin => {
        /// CHAIN DATA EXTRACTION: Same multi-level lookup as above
        const chainData = stablecoin.chainCirculating[validatedChain] || 
                         stablecoin.chainCirculating[chain.toLowerCase()] ||
                         stablecoin.chainCirculating[Object.keys(stablecoin.chainCirculating).find(key => 
                           key.toLowerCase().includes(validatedChain.toLowerCase())
                         ) || ''];

        /// BUILD SIMPLIFIED RESPONSE: Focus on chain-relevant data
        return {
          id: stablecoin.id,
          name: stablecoin.name,
          symbol: stablecoin.symbol,
          marketCap: stablecoin.marketCap,
          circulation: chainData?.current?.peggedUSD || 0,
          price: stablecoin.price,
          pegStability: stablecoin.pegStability,
          riskLevel: stablecoin.riskLevel
        };
      }).sort((a, b) => b.circulation - a.circulation); /// Sort by chain circulation (largest first)

      const chainResponse: ChainStablecoinResponse = {
        chain: primaryChain, // Use the validated primary chain instead of raw input
        totalStablecoins: stablecoins.length,
        totalCirculation: totalCirculation,
        stablecoins: chainStablecoins
      };

      const response: ApiResponse<ChainStablecoinResponse> = {
        success: true,
        data: chainResponse,
        pagination: {
          page: 1,
          limit: stablecoins.length,
          total: stablecoins.length
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Stablecoin Analytics Endpoint
  /// 
  /// Retrieves comprehensive market analytics for the entire stablecoin ecosystem
  /// including market cap breakdowns, mechanism analysis, and stability metrics.
  /// 
  /// **@param {Request} req** - Express request object
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning market analytics
  /// 
  /// ### Analytics Included:
  /// - **Total Market Metrics**: Market cap, total stablecoins count
  /// - **Mechanism Breakdown**: Fiat-backed, crypto-backed, algorithmic percentages
  /// - **Chain Analysis**: Cross-chain circulation distribution
  /// - **Stability Metrics**: Average stability, depegged count, risk distribution
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": {
  ///     "totalMarketCap": 150000000000,
  ///     "totalStablecoins": 200,
  ///     "mechanismBreakdown": {...},
  ///     "chainBreakdown": {...},
  ///     "stabilityMetrics": {...}
  ///   }
  /// }
  /// ```
  /// 
  /// **@route** GET /api/v1/stablecoins/analytics
  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// ANALYTICS AGGREGATION: Fetch comprehensive market analytics
      /// Service handles all calculations and data aggregation
      const analytics = await stablecoinService.getAnalytics();

      const response: ApiResponse<StablecoinAnalytics> = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Top Stablecoins Endpoint
  /// 
  /// Retrieves the top stablecoins ranked by market capitalization with
  /// configurable result limits and cleaned response format.
  /// 
  /// **@param {Request} req** - Express request object with query parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning top stablecoins
  /// 
  /// ### Supported Query Parameters:
  /// - **limit**: Number of top stablecoins to return (1-50, default: 10)
  /// 
  /// ### Response Features:
  /// 1. **Market Cap Sorting**: Automatically sorted by market cap (largest first)
  /// 2. **Clean Response**: Removes detailed chain data for faster loading
  /// 3. **Essential Metrics**: Focuses on key metrics for ranking purposes
  /// 4. **Pagination Info**: Includes pagination metadata
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": [{
  ///     "symbol": "USDT",
  ///     "marketCap": 83000000000,
  ///     "pegStability": 99.9,
  ///     "riskLevel": "low"
  ///   }],
  ///   "pagination": {...}
  /// }
  /// ```
  /// 
  /// **@route** GET /api/v1/stablecoins/top
  async getTopStablecoins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract limit parameter with default value
      const { limit = '10' } = req.query;
      
      /// VALIDATION: Limit parameter with bounds checking
      /// Prevents API abuse while allowing reasonable result sets
      const validatedLimit = InputValidator.validateInteger(limit as string, 'limit', 1, 50);

      const filters: StablecoinFilters = {
        sortBy: 'marketCap',
        sortOrder: 'desc',
        limit: validatedLimit,
        offset: 0
      };

      const topStablecoins = await stablecoinService.getStablecoins(filters);

      /// DATA OPTIMIZATION: Remove detailed chain data for performance
      /// Top stablecoins endpoint focuses on ranking, not detailed chain analysis
      const responseData = topStablecoins.map(({ chainCirculating, ...rest }) => rest);

      const response: ApiResponse<any[]> = {
        success: true,
        data: responseData,
        pagination: {
          page: 1,
          limit: validatedLimit,
          total: responseData.length
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Depegged Stablecoins Endpoint
  /// 
  /// Retrieves stablecoins that have lost their peg (stability below threshold)
  /// for risk monitoring and alert systems.
  /// 
  /// **@param {Request} req** - Express request object with query parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning depegged stablecoins
  /// 
  /// ### Supported Query Parameters:
  /// - **threshold**: Stability threshold percentage (0-100, default: 99.0)
  /// - **limit**: Number of results to return (1-100, default: 20)
  /// 
  /// **@route** GET /api/v1/stablecoins/depegged
  async getDepeggedStablecoins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract query parameters with defaults
      const { threshold = '99.0', limit = '20' } = req.query;
      
      /// VALIDATION: Threshold parameter validation (0-100%)
      const validatedThreshold = InputValidator.validateThreshold(threshold as string);
      const validatedLimit = InputValidator.validateInteger(limit as string, 'limit', 1, 100);

      const filters: StablecoinFilters = {
        sortBy: 'id',
        sortOrder: 'asc',
        limit: validatedLimit,
        offset: 0
      };

      const allStablecoins = await stablecoinService.getStablecoins(filters);
      
      /// FILTER: Find stablecoins below stability threshold
      const depeggedStablecoins = allStablecoins.filter(stablecoin => 
        stablecoin.pegStability < validatedThreshold
      ).sort((a, b) => a.pegStability - b.pegStability); // Worst stability first

      /// DATA TRANSFORMATION: Remove detailed chain data for clean response
      const responseData = depeggedStablecoins.map(({ chainCirculating, ...rest }) => rest);

      const response: ApiResponse<any[]> = {
        success: true,
        data: responseData,
        pagination: {
          page: 1,
          limit: validatedLimit,
          total: responseData.length
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

}

export const stablecoinController = new StablecoinController();
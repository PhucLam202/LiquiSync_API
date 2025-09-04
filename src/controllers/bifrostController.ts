import { Request, Response, NextFunction } from 'express';
import { bifrostService } from '../services/bifrostService.js';
import { 
  ApiResponse, 
  TokenYield,
  ExchangeRateResponse, 
  ConvertResponse, 
  ExchangeRateQuery,
  ConvertQuery,
  BifrostTvlResponse 
} from '../types/index.js';
import { AppError } from '../middleware/e/AppError.js';
import { ErrorCode } from '../middleware/e/ErrorCode.js';
import { logger } from '../utils/logger.js';


export class BifrostController {
  
  /// ## Get All Yields Endpoint
  /// 
  /// Retrieves comprehensive yield farming data for all supported tokens with
  /// advanced filtering, sorting, and validation capabilities.
  /// 
  /// **@param {Request} req** - Express request object with query parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning paginated yield data
  /// 
  /// ### Supported Query Parameters:
  /// - **minApy**: Filter yields by minimum APY threshold (0-1000%)
  /// - **sortBy**: Sort criteria - "apy" (default) or "tvl"
  /// - **limit**: Result limit (1-100, default: 20)
  /// 
  /// ### Validation Layers:
  /// 1. **Parameter Type Validation**: Ensures correct data types
  /// 2. **Range Validation**: APY and limit within reasonable bounds
  /// 3. **Sort Option Validation**: Only allows predefined sort criteria
  /// 4. **Input Sanitization**: Prevents injection attacks
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": [{
  ///     "symbol": "vDOT",
  ///     "protocol": "bifrost",
  ///     "apy": 15.42,
  ///     "tvl": 1000000,
  ///     "apyBreakdown": {...}
  ///   }],
  ///   "pagination": {...},
  ///   "timestamp": "2024-01-01T00:00:00.000Z"
  /// }
  /// ```
  async getYields(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract query parameters with default values for robustness
      /// NOTE: Parameters are now optional - endpoint returns all data by default
      const { minApy, sortBy = 'apy', limit } = req.query;
      
      /// VALIDATION LAYER 1: Sort Parameter Validation (if provided)
      /// Prevents SQL injection and ensures only valid sort criteria
      const validSortOptions = ['apy', 'tvl'];
      if (sortBy && !validSortOptions.includes(sortBy as string)) {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Invalid sortBy parameter. Must be "apy" or "tvl"');
      }
      
      /// DATA AGGREGATION: Fetch comprehensive protocol data
      /// Uses cached data from Bifrost service for performance
      const rawData = await bifrostService.getSiteData();
      
      /// SUPPORTED TOKENS: Current Bifrost liquid staking token list
      /// This list is maintained to match official Bifrost protocol supported assets
      const supportedTokens = ['vDOT', 'vKSM', 'vBNC', 'vASTR', 'vMANTA', 'vETH', 'vETH2', 'vFIL', 'vPHA', 'vMOVR', 'vGLMR'];
      
      /// DATA TRANSFORMATION: Convert raw API data to standardized yield objects
      /// Filter out null results from tokens with incomplete data
      let yields = supportedTokens
        .map(token => {
          const result = bifrostService.transformToTokenYield(rawData, token);
          if (!result) {
            logger.debug(`Failed to transform token: ${token}`);
          }
          return result;
        })
        .filter((tokenYield): tokenYield is TokenYield => tokenYield !== null);

      /// VALIDATION LAYER 2: APY Filter Validation (if provided)
      /// Applies minimum APY filter with comprehensive bounds checking
      if (minApy) {
        const minApyNum = parseFloat(minApy as string);
        /// Range validation: 0% to 1000% APY (prevents unrealistic values)
        if (isNaN(minApyNum) || minApyNum < 0 || minApyNum > 1000) {
          throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Invalid minApy parameter. Must be between 0 and 1000');
        }
        /// Apply filter: Only include yields meeting minimum threshold
        yields = yields.filter(y => y.apy >= minApyNum);
      }

      /// SORTING LOGIC: Apply user-specified or default sorting
      /// Default sort: APY (descending) - shows highest yields first
      /// Alternative: TVL (descending) - shows largest pools first
      if (sortBy === 'tvl') {
        yields.sort((a, b) => b.tvl - a.tvl);     // TVL: Largest to smallest
      } else {
        yields.sort((a, b) => b.apy - a.apy);     // APY: Highest to lowest (default)
      }

      /// VALIDATION LAYER 3: Limit Parameter Validation (if provided)
      /// If no limit is specified, return all data
      let finalYields = yields;
      if (limit) {
        const limitNum = parseInt(limit as string);
        if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
          throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Invalid limit parameter. Must be between 1 and 100');
        }
        /// Apply pagination: Limit results to prevent API abuse
        finalYields = yields.slice(0, limitNum);
      }

      const response: ApiResponse<TokenYield[]> = {
        success: true,
        data: finalYields,
        pagination: {
          page: 1,
          limit: finalYields.length,
          total: yields.length  // Total before limit applied
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Yield by Symbol Endpoint
  /// 
  /// Retrieves yield farming data for a specific token symbol with comprehensive
  /// validation, sanitization, and normalization.
  /// 
  /// **@param {Request} req** - Express request object with path parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning single token yield data
  /// 
  /// ### Path Parameters:
  /// - **symbol**: Token symbol (e.g., "vDOT", "vksm", "VDOT")
  /// 
  /// ### Security Features:
  /// 1. **Input Sanitization**: Removes special characters and limits length
  /// 2. **Format Validation**: Ensures alphanumeric-only symbols
  /// 3. **Normalization**: Smart case handling for user convenience
  /// 4. **Support Validation**: Verifies token against official list
  /// 
  /// ### Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": {
  ///     "symbol": "VDOT",
  ///     "protocol": "bifrost",
  ///     "apy": 15.42,
  ///     "tvl": 1000000,
  ///     "apyBreakdown": {...}
  ///   },
  ///   "timestamp": "2024-01-01T00:00:00.000Z"
  /// }
  /// ```
  async getYieldBySymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract symbol parameter from URL path
      const { symbol } = req.params;
      
      /// VALIDATION LAYER 1: Presence and Basic Format Validation
      /// Ensures symbol parameter exists and is not empty/whitespace-only
      if (!symbol || symbol.trim() === '') {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Symbol parameter is required');
      }
      
      /// VALIDATION LAYER 2: Input Sanitization and Security
      /// Removes special characters to prevent injection attacks and limits length for DoS protection
      const sanitizedSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
      if (sanitizedSymbol.length === 0) {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Invalid symbol format');
      }
      
      /// SUPPORTED TOKENS: Official Bifrost protocol liquid staking tokens
      /// This list must be kept in sync with protocol updates
      const supportedTokens = ['vDOT', 'vKSM', 'vBNC', 'vASTR', 'vMANTA', 'vETH', 'vETH2', 'vFIL', 'vPHA', 'vMOVR', 'vGLMR'];
      
      /// VALIDATION LAYER 3: Symbol Normalization
      /// Smart normalization handles various input formats for user convenience
      /// Examples: "vdot" → "vDOT", "VKSM" → "vKSM", "dot" → "DOT"
      const normalizedSymbol = sanitizedSymbol.toLowerCase().startsWith('v') ? 
        'v' + sanitizedSymbol.substring(1).toUpperCase() : 
        sanitizedSymbol.toUpperCase();
      
      /// VALIDATION LAYER 4: Support List Validation
      /// Verifies token exists in official Bifrost supported token list
      if (!supportedTokens.includes(normalizedSymbol)) {
        throw AppError.newError404(ErrorCode.NOT_FOUND, `Token ${symbol} is not supported`);
      }
      
      /// DATA RETRIEVAL: Fetch protocol data and transform for specific token
      /// Uses cached service data for performance optimization
      const rawData = await bifrostService.getSiteData();
      logger.debug(`Looking for yield data for normalized symbol: ${normalizedSymbol}`);
      const yieldData = bifrostService.transformToTokenYield(rawData, normalizedSymbol);

      /// VALIDATION LAYER 5: Data Existence Validation
      /// Ensures yield data exists for the requested token (handles API inconsistencies)
      if (!yieldData) {
        throw AppError.newError404(ErrorCode.NOT_FOUND, `Token ${symbol} not found`);
      }

      const response: ApiResponse<TokenYield> = {
        success: true,
        data: yieldData,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Get Exchange Rate Endpoint
  /// 
  /// Retrieves real-time exchange rate for a specific vToken with optional
  /// historical data and volatility metrics.
  /// 
  /// **@param {Request} req** - Express request object with path and query parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning exchange rate data
  /// 
  /// ### Path Parameters:
  /// - **token**: vToken symbol (e.g., "vKSM", "vDOT")
  /// 
  /// ### Query Parameters:
  /// - **includeHistory**: Include historical rate data ("true"/"false")
  /// - **historyDays**: Number of days for historical data
  /// - **includeVolatility**: Include volatility metrics ("true"/"false")
  /// - **source**: Data source preference ("runtime"/"frontend"/"auto")
  /// 
  /// ### Security Features:
  /// - Token format validation (alphanumeric only)
  /// - Input sanitization and length limits
  /// - Structured logging without sensitive data exposure
  async getExchangeRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const query = req.query as ExchangeRateQuery;

      // Validate token parameter
      if (!token || typeof token !== 'string') {
        throw AppError.newError400(ErrorCode.INVALID_INPUT, 'Token parameter is required');
      }

      // Validate token format (should be alphanumeric)
      if (!/^[a-zA-Z0-9]+$/.test(token)) {
        throw AppError.newError400(ErrorCode.INVALID_INPUT, 'Invalid token format');
      }

      logger.info(`Getting exchange rate for token: ${token}`, { query });

      // Get exchange rate from service
      const exchangeRate = await bifrostService.getExchangeRate(token);

      // Build response
      const responseData: ExchangeRateResponse['data'] = {
        exchangeRate,
        metadata: {
          lastUpdate: exchangeRate.timestamp,
          source: exchangeRate.source
        }
      };

      // Add historical data if requested
      if (query.includeHistory === 'true') {
        // TODO: Implement historical data fetching
        responseData.historicalRates = [];
      }

      // Add volatility if requested
      if (query.includeVolatility === 'true') {
        // TODO: Implement volatility calculation
        responseData.volatility = {
          daily: 0,
          weekly: 0,
          monthly: 0
        };
      }

      const response: ApiResponse<ExchangeRateResponse['data']> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /// ## Token Amount Conversion Controller
  /// 
  /// Handles token conversion requests between vTokens and their underlying base tokens.
  /// Uses real-time exchange rates from Bifrost Staking API for accurate conversions.
  /// 
  /// **Enhanced Exchange Rate Logic**:
  /// - **Primary**: Bifrost Staking API (direct exchangeRatio field) - 98% confidence
  /// - **Fallback**: Site API with TVL/TVM calculation when exchangeRatio unavailable
  /// - **Validation**: Multi-layer validation of exchangeRatio data quality
  /// - **Transparency**: Full logging of data source and calculation method
  /// - Rate format: 1 vToken = X base tokens (e.g., 1 vDOT = 1.529 DOT)
  /// 
  /// **Conversion Examples** (using exchangeRatio from Bifrost API):
  /// - 1 DOT → 0.654 vDOT (1 ÷ exchangeRatio)
  /// - 1 vDOT → 1.529 DOT (direct exchangeRatio from API)
  /// - Source tracking: 'bifrost_api' for direct API usage, 'site_api_calculated' for fallback
  /// 
  /// This endpoint provides comprehensive validation, security checks, and optional 
  /// features like slippage protection.
  /// 
  /// **@param {Request} req** - Express request object with query parameters
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning standardized API response
  /// 
  /// ### Required Query Parameters:
  /// - **amount**: Positive number as string (e.g., "100.5")
  /// - **from**: Source token symbol (e.g., "vDOT", "DOT")  
  /// - **to**: Target token symbol (e.g., "DOT", "vDOT")
  /// 
  /// ### Optional Query Parameters:
  /// - **includesFees**: Include fee breakdown ("true"/"false")
  /// 
  /// ### Security Validation Layers:
  /// 1. **Parameter Presence**: Validates required parameters exist
  /// 2. **Amount Validation**: Ensures positive numeric values
  /// 3. **Token Pair Validation**: Calls secure isValidTokenPair function
  /// 4. **Type Safety**: TypeScript type checking with runtime validation
  /// 
  /// ### Optimized Response Structure:
  /// ```json
  /// {
  ///   "success": true,
  ///   "data": {
  ///     "conversion": {
  ///       "from": { "amount": "100.000000", "symbol": "vKSM", "network": "bifrost" },
  ///       "to": { "amount": "152.810000", "symbol": "KSM", "network": "bifrost" },
  ///       "rate": 1.5281,
  ///       "effectiveRate": "1.52810000"
  ///     },
  ///     "input": { "amount": "100", "token": {...} },
  ///     "output": { "amount": "152.81", "token": {...} },
  ///     "exchangeRate": {...},
  ///     "calculation": {...}
  ///   },
  ///   "timestamp": "2024-01-01T00:00:00.000Z"
  /// }
  /// ```
  async convertTokenAmount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      /// Extract and type-cast query parameters for validation
      const query = req.query as unknown as ConvertQuery;
      const { amount, from, to, includesFees } = query;

      /// VALIDATION LAYER 1: Required Parameters Check
      /// Ensures all mandatory parameters are present and not empty
      if (!amount || !from || !to) {
        throw AppError.newError400(
          ErrorCode.INVALID_INPUT, 
          'amount, from, and to parameters are required'
        );
      }

      /// VALIDATION LAYER 2: Amount Format and Range Validation
      /// Prevents negative values, zero amounts, and non-numeric inputs
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw AppError.newError400(ErrorCode.INVALID_INPUT, 'Amount must be a positive number');
      }


      /// VALIDATION LAYER 4: Token Pair Security Validation
      /// Calls the comprehensive 11-layer security validation in service
      const isValidPair = await bifrostService.isValidTokenPair(from, to);
      if (!isValidPair) {
        throw AppError.newError400(
          ErrorCode.INVALID_INPUT, 
          `Conversion between ${from} and ${to} is not supported`
        );
      }

      /// Log successful validation for monitoring (sanitized)
      logger.info('Converting token amount', { amount, from, to });

      /// BUILD INPUT TOKEN AMOUNT OBJECT
      /// Prepare structured input data for service layer processing with proper token normalization
      let normalizedFromSymbol = from.toUpperCase();
      let normalizedToSymbol = to.toUpperCase();
      
      // Handle cases where tokens come as "VDOT" instead of "vDOT"
      if (normalizedFromSymbol.startsWith('V') && normalizedFromSymbol.length > 1) {
        normalizedFromSymbol = 'v' + normalizedFromSymbol.substring(1);
      }
      if (normalizedToSymbol.startsWith('V') && normalizedToSymbol.length > 1) {
        normalizedToSymbol = 'v' + normalizedToSymbol.substring(1);
      }
      
      const inputTokenAmount = {
        amount,
        decimals: 12, // Standard precision for Polkadot ecosystem
        token: {
          symbol: normalizedFromSymbol,
          network: 'bifrost' as const
        },
        formattedAmount: parseFloat(amount).toFixed(8) // Format for display
      };

      /// PERFORM CORE CONVERSION
      /// Delegate to service layer for business logic and exchange rate calculation
      const outputTokenAmount = await bifrostService.convertTokenAmount({
        amount,
        fromToken: normalizedFromSymbol,
        toToken: normalizedToSymbol
      });

      /// FETCH EXCHANGE RATE FOR RESPONSE METADATA
      /// Determine which token is the vToken for rate lookup
      const vToken = normalizedFromSymbol.startsWith('v') ? normalizedFromSymbol : normalizedToSymbol;
      const exchangeRate = await bifrostService.getExchangeRate(vToken);

      /// BUILD OPTIMIZED RESPONSE DATA
      /// Structured for better readability and user experience
      const responseData: ConvertResponse['data'] = {
        // Conversion summary - most important information first
        conversion: {
          from: {
            amount: parseFloat(amount).toFixed(6),
            symbol: normalizedFromSymbol,
            network: 'bifrost'
          },
          to: {
            amount: parseFloat(outputTokenAmount.amount).toFixed(6),
            symbol: normalizedToSymbol,
            network: 'bifrost'
          },
          rate: exchangeRate.rate,
          effectiveRate: (parseFloat(outputTokenAmount.amount) / parseFloat(amount)).toFixed(8)
        },
        
        // Detailed token information
        input: inputTokenAmount,
        output: outputTokenAmount,
        
        // Exchange rate details
        exchangeRate,
        
        // Calculation metadata
        calculation: {
          method: exchangeRate.source === 'runtime' ? 'bifrost_api' : 
                  exchangeRate.source === 'frontend_api' ? 'site_api_calculated' : 'runtime_api',
          precision: 12,
          roundingApplied: false,
          timestamp: new Date().toISOString(),
          dataSource: exchangeRate.source
        }
      };

      /// OPTIONAL FEATURE: Fee Breakdown
      /// Add fee information if requested by client
      if (includesFees === 'true') {
        responseData.fees = {
          swapFee: 0,      // Currently no swap fees in Bifrost
          networkFee: 0,   // Network transaction fees (estimated)
          total: 0         // Total fees for user transparency
        };
      }


      /// FORMAT FINAL API RESPONSE
      /// Standardized response structure with success indicator and timestamp
      const response: ApiResponse<ConvertResponse['data']> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      };

      /// Send JSON response to client
      res.json(response);
    } catch (error) {
      /// Pass any errors to centralized error handler middleware
      /// Error handler will sanitize and format error responses appropriately
      next(error);
    }
  }

  /// ## Get Supported Tokens Endpoint
  /// 
  /// Retrieves list of all supported tokens for conversion operations.
  /// 
  /// **@param {Request} req** - Express request object
  /// **@param {Response} res** - Express response object for API response
  /// **@param {NextFunction} next** - Express next function for error handling
  /// **@returns {Promise<void>}** - Async function returning supported tokens list
  async getSupportedTokens(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting supported tokens list');

      const tokens = await bifrostService.getSupportedTokens();

      const response: ApiResponse<{ tokens: string[]; count: number }> = {
        success: true,
        data: {
          tokens,
          count: tokens.length
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  // ============================================================================
  // EXTENDED CONTROLLER METHODS FOR NEW ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/bifrost/vtokens
   * Get list of all vTokens with comprehensive metadata
   */
  async getVTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = performance.now();
      const requestId = `vtokens-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('Processing vTokens list request', { 
        requestId, 
        query: req.query,
        ip: req.ip 
      });

      // Extract and validate query parameters
      const {
        page = 1,
        limit = 20,
        minTvl,
        sortBy = 'tvl'
      } = req.query;

      // Validate parameters
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const minTvlNum = minTvl ? parseFloat(minTvl as string) : undefined;

      // Validate sort parameters
      const validSortFields = ['apy', 'tvl', 'volume', 'holders', 'name'];
      
      if (!validSortFields.includes(sortBy as string)) {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Invalid sortBy parameter');
      }
      
      const filterOptions = {
        page: pageNum,
        limit: limitNum,
        minTvl: minTvlNum,
        sortBy: sortBy as string,
        sortOrder: 'desc' // Fixed to desc for consistent ordering
      };

      // Get vTokens data from service
      const vTokensData = await bifrostService.getVTokensList(filterOptions);
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      logger.info('vTokens request completed successfully', {
        requestId,
        responseTime,
        tokensCount: vTokensData.data.tokens.length,
        totalTokens: vTokensData.pagination.total
      });

      const response = {
        success: true,
        data: vTokensData.data,
        pagination: vTokensData.pagination,
        metadata: {
          ...vTokensData.metadata,
          requestId,
          responseTime
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);

    } catch (error) {
      logger.error('Error in getVTokens controller', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/bifrost/vtokens/:symbol
   * Get detailed information for a specific vToken
   */
  async getVTokenBySymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = performance.now();
      const requestId = `vtoken-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { symbol } = req.params;
      
      logger.info('Processing vToken detail request', { 
        requestId, 
        symbol,
        ip: req.ip 
      });

      // Validate symbol parameter
      if (!symbol || typeof symbol !== 'string') {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 'Symbol parameter is required');
      }

      // Clean and validate symbol
      const cleanSymbol = symbol.trim().toUpperCase();
      if (!/^[A-Z0-9]{2,10}$/.test(cleanSymbol)) {
        throw AppError.newError400(ErrorCode.VALIDATION_ERROR, 
          `Invalid symbol format. Symbol must be 2-10 characters (letters and numbers only). ` +
          `Examples: vDOT, vKSM, vBNC, vETH, DOT, KSM. Received: "${symbol}"`);
      }

      // Auto-convert base tokens to vTokens for user convenience
      // If user queries "DOT", automatically convert to "vDOT"
      const vTokenSymbol = cleanSymbol.startsWith('V') ? cleanSymbol : `V${cleanSymbol}`;
      // Handle proper casing: "VDOT" -> "vDOT"
      const normalizedSymbol = vTokenSymbol.charAt(0).toLowerCase() + vTokenSymbol.substring(1);

      // Get detailed vToken data from service
      const vTokenDetail = await bifrostService.getVTokenDetail(normalizedSymbol);
      
      if (!vTokenDetail) {
        throw AppError.newError404(ErrorCode.NOT_FOUND, `vToken ${normalizedSymbol} (${symbol}) not found`);
      }
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      logger.info('vToken detail request completed successfully', {
        requestId,
        originalSymbol: symbol,
        normalizedSymbol: normalizedSymbol,
        responseTime
      });

      res.json({
        success: true,
        data: vTokenDetail,
        metadata: {
          requestId,
          responseTime,
          lastUpdate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getVTokenBySymbol controller', { 
        symbol: req.params.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/bifrost/tvl
   * Get comprehensive Bifrost protocol TVL data
   */
  async getBifrostTvl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = performance.now();
      const requestId = `bifrost-tvl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Get Bifrost site data
      const siteData = await bifrostService.getSiteData();
      
      // Extract protocol-level metrics
      const protocolSummary = {
        name: 'Bifrost',
        totalTvl: siteData.totalTvl || 0,
        totalAddresses: siteData.totalAddresses || 0,
        totalRevenue: siteData.totalRevenue || 0,
        bncPrice: siteData.bncPrice || 0
      };

      // Process token-level TVL data
      const supportedTokens = ['vDOT', 'vKSM', 'vBNC', 'vASTR', 'vMANTA', 'vETH', 'vETH2', 'vFIL', 'vPHA', 'vMOVR', 'vGLMR'];
      const tokens = [];
      let totalTokenTvl = 0;
      let totalHolders = 0;
      let totalApy = 0;
      let validTokens = 0;

      for (const tokenSymbol of supportedTokens) {
        const tokenYield = bifrostService.transformToTokenYield(siteData, tokenSymbol);
        if (tokenYield) {
          const marketShare = protocolSummary.totalTvl > 0 ? 
            (tokenYield.tvl / protocolSummary.totalTvl) * 100 : 0;

          tokens.push({
            symbol: tokenYield.symbol,
            tvl: tokenYield.tvl,
            tvm: tokenYield.totalValueMinted,
            totalIssuance: tokenYield.totalIssuance,
            holders: tokenYield.holders,
            apy: tokenYield.apy,
            marketShare: parseFloat(marketShare.toFixed(2)),
            price: tokenYield.price
          });

          totalTokenTvl += tokenYield.tvl;
          totalHolders += tokenYield.holders;
          totalApy += tokenYield.apy;
          validTokens++;
        }
      }

      // Sort tokens by TVL (descending)
      tokens.sort((a, b) => b.tvl - a.tvl);

      // Calculate summary statistics
      const topTokenByTvl = tokens.length > 0 ? tokens[0].symbol : '';
      const topTokenByHolders = tokens.length > 0 ? 
        tokens.reduce((prev, current) => (prev.holders > current.holders) ? prev : current).symbol : '';
      const averageApy = validTokens > 0 ? totalApy / validTokens : 0;

      // Calculate TVL distribution
      const top3Tvl = tokens.slice(0, 3).reduce((sum, token) => sum + token.tvl, 0);
      const top3Percentage = totalTokenTvl > 0 ? (top3Tvl / totalTokenTvl) * 100 : 0;
      
      // Calculate Gini coefficient as concentration measure (simplified)
      let concentration = 0;
      if (tokens.length > 1) {
        const sortedTvls = tokens.map(t => t.tvl).sort((a, b) => a - b);
        const n = sortedTvls.length;
        const sum = sortedTvls.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          const numerator = sortedTvls.reduce((acc, tvl, i) => acc + (2 * (i + 1) - n - 1) * tvl, 0);
          concentration = numerator / (n * sum);
        }
      }

      const summary = {
        topTokenByTvl,
        topTokenByHolders,
        averageApy: parseFloat(averageApy.toFixed(2)),
        totalTokenCount: tokens.length,
        tvlDistribution: {
          top3Percentage: parseFloat(top3Percentage.toFixed(2)),
          concentration: parseFloat((concentration * 100).toFixed(2)) // Convert to percentage
        }
      };

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      const response: BifrostTvlResponse = {
        success: true,
        data: {
          protocol: protocolSummary,
          tokens,
          summary,
          metadata: {
            lastUpdate: new Date().toISOString(),
            dataSource: 'bifrost_site_api',
            cacheAge: 300 // 5 minutes
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      next(error);
    }
  }

}

export const bifrostController = new BifrostController();
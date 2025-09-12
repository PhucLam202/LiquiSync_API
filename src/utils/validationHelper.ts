/**
 * Validation Helper
 * 
 * Comprehensive input validation with security measures and user-friendly
 * error messages for all market intelligence endpoints.
 */

import { logger } from './logger.js';
import { 
  MarketOverviewOptions,
  DominanceOptions,
  TrendingOptions,
  MoversOptions,
  ChainEcosystemOptions,
  ChainsOverviewOptions
} from '../types/index.js';
import { AppError } from '../middleware/e/AppError.js';
import { ErrorCode } from '../middleware/e/ErrorCode.js';

/**
 * Validation Helper Class
 * 
 * Provides comprehensive input validation with security measures and user-friendly
 * error messages for all market intelligence endpoints.
 */
export class ValidationHelper {
  
  private static allowedDetailLevels = ['minimal', 'basic', 'full'];
  private static allowedTimeframes = ['24h', '7d', '30d'];
  private static allowedCategories = [
    'dex', 'lending', 'liquid-staking', 'yield-farming', 
    'derivatives', 'cross-chain', 'insurance', 'launchpad',
    'nft-marketplace', 'gaming', 'social', 'real-world-assets',
    'bridge', 'options', 'prediction-markets', 'asset-management'
  ];
  private static allowedChains = [
    'ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 
    'optimism', 'fantom', 'solana', 'terra', 'cosmos',
    'near', 'flow', 'cardano', 'polkadot', 'kusama',
    'moonbeam', 'moonriver', 'aurora', 'harmony', 'celo',
    'binance-smart-chain', 'eth', 'dot', 'btc', 'sol', 
    'avax', 'matic', 'bnb', 'ada', 'link'
  ];

  private static supportedChains = [
    'ethereum', 'solana', 'binance-smart-chain', 'polygon', 
    'avalanche', 'arbitrum', 'optimism', 'fantom', 'cronos', 'aurora'
  ];

  private static chainAliases = {
    'eth': 'ethereum',
    'sol': 'solana', 
    'bsc': 'binance-smart-chain',
    'poly': 'polygon',
    'avax': 'avalanche',
    'arb': 'arbitrum',
    'op': 'optimism',
    'ftm': 'fantom',
    'dot': 'polkadot',
    'btc': 'bitcoin',
    'matic': 'polygon',
    'bnb': 'binance-smart-chain',
    'ada': 'cardano',
    'link': 'chainlink',
    'celo': 'celo'
  };

  /**
   * Validate market overview query parameters
   */
  static async validateMarketOverviewQuery(query: any): Promise<MarketOverviewOptions> {
    const errors: string[] = [];
    
    logger.debug('Validating market overview query', { query });

    // Validate detail level
    const detail = this.validateDetailLevel(query.detail, errors);
    
    // Validate timeframe
    const timeframe = this.validateTimeframe(query.timeframe, errors);
    
    // Validate categories
    const categories = this.validateCategories(query.categories, errors);
    
    // Validate chains
    const chains = this.validateChains(query.chains, errors);
    
    // Validate limit
    const limit = this.validateLimit(query.limit, errors, 50, 1, 50); // Max 50 for overview

    if (errors.length > 0) {
      logger.warn('Market overview validation failed', { errors, query });
      throw AppError.newError400(
        ErrorCode.VALIDATION_ERROR, 
        `Validation failed: ${errors.join(', ')}`
      );
    }

    const validatedQuery: MarketOverviewOptions = {
      detail,
      timeframe,
      categories,
      chains,
      limit
    };

    logger.debug('Market overview validation successful', { validatedQuery });
    return validatedQuery;
  }

  /**
   * Validate market dominance query parameters
   */
  static async validateDominanceQuery(query: any): Promise<DominanceOptions> {
    const errors: string[] = [];
    
    logger.debug('Validating dominance query', { query });

    const detail = this.validateDetailLevel(query.detail, errors);
    const limit = this.validateLimit(query.limit, errors, 20, 1, 50);

    if (errors.length > 0) {
      logger.warn('Dominance validation failed', { errors, query });
      throw AppError.newError400(
        ErrorCode.VALIDATION_ERROR,
        `Validation failed: ${errors.join(', ')}`
      );
    }

    const validatedQuery: DominanceOptions = {
      detail,
      limit
    };

    logger.debug('Dominance validation successful', { validatedQuery });
    return validatedQuery;
  }

  /**
   * Validate trending protocols query parameters
   */
  static async validateTrendingQuery(query: any): Promise<TrendingOptions> {
    const errors: string[] = [];
    
    logger.debug('Validating trending query', { query });

    // Validate timeframes array
    let timeframes = this.validateTimeframes(query.timeframes, errors);
    if (timeframes.length === 0) {
      timeframes = ['7d']; // Default timeframe
    }

    // Validate minimum TVL
    const minTvl = this.validateMinTvl(query.minTvl, errors);
    
    // Validate categories
    const categories = this.validateCategories(query.categories, errors);
    const limit = this.validateLimit(query.limit, errors, 30, 1, 30);

    if (errors.length > 0) {
      logger.warn('Trending validation failed', { errors, query });
      throw AppError.newError400(
        ErrorCode.VALIDATION_ERROR,
        `Validation failed: ${errors.join(', ')}`
      );
    }

    const validatedQuery: TrendingOptions = {
      timeframes,
      minTvl,
      categories,
      limit
    };

    logger.debug('Trending validation successful', { validatedQuery });
    return validatedQuery;
  }

  /**
   * Validate market movers query parameters
   */
  static async validateMoversQuery(query: any): Promise<MoversOptions> {
    const errors: string[] = [];
    
    logger.debug('Validating movers query', { query });

    const timeframe = this.validateTimeframe(query.timeframe, errors);
    const detail = this.validateDetailLevel(query.detail, errors);
    const limit = this.validateLimit(query.limit, errors, 25, 1, 25);

    if (errors.length > 0) {
      logger.warn('Movers validation failed', { errors, query });
      throw AppError.newError400(
        ErrorCode.VALIDATION_ERROR,
        `Validation failed: ${errors.join(', ')}`
      );
    }

    const validatedQuery: MoversOptions = {
      timeframe,
      detail,
      limit
    };

    logger.debug('Movers validation successful', { validatedQuery });
    return validatedQuery;
  }

  /**
   * Validate chain ecosystem query parameters
   */
  static async validateChainEcosystemQuery(query: any): Promise<ChainEcosystemOptions> {
    const errors: string[] = [];
    
    logger.debug('Validating chain ecosystem query', { query });

    // Chain name validation with aliases
    const chain = this.normalizeChainName(query.chain, errors);
    
    // Validate detail level
    const detail = this.validateDetailLevel(query.detail, errors);
    
    // Standard parameter validation
    const limit = this.validateLimit(query.limit, errors, 50, 1, 100);
    const sortBy = this.validateSortBy(
      query.sortBy,
      ['tvl', 'growth', 'marketShare', 'name'],
      errors
    ) as 'tvl' | 'growth' | 'marketShare' | 'name';
    
    // Categories validation (optional)
    const categories = this.validateCategories(query.categories, errors);

    if (errors.length > 0) {
      logger.warn('Chain ecosystem validation failed', { errors, query });
      throw AppError.newError400(
        ErrorCode.VALIDATION_ERROR,
        `Validation failed: ${errors.join(', ')}`
      );
    }

    const validatedQuery: ChainEcosystemOptions = {
      chain,
      detail,
      limit,
      sortBy,
      categories
    };

    logger.debug('Chain ecosystem validation successful', { validatedQuery });
    return validatedQuery;
  }

  /**
   * Validate chains overview query parameters
   */
  static async validateChainsOverviewQuery(query: any): Promise<ChainsOverviewOptions> {
    const errors: string[] = [];
    
    logger.debug('Validating chains overview query', { query });

    const sortBy = this.validateSortBy(
      query.sortBy,
      ['tvl', 'name', 'protocolCount', 'dominance'],
      errors
    ) as 'tvl' | 'name' | 'protocolCount' | 'dominance';
    const limit = this.validateLimit(query.limit, errors, 20, 1, 50);

    if (errors.length > 0) {
      logger.warn('Chains overview validation failed', { errors, query });
      throw AppError.newError400(
        ErrorCode.VALIDATION_ERROR,
        `Validation failed: ${errors.join(', ')}`
      );
    }

    const validatedQuery: ChainsOverviewOptions = {
      sortBy,
      limit
    };

    logger.debug('Chains overview validation successful', { validatedQuery });
    return validatedQuery;
  }

  /**
   * Validate generic query parameters for security
   */
  static validateGenericParams(query: any): any {
    const sanitized: any = {};
    
    // Remove potentially dangerous characters and limit string lengths
    Object.keys(query).forEach(key => {
      if (typeof query[key] === 'string') {
        const sanitizedKey = this.sanitizeString(key, 50);
        const sanitizedValue = this.sanitizeString(query[key], 200);
        if (sanitizedKey && sanitizedValue) {
          sanitized[sanitizedKey] = sanitizedValue;
        }
      } else if (typeof query[key] === 'number') {
        if (this.isValidNumber(query[key])) {
          sanitized[key] = query[key];
        }
      } else if (typeof query[key] === 'boolean') {
        sanitized[key] = query[key];
      } else if (Array.isArray(query[key])) {
        const sanitizedArray = query[key]
          .filter((item: any) => typeof item === 'string')
          .map((item: string) => this.sanitizeString(item, 100))
          .filter((item): item is string => item !== null)
          .slice(0, 10); // Limit array size
        
        if (sanitizedArray.length > 0) {
          sanitized[key] = sanitizedArray;
        }
      }
    });
    
    return sanitized;
  }

  // Private validation methods
  private static validateDetailLevel(detail: any, errors: string[]): 'minimal' | 'basic' | 'full' {
    if (!detail) return 'basic'; // Default
    
    if (typeof detail !== 'string') {
      errors.push('detail must be a string');
      return 'basic';
    }

    const cleanDetail = detail.toLowerCase().trim();
    if (!this.allowedDetailLevels.includes(cleanDetail)) {
      errors.push(`detail must be one of: ${this.allowedDetailLevels.join(', ')}`);
      return 'basic';
    }

    return cleanDetail as 'minimal' | 'basic' | 'full';
  }

  private static validateTimeframe(timeframe: any, errors: string[]): '24h' | '7d' | '30d' {
    if (!timeframe) return '7d'; // Default
    
    if (typeof timeframe !== 'string') {
      errors.push('timeframe must be a string');
      return '7d';
    }

    const cleanTimeframe = timeframe.toLowerCase().trim();
    if (!this.allowedTimeframes.includes(cleanTimeframe)) {
      errors.push(`timeframe must be one of: ${this.allowedTimeframes.join(', ')}`);
      return '7d';
    }

    return cleanTimeframe as '24h' | '7d' | '30d';
  }

  private static validateTimeframes(timeframes: any, errors: string[]): ('24h' | '7d' | '30d')[] {
    if (!timeframes) return ['7d'];
    
    let timeframeArray: string[] = [];
    
    if (typeof timeframes === 'string') {
      timeframeArray = timeframes.split(',').map(t => t.trim());
    } else if (Array.isArray(timeframes)) {
      timeframeArray = timeframes.map(t => String(t).trim());
    } else {
      errors.push('timeframes must be a string or array');
      return ['7d'];
    }

    // Remove duplicates and limit to 5 timeframes
    timeframeArray = [...new Set(timeframeArray)].slice(0, 5);

    const validTimeframes = timeframeArray.filter(t => this.allowedTimeframes.includes(t));
    const invalidTimeframes = timeframeArray.filter(t => !this.allowedTimeframes.includes(t));

    if (invalidTimeframes.length > 0) {
      errors.push(`Invalid timeframes: ${invalidTimeframes.join(', ')}`);
    }

    if (validTimeframes.length === 0) {
      errors.push(`At least one valid timeframe required: ${this.allowedTimeframes.join(', ')}`);
      return ['7d'];
    }

    return validTimeframes as ('24h' | '7d' | '30d')[];
  }

  private static validateCategories(categories: any, errors: string[]): string[] | undefined {
    if (!categories) return undefined;
    
    let categoryArray: string[] = [];
    
    if (typeof categories === 'string') {
      categoryArray = categories.split(',').map(c => c.trim().toLowerCase());
    } else if (Array.isArray(categories)) {
      categoryArray = categories.map(c => String(c).trim().toLowerCase());
    } else {
      errors.push('categories must be a string or array');
      return undefined;
    }

    // Remove duplicates and limit to 10 categories
    categoryArray = [...new Set(categoryArray)].slice(0, 10);

    // Validate against allowed categories
    const validCategories = categoryArray.filter(c => this.allowedCategories.includes(c));
    const invalidCategories = categoryArray.filter(c => !this.allowedCategories.includes(c));

    if (invalidCategories.length > 0) {
      errors.push(`Invalid categories: ${invalidCategories.join(', ')}`);
    }

    if (validCategories.length > 0) {
      return validCategories;
    }

    return undefined;
  }

  private static validateChains(chains: any, errors: string[]): string[] | undefined {
    if (!chains) return undefined;
    
    let chainArray: string[] = [];
    
    if (typeof chains === 'string') {
      chainArray = chains.split(',').map(c => c.trim().toLowerCase());
    } else if (Array.isArray(chains)) {
      chainArray = chains.map(c => String(c).trim().toLowerCase());
    } else {
      errors.push('chains must be a string or array');
      return undefined;
    }

    // Apply chain aliases
    chainArray = chainArray.map(c => (this.chainAliases as any)[c] || c);

    // Remove duplicates and limit to 10 chains
    chainArray = [...new Set(chainArray)].slice(0, 10);

    // Validate against allowed chains
    const validChains = chainArray.filter(c => this.allowedChains.includes(c));
    const invalidChains = chainArray.filter(c => !this.allowedChains.includes(c));

    if (invalidChains.length > 0) {
      errors.push(`Invalid chains: ${invalidChains.join(', ')}`);
    }

    if (validChains.length > 0) {
      return validChains;
    }

    return undefined;
  }

  private static validateLimit(limit: any, errors: string[], defaultLimit: number, minLimit: number = 1, maxLimit?: number): number {
    if (!limit) return defaultLimit; // Default
    
    const numLimit = parseInt(String(limit));
    
    if (isNaN(numLimit)) {
      errors.push('limit must be a number');
      return defaultLimit;
    }

    if (numLimit < minLimit) {
      errors.push(`limit must be at least ${minLimit}`);
      return defaultLimit;
    }

    if (maxLimit && numLimit > maxLimit) {
      errors.push(`limit cannot exceed ${maxLimit}`);
      return maxLimit;
    }

    return numLimit;
  }

  private static validateMinTvl(minTvl: any, errors: string[]): number {
    if (!minTvl) return 0; // Default
    
    const numMinTvl = parseFloat(String(minTvl));
    
    if (isNaN(numMinTvl)) {
      errors.push('minTvl must be a number');
      return 0;
    }

    if (numMinTvl < 0) {
      errors.push('minTvl cannot be negative');
      return 0;
    }

    if (numMinTvl > 10000000000) { // 10B max
      errors.push('minTvl cannot exceed 10 billion');
      return 10000000000;
    }

    return numMinTvl;
  }

  private static validateMinPercentChange(minChange: any, errors: string[]): number {
    if (!minChange) return 1; // Default 1%
    
    const numMinChange = parseFloat(String(minChange));
    
    if (isNaN(numMinChange)) {
      errors.push('minPercentChange must be a number');
      return 1;
    }

    if (numMinChange < 0) {
      errors.push('minPercentChange cannot be negative');
      return 1;
    }

    if (numMinChange > 1000) { // 1000% max
      errors.push('minPercentChange cannot exceed 1000%');
      return 1000;
    }

    return numMinChange;
  }

  private static validateBoolean(value: any, defaultValue: boolean): boolean {
    if (value === undefined || value === null) return defaultValue;
    
    if (typeof value === 'boolean') return value;
    
    const stringValue = String(value).toLowerCase().trim();
    if (stringValue === 'true' || stringValue === '1' || stringValue === 'yes') return true;
    if (stringValue === 'false' || stringValue === '0' || stringValue === 'no') return false;
    
    return defaultValue;
  }

  /**
   * Sanitize string inputs to prevent injection attacks
   */
  private static sanitizeString(input: string, maxLength: number = 255): string | null {
    if (typeof input !== 'string') return null;
    
    // Remove potentially dangerous characters
    const cleaned = input
      .replace(/[<>\"'&\x00-\x1f\x7f-\x9f]/g, '') // Remove control chars and HTML chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();
    
    // Limit length
    const limited = cleaned.substring(0, maxLength);
    
    // Return null if empty after cleaning
    return limited.length > 0 ? limited : null;
  }

  /**
   * Validate if a number is within safe range
   */
  private static isValidNumber(value: any): boolean {
    if (typeof value !== 'number') return false;
    
    // Check for NaN, Infinity, and extremely large numbers
    return !isNaN(value) && 
           isFinite(value) && 
           value >= -1e15 && 
           value <= 1e15;
  }

  /**
   * Validate email format (if needed for future features)
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validate URL format (if needed for future features)
   */
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) && url.length <= 2048;
    } catch {
      return false;
    }
  }

  /**
   * Validate date string in ISO format
   */
  static validateISODate(dateString: string): boolean {
    if (typeof dateString !== 'string') return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && 
           date.getFullYear() >= 2000 && 
           date.getFullYear() <= new Date().getFullYear() + 10;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page: any, limit: any): { page: number; limit: number } {
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    
    return { page: pageNum, limit: limitNum };
  }

  /**
   * Validate sort parameters
   */
  static validateSort(sortBy: any, sortOrder: any, allowedFields: string[]): { sortBy: string; sortOrder: 'asc' | 'desc' } {
    const validSortBy = allowedFields.includes(String(sortBy)) ? String(sortBy) : allowedFields[0];
    const validSortOrder = ['asc', 'desc'].includes(String(sortOrder)?.toLowerCase()) 
      ? String(sortOrder).toLowerCase() as 'asc' | 'desc'
      : 'desc';
    
    return { sortBy: validSortBy, sortOrder: validSortOrder };
  }

  /**
   * Rate limiting validation helper
   */
  static validateRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    // This would integrate with your rate limiting implementation
    // For now, return true (allowing all requests)
    logger.debug('Rate limit check', { identifier, maxRequests, windowMs });
    return true;
  }

  /**
   * Cross-Site Scripting (XSS) prevention
   */
  static preventXSS(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * SQL Injection prevention (for future database queries)
   */
  static preventSQLInjection(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/['";\\]/g, '') // Remove common SQL injection chars
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comments
      .replace(/\*\//g, '')
      .replace(/\bUNION\b/gi, '')
      .replace(/\bSELECT\b/gi, '')
      .replace(/\bINSERT\b/gi, '')
      .replace(/\bUPDATE\b/gi, '')
      .replace(/\bDELETE\b/gi, '')
      .replace(/\bDROP\b/gi, '');
  }

  // Chain-specific validation helpers
  private static normalizeChainName(chain: any, errors: string[]): string {
    if (!chain || typeof chain !== 'string') {
      errors.push('chain parameter is required and must be a string');
      return '';
    }

    const cleanChain = chain.toLowerCase().trim();
    
    // Check if it's an alias first
    const normalizedChain = this.chainAliases[cleanChain as keyof typeof this.chainAliases] || cleanChain;
    
    if (!this.supportedChains.includes(normalizedChain)) {
      errors.push(
        `Unsupported chain: ${chain}. Supported: ${this.supportedChains.join(', ')}`
      );
      return '';
    }

    return normalizedChain;
  }

  private static validateSortBy(sortBy: any, allowedValues: string[], errors: string[]): string {
    if (!sortBy) return allowedValues[0]; // Default to first allowed value
    
    if (typeof sortBy !== 'string') {
      errors.push('sortBy must be a string');
      return allowedValues[0];
    }

    const cleanSortBy = sortBy.toLowerCase().trim();
    if (!allowedValues.includes(cleanSortBy)) {
      errors.push(`sortBy must be one of: ${allowedValues.join(', ')}`);
      return allowedValues[0];
    }

    return cleanSortBy;
  }

  /**
   * Health check for validation system
   */
  static healthCheck(): { status: string; validationRules: number } {
    return {
      status: 'healthy',
      validationRules: this.allowedCategories.length + this.allowedChains.length + this.allowedTimeframes.length + this.supportedChains.length
    };
  }
}

export default ValidationHelper;
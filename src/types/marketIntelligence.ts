/**
 * Market Intelligence Type Definitions
 * 
 * Complete TypeScript interfaces for the Market Intelligence Endpoints system.
 * These types define the structure for intelligent DeFi market analysis responses
 * with pre-calculated insights, recommendations, and benchmarks.
 */

/**
 * Intelligent Response Format
 * Standard structure for all market intelligence endpoints
 */
export interface IntelligentResponse<T> {
  success: boolean;
  data: T;
  intelligence: {
    insights: string[];
    recommendations: Recommendation[];
    context: MarketContext;
  };
  benchmarks: BenchmarkData;
  metadata: ResponseMetadata;
}

/**
 * Market Overview Data Structure
 */
export interface MarketOverviewData {
  totalTvl: number;
  totalProtocols: number;
  dominantChain: string;
  topProtocols: ProtocolSummary[];
  trends: {
    tvlGrowth7d: number;
    protocolsAdded7d: number;
    dominanceShift: string;
  };
}

/**
 * Chain TVL Breakdown
 */
export interface ChainTvl {
  chain: string;
  tvl: number;
  percentage: number;
}

/**
 * Protocol Summary with Intelligence
 */
export interface ProtocolSummary {
  id: string;
  name: string;
  tvl: number;
  marketShare: number;
  rank: number;
  growth7d: number;
  growth_1d?: number;
  dominanceReason: string;
  category?: string;
  chain?: string;
  chains?: string[];
  chainTvls?: ChainTvl[];
}

/**
 * Market Dominance Analysis
 */
export interface MarketDominanceData {
  protocolDominance: DominanceEntry[];
  chainDominance: ChainDominanceEntry[];
  categoryDominance: CategoryDominanceEntry[];
  concentrationIndex: number;
  diversity: {
    herfindahlIndex: number;
    shannonIndex: number;
  };
}

export interface DominanceEntry {
  id: string;
  name: string;
  tvl: number;
  dominancePercentage: number;
  category: string;
  chain: string;
  chains?: string[];
}

export interface ChainDominanceEntry {
  name: string;
  tvl: number;
  dominancePercentage: number;
  protocolCount: number;
  growth7d: number;
}

export interface CategoryDominanceEntry {
  category: string;
  tvl: number;
  dominancePercentage: number;
  protocolCount: number;
  averageTvlPerProtocol: number;
}

/**
 * Trending Protocols Analysis
 */
export interface TrendingProtocolsData {
  byTimeframe: {
    '24h': TrendingProtocol[];
    '7d': TrendingProtocol[];
    '30d': TrendingProtocol[];
  };
  overallTrending: TrendingProtocol[];
  emergingProtocols: EmergingProtocol[];
  momentum: {
    accelerating: TrendingProtocol[];
    decelerating: TrendingProtocol[];
  };
}

export interface TrendingProtocol {
  id: string;
  name: string;
  tvl: number;
  growthRate: number;
  momentumScore: number;
  trendingScore: number;
  rank: number;
  category: string;
  chain: string;
  logo?: string;
}

export interface EmergingProtocol {
  id: string;
  name: string;
  tvl: number;
  growthRate: number;
  emergenceScore: number;
  category: string;
  chain: string;
  daysActive: number;
}

/**
 * Market Movers Analysis
 */
export interface MarketMoversData {
  gainers: {
    tvl: MoverProtocol[];
    price: MoverProtocol[];
  };
  losers: {
    tvl: MoverProtocol[];
    price: MoverProtocol[];
  };
  volatility: {
    high: VolatilityProtocol[];
    low: VolatilityProtocol[];
  };
  correlations: CorrelationData;
}

export interface MoverProtocol {
  id: string;
  name: string;
  tvl: number;
  changePercent: number;
  changeAbsolute: number;
  reason: string;
  category: string;
  chain: string;
  logo?: string;
}

export interface VolatilityProtocol {
  id: string;
  name: string;
  tvl: number;
  volatilityScore: number;
  standardDeviation: number;
  category: string;
  chain: string;
}

export interface CorrelationData {
  tvlPriceCorrelation: number;
  strongPositiveCorrelations: ProtocolPair[];
  strongNegativeCorrelations: ProtocolPair[];
}

export interface ProtocolPair {
  protocol1: string;
  protocol2: string;
  correlation: number;
}

/**
 * Intelligence Components
 */
export interface Recommendation {
  type: 'opportunity' | 'warning' | 'strategy' | 'timing';
  description: string;
  confidence: number; // 0.0 to 1.0
  category?: string;
  timeframe?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface MarketContext {
  marketPhase: string;
  volatility: string;
  innovationAreas: string[];
  riskLevel?: string;
  sentiment?: string;
}

export interface BenchmarkData {
  sectorAverage: {
    tvl: number;
    growth7d: number;
    protocolsPerChain: number;
  };
  chainComparison: ChainBenchmark[];
  historicalContext: {
    allTimeHigh: number;
    yearToDate: number;
    marketCyclePhase: string;
  };
}

/**
 * Market benchmarks interface - extends BenchmarkData for market intelligence
 */
export interface MarketBenchmarks extends BenchmarkData {}

export interface ChainBenchmark {
  name: string;
  tvl: number;
  dominance: number;
  growth7d: number;
}

/**
 * Query Parameter Interfaces
 */
export interface MarketOverviewOptions {
  detail: 'minimal' | 'basic' | 'full';
  timeframe: '24h' | '7d' | '30d';
  categories?: string[];
  chains?: string[];
  limit?: number;
}

export interface DominanceOptions {
  detail: 'minimal' | 'basic' | 'full';
  limit: number;
}

export interface TrendingOptions {
  timeframes: ('24h' | '7d' | '30d')[];
  minTvl: number;
  categories?: string[];
  chains?: string[];
  limit: number;
}

export interface MoversOptions {
  timeframe: '24h' | '7d' | '30d';
  detail: 'minimal' | 'basic' | 'full';
  limit: number;
}

/**
 * External API Data Interfaces
 */
export interface Protocol {
  id: string;
  name: string;
  tvl?: number;
  category?: string;
  chain?: string;
  chains?: string[];
  growth7d?: number;
  growth30d?: number;
  logo?: string;
  url?: string;
  description?: string;
  gecko_id?: string;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  mcap?: number;
  slug?: string;
  parentProtocol?: string;
}

export interface Chain {
  name: string;
  tvl?: number;
  protocols?: Protocol[];
  gecko_id?: string;
  tokenSymbol?: string;
  cmcId?: string;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

export interface HistoricalData {
  data: Array<{
    date: string;
    tvl: number;
  }>;
}

export interface DefiLlamaProtocolsResponse extends Array<Protocol> {}

export interface DefiLlamaChainsResponse extends Array<Chain> {}

export interface DefiLlamaHistoricalResponse {
  [timestamp: string]: number;
}

/**
 * Internal Analysis Interfaces
 */
export interface MarketAnalysisData {
  protocols: Protocol[];
  chains: Chain[];
  categories: any[];
  totalTvl: number;
  growth24h: number;
}

export interface DominanceAnalysisData {
  protocolDominance: DominanceEntry[];
  chainDominance: ChainDominanceEntry[];
  categoryDominance: CategoryDominanceEntry[];
}

export interface TrendingAnalysisData {
  protocols: Protocol[];
  trendingAnalysis: TrendingProtocol[][];
  timeframes: string[];
}

export interface MovementAnalysisData {
  tvlMovers: MoversData;
  priceMovers: MoversData;
  timeframe: string;
}

export interface MoversData {
  gainers: MoverProtocol[];
  losers: MoverProtocol[];
}

/**
 * Service Layer Interfaces
 */
export interface MarketOverviewResult {
  overview: MarketOverviewData;
  intelligence: {
    insights: string[];
    recommendations: Recommendation[];
    dominanceShift: string;
    marketPhase: string;
    volatility: string;
    innovationAreas: string[];
  };
  benchmarks: BenchmarkData;
  metadata: {
    dataAge: number;
    coverage: number;
    lastUpdate: string;
  };
}

export interface MarketDominanceResult {
  dominance: MarketDominanceData;
  intelligence: DominanceInsights;
  benchmarks: BenchmarkData;
  metadata: {
    dataAge: number;
    coverage: number;
    lastUpdate: string;
  };
}

export interface TrendingProtocolsResult {
  trending: TrendingProtocolsData;
  intelligence: TrendingInsights;
  benchmarks: BenchmarkData;
  metadata: {
    dataAge: number;
    coverage: number;
    lastUpdate: string;
  };
}

export interface MarketMoversResult {
  movers: MarketMoversData;
  intelligence: MovementInsights;
  benchmarks: BenchmarkData;
  metadata: {
    dataAge: number;
    coverage: number;
    lastUpdate: string;
  };
}

/**
 * Insights Interfaces
 */
export interface MarketInsights {
  keyInsights: string[];
  recommendations: Recommendation[];
  dominanceShift: string;
  marketPhase: string;
  volatility: string;
  innovationAreas: string[];
}

export interface DominanceInsights {
  insights: string[];
  recommendations: Recommendation[];
  context: {
    concentrationLevel: string;
    diversityScore: number;
    competitionHealth: string;
  };
}

export interface TrendingInsights {
  insights: string[];
  recommendations: Recommendation[];
  context: {
    marketMomentum: string;
    trendStrength: string;
    sustainabilityScore: number;
  };
}

export interface MovementInsights {
  insights: string[];
  recommendations: Recommendation[];
  context: {
    marketVolatility: string;
    opportunityIndex: number;
    riskLevel: string;
  };
}

/**
 * Cache and Metadata Interfaces
 */
export interface ResponseMetadata {
  requestId: string;
  responseTime?: number;
  dataSource: string;
  calculatedAt: string;
  dataFreshness: number;
  methodology: string;
  coverage: number;
}

export interface CacheStrategy {
  ttl: number; // Time to live in milliseconds
  priority: 'high' | 'medium' | 'low';
  warmingEnabled: boolean;
  fallbackTtl: number; // Fallback TTL for stale data
}

export interface CacheMetadata {
  strategy: CacheStrategy;
  storedAt: string;
  ttl: number;
  dataSize: number;
}

export interface CacheStats {
  memory: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  redis: {
    memoryUsage: number;
    connectedClients: number;
  };
  strategies: Array<{ key: string } & CacheStrategy>;
}

/**
 * External Client Interfaces
 */
/**
 * Chain-Specific Endpoint Interfaces
 */
export interface ChainEcosystemData {
  chainInfo: ChainMetadata;
  protocols: ChainProtocolSummary[];
  chainMetrics: ChainMetrics;
  comparisons: ChainComparisons;
}

export interface ChainMetadata {
  name: string;
  displayName: string;
  totalTvl: number;
  protocolCount: number;
  dominancePercentage: number;
  nativeToken: string;
  explorer: string;
  rpcUrl?: string;
  growth1d: number;
  growth7d: number;
  growth30d?: number;
}

export interface ChainProtocolSummary extends ProtocolSummary {
  chainSpecificTvl: number;
  chainSpecificRank: number;
  chainDominancePercentage: number;
  crossChainTvl?: number;
}

export interface ChainMetrics {
  averageTvlPerProtocol: number;
  medianTvlPerProtocol: number;
  topCategory: string;
  diversityScore: number;
  concentrationIndex: number;
  maturityScore: number;
}

export interface ChainComparisons {
  rankAmongChains: number;
  tvlVsTotal: number;
  protocolsVsTotal: number;
}

export interface ChainsOverviewData {
  chains: ChainOverviewEntry[];
  totalTvl: number;
  totalChains: number;
  marketDistribution: MarketDistribution;
}

export interface ChainOverviewEntry {
  name: string;
  displayName: string;
  tvl: number;
  protocolCount: number;
  dominancePercentage: number;
  growth_1d: number;
  growth_7d: number;
  growth_30d: number;
  nativeToken: string;
}

export interface MarketDistribution {
  topChainDominance: number;
  top3ChainsDominance: number;
  diversityIndex: number;
}

// Query Options
export interface ChainEcosystemOptions {
  chain: string;
  detail: 'minimal' | 'basic' | 'full';
  limit: number;
  sortBy: 'tvl' | 'growth' | 'marketShare' | 'name';
  categories?: string[];
}

export interface ChainsOverviewOptions {
  sortBy: 'tvl' | 'name' | 'protocolCount' | 'dominance';
  limit: number;
}

// Service Results
export interface ChainEcosystemResult {
  ecosystem: ChainEcosystemData;
  intelligence: ChainInsights;
  benchmarks: ChainBenchmarks;
  metadata: {
    dataAge: number;
    coverage: number;
    lastUpdate: string;
  };
}

export interface ChainsOverviewResult {
  overview: ChainsOverviewData;
  metadata: {
    dataAge: number;
    coverage: number;
    lastUpdate: string;
  };
}

// Insights and Benchmarks
export interface ChainInsights {
  insights: string[];
  recommendations: Recommendation[];
  context: {
    chainHealth: string;
    growthTrend: string;
    competitivePosition: string;
    innovationLevel: string;
  };
}

export interface ChainBenchmarks extends BenchmarkData {
  chainSpecific: {
    protocolDensity: number;
    tvlEfficiency: number;
    growthMomentum: number;
    marketPositioning: string;
  };
}

export interface DefiLlamaClient {
  getProtocols(): Promise<Protocol[]>;
  getChains(): Promise<Chain[]>;
  getCategories(): Promise<any[]>;
  getHistoricalTVL(timeframe: string): Promise<HistoricalData | null>;
  getProtocolsPrices(): Promise<any>;
}
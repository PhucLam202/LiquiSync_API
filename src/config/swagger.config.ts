import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LiquidSync API - DeFi Data Aggregation",
      version: "1.0.0",
      description: `# LiquidSync API - Next-Generation DeFi Data Aggregation Platform

##  Overview

**LiquidSync** is a cutting-edge, enterprise-grade DeFi data aggregation API that seamlessly bridges the **Polkadot parachain ecosystem** with **Ethereum liquid staking infrastructure**. Our platform empowers developers with real-time, normalized, and highly reliable data from the most prominent DeFi protocols in the blockchain space.

## What We Offer

### Multi-Chain Data Integration
- **Polkadot Ecosystem**: Comprehensive data from parachains including Bifrost, Moonbeam, Acala, and more
- **Ethereum Infrastructure**: Real-time liquid staking data from Lido, Rocket Pool, and other leading protocols
- **Cross-Chain Intelligence**: Unified data layer across multiple blockchain networks

### Protocol Coverage
We aggregate data from **15+ top-tier DeFi protocols** including:
- **Bifrost** - Liquid staking and parachain infrastructure
- **Lido** - Ethereum liquid staking solutions
- **Rocket Pool** - Decentralized staking protocol
- **And many more** - Continuously expanding our ecosystem

## Key Features

### Cross-Chain Yield Intelligence
### LST Token Tracking
### Exchange Rate Conversions
### Stablecoin Analytics

## Getting Started

1. **API Key**: Get your free API key from our dashboard
2. **Documentation**: Explore our comprehensive API documentation
3. **SDK Integration**: Use our TypeScript SDK for rapid development
4. **Support**: 24/7 developer support and community assistance

---

*Built with ❤️ for the DeFi community*`,
      contact: {
        name: "LiquidSync API Team",
        url: "https://github.com/PhucLam202/defi-data-api",
        email: "support@liquidsync.dev"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: (() => {
      const isProduction = process.env.NODE_ENV === 'production';
      const isRailwayEnvironment = Boolean(process.env.RAILWAY_ENVIRONMENT);
      const port = process.env.PORT || 3000;
      const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
      
      // Check if we're running locally by checking for typical local indicators
      const isLocalhost = process.env.LOCAL_DEVELOPMENT === 'true' ||
                         (!isRailwayEnvironment && 
                          (process.env.HOST === 'localhost' || 
                           process.env.HOST === '127.0.0.1' ||
                           !process.env.RAILWAY_ENVIRONMENT));
      
      if (isLocalhost) {
        // Running locally (regardless of NODE_ENV)
        console.log(`  Local Development Mode: Using localhost as primary server`);
        const servers = [
          {
            url: `http://localhost:${port}`,
            description: 'Local development server (primary)'
          }
        ];
        
        // Add Railway server as secondary option if domain is available
        if (railwayDomain) {
          servers.push({
            url: `https://${railwayDomain}`,
            description: 'Railway server (secondary)'
          });
        }
        
        console.log(`  Available servers:`, servers.map(s => `${s.url} (${s.description})`).join(', '));
        return servers;
      } else {
        // Running on Railway
        const railwayUrl = railwayDomain 
          ? `https://${railwayDomain}`
          : 'https://liquidsyncapi-staging.up.railway.app';
        
        console.log(`  Railway Mode: Using ${railwayUrl}`);
        return [
          {
            url: railwayUrl,
            description: `Railway ${isProduction ? 'production' : 'staging'} server`
          }
        ];
      }
    })(),
    tags: [
      {
        name: "Bifrost Protocol",
        description: "Complete Bifrost liquid staking protocol API including yields data and vToken exchange rates with conversion services"
      },
      {
        name: "TVL",
        description: "Total Value Locked analytics and blockchain ecosystem analysis"
      },
      {
        name: "Stablecoins",
        description: "Comprehensive stablecoin ecosystem analytics"
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-KEY"
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    externalDocs: {
      description: "Find more information and API guides",
      url: "https://github.com/PhucLam202/defi-data-api"
    }
  },
  apis: [
    "./src/routes/**/*.ts",
    "./src/routes/**/*.js", 
    "./src/controllers/**/*.ts",
    "./src/controllers/**/*.js"
  ],
};

export const openapiSpecification = swaggerJSDoc(options);
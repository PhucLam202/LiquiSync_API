// File: src/services/redis/redisService.ts
import { Redis } from "ioredis";
import "dotenv/config";

class RedisClient {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      // Use REDIS_URL if available, otherwise fall back to individual parameters
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        throw new Error("REDIS_URL is not set");
      }

      RedisClient.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
      });

      // Handle connection events
      RedisClient.instance.on("connect", () => {
        console.log("Redis connected successfully");
      });

      RedisClient.instance.on("error", (error) => {
        console.error("Redis connection error:", error);
      });
    }

    return RedisClient.instance;
  }
}

export class RedisService {
  private static redis = RedisClient.getInstance();

  static async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error("Redis GET error:", error);
      throw error;
    }
  }

  static async set(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error("Redis SET error:", error);
      throw error;
    }
  }

  static async setex(
    key: string,
    ttlSeconds: number,
    value: string
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, value);
    } catch (error) {
      console.error("Redis SETEX error:", error);
      throw error;
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("Redis DEL error:", error);
      throw error;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis EXISTS error:", error);
      throw error;
    }
  }

  static async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      console.error("Redis INCR error:", error);
      throw error;
    }
  }

  static async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error("Redis EXPIRE error:", error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
    } catch (error) {
      console.error("Redis disconnect error:", error);
      throw error;
    }
  }
}

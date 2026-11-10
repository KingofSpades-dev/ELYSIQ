// src/lib/soul/provider.ts

import { UserMemory, MemoryEvent, SoulProvider } from './types';

// Helper to get Redis instance
async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

// In-Memory fallback storage for local sandbox development
const IN_MEMORY_DB = new Map<string, UserMemory>();
const IN_MEMORY_EVENTS = new Map<string, MemoryEvent[]>();

export class HybridSoulProvider implements SoulProvider {
  private cachePrefix = 'elysiq:soul:cache:';
  private dbPrefix = 'elysiq:soul:db:';
  private eventPrefix = 'elysiq:soul:events:';

  /**
   * Load user memory by wallet address
   */
  async load(wallet: string): Promise<UserMemory | null> {
    const redis = await getRedis();
    const cleanWallet = wallet.toLowerCase();

    if (redis) {
      try {
        // 1. Try to read from fast Redis Cache
        const cached = await redis.get<UserMemory>(`${this.cachePrefix}${cleanWallet}`);
        if (cached) {
          console.log(`[SOUL] Cache HIT for wallet: ${cleanWallet}`);
          return cached;
        }

        // 2. Cache Miss - Load from "Postgres" permanent storage (simulated via Redis DB namespace)
        console.log(`[SOUL] Cache MISS for wallet: ${cleanWallet}, loading from DB`);
        const dbData = await redis.get<UserMemory>(`${this.dbPrefix}${cleanWallet}`);
        
        if (dbData) {
          // Write back to Cache with TTL (1 hour)
          await redis.set(`${this.cachePrefix}${cleanWallet}`, dbData, { ex: 3600 });
          return dbData;
        }
      } catch (err) {
        console.error('[SOUL] Failed to load from Redis, falling back to In-Memory:', err);
      }
    }

    // Fallback to In-Memory storage
    const mem = IN_MEMORY_DB.get(cleanWallet) || null;
    if (mem) {
      // Load raw events to build up the object
      mem.events = IN_MEMORY_EVENTS.get(cleanWallet) || [];
    }
    return mem;
  }

  /**
   * Save user memory to permanent storage and invalidates/updates cache
   */
  async save(wallet: string, mem: UserMemory): Promise<void> {
    const redis = await getRedis();
    const cleanWallet = wallet.toLowerCase();
    mem.updatedAt = new Date().toISOString();

    if (redis) {
      try {
        // 1. Save to permanent DB storage (simulated Postgres namespace)
        await redis.set(`${this.dbPrefix}${cleanWallet}`, mem);

        // 2. Write-through to Redis Cache with TTL (1 hour)
        await redis.set(`${this.cachePrefix}${cleanWallet}`, mem, { ex: 3600 });
        console.log(`[SOUL] Saved memory & updated cache for wallet: ${cleanWallet}`);
        return;
      } catch (err) {
        console.error('[SOUL] Failed to save to Redis:', err);
      }
    }

    // Fallback to In-Memory
    IN_MEMORY_DB.set(cleanWallet, mem);
    IN_MEMORY_EVENTS.set(cleanWallet, mem.events || []);
  }

  /**
   * Log an event to the event sourcing stream
   */
  async logEvent(wallet: string, event: Omit<MemoryEvent, 'id' | 'timestamp'>): Promise<void> {
    const redis = await getRedis();
    const cleanWallet = wallet.toLowerCase();
    
    const newEvent: MemoryEvent = {
      ...event,
      id: 'evt_' + Math.random().toString(36).slice(2, 11),
      timestamp: new Date().toISOString()
    };

    if (redis) {
      try {
        const key = `${this.eventPrefix}${cleanWallet}`;
        const existingEvents = await redis.get<MemoryEvent[]>(key) || [];
        existingEvents.push(newEvent);
        await redis.set(key, existingEvents);

        // Invalidate cache to force summary rebuild on next load/reflection
        await redis.del(`${this.cachePrefix}${cleanWallet}`);
        console.log(`[SOUL] Logged event ${newEvent.kind} and invalidated cache for: ${cleanWallet}`);
        return;
      } catch (err) {
        console.error('[SOUL] Failed to log event to Redis:', err);
      }
    }

    // Fallback to In-Memory
    const existing = IN_MEMORY_EVENTS.get(cleanWallet) || [];
    existing.push(newEvent);
    IN_MEMORY_EVENTS.set(cleanWallet, existing);
    
    // Update local memory if exists
    const mem = IN_MEMORY_DB.get(cleanWallet);
    if (mem) {
      mem.events = existing;
      IN_MEMORY_DB.set(cleanWallet, mem);
    }
  }

  /**
   * Helper to initialize a default blank memory object for a new wallet
   */
  createDefaultMemory(wallet: string): UserMemory {
    return {
      wallet: wallet.toLowerCase(),
      profile: {
        role: 'New User',
        summary: 'This is your first conversation with this user.',
        lastConfirmedAt: new Date().toISOString()
      },
      preferences: {
        riskTolerance: 'medium',
        likesMemecoins: false,
        customPreferences: {}
      },
      security: {
        rugsAvoided: 0,
        riskyProjectsViewed: [],
        preferredChains: ['Elysium']
      },
      social: {
        tonePreference: 'Nietzschean',
        pastSalutations: []
      },
      events: [],
      updatedAt: new Date().toISOString(),
      appearance: {
        bodyVariant: 'terracotta',
        accessories: [],
        background: 'default',
        defaultMood: 'NEUTRAL',
        personalityFlavor: 'standard'
      }
    };
  }
}

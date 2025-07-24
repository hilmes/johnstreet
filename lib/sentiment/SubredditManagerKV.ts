import { kv } from '@vercel/kv'
import { SubredditConfig, SubredditTag, SubredditStats } from './SubredditManager'

const KV_KEYS = {
  subreddits: 'subreddits:all',
  tags: 'tags:all',
  subreddit: (name: string) => `subreddit:${name}`,
  tag: (name: string) => `tag:${name}`,
  stats: 'stats:current',
  initialized: 'system:initialized'
}

export class SubredditManagerKV {
  private initialized = false

  constructor() {
    // Auto-initialize on first use
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    const isInitialized = await kv.get(KV_KEYS.initialized)
    if (!isInitialized) {
      await this.initializeDefaultData()
      await kv.set(KV_KEYS.initialized, true)
    }
    
    this.initialized = true
  }

  private async initializeDefaultData(): Promise<void> {
    // Initialize default subreddits
    const defaultSubreddits: SubredditConfig[] = [
      // Main crypto communities
      {
        name: 'CryptoCurrency',
        displayName: 'r/CryptoCurrency',
        tags: ['mainstream', 'news', 'discussion'],
        priority: 'high',
        scanFrequency: 'hourly',
        active: true,
        riskLevel: 'safe',
        description: 'Main cryptocurrency discussion subreddit',
        addedAt: Date.now(),
        customFilters: {
          minScore: 10,
          maxAge: 24,
          newProjectKeywords: ['new project', 'new coin', 'just launched', 'fresh launch', 'brand new'],
          keywords: ['announcement', 'launch', 'upcoming', 'presale']
        }
      },
      {
        name: 'Bitcoin',
        displayName: 'r/Bitcoin',
        tags: ['bitcoin', 'mainstream', 'news'],
        priority: 'high',
        scanFrequency: 'hourly',
        active: true,
        riskLevel: 'safe',
        description: 'Bitcoin-focused community',
        addedAt: Date.now()
      },
      {
        name: 'ethereum',
        displayName: 'r/ethereum',
        tags: ['ethereum', 'defi', 'mainstream'],
        priority: 'high',
        scanFrequency: 'hourly',
        active: true,
        riskLevel: 'safe',
        description: 'Ethereum community and development',
        addedAt: Date.now()
      },

      // Pump-focused subreddits (high risk)
      {
        name: 'CryptoMoonShots',
        displayName: 'r/CryptoMoonShots',
        tags: ['pump', 'high-risk', 'new-coins', 'speculation'],
        priority: 'critical',
        scanFrequency: 'realtime',
        active: true,
        riskLevel: 'high_risk',
        description: 'High-risk pump and speculation subreddit',
        addedAt: Date.now(),
        customFilters: {
          minScore: 5,
          maxAge: 6,
          newProjectKeywords: [
            'new project', 'new coin', 'new token', 'just launched', 'fresh launch', 
            'brand new', 'gem found', 'hidden gem', 'early project', 'stealth launch',
            'fair launch', 'presale live', 'ido launching', 'new listing'
          ],
          pumpKeywords: [
            'moon', 'moonshot', 'rocket', 'pump', '100x', '1000x', 'diamond hands',
            'ape in', 'yolo', 'to the moon', 'lambo', 'get rich', 'easy money'
          ],
          keywords: ['gem', 'moonshot', 'pump', 'launch', 'presale', 'ido']
        }
      },
      {
        name: 'satoshistreetbets',
        displayName: 'r/SatoshiStreetBets',
        tags: ['pump', 'gambling', 'high-risk', 'memes'],
        priority: 'critical',
        scanFrequency: 'realtime',
        active: true,
        riskLevel: 'high_risk',
        description: 'Crypto gambling and pump community',
        addedAt: Date.now()
      },
      {
        name: 'crypto_bets',
        displayName: 'r/crypto_bets',
        tags: ['pump', 'gambling', 'high-risk'],
        priority: 'high',
        scanFrequency: 'hourly',
        active: true,
        riskLevel: 'high_risk',
        description: 'Cryptocurrency betting and speculation',
        addedAt: Date.now()
      },
      {
        name: 'pennycrypto',
        displayName: 'r/pennycrypto',
        tags: ['pump', 'penny-stocks', 'high-risk', 'new-coins'],
        priority: 'high',
        scanFrequency: 'hourly',
        active: true,
        riskLevel: 'high_risk',
        description: 'Penny cryptocurrency discussions',
        addedAt: Date.now()
      },
      {
        name: 'cryptomarsshots',
        displayName: 'r/cryptomarsshots',
        tags: ['pump', 'speculation', 'high-risk'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'high_risk',
        description: 'Speculative crypto investments',
        addedAt: Date.now()
      },
      {
        name: 'shitcoinmoonshots',
        displayName: 'r/shitcoinmoonshots',
        tags: ['pump', 'shitcoins', 'high-risk', 'speculation'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'high_risk',
        description: 'High-risk speculative token discussions',
        addedAt: Date.now()
      },

      // Specific coin communities
      {
        name: 'dogecoin',
        displayName: 'r/dogecoin',
        tags: ['dogecoin', 'memes', 'community'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'moderate',
        description: 'Dogecoin community',
        addedAt: Date.now()
      },
      {
        name: 'cardano',
        displayName: 'r/cardano',
        tags: ['cardano', 'ada', 'development'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'safe',
        description: 'Cardano blockchain community',
        addedAt: Date.now()
      },
      {
        name: 'solana',
        displayName: 'r/solana',
        tags: ['solana', 'sol', 'development', 'defi'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'safe',
        description: 'Solana blockchain community',
        addedAt: Date.now()
      },

      // DeFi and NFT communities
      {
        name: 'defi',
        displayName: 'r/defi',
        tags: ['defi', 'finance', 'yield-farming'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'moderate',
        description: 'Decentralized finance discussions',
        addedAt: Date.now()
      },
      {
        name: 'NFT',
        displayName: 'r/NFT',
        tags: ['nft', 'collectibles', 'art'],
        priority: 'low',
        scanFrequency: 'weekly',
        active: true,
        riskLevel: 'moderate',
        description: 'NFT and digital collectibles',
        addedAt: Date.now()
      },

      // Trading communities
      {
        name: 'altcoin',
        displayName: 'r/altcoin',
        tags: ['altcoins', 'trading', 'analysis'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'moderate',
        description: 'Alternative cryptocurrency discussions',
        addedAt: Date.now()
      },
      {
        name: 'binance',
        displayName: 'r/binance',
        tags: ['binance', 'exchange', 'trading'],
        priority: 'medium',
        scanFrequency: 'daily',
        active: true,
        riskLevel: 'safe',
        description: 'Binance exchange community',
        addedAt: Date.now()
      },
      {
        name: 'coinbase',
        displayName: 'r/coinbase',
        tags: ['coinbase', 'exchange', 'trading'],
        priority: 'low',
        scanFrequency: 'weekly',
        active: true,
        riskLevel: 'safe',
        description: 'Coinbase exchange community',
        addedAt: Date.now()
      }
    ]

    // Initialize default tags
    const defaultTags: SubredditTag[] = [
      { name: 'mainstream', color: '#10B981', description: 'Established crypto communities', count: 0 },
      { name: 'pump', color: '#EF4444', description: 'Pump and dump focused', count: 0 },
      { name: 'high-risk', color: '#DC2626', description: 'High-risk speculation', count: 0 },
      { name: 'news', color: '#3B82F6', description: 'News and updates', count: 0 },
      { name: 'trading', color: '#F59E0B', description: 'Trading focused', count: 0 },
      { name: 'defi', color: '#8B5CF6', description: 'Decentralized finance', count: 0 },
      { name: 'development', color: '#06B6D4', description: 'Technical development', count: 0 },
      { name: 'memes', color: '#F97316', description: 'Meme and community content', count: 0 },
      { name: 'new-coins', color: '#EC4899', description: 'New cryptocurrency projects', count: 0 },
      { name: 'speculation', color: '#EF4444', description: 'Speculative investments', count: 0 },
      { name: 'bitcoin', color: '#F7931A', description: 'Bitcoin related', count: 0 },
      { name: 'ethereum', color: '#627EEA', description: 'Ethereum related', count: 0 },
      { name: 'exchange', color: '#6B7280', description: 'Exchange platforms', count: 0 },
      { name: 'nft', color: '#A855F7', description: 'Non-fungible tokens', count: 0 },
      { name: 'gambling', color: '#B91C1C', description: 'Gambling and high-risk bets', count: 0 }
    ]

    // Store in KV
    const subredditMap = new Map(defaultSubreddits.map(s => [s.name, s]))
    const tagMap = new Map(defaultTags.map(t => [t.name, t]))

    await kv.set(KV_KEYS.subreddits, Object.fromEntries(subredditMap))
    await kv.set(KV_KEYS.tags, Object.fromEntries(tagMap))

    // Store individual items for faster access
    for (const subreddit of defaultSubreddits) {
      await kv.set(KV_KEYS.subreddit(subreddit.name), subreddit)
    }
    
    for (const tag of defaultTags) {
      await kv.set(KV_KEYS.tag(tag.name), tag)
    }

    await this.updateTagCounts()
  }

  private async updateTagCounts(): Promise<void> {
    const subreddits = await this.getAllSubreddits()
    const tags = await this.getAllTags()
    
    // Reset counts
    const tagCounts = new Map<string, number>()
    for (const tag of tags) {
      tagCounts.set(tag.name, 0)
    }

    // Count occurrences
    for (const subreddit of subreddits) {
      for (const tagName of subreddit.tags) {
        tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1)
      }
    }

    // Update tags with new counts
    const updatedTags = tags.map(tag => ({
      ...tag,
      count: tagCounts.get(tag.name) || 0
    }))

    // Store updated tags
    const tagMap = new Map(updatedTags.map(t => [t.name, t]))
    await kv.set(KV_KEYS.tags, Object.fromEntries(tagMap))
    
    for (const tag of updatedTags) {
      await kv.set(KV_KEYS.tag(tag.name), tag)
    }
  }

  // Subreddit management methods
  async addSubreddit(config: Omit<SubredditConfig, 'addedAt'>): Promise<boolean> {
    await this.ensureInitialized()
    
    const existing = await kv.get(KV_KEYS.subreddit(config.name))
    if (existing) {
      return false // Already exists
    }

    const fullConfig: SubredditConfig = {
      ...config,
      addedAt: Date.now()
    }

    // Store individual subreddit
    await kv.set(KV_KEYS.subreddit(config.name), fullConfig)
    
    // Update the main subreddits map
    const allSubreddits = await kv.get(KV_KEYS.subreddits) || {}
    allSubreddits[config.name] = fullConfig
    await kv.set(KV_KEYS.subreddits, allSubreddits)
    
    await this.updateTagCounts()
    return true
  }

  async updateSubreddit(name: string, updates: Partial<SubredditConfig>): Promise<boolean> {
    await this.ensureInitialized()
    
    const existing = await kv.get(KV_KEYS.subreddit(name)) as SubredditConfig
    if (!existing) {
      return false
    }

    const updated = { ...existing, ...updates }
    
    // Store updated subreddit
    await kv.set(KV_KEYS.subreddit(name), updated)
    
    // Update the main subreddits map
    const allSubreddits = await kv.get(KV_KEYS.subreddits) || {}
    allSubreddits[name] = updated
    await kv.set(KV_KEYS.subreddits, allSubreddits)
    
    await this.updateTagCounts()
    return true
  }

  async removeSubreddit(name: string): Promise<boolean> {
    await this.ensureInitialized()
    
    const existing = await kv.get(KV_KEYS.subreddit(name))
    if (!existing) {
      return false
    }

    // Remove individual subreddit
    await kv.del(KV_KEYS.subreddit(name))
    
    // Update the main subreddits map
    const allSubreddits = await kv.get(KV_KEYS.subreddits) || {}
    delete allSubreddits[name]
    await kv.set(KV_KEYS.subreddits, allSubreddits)
    
    await this.updateTagCounts()
    return true
  }

  async toggleSubreddit(name: string): Promise<boolean> {
    await this.ensureInitialized()
    
    const subreddit = await kv.get(KV_KEYS.subreddit(name)) as SubredditConfig
    if (!subreddit) {
      return false
    }

    const updated = { ...subreddit, active: !subreddit.active }
    
    // Store updated subreddit
    await kv.set(KV_KEYS.subreddit(name), updated)
    
    // Update the main subreddits map
    const allSubreddits = await kv.get(KV_KEYS.subreddits) || {}
    allSubreddits[name] = updated
    await kv.set(KV_KEYS.subreddits, allSubreddits)
    
    return true
  }

  // Retrieval methods
  async getSubreddit(name: string): Promise<SubredditConfig | undefined> {
    await this.ensureInitialized()
    return await kv.get(KV_KEYS.subreddit(name)) as SubredditConfig | undefined
  }

  async getAllSubreddits(): Promise<SubredditConfig[]> {
    await this.ensureInitialized()
    const subreddits = await kv.get(KV_KEYS.subreddits) || {}
    return Object.values(subreddits) as SubredditConfig[]
  }

  async getActiveSubreddits(): Promise<SubredditConfig[]> {
    const allSubreddits = await this.getAllSubreddits()
    return allSubreddits.filter(s => s.active)
  }

  async getSubredditsByTag(tag: string): Promise<SubredditConfig[]> {
    const allSubreddits = await this.getAllSubreddits()
    return allSubreddits.filter(s => s.tags.includes(tag))
  }

  async getSubredditsByRiskLevel(riskLevel: SubredditConfig['riskLevel']): Promise<SubredditConfig[]> {
    const allSubreddits = await this.getAllSubreddits()
    return allSubreddits.filter(s => s.riskLevel === riskLevel)
  }

  async getSubredditsByPriority(priority: SubredditConfig['priority']): Promise<SubredditConfig[]> {
    const allSubreddits = await this.getAllSubreddits()
    return allSubreddits.filter(s => s.priority === priority)
  }

  async getSubredditsForScanning(frequency: SubredditConfig['scanFrequency']): Promise<SubredditConfig[]> {
    const activeSubreddits = await this.getActiveSubreddits()
    return activeSubreddits.filter(s => s.scanFrequency === frequency)
  }

  // Tag management methods
  async addTag(tag: SubredditTag): Promise<boolean> {
    await this.ensureInitialized()
    
    const existing = await kv.get(KV_KEYS.tag(tag.name))
    if (existing) {
      return false
    }
    
    const newTag = { ...tag, count: 0 }
    
    // Store individual tag
    await kv.set(KV_KEYS.tag(tag.name), newTag)
    
    // Update the main tags map
    const allTags = await kv.get(KV_KEYS.tags) || {}
    allTags[tag.name] = newTag
    await kv.set(KV_KEYS.tags, allTags)
    
    await this.updateTagCounts()
    return true
  }

  async updateTag(name: string, updates: Partial<SubredditTag>): Promise<boolean> {
    await this.ensureInitialized()
    
    const existing = await kv.get(KV_KEYS.tag(name)) as SubredditTag
    if (!existing) {
      return false
    }

    const updated = { ...existing, ...updates }
    
    // Store updated tag
    await kv.set(KV_KEYS.tag(name), updated)
    
    // Update the main tags map
    const allTags = await kv.get(KV_KEYS.tags) || {}
    allTags[name] = updated
    await kv.set(KV_KEYS.tags, allTags)
    
    return true
  }

  async removeTag(name: string): Promise<boolean> {
    await this.ensureInitialized()
    
    const existing = await kv.get(KV_KEYS.tag(name))
    if (!existing) {
      return false
    }

    // Remove tag from all subreddits first
    const allSubreddits = await this.getAllSubreddits()
    for (const subreddit of allSubreddits) {
      if (subreddit.tags.includes(name)) {
        const updatedTags = subreddit.tags.filter(t => t !== name)
        await this.updateSubreddit(subreddit.name, { tags: updatedTags })
      }
    }

    // Remove individual tag
    await kv.del(KV_KEYS.tag(name))
    
    // Update the main tags map
    const allTags = await kv.get(KV_KEYS.tags) || {}
    delete allTags[name]
    await kv.set(KV_KEYS.tags, allTags)
    
    await this.updateTagCounts()
    return true
  }

  async getAllTags(): Promise<SubredditTag[]> {
    await this.ensureInitialized()
    const tags = await kv.get(KV_KEYS.tags) || {}
    return Object.values(tags) as SubredditTag[]
  }

  async getTag(name: string): Promise<SubredditTag | undefined> {
    await this.ensureInitialized()
    return await kv.get(KV_KEYS.tag(name)) as SubredditTag | undefined
  }

  // Statistics methods
  async getStats(): Promise<SubredditStats> {
    const allSubreddits = await this.getAllSubreddits()
    const activeSubreddits = await this.getActiveSubreddits()
    const highRiskSubreddits = await this.getSubredditsByRiskLevel('high_risk')

    const totalScans = allSubreddits.reduce((sum, s) => sum + (s.totalPosts || 0), 0)
    const avgSentiment = allSubreddits.length > 0 ? 
      allSubreddits.reduce((sum, s) => sum + (s.avgSentiment || 0), 0) / allSubreddits.length : 0

    const topTags = (await this.getAllTags())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalSubreddits: allSubreddits.length,
      activeSubreddits: activeSubreddits.length,
      highRiskSubreddits: highRiskSubreddits.length,
      totalScans,
      avgSentiment,
      topTags
    }
  }

  // Validation methods
  async validateSubredditName(name: string): Promise<{ valid: boolean; error?: string }> {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Subreddit name is required' }
    }

    const cleanName = name.replace(/^r\//, '').trim()
    
    if (cleanName.length < 2) {
      return { valid: false, error: 'Subreddit name must be at least 2 characters' }
    }

    if (cleanName.length > 21) {
      return { valid: false, error: 'Subreddit name must be 21 characters or less' }
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanName)) {
      return { valid: false, error: 'Subreddit name can only contain letters, numbers, and underscores' }
    }

    const existing = await this.getSubreddit(cleanName)
    if (existing) {
      return { valid: false, error: 'Subreddit is already being tracked' }
    }

    return { valid: true }
  }

  // Export/Import methods
  async exportConfiguration(): Promise<string> {
    const subreddits = await this.getAllSubreddits()
    const tags = await this.getAllTags()
    
    const config = {
      subreddits: subreddits.map(s => [s.name, s]),
      tags: tags.map(t => [t.name, t]),
      exportedAt: Date.now()
    }
    return JSON.stringify(config, null, 2)
  }

  async importConfiguration(configJson: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = JSON.parse(configJson)
      
      if (!config.subreddits || !config.tags) {
        return { success: false, error: 'Invalid configuration format' }
      }

      // Clear existing data
      await kv.del(KV_KEYS.subreddits)
      await kv.del(KV_KEYS.tags)

      // Import tags first
      const tagMap = new Map()
      for (const [name, tag] of config.tags) {
        tagMap.set(name, tag)
        await kv.set(KV_KEYS.tag(name), tag)
      }
      await kv.set(KV_KEYS.tags, Object.fromEntries(tagMap))

      // Import subreddits
      const subredditMap = new Map()
      for (const [name, subreddit] of config.subreddits) {
        subredditMap.set(name, subreddit)
        await kv.set(KV_KEYS.subreddit(name), subreddit)
      }
      await kv.set(KV_KEYS.subreddits, Object.fromEntries(subredditMap))

      await this.updateTagCounts()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to parse configuration file' }
    }
  }

  // Search and filter methods
  async searchSubreddits(query: string): Promise<SubredditConfig[]> {
    const allSubreddits = await this.getAllSubreddits()
    const lowerQuery = query.toLowerCase()
    return allSubreddits.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.displayName.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery) ||
      s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  // Bulk operations
  async bulkUpdateSubreddits(names: string[], updates: Partial<SubredditConfig>): Promise<number> {
    let updated = 0
    for (const name of names) {
      if (await this.updateSubreddit(name, updates)) {
        updated++
      }
    }
    return updated
  }

  async bulkToggleSubreddits(names: string[]): Promise<number> {
    let toggled = 0
    for (const name of names) {
      if (await this.toggleSubreddit(name)) {
        toggled++
      }
    }
    return toggled
  }

  // Schedule-based retrieval
  async getSubredditsToScan(currentTime: number = Date.now()): Promise<SubredditConfig[]> {
    const activeSubreddits = await this.getActiveSubreddits()
    const toScan: SubredditConfig[] = []

    for (const subreddit of activeSubreddits) {
      const lastScanned = subreddit.lastScanned || 0
      const timeSinceLastScan = currentTime - lastScanned

      let shouldScan = false
      switch (subreddit.scanFrequency) {
        case 'realtime':
          shouldScan = timeSinceLastScan > 5 * 60 * 1000 // 5 minutes
          break
        case 'hourly':
          shouldScan = timeSinceLastScan > 60 * 60 * 1000 // 1 hour
          break
        case 'daily':
          shouldScan = timeSinceLastScan > 24 * 60 * 60 * 1000 // 24 hours
          break
        case 'weekly':
          shouldScan = timeSinceLastScan > 7 * 24 * 60 * 60 * 1000 // 7 days
          break
      }

      if (shouldScan) {
        toScan.push(subreddit)
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return toScan.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
  }

  // Update scan results
  async updateScanResults(name: string, results: {
    totalPosts?: number
    avgSentiment?: number
    pumpSignalsDetected?: number
  }): Promise<boolean> {
    const subreddit = await this.getSubreddit(name)
    if (!subreddit) {
      return false
    }

    const updates: Partial<SubredditConfig> = {
      lastScanned: Date.now()
    }
    
    if (results.totalPosts !== undefined) updates.totalPosts = results.totalPosts
    if (results.avgSentiment !== undefined) updates.avgSentiment = results.avgSentiment
    if (results.pumpSignalsDetected !== undefined) updates.pumpSignalsDetected = results.pumpSignalsDetected

    return await this.updateSubreddit(name, updates)
  }
}

// Export singleton instance
export const subredditManagerKV = new SubredditManagerKV()
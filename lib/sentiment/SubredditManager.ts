export interface SubredditConfig {
  name: string
  displayName: string
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  scanFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  active: boolean
  riskLevel: 'safe' | 'moderate' | 'risky' | 'high_risk'
  description?: string
  lastScanned?: number
  totalPosts?: number
  avgSentiment?: number
  pumpSignalsDetected?: number
  addedBy?: string
  addedAt: number
  customFilters?: {
    minScore?: number
    maxAge?: number // hours
    requiresFlairs?: string[]
    excludeFlairs?: string[]
    keywords?: string[]
    excludeKeywords?: string[]
    newProjectKeywords?: string[]
    pumpKeywords?: string[]
  }
}

export interface SubredditTag {
  name: string
  color: string
  description: string
  count: number
}

export interface SubredditStats {
  totalSubreddits: number
  activeSubreddits: number
  highRiskSubreddits: number
  totalScans: number
  avgSentiment: number
  topTags: SubredditTag[]
}

export class SubredditManager {
  private subreddits: Map<string, SubredditConfig> = new Map()
  private tags: Map<string, SubredditTag> = new Map()

  constructor() {
    this.initializeDefaultSubreddits()
    this.initializeDefaultTags()
  }

  private initializeDefaultSubreddits(): void {
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

    for (const subreddit of defaultSubreddits) {
      this.subreddits.set(subreddit.name, subreddit)
    }
  }

  private initializeDefaultTags(): void {
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

    for (const tag of defaultTags) {
      this.tags.set(tag.name, tag)
    }

    this.updateTagCounts()
  }

  private updateTagCounts(): void {
    // Reset counts
    for (const tag of this.tags.values()) {
      tag.count = 0
    }

    // Count occurrences
    for (const subreddit of this.subreddits.values()) {
      for (const tagName of subreddit.tags) {
        const tag = this.tags.get(tagName)
        if (tag) {
          tag.count++
        }
      }
    }
  }

  // Subreddit management methods
  addSubreddit(config: Omit<SubredditConfig, 'addedAt'>): boolean {
    if (this.subreddits.has(config.name)) {
      return false // Already exists
    }

    const fullConfig: SubredditConfig = {
      ...config,
      addedAt: Date.now()
    }

    this.subreddits.set(config.name, fullConfig)
    this.updateTagCounts()
    return true
  }

  updateSubreddit(name: string, updates: Partial<SubredditConfig>): boolean {
    const existing = this.subreddits.get(name)
    if (!existing) {
      return false
    }

    const updated = { ...existing, ...updates }
    this.subreddits.set(name, updated)
    this.updateTagCounts()
    return true
  }

  removeSubreddit(name: string): boolean {
    const deleted = this.subreddits.delete(name)
    if (deleted) {
      this.updateTagCounts()
    }
    return deleted
  }

  toggleSubreddit(name: string): boolean {
    const subreddit = this.subreddits.get(name)
    if (!subreddit) {
      return false
    }

    subreddit.active = !subreddit.active
    return true
  }

  // Retrieval methods
  getSubreddit(name: string): SubredditConfig | undefined {
    return this.subreddits.get(name)
  }

  getAllSubreddits(): SubredditConfig[] {
    return Array.from(this.subreddits.values())
  }

  getActiveSubreddits(): SubredditConfig[] {
    return Array.from(this.subreddits.values()).filter(s => s.active)
  }

  getSubredditsByTag(tag: string): SubredditConfig[] {
    return Array.from(this.subreddits.values()).filter(s => s.tags.includes(tag))
  }

  getSubredditsByRiskLevel(riskLevel: SubredditConfig['riskLevel']): SubredditConfig[] {
    return Array.from(this.subreddits.values()).filter(s => s.riskLevel === riskLevel)
  }

  getSubredditsByPriority(priority: SubredditConfig['priority']): SubredditConfig[] {
    return Array.from(this.subreddits.values()).filter(s => s.priority === priority)
  }

  getSubredditsForScanning(frequency: SubredditConfig['scanFrequency']): SubredditConfig[] {
    return this.getActiveSubreddits().filter(s => s.scanFrequency === frequency)
  }

  // Tag management methods
  addTag(tag: SubredditTag): boolean {
    if (this.tags.has(tag.name)) {
      return false
    }
    
    this.tags.set(tag.name, { ...tag, count: 0 })
    this.updateTagCounts()
    return true
  }

  updateTag(name: string, updates: Partial<SubredditTag>): boolean {
    const existing = this.tags.get(name)
    if (!existing) {
      return false
    }

    const updated = { ...existing, ...updates }
    this.tags.set(name, updated)
    return true
  }

  removeTag(name: string): boolean {
    // Remove tag from all subreddits first
    for (const subreddit of this.subreddits.values()) {
      subreddit.tags = subreddit.tags.filter(t => t !== name)
    }

    const deleted = this.tags.delete(name)
    if (deleted) {
      this.updateTagCounts()
    }
    return deleted
  }

  getAllTags(): SubredditTag[] {
    return Array.from(this.tags.values())
  }

  getTag(name: string): SubredditTag | undefined {
    return this.tags.get(name)
  }

  // Statistics methods
  getStats(): SubredditStats {
    const allSubreddits = this.getAllSubreddits()
    const activeSubreddits = this.getActiveSubreddits()
    const highRiskSubreddits = this.getSubredditsByRiskLevel('high_risk')

    const totalScans = allSubreddits.reduce((sum, s) => sum + (s.totalPosts || 0), 0)
    const avgSentiment = allSubreddits.length > 0 ? 
      allSubreddits.reduce((sum, s) => sum + (s.avgSentiment || 0), 0) / allSubreddits.length : 0

    const topTags = this.getAllTags()
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
  validateSubredditName(name: string): { valid: boolean; error?: string } {
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

    if (this.subreddits.has(cleanName)) {
      return { valid: false, error: 'Subreddit is already being tracked' }
    }

    return { valid: true }
  }

  // Import/Export methods
  exportConfiguration(): string {
    const config = {
      subreddits: Array.from(this.subreddits.entries()),
      tags: Array.from(this.tags.entries()),
      exportedAt: Date.now()
    }
    return JSON.stringify(config, null, 2)
  }

  importConfiguration(configJson: string): { success: boolean; error?: string } {
    try {
      const config = JSON.parse(configJson)
      
      if (!config.subreddits || !config.tags) {
        return { success: false, error: 'Invalid configuration format' }
      }

      // Clear existing data
      this.subreddits.clear()
      this.tags.clear()

      // Import tags first
      for (const [name, tag] of config.tags) {
        this.tags.set(name, tag)
      }

      // Import subreddits
      for (const [name, subreddit] of config.subreddits) {
        this.subreddits.set(name, subreddit)
      }

      this.updateTagCounts()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to parse configuration file' }
    }
  }

  // Search and filter methods
  searchSubreddits(query: string): SubredditConfig[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllSubreddits().filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.displayName.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery) ||
      s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  // Bulk operations
  bulkUpdateSubreddits(names: string[], updates: Partial<SubredditConfig>): number {
    let updated = 0
    for (const name of names) {
      if (this.updateSubreddit(name, updates)) {
        updated++
      }
    }
    return updated
  }

  bulkToggleSubreddits(names: string[]): number {
    let toggled = 0
    for (const name of names) {
      if (this.toggleSubreddit(name)) {
        toggled++
      }
    }
    return toggled
  }

  // Schedule-based retrieval
  getSubredditsToScan(currentTime: number = Date.now()): SubredditConfig[] {
    const activeSubreddits = this.getActiveSubreddits()
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
  updateScanResults(name: string, results: {
    totalPosts?: number
    avgSentiment?: number
    pumpSignalsDetected?: number
  }): boolean {
    const subreddit = this.subreddits.get(name)
    if (!subreddit) {
      return false
    }

    subreddit.lastScanned = Date.now()
    if (results.totalPosts !== undefined) subreddit.totalPosts = results.totalPosts
    if (results.avgSentiment !== undefined) subreddit.avgSentiment = results.avgSentiment
    if (results.pumpSignalsDetected !== undefined) subreddit.pumpSignalsDetected = results.pumpSignalsDetected

    return true
  }
}
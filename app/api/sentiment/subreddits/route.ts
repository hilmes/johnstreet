import { NextRequest, NextResponse } from 'next/server'
import { SubredditManager, SubredditConfig } from '@/lib/sentiment/SubredditManager'

// Global instance to maintain state across requests
let subredditManager: SubredditManager | null = null

function getManager(): SubredditManager {
  if (!subredditManager) {
    subredditManager = new SubredditManager()
  }
  return subredditManager
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'list'
  const tag = searchParams.get('tag')
  const riskLevel = searchParams.get('risk_level')
  const priority = searchParams.get('priority')
  const active = searchParams.get('active')
  const frequency = searchParams.get('frequency')
  const query = searchParams.get('query')
  const name = searchParams.get('name')

  try {
    const manager = getManager()

    switch (action) {
      case 'list': {
        let subreddits = manager.getAllSubreddits()

        // Apply filters
        if (tag) {
          subreddits = manager.getSubredditsByTag(tag)
        }
        if (riskLevel) {
          subreddits = subreddits.filter(s => s.riskLevel === riskLevel)
        }
        if (priority) {
          subreddits = subreddits.filter(s => s.priority === priority)
        }
        if (active !== null) {
          const isActive = active === 'true'
          subreddits = subreddits.filter(s => s.active === isActive)
        }
        if (frequency) {
          subreddits = subreddits.filter(s => s.scanFrequency === frequency)
        }
        if (query) {
          subreddits = manager.searchSubreddits(query)
        }

        return NextResponse.json({
          success: true,
          data: subreddits
        })
      }

      case 'get': {
        if (!name) {
          return NextResponse.json(
            { success: false, error: 'name parameter is required' },
            { status: 400 }
          )
        }

        const subreddit = manager.getSubreddit(name)
        return NextResponse.json({
          success: true,
          data: subreddit || null
        })
      }

      case 'tags': {
        const tags = manager.getAllTags()
        return NextResponse.json({
          success: true,
          data: tags
        })
      }

      case 'stats': {
        const stats = manager.getStats()
        return NextResponse.json({
          success: true,
          data: stats
        })
      }

      case 'to_scan': {
        const subreddits = manager.getSubredditsToScan()
        return NextResponse.json({
          success: true,
          data: subreddits
        })
      }

      case 'validate': {
        if (!name) {
          return NextResponse.json(
            { success: false, error: 'name parameter is required' },
            { status: 400 }
          )
        }

        const validation = manager.validateSubredditName(name)
        return NextResponse.json({
          success: true,
          data: validation
        })
      }

      case 'export': {
        const config = manager.exportConfiguration()
        return NextResponse.json({
          success: true,
          data: { config }
        })
      }

      default: {
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('Subreddit management error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process subreddit request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subreddit, subreddits, tag, updates, config } = body

    const manager = getManager()

    switch (action) {
      case 'add': {
        if (!subreddit) {
          return NextResponse.json(
            { success: false, error: 'subreddit data is required' },
            { status: 400 }
          )
        }

        // Validate subreddit name
        const validation = manager.validateSubredditName(subreddit.name)
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 400 }
          )
        }

        const success = manager.addSubreddit(subreddit)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Failed to add subreddit' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Subreddit added successfully' }
        })
      }

      case 'update': {
        if (!subreddit?.name || !updates) {
          return NextResponse.json(
            { success: false, error: 'subreddit name and updates are required' },
            { status: 400 }
          )
        }

        const success = manager.updateSubreddit(subreddit.name, updates)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Subreddit not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Subreddit updated successfully' }
        })
      }

      case 'remove': {
        if (!subreddit?.name) {
          return NextResponse.json(
            { success: false, error: 'subreddit name is required' },
            { status: 400 }
          )
        }

        const success = manager.removeSubreddit(subreddit.name)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Subreddit not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Subreddit removed successfully' }
        })
      }

      case 'toggle': {
        if (!subreddit?.name) {
          return NextResponse.json(
            { success: false, error: 'subreddit name is required' },
            { status: 400 }
          )
        }

        const success = manager.toggleSubreddit(subreddit.name)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Subreddit not found' },
            { status: 404 }
          )
        }

        const updated = manager.getSubreddit(subreddit.name)
        return NextResponse.json({
          success: true,
          data: { 
            message: `Subreddit ${updated?.active ? 'activated' : 'deactivated'}`,
            active: updated?.active
          }
        })
      }

      case 'bulk_update': {
        if (!subreddits || !Array.isArray(subreddits) || !updates) {
          return NextResponse.json(
            { success: false, error: 'subreddits array and updates are required' },
            { status: 400 }
          )
        }

        const updated = manager.bulkUpdateSubreddits(subreddits, updates)
        return NextResponse.json({
          success: true,
          data: { 
            message: `Updated ${updated} subreddits`,
            updated
          }
        })
      }

      case 'bulk_toggle': {
        if (!subreddits || !Array.isArray(subreddits)) {
          return NextResponse.json(
            { success: false, error: 'subreddits array is required' },
            { status: 400 }
          )
        }

        const toggled = manager.bulkToggleSubreddits(subreddits)
        return NextResponse.json({
          success: true,
          data: { 
            message: `Toggled ${toggled} subreddits`,
            toggled
          }
        })
      }

      case 'add_tag': {
        if (!tag) {
          return NextResponse.json(
            { success: false, error: 'tag data is required' },
            { status: 400 }
          )
        }

        const success = manager.addTag(tag)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Tag already exists' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Tag added successfully' }
        })
      }

      case 'update_tag': {
        if (!tag?.name || !updates) {
          return NextResponse.json(
            { success: false, error: 'tag name and updates are required' },
            { status: 400 }
          )
        }

        const success = manager.updateTag(tag.name, updates)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Tag not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Tag updated successfully' }
        })
      }

      case 'remove_tag': {
        if (!tag?.name) {
          return NextResponse.json(
            { success: false, error: 'tag name is required' },
            { status: 400 }
          )
        }

        const success = manager.removeTag(tag.name)
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Tag not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Tag removed successfully' }
        })
      }

      case 'import': {
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'config data is required' },
            { status: 400 }
          )
        }

        const result = manager.importConfiguration(config)
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Configuration imported successfully' }
        })
      }

      case 'update_scan_results': {
        if (!subreddit?.name) {
          return NextResponse.json(
            { success: false, error: 'subreddit name is required' },
            { status: 400 }
          )
        }

        const { totalPosts, avgSentiment, pumpSignalsDetected } = body
        const success = manager.updateScanResults(subreddit.name, {
          totalPosts,
          avgSentiment,
          pumpSignalsDetected
        })

        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Subreddit not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Scan results updated successfully' }
        })
      }

      default: {
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('Subreddit management POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process subreddit request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
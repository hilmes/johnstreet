/**
 * Performance Monitoring Integration
 * 
 * Following AI-GUIDELINES.md standards:
 * - Performance marks for critical user flows
 * - Real User Monitoring (RUM)
 * - Web Vitals tracking
 */

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  url: string
  userAgent: string
}

export interface WebVital {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private webVitals: WebVital[] = []
  private observer: PerformanceObserver | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObserver()
      this.setupWebVitals()
    }
  }

  private initializeObserver() {
    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration || entry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        })
      })

      // Observe different types of performance entries
      this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }

  private setupWebVitals() {
    // Import web-vitals dynamically to avoid SSR issues
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.handleWebVital.bind(this))
      getFID(this.handleWebVital.bind(this))
      getFCP(this.handleWebVital.bind(this))
      getLCP(this.handleWebVital.bind(this))
      getTTFB(this.handleWebVital.bind(this))
    }).catch(() => {
      console.warn('Web Vitals library not available')
    })
  }

  private handleWebVital(metric: any) {
    const webVital: WebVital = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now()
    }

    this.webVitals.push(webVital)
    this.reportWebVital(webVital)
  }

  /**
   * Mark the start of a performance measurement
   */
  public markStart(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-start`)
    }
  }

  /**
   * Mark the end of a performance measurement and calculate duration
   */
  public markEnd(name: string): number | null {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const endMark = `${name}-end`
      const startMark = `${name}-start`
      
      performance.mark(endMark)
      
      try {
        performance.measure(name, startMark, endMark)
        
        const measure = performance.getEntriesByName(name, 'measure')[0]
        
        // Clean up marks
        performance.clearMarks(startMark)
        performance.clearMarks(endMark)
        performance.clearMeasures(name)
        
        return measure.duration
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error)
        return null
      }
    }
    
    return null
  }

  /**
   * Record a custom metric
   */
  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Report to analytics service (implement based on your needs)
    this.reportMetric(metric)
  }

  /**
   * Time a function execution
   */
  public async timeFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.markStart(name)
    
    try {
      const result = await fn()
      return result
    } finally {
      this.markEnd(name)
    }
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get all recorded web vitals
   */
  public getWebVitals(): WebVital[] {
    return [...this.webVitals]
  }

  /**
   * Report metric to analytics service
   */
  private reportMetric(metric: PerformanceMetric): void {
    // Implement your analytics reporting here
    // Examples: Google Analytics, DataDog, New Relic, etc.
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metric:', metric)
    }

    // Example: Send to your API endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance-metric',
          data: metric
        })
      }).catch(error => {
        console.warn('Failed to report metric:', error)
      })
    }
  }

  /**
   * Report web vital to analytics service
   */
  private reportWebVital(vital: WebVital): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', vital)
    }

    // Example: Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', vital.name, {
        event_category: 'Web Vitals',
        value: Math.round(vital.name === 'CLS' ? vital.value * 1000 : vital.value),
        event_label: vital.rating,
        non_interaction: true,
      })
    }

    // Example: Send to your API endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'web-vital',
          data: vital
        })
      }).catch(error => {
        console.warn('Failed to report web vital:', error)
      })
    }
  }

  /**
   * Clean up and disconnect observer
   */
  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

// Global singleton instance
let performanceMonitor: PerformanceMonitor | null = null

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor
}

// Utility hooks for React components
export const usePerformanceTimer = (name: string) => {
  const monitor = getPerformanceMonitor()
  
  const startTimer = () => monitor.markStart(name)
  const endTimer = () => monitor.markEnd(name)
  
  return { startTimer, endTimer }
}

// Higher-order component for measuring component render time
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  const TrackedComponent = (props: P) => {
    const monitor = getPerformanceMonitor()
    
    React.useEffect(() => {
      monitor.markStart(`${componentName}-render`)
      
      return () => {
        monitor.markEnd(`${componentName}-render`)
      }
    }, [monitor])
    
    return React.createElement(WrappedComponent, props)
  }
  
  TrackedComponent.displayName = `withPerformanceTracking(${componentName})`
  
  return TrackedComponent
}
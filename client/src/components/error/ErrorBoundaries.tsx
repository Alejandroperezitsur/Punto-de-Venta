import React from 'react'
import { createLogger } from '../../lib/structuredLogger'

const logger = createLogger('ErrorBoundary')

type FallbackComponent = React.ComponentType<{
  error: Error | null
  resetError: () => void
  degraded?: boolean
}>

interface DomainErrorBoundaryProps {
  children: React.ReactNode
  domain: string
  fallback?: FallbackComponent
  onError?: (error: Error, info: React.ErrorInfo) => void
  autoResetMs?: number
  showDetails?: boolean
}

interface DomainErrorBoundaryState {
  hasError: boolean
  error: Error | null
  degraded: boolean
  retryCount: number
}

const MAX_AUTO_RETRIES = 3

class DomainErrorBoundary extends React.Component<DomainErrorBoundaryProps, DomainErrorBoundaryState> {
  private resetTimer: ReturnType<typeof setTimeout> | null = null

  constructor(props: DomainErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, degraded: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(`[${this.props.domain}] ${error.message}`, error)
    this.props.onError?.(error, info)

    if (this.props.autoResetMs && this.state.retryCount < MAX_AUTO_RETRIES) {
      this.resetTimer = setTimeout(() => {
        this.setState(prev => ({ retryCount: prev.retryCount + 1 }))
        this.resetError()
      }, this.props.autoResetMs)
    }
  }

  componentWillUnmount() {
    if (this.resetTimer) clearTimeout(this.resetTimer)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  enableDegradedMode = () => {
    this.setState({ degraded: true, hasError: false, error: null })
  }

  render() {
    if (this.state.degraded) {
      return this.props.children
    }

    if (this.state.hasError) {
      const Fallback = this.props.fallback
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            resetError={this.resetError}
            degraded={this.state.degraded}
          />
        )
      }

      return (
        <DefaultErrorFallback
          domain={this.props.domain}
          error={this.state.error}
          resetError={this.resetError}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({
  domain,
  error,
  resetError,
  showDetails,
}: {
  domain: string
  error: Error | null
  resetError: () => void
  showDetails?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 m-2">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {domain} — Error temporal
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          El sistema se recuperará automáticamente.
        </p>
        {showDetails && error && (
          <details className="text-left mb-4">
            <summary className="text-xs text-gray-400 cursor-pointer">Detalles</summary>
            <pre className="mt-2 text-[10px] bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-20 text-gray-600 dark:text-gray-300">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={resetError}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  )
}

export function POSErrorBoundary(props: {
  children: React.ReactNode
  fallback?: FallbackComponent
}) {
  return (
    <DomainErrorBoundary
      domain="POS Core"
      autoResetMs={5000}
      onError={(err) => logger.error('POS Core error, auto-retry in 5s', err)}
      {...props}
    />
  )
}

export function ScannerErrorBoundary(props: {
  children: React.ReactNode
  fallback?: FallbackComponent
}) {
  return (
    <DomainErrorBoundary
      domain="Scanner"
      autoResetMs={3000}
      onError={(err) => logger.error('Scanner error, auto-retry in 3s', err)}
      {...props}
    />
  )
}

export function AdminErrorBoundary(props: {
  children: React.ReactNode
  fallback?: FallbackComponent
}) {
  return (
    <DomainErrorBoundary
      domain="Admin"
      showDetails
      {...props}
    />
  )
}

export function ReportsErrorBoundary(props: {
  children: React.ReactNode
  fallback?: FallbackComponent
}) {
  return (
    <DomainErrorBoundary
      domain="Reports"
      showDetails
      {...props}
    />
  )
}

export function SyncErrorBoundary(props: {
  children: React.ReactNode
  fallback?: FallbackComponent
}) {
  return (
    <DomainErrorBoundary
      domain="Sync Engine"
      autoResetMs={10000}
      {...props}
    />
  )
}

export function SelfHealingBoundary(props: {
  children: React.ReactNode
  domain?: string
}) {
  return (
    <DomainErrorBoundary
      domain={props.domain || 'Component'}
      autoResetMs={3000}
      fallback={({ error, resetError }) => (
        <SelfHealingFallback error={error} resetError={resetError} domain={props.domain || 'Component'} />
      )}
    >
      {props.children}
    </DomainErrorBoundary>
  )
}

function SelfHealingFallback({
  error,
  resetError,
  domain,
}: {
  error: Error | null
  resetError: () => void
  domain: string
}) {
  React.useEffect(() => {
    const timer = setTimeout(resetError, 3000)
    return () => clearTimeout(timer)
  }, [resetError])

  return (
    <div className="flex items-center justify-center p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded m-1">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs text-yellow-700 dark:text-yellow-300">
          {domain} — Recuperando...
        </span>
      </div>
    </div>
  )
}

export { DomainErrorBoundary }
export type { DomainErrorBoundaryProps }

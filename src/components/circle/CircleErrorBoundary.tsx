import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class CircleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Circle game error:', error, errorInfo)
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(35, 10, 25, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            backdropFilter: 'blur(10px)',
            color: 'white'
          }}
        >
          <div style={{
            background: 'rgba(57, 41, 62, 0.95)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid rgba(178, 165, 193, 0.3)',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              margin: '0 0 1rem 0',
              color: '#ff6b9d',
              fontSize: '1.5rem'
            }}>
              Oops! Something went wrong
            </h2>
            <p style={{ 
              margin: '0 0 1.5rem 0',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5'
            }}>
              The circle game encountered an error. Please try again.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{
                background: 'linear-gradient(135deg, #ff6b9d, #ff8fb3)',
                border: 'none',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(255, 107, 157, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
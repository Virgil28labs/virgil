import { render, screen, fireEvent } from '@testing-library/react'
import { DogImageStates, DogImageSkeleton, DogImageError } from './DogImageStates'

const defaultProps = {
  loading: false,
  error: null,
  dogsCount: 0,
  activeTab: 'fetch' as const
}

describe('DogImageStates', () => {
  describe('Loading State', () => {
    it('renders loading state when loading is true', () => {
      render(<DogImageStates {...defaultProps} loading={true} />)
      
      expect(screen.getByText('Fetching adorable doggos...')).toBeInTheDocument()
      expect(document.querySelector('.doggo-loading-spinner')).toBeInTheDocument()
    })

    it('shows loading state regardless of other props when loading is true', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          loading={true} 
          error="Some error" 
          dogsCount={5} 
        />
      )
      
      expect(screen.getByText('Fetching adorable doggos...')).toBeInTheDocument()
      expect(screen.queryByText('Some error')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('renders error state when there is an error and not loading', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          loading={false} 
          error="Failed to fetch dogs" 
        />
      )
      
      expect(screen.getByText('Failed to fetch dogs')).toBeInTheDocument()
      expect(screen.getByText('😢')).toBeInTheDocument()
    })

    it('does not show error state when loading is true', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          loading={true} 
          error="Failed to fetch dogs" 
        />
      )
      
      expect(screen.queryByText('Failed to fetch dogs')).not.toBeInTheDocument()
      expect(screen.getByText('Fetching adorable doggos...')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('renders fetch tab empty state when activeTab is fetch', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          activeTab="fetch" 
          dogsCount={0} 
        />
      )
      
      expect(screen.getByText('Ready to meet some doggos?')).toBeInTheDocument()
      expect(screen.getByText("Choose your preferences and click 'Fetch'")).toBeInTheDocument()
      expect(screen.queryByText('Go Fetch →')).not.toBeInTheDocument()
    })

    it('renders gallery tab empty state when activeTab is gallery', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          activeTab="gallery" 
          dogsCount={0} 
        />
      )
      
      expect(screen.getByText('Your Doggo Sanctuary is empty!')).toBeInTheDocument()
      expect(screen.getByText('Start by fetching some adorable friends')).toBeInTheDocument()
    })

    it('shows Go Fetch button in gallery empty state when onSwitchToFetch is provided', () => {
      const mockSwitchToFetch = jest.fn()
      
      render(
        <DogImageStates 
          {...defaultProps} 
          activeTab="gallery" 
          dogsCount={0}
          onSwitchToFetch={mockSwitchToFetch}
        />
      )
      
      const button = screen.getByText('Go Fetch →')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Switch to fetch tab to get dogs')
      
      fireEvent.click(button)
      expect(mockSwitchToFetch).toHaveBeenCalledTimes(1)
    })

    it('does not show Go Fetch button when onSwitchToFetch is not provided', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          activeTab="gallery" 
          dogsCount={0}
        />
      )
      
      expect(screen.queryByText('Go Fetch →')).not.toBeInTheDocument()
    })

    it('does not show empty state when there are dogs', () => {
      render(
        <DogImageStates 
          {...defaultProps} 
          dogsCount={5} 
        />
      )
      
      expect(screen.queryByText('Ready to meet some doggos?')).not.toBeInTheDocument()
      expect(screen.queryByText('Your Doggo Sanctuary is empty!')).not.toBeInTheDocument()
    })
  })

  describe('No State (Dogs Present)', () => {
    it('returns null when there are dogs to display', () => {
      const { container } = render(
        <DogImageStates 
          {...defaultProps} 
          dogsCount={5} 
        />
      )
      
      expect(container.firstChild).toBeNull()
    })

    it('returns null when not loading, no error, and dogs exist', () => {
      const { container } = render(
        <DogImageStates 
          {...defaultProps} 
          loading={false}
          error={null}
          dogsCount={3} 
        />
      )
      
      expect(container.firstChild).toBeNull()
    })
  })
})

describe('DogImageSkeleton', () => {
  it('renders skeleton loading element', () => {
    const { container } = render(<DogImageSkeleton />)
    
    expect(container.querySelector('.doggo-image-skeleton')).toBeInTheDocument()
  })
})

describe('DogImageError', () => {
  it('renders image error element with proper accessibility', () => {
    render(<DogImageError />)
    
    const errorElement = screen.getByLabelText('Image failed to load')
    expect(errorElement).toBeInTheDocument()
    expect(errorElement).toHaveTextContent('🐕‍🦺')
    expect(errorElement).toHaveClass('doggo-image-error')
  })
})
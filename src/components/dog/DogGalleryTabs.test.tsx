import { render, screen, fireEvent } from '@testing-library/react'
import { DogGalleryTabs } from './DogGalleryTabs'

const defaultProps = {
  activeTab: 'fetch' as const,
  favoritesCount: 0,
  onTabChange: jest.fn()
}

describe('DogGalleryTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders both tabs', () => {
    render(<DogGalleryTabs {...defaultProps} />)
    
    expect(screen.getByText('Fetch Doggos')).toBeInTheDocument()
    expect(screen.getByText(/❤️ Favorites/)).toBeInTheDocument()
  })

  it('marks fetch tab as active when activeTab is fetch', () => {
    render(<DogGalleryTabs {...defaultProps} activeTab="fetch" />)
    
    const fetchTab = screen.getByRole('tab', { name: /Fetch Doggos/i })
    const galleryTab = screen.getByRole('tab', { name: /❤️ Favorites/i })
    
    expect(fetchTab).toHaveClass('active')
    expect(fetchTab).toHaveAttribute('aria-selected', 'true')
    expect(galleryTab).not.toHaveClass('active')
    expect(galleryTab).toHaveAttribute('aria-selected', 'false')
  })

  it('marks gallery tab as active when activeTab is gallery', () => {
    render(<DogGalleryTabs {...defaultProps} activeTab="gallery" />)
    
    const fetchTab = screen.getByRole('tab', { name: /Fetch Doggos/i })
    const galleryTab = screen.getByRole('tab', { name: /❤️ Favorites/i })
    
    expect(galleryTab).toHaveClass('active')
    expect(galleryTab).toHaveAttribute('aria-selected', 'true')
    expect(fetchTab).not.toHaveClass('active')
    expect(fetchTab).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onTabChange with fetch when fetch tab is clicked', () => {
    const mockOnTabChange = jest.fn()
    render(<DogGalleryTabs {...defaultProps} onTabChange={mockOnTabChange} />)
    
    fireEvent.click(screen.getByRole('tab', { name: /Fetch Doggos/i }))
    
    expect(mockOnTabChange).toHaveBeenCalledWith('fetch')
  })

  it('calls onTabChange with gallery when gallery tab is clicked', () => {
    const mockOnTabChange = jest.fn()
    render(<DogGalleryTabs {...defaultProps} onTabChange={mockOnTabChange} />)
    
    fireEvent.click(screen.getByRole('tab', { name: /❤️ Favorites/i }))
    
    expect(mockOnTabChange).toHaveBeenCalledWith('gallery')
  })

  it('displays favorites count when favoritesCount > 0', () => {
    render(<DogGalleryTabs {...defaultProps} favoritesCount={5} />)
    
    expect(screen.getByText(/❤️ Favorites \(5\)/)).toBeInTheDocument()
  })

  it('does not display favorites count when favoritesCount is 0', () => {
    render(<DogGalleryTabs {...defaultProps} favoritesCount={0} />)
    
    expect(screen.getByText(/❤️ Favorites$/)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<DogGalleryTabs {...defaultProps} />)
    
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()
    
    const fetchTab = screen.getByRole('tab', { name: /Fetch Doggos/i })
    const galleryTab = screen.getByRole('tab', { name: /❤️ Favorites/i })
    
    expect(fetchTab).toHaveAttribute('aria-controls', 'fetch-panel')
    expect(fetchTab).toHaveAttribute('title', "Press 'f' for quick access")
    
    expect(galleryTab).toHaveAttribute('aria-controls', 'gallery-panel')
    expect(galleryTab).toHaveAttribute('title', "Press 'g' for quick access")
  })

  it('handles keyboard shortcut hints in title attributes', () => {
    render(<DogGalleryTabs {...defaultProps} />)
    
    const fetchTab = screen.getByRole('tab', { name: /Fetch Doggos/i })
    const galleryTab = screen.getByRole('tab', { name: /❤️ Favorites/i })
    
    expect(fetchTab).toHaveAttribute('title', "Press 'f' for quick access")
    expect(galleryTab).toHaveAttribute('title', "Press 'g' for quick access")
  })
})
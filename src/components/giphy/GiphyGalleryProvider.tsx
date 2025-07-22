import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode, memo } from 'react'
import { giphyService } from '../../lib/giphyService'
import type { 
  GiphyContextType, 
  GiphyState, 
  GiphyAction, 
  GiphyImage
} from '../../types'

// Initial state
const initialState: GiphyState = {
  searchResults: [],
  trendingGifs: [],
  favorites: [],
  searchQuery: '',
  currentTab: 'trending',
  rating: 'pg',
  loading: 'idle',
  error: null,
  hasMore: false,
  offset: 0
}

// Reducer function
function giphyGalleryReducer(state: GiphyState, action: GiphyAction): GiphyState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: 'error' }
    
    case 'SET_SEARCH_RESULTS':
      return { 
        ...state, 
        searchResults: action.payload, 
        loading: 'success',
        error: null,
        offset: 0 
      }
    
    case 'APPEND_SEARCH_RESULTS':
      return { 
        ...state, 
        searchResults: [...state.searchResults, ...action.payload],
        loading: 'success',
        error: null,
        offset: state.offset + action.payload.length
      }
    
    case 'SET_TRENDING_GIFS':
      return { 
        ...state, 
        trendingGifs: action.payload, 
        loading: 'success',
        error: null 
      }
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    
    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload }
    
    case 'SET_RATING':
      return { ...state, rating: action.payload }
    
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload }
    
    case 'TOGGLE_FAVORITE': {
      const gif = action.payload
      const isCurrentlyFavorited = state.favorites.some(fav => fav.id === gif.id)
      
      const newFavorites = isCurrentlyFavorited
        ? state.favorites.filter(fav => fav.id !== gif.id)
        : [...state.favorites, gif]
      
      return { ...state, favorites: newFavorites }
    }
    
    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload }
    
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    default:
      return state
  }
}

// Favorites localStorage key
const FAVORITES_STORAGE_KEY = 'giphy-favorites'

// Helper function to load favorites from localStorage
function loadFavoritesFromStorage(): GiphyImage[] {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to load Giphy favorites from localStorage:', error)
    return []
  }
}

// Helper function to save favorites to localStorage
function saveFavoritesToStorage(favorites: GiphyImage[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  } catch (error) {
    console.warn('Failed to save Giphy favorites to localStorage:', error)
  }
}

// Create the context
const GiphyGalleryContext = createContext<GiphyContextType | undefined>(undefined)

// Provider props
interface GiphyGalleryProviderProps {
  children: ReactNode
  isOpen?: boolean
}

// Provider component
export const GiphyGalleryProvider = memo(function GiphyGalleryProvider({ children, isOpen = false }: GiphyGalleryProviderProps) {
  const [state, dispatch] = useReducer(giphyGalleryReducer, {
    ...initialState,
    favorites: loadFavoritesFromStorage()
  })

  // Load trending GIFs when gallery opens
  useEffect(() => {
    if (isOpen && state.trendingGifs.length === 0) {
      loadTrending()
    }
  }, [isOpen])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    saveFavoritesToStorage(state.favorites)
  }, [state.favorites])

  // Search for GIFs
  const search = useCallback(async (query: string, loadMore = false) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a search term' })
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: 'loading' })
      
      const offset = loadMore ? state.offset : 0
      const searchParams = {
        q: query.trim(),
        limit: 25,
        offset,
        rating: state.rating
      }

      const result = await giphyService.searchGifs(searchParams)
      
      if (loadMore) {
        dispatch({ type: 'APPEND_SEARCH_RESULTS', payload: result.gifs })
      } else {
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: result.gifs })
      }
      
      dispatch({ type: 'SET_HAS_MORE', payload: result.hasMore })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search GIFs'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }, [state.rating, state.offset])

  // Load trending GIFs
  const loadTrending = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: 'loading' })
      
      const result = await giphyService.getTrendingGifs({
        limit: 50,
        rating: state.rating
      })
      
      dispatch({ type: 'SET_TRENDING_GIFS', payload: result.gifs })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load trending GIFs'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }, [state.rating])

  // Load more results (for infinite scroll)
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading === 'loading') return
    
    if (state.currentTab === 'search' && state.searchQuery) {
      await search(state.searchQuery, true)
    }
  }, [state.hasMore, state.loading, state.currentTab, state.searchQuery, search])

  // Toggle favorite status
  const toggleFavorite = useCallback((gif: GiphyImage) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: gif })
  }, [])

  // Check if GIF is favorited
  const isFavorited = useCallback((url: string) => {
    return state.favorites.some(fav => fav.url === url)
  }, [state.favorites])

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
  }, [])

  // Set current tab
  const setCurrentTab = useCallback((tab: 'search' | 'trending' | 'favorites') => {
    dispatch({ type: 'SET_CURRENT_TAB', payload: tab })
    
    // Load data for the selected tab if needed
    if (tab === 'trending' && state.trendingGifs.length === 0) {
      loadTrending()
    }
  }, [state.trendingGifs.length, loadTrending])

  // Set content rating filter
  const setRating = useCallback((rating: 'g' | 'pg' | 'pg-13' | 'r') => {
    dispatch({ type: 'SET_RATING', payload: rating })
    
    // Reload current data with new rating
    if (state.currentTab === 'trending') {
      loadTrending()
    } else if (state.currentTab === 'search' && state.searchQuery) {
      search(state.searchQuery)
    }
  }, [state.currentTab, state.searchQuery, loadTrending, search])

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  // Context value
  const contextValue: GiphyContextType = {
    // State
    searchResults: state.searchResults,
    trendingGifs: state.trendingGifs,
    favorites: state.favorites,
    searchQuery: state.searchQuery,
    currentTab: state.currentTab,
    rating: state.rating,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    
    // Actions
    search,
    loadTrending,
    loadMore,
    toggleFavorite,
    isFavorited,
    setSearchQuery,
    setCurrentTab,
    setRating,
    clearError
  }

  return (
    <GiphyGalleryContext.Provider value={contextValue}>
      {children}
    </GiphyGalleryContext.Provider>
  )
})

// Custom hook to use the context
export function useGiphyGallery(): GiphyContextType {
  const context = useContext(GiphyGalleryContext)
  if (context === undefined) {
    throw new Error('useGiphyGallery must be used within a GiphyGalleryProvider')
  }
  return context
}

// Export context for testing
export { GiphyGalleryContext }
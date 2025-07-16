import { renderHook, act } from '@testing-library/react'
import { useDogApi } from './useDogApi'

// Mock dedupeFetch
jest.mock('../../../lib/requestDeduplication', () => ({
  dedupeFetch: jest.fn()
}))

import { dedupeFetch } from '../../../lib/requestDeduplication'

const mockDedupeFetch = dedupeFetch as jest.MockedFunction<typeof dedupeFetch>

describe('useDogApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useDogApi())

      expect(result.current.dogs).toEqual([])
      expect(result.current.breeds).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchDogs', () => {
    it('should fetch random dog successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: 'https://images.dog.ceo/breeds/akita/512.jpg'
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs()
      })

      expect(result.current.dogs).toHaveLength(1)
      expect(result.current.dogs[0]).toMatchObject({
        url: 'https://images.dog.ceo/breeds/akita/512.jpg',
        breed: 'akita',
        id: expect.any(String)
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should fetch multiple dogs successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: [
            'https://images.dog.ceo/breeds/akita/512.jpg',
            'https://images.dog.ceo/breeds/beagle/123.jpg'
          ]
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs('', 2)
      })

      expect(result.current.dogs).toHaveLength(2)
      expect(result.current.dogs[0].breed).toBe('akita')
      expect(result.current.dogs[1].breed).toBe('beagle')
    })

    it('should fetch specific breed successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: 'https://images.dog.ceo/breeds/husky/123.jpg'
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs('husky')
      })

      expect(mockDedupeFetch).toHaveBeenCalledWith(
        'https://dog.ceo/api/breed/husky/images/random',
        expect.any(Object)
      )
      expect(result.current.dogs[0].breed).toBe('husky')
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs()
      })

      expect(result.current.dogs).toEqual([])
      expect(result.current.error).toBe('Unable to fetch dogs. Please try again.')
      expect(result.current.loading).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      mockDedupeFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs()
      })

      expect(result.current.dogs).toEqual([])
      expect(result.current.error).toBe('Unable to fetch dogs. Please try again.')
      expect(console.warn).toHaveBeenCalledWith(
        'Dog API fetch failed:',
        expect.any(Error)
      )
    })

    it('should handle abort errors silently', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockDedupeFetch.mockRejectedValueOnce(abortError)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs()
      })

      expect(result.current.error).toBeNull()
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should cancel previous request when making new request', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: 'https://images.dog.ceo/breeds/akita/512.jpg'
        })
      }
      mockDedupeFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResponse as Response), 100))
      )

      const { result } = renderHook(() => useDogApi())

      // Start first request
      act(() => {
        result.current.fetchDogs()
      })

      // Start second request immediately
      await act(async () => {
        await result.current.fetchDogs()
      })

      expect(result.current.dogs).toHaveLength(1)
    })

    it('should handle mixed breed when URL pattern does not match', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: 'https://example.com/dog.jpg'
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs()
      })

      expect(result.current.dogs[0].breed).toBe('mixed')
    })
  })

  describe('fetchBreeds', () => {
    it('should fetch breeds list successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            akita: [],
            beagle: [],
            corgi: ['cardigan', 'pembroke']
          }
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchBreeds()
      })

      expect(result.current.breeds).toEqual(['akita', 'beagle', 'corgi'])
      expect(mockDedupeFetch).toHaveBeenCalledWith(
        'https://dog.ceo/api/breeds/list/all',
        expect.any(Object)
      )
    })

    it('should handle empty breeds response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {}
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchBreeds()
      })

      expect(result.current.breeds).toEqual([])
    })

    it('should handle breeds API error gracefully', async () => {
      const mockResponse = {
        ok: false
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchBreeds()
      })

      expect(result.current.breeds).toEqual([])
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to fetch breeds:',
        expect.any(Error)
      )
    })

    it('should handle breeds network error gracefully', async () => {
      mockDedupeFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchBreeds()
      })

      expect(result.current.breeds).toEqual([])
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to fetch breeds:',
        expect.any(Error)
      )
    })

    it('should handle null message in breeds response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: null
        })
      }
      mockDedupeFetch.mockResolvedValueOnce(mockResponse as Response)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchBreeds()
      })

      expect(result.current.breeds).toEqual([])
    })
  })

  describe('loading state', () => {
    it('should set loading state during fetch', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: 'https://images.dog.ceo/breeds/akita/512.jpg'
        })
      }
      mockDedupeFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResponse as Response), 50))
      )

      const { result } = renderHook(() => useDogApi())

      expect(result.current.loading).toBe(false)

      let fetchPromise: Promise<void>
      act(() => {
        fetchPromise = result.current.fetchDogs()
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await fetchPromise!
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('timeout handling', () => {
    it('should handle request timeout', async () => {
      jest.useFakeTimers()
      
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      
      mockDedupeFetch.mockRejectedValue(abortError)

      const { result } = renderHook(() => useDogApi())

      await act(async () => {
        await result.current.fetchDogs()
      })

      // Since AbortError is handled silently, no error should be set
      expect(result.current.error).toBeNull()

      jest.useRealTimers()
    })
  })
})
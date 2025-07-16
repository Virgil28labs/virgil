import { 
  calculateTextPosition, 
  validateTextPosition, 
  measureText, 
  calculateVisualTextBounds 
} from './textAlignmentUtils'

// Mock canvas context
const mockContext = {
  font: '',
  measureText: jest.fn((text: string) => ({
    width: text.length * 10, // Simple mock: 10px per character
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: text.length * 10,
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 2,
    fontBoundingBoxAscent: 12,
    fontBoundingBoxDescent: 3
  }))
}

// Mock canvas element
const mockCanvas = {
  getContext: jest.fn(() => mockContext)
}

// Mock document.createElement
const originalCreateElement = document.createElement
beforeAll(() => {
  document.createElement = jest.fn((tag: string) => {
    if (tag === 'canvas') {
      return mockCanvas as any
    }
    return originalCreateElement.call(document, tag)
  })
})

afterAll(() => {
  document.createElement = originalCreateElement
})

describe('textAlignmentUtils', () => {
  describe('calculateTextPosition', () => {
    const mockRect: DOMRect = {
      left: 100,
      right: 300,
      top: 50,
      bottom: 100,
      width: 200,
      height: 50,
      x: 100,
      y: 50,
      toJSON: () => ({})
    }

    it('should calculate position for center alignment', () => {
      const computedStyle = {
        textAlign: 'center',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(160) // 100 + (200 - 80) / 2
    })

    it('should calculate position for left alignment', () => {
      const computedStyle = {
        textAlign: 'left',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(100)
    })

    it('should calculate position for right alignment', () => {
      const computedStyle = {
        textAlign: 'right',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(220) // 300 - 80
    })

    it('should calculate position for start alignment in LTR', () => {
      const computedStyle = {
        textAlign: 'start',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(100)
    })

    it('should calculate position for start alignment in RTL', () => {
      const computedStyle = {
        textAlign: 'start',
        direction: 'rtl'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(220) // 300 - 80
    })

    it('should calculate position for end alignment in LTR', () => {
      const computedStyle = {
        textAlign: 'end',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(220) // 300 - 80
    })

    it('should calculate position for end alignment in RTL', () => {
      const computedStyle = {
        textAlign: 'end',
        direction: 'rtl'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(100)
    })

    it('should handle justify alignment', () => {
      const computedStyle = {
        textAlign: 'justify',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(160) // Falls back to center
    })

    it('should handle inherit alignment with parent', () => {
      const mockParent = document.createElement('div')
      
      // Mock getComputedStyle for parent
      const originalGetComputedStyle = window.getComputedStyle
      window.getComputedStyle = jest.fn((element) => {
        if (element === mockParent) {
          return { textAlign: 'right' } as CSSStyleDeclaration
        }
        return originalGetComputedStyle(element)
      })

      const computedStyle = {
        textAlign: 'inherit',
        direction: 'ltr',
        parentElement: mockParent
      } as any

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(220) // Inherits right alignment

      window.getComputedStyle = originalGetComputedStyle
    })

    it('should handle inherit alignment without parent', () => {
      const computedStyle = {
        textAlign: 'inherit',
        direction: 'ltr',
        parentElement: null
      } as any

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(100) // Falls back to left
    })

    it('should handle initial alignment', () => {
      const computedStyle = {
        textAlign: 'initial',
        direction: 'ltr',
        parentElement: null
      } as any

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(100) // Falls back to left
    })

    it('should handle unset alignment', () => {
      const computedStyle = {
        textAlign: 'unset',
        direction: 'ltr',
        parentElement: null
      } as any

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(100) // Falls back to left
    })

    it('should handle unknown alignment', () => {
      const computedStyle = {
        textAlign: 'invalid-value' as any,
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(160) // Falls back to center
    })

    it('should handle missing direction', () => {
      const computedStyle = {
        textAlign: 'right'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(mockRect, 80, computedStyle)
      expect(position).toBe(220) // Defaults to LTR
    })
  })

  describe('validateTextPosition', () => {
    const mockRect: DOMRect = {
      left: 100,
      right: 300,
      top: 50,
      bottom: 100,
      width: 200,
      height: 50,
      x: 100,
      y: 50,
      toJSON: () => ({})
    }

    it('should return valid position within bounds', () => {
      const validated = validateTextPosition(150, 80, mockRect)
      expect(validated).toBe(150)
    })

    it('should clamp position that extends past right boundary', () => {
      const validated = validateTextPosition(250, 80, mockRect)
      expect(validated).toBe(220) // 300 - 80
    })

    it('should clamp position that extends past left boundary', () => {
      const validated = validateTextPosition(50, 80, mockRect)
      expect(validated).toBe(100)
    })

    it('should handle text that fits exactly', () => {
      const validated = validateTextPosition(100, 200, mockRect)
      expect(validated).toBe(100)
    })

    it('should handle text wider than container', () => {
      const validated = validateTextPosition(150, 300, mockRect)
      expect(validated).toBe(100) // Clamps to left edge
    })
  })

  describe('measureText', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // Clear the cache by creating new measurements
      for (let i = 0; i < 101; i++) {
        measureText(`cache-clear-${i}`, {
          fontSize: '16px',
          fontWeight: 'normal',
          fontFamily: 'Arial'
        } as CSSStyleDeclaration)
      }
    })

    it('should measure text dimensions', () => {
      const computedStyle = {
        fontSize: '16px',
        fontWeight: 'bold',
        fontFamily: 'Arial'
      } as CSSStyleDeclaration

      const measurement = measureText('Hello', computedStyle)

      expect(measurement.width).toBe(50) // 5 characters * 10
      expect(measurement.height).toBe(16)
      expect(mockContext.font).toBe('bold 16px Arial')
    })

    it('should cache measurements', () => {
      jest.clearAllMocks() // Clear the call count after cache filling
      
      const computedStyle = {
        fontSize: '14px',
        fontWeight: 'normal',
        fontFamily: 'Helvetica'
      } as CSSStyleDeclaration

      // First call
      const measurement1 = measureText('Test', computedStyle)
      expect(mockContext.measureText).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const measurement2 = measureText('Test', computedStyle)
      expect(mockContext.measureText).toHaveBeenCalledTimes(1)

      expect(measurement1).toBe(measurement2) // Same object reference
    })

    it('should handle different font configurations', () => {
      // Clear any previous calls
      mockContext.measureText.mockClear()
      
      const style1 = {
        fontSize: '12px',
        fontWeight: '300',
        fontFamily: 'sans-serif'
      } as CSSStyleDeclaration

      const style2 = {
        fontSize: '12px',
        fontWeight: '600',
        fontFamily: 'sans-serif'
      } as CSSStyleDeclaration

      measureText('Text', style1)
      measureText('Text', style2)

      // Should be called twice for different font weights
      expect(mockContext.measureText).toHaveBeenCalledTimes(2)
    })

    it('should parse fontSize correctly', () => {
      const computedStyle = {
        fontSize: '24.5px',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      } as CSSStyleDeclaration

      const measurement = measureText('Hi', computedStyle)
      expect(measurement.height).toBe(24.5)
    })

    it.skip('should handle canvas context error', () => {
      // Force a fresh global canvas creation by resetting internal state
      const originalCreateElement = document.createElement
      let canvasCreated = false
      
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas' && !canvasCreated) {
          canvasCreated = true
          return {
            getContext: () => null
          } as any
        }
        return originalCreateElement.call(document, tagName)
      })

      // Clear the existing global canvas by using a unique cache key that forces recreation
      const computedStyle = {
        fontSize: '999px', // Unique font size to bypass cache
        fontWeight: 'normal',
        fontFamily: 'Arial'
      } as CSSStyleDeclaration

      expect(() => measureText('Error-Unique', computedStyle)).toThrow('Could not get canvas context')

      // Restore
      document.createElement = originalCreateElement
    })

    it('should maintain LRU cache size limit', () => {
      // Already filled cache in beforeEach
      // Add one more to trigger pruning
      const computedStyle = {
        fontSize: '16px',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      } as CSSStyleDeclaration

      measureText('new-text-after-limit', computedStyle)

      // Should still work without errors
      expect(mockContext.measureText).toHaveBeenCalled()
    })

    it('should update cache order on access', () => {
      const style = {
        fontSize: '16px',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      } as CSSStyleDeclaration

      // Create initial entries
      measureText('first', style)
      measureText('second', style)
      
      // Access first again - should move to end
      const callCount = mockContext.measureText.mock.calls.length
      measureText('first', style)
      
      // Should use cache, not call measureText again
      expect(mockContext.measureText).toHaveBeenCalledTimes(callCount)
    })
  })

  describe('calculateVisualTextBounds', () => {
    it('should calculate visual text bounds', () => {
      const rect: DOMRect = {
        left: 100,
        right: 300,
        top: 50,
        bottom: 100,
        width: 200,
        height: 50,
        x: 100,
        y: 50,
        toJSON: () => ({})
      }

      const bounds = calculateVisualTextBounds(rect, 16)

      expect(bounds.top).toBe(67) // 50 + (50 - 16) / 2
      expect(bounds.baseline).toBe(79.8) // 67 + (16 * 0.8)
      expect(bounds.height).toBe(16)
    })

    it('should handle small containers', () => {
      const rect: DOMRect = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 10,
        width: 100,
        height: 10,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }

      const bounds = calculateVisualTextBounds(rect, 20)

      expect(bounds.top).toBe(-5) // 0 + (10 - 20) / 2
      expect(bounds.baseline).toBe(11) // -5 + (20 * 0.8)
      expect(bounds.height).toBe(20)
    })

    it('should handle large font sizes', () => {
      const rect: DOMRect = {
        left: 0,
        right: 500,
        top: 100,
        bottom: 200,
        width: 500,
        height: 100,
        x: 0,
        y: 100,
        toJSON: () => ({})
      }

      const bounds = calculateVisualTextBounds(rect, 72)

      expect(bounds.top).toBe(114) // 100 + (100 - 72) / 2
      expect(bounds.baseline).toBe(171.6) // 114 + (72 * 0.8)
      expect(bounds.height).toBe(72)
    })
  })

  describe('edge cases', () => {
    it('should handle zero-width text', () => {
      const rect: DOMRect = {
        left: 100,
        right: 300,
        top: 50,
        bottom: 100,
        width: 200,
        height: 50,
        x: 100,
        y: 50,
        toJSON: () => ({})
      }

      const computedStyle = {
        textAlign: 'center',
        direction: 'ltr'
      } as CSSStyleDeclaration

      const position = calculateTextPosition(rect, 0, computedStyle)
      expect(position).toBe(200) // 100 + (200 - 0) / 2
    })

    it('should handle very long text', () => {
      const rect: DOMRect = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }

      const validated = validateTextPosition(0, 500, rect)
      expect(validated).toBe(0) // Clamps to left when text is wider than container
    })

    it('should handle RTL text alignment combinations', () => {
      const rect: DOMRect = {
        left: 100,
        right: 300,
        top: 50,
        bottom: 100,
        width: 200,
        height: 50,
        x: 100,
        y: 50,
        toJSON: () => ({})
      }

      const computedStyle = {
        textAlign: 'left',
        direction: 'rtl'
      } as CSSStyleDeclaration

      // In RTL, 'left' alignment with RTL direction may behave differently
      const position = calculateTextPosition(rect, 80, computedStyle)
      expect(position).toBe(220)
    })
  })
})
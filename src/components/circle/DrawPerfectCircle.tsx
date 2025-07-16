import React, { memo, useState, useRef, useEffect, useCallback } from 'react'
import './DrawPerfectCircle.css'
import type { 
  DrawPerfectCircleProps, 
  Point, 
  EvaluationResult, 
  CircleEvaluationParams, 
  GridConfig, 
  DrawingConfig 
} from './types'

// Game configuration constants
const EVALUATION_CONFIG: CircleEvaluationParams = {
  points: [],
  minPoints: 10,
  maxClosureDistanceFactor: 0.2,
  varianceWeight: 0.6,
  closureWeight: 0.4
}

const GRID_CONFIG: GridConfig = {
  visible: true,
  size: 40,
  color: 'rgba(178, 165, 193, 0.4)',
  lineWidth: 0.5
}

const DRAWING_CONFIG: DrawingConfig = {
  strokeColor: '#b3b3b3',
  lineWidth: 2.5,
  lineCap: 'round',
  lineJoin: 'round',
  shadowBlur: 8,
  shadowColor: 'rgba(179, 179, 179, 0.3)'
}

export const DrawPerfectCircle = memo(function DrawPerfectCircle({ 
  isOpen, 
  onClose 
}: DrawPerfectCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [bestScore, setBestScore] = useState(() => {
    try {
      const saved = localStorage.getItem('perfectCircleBestScore')
      return saved ? parseInt(saved, 10) : 0
    } catch (error) {
      console.warn('Failed to load best score from localStorage:', error)
      return 0
    }
  })
  const [attempts, setAttempts] = useState(() => {
    try {
      const saved = localStorage.getItem('perfectCircleAttempts')
      return saved ? parseInt(saved, 10) : 0
    } catch (error) {
      console.warn('Failed to load attempts from localStorage:', error)
      return 0
    }
  })
  
  /**
   * Evaluates the quality of a drawn circle based on points
   * @param points Array of points representing the drawn circle
   * @returns Evaluation result with score and message
   */
  const evaluateCircle = useCallback((points: Point[]): EvaluationResult => {
    if (points.length < EVALUATION_CONFIG.minPoints!) {
      return { score: 0, message: "Draw a complete circle!" }
    }

    // Calculate center using average of all points
    const center = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 })
    
    center.x /= points.length
    center.y /= points.length

    // Calculate average radius and variance
    let avgRadius = 0
    for (const point of points) {
      const distance = Math.sqrt(
        Math.pow(point.x - center.x, 2) + 
        Math.pow(point.y - center.y, 2)
      )
      avgRadius += distance
    }
    avgRadius /= points.length

    let radiusVariance = 0
    for (const point of points) {
      const distance = Math.sqrt(
        Math.pow(point.x - center.x, 2) + 
        Math.pow(point.y - center.y, 2)
      )
      radiusVariance += Math.pow(distance - avgRadius, 2)
    }
    radiusVariance = Math.sqrt(radiusVariance / points.length)

    // Check if circle is closed
    const startPoint = points[0]
    const endPoint = points[points.length - 1]
    const closureDistance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + 
      Math.pow(endPoint.y - startPoint.y, 2)
    )
    const maxClosureDistance = avgRadius * EVALUATION_CONFIG.maxClosureDistanceFactor!
    const isClosed = closureDistance < maxClosureDistance

    // Calculate score
    const maxVariance = avgRadius * 0.5
    const varianceScore = Math.max(0, 1 - (radiusVariance / maxVariance))
    const closureScore = isClosed ? 1 : 0.5
    
    let totalScore = Math.round((varianceScore * EVALUATION_CONFIG.varianceWeight! + closureScore * EVALUATION_CONFIG.closureWeight!) * 100)
    totalScore = Math.max(0, Math.min(100, totalScore))

    // Get appropriate message
    let message
    if (totalScore >= 95) {
      message = "Perfect circle! You're a true artist! ✨"
    } else if (totalScore >= 85) {
      message = "Excellent! Almost perfect! 🎯"
    } else if (totalScore >= 75) {
      message = "Great job! Very circular! 👏"
    } else if (totalScore >= 60) {
      message = "Good effort! Keep practicing! 💪"
    } else if (totalScore >= 40) {
      message = "Not bad! Try drawing slower? 🖊️"
    } else if (totalScore >= 20) {
      message = "Give it another shot! Practice makes perfect! 🔄"
    } else {
      message = "Hmm, that looks more like abstract art! 🎨"
    }

    return { score: totalScore, message, isClosed }
  }, [])

  /**
   * Draws the canvas content including grid and circle
   */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const displayWidth = canvas.width / (window.devicePixelRatio || 1)
    const displayHeight = canvas.height / (window.devicePixelRatio || 1)
    
    // Clear canvas completely first
    ctx.clearRect(0, 0, displayWidth, displayHeight)
    
    // Fill with uniform subtle background
    ctx.fillStyle = 'rgba(45, 34, 51, 0.06)'
    ctx.fillRect(0, 0, displayWidth, displayHeight)
    
    // Draw subtle grid if enabled
    if (showGrid) {
      // Save canvas state before drawing grid
      ctx.save()
      
      ctx.strokeStyle = GRID_CONFIG.color
      ctx.lineWidth = GRID_CONFIG.lineWidth
      ctx.lineCap = 'square'
      ctx.lineJoin = 'miter'
      const gridSize = GRID_CONFIG.size
      
      // Calculate grid centering to create equal margins on all sides
      const numVerticalLines = Math.floor(displayWidth / gridSize) + 1
      const numHorizontalLines = Math.floor(displayHeight / gridSize) + 1
      const totalGridWidth = (numVerticalLines - 1) * gridSize
      const totalGridHeight = (numHorizontalLines - 1) * gridSize
      const startX = (displayWidth - totalGridWidth) / 2
      const startY = (displayHeight - totalGridHeight) / 2
      
      // Draw vertical grid lines (centered)
      for (let i = 0; i < numVerticalLines; i++) {
        const x = startX + (i * gridSize)
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, displayHeight)
        ctx.stroke()
      }
      
      // Draw horizontal grid lines (centered)
      for (let i = 0; i < numHorizontalLines; i++) {
        const y = startY + (i * gridSize)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(displayWidth, y)
        ctx.stroke()
      }
      
      // Restore canvas state after drawing grid
      ctx.restore()
    }
    
    // Draw the circle with sophisticated gray color
    if (points.length > 1) {
      // Save canvas state before drawing circle
      ctx.save()
      
      ctx.strokeStyle = DRAWING_CONFIG.strokeColor
      ctx.lineWidth = DRAWING_CONFIG.lineWidth
      ctx.lineJoin = DRAWING_CONFIG.lineJoin
      ctx.lineCap = DRAWING_CONFIG.lineCap
      ctx.shadowBlur = DRAWING_CONFIG.shadowBlur
      ctx.shadowColor = DRAWING_CONFIG.shadowColor
      
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      
      ctx.stroke()
      
      // Restore canvas state after drawing circle
      ctx.restore()
    }
  }, [points, showGrid])

  // Set up canvas and handle resizing
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size and scale for high DPI displays
    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const scale = window.devicePixelRatio || 1
      
      canvas.width = rect.width * scale
      canvas.height = rect.height * scale
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      ctx.scale(scale, scale)
      drawCanvas()
    }
    
    updateCanvasSize()
    
    const handleResize = () => {
      updateCanvasSize()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen, drawCanvas])

  // Update canvas when points or grid changes
  useEffect(() => {
    drawCanvas()
  }, [points, showGrid, drawCanvas])

  /**
   * Gets mouse position relative to canvas
   * @param e Mouse event
   * @returns Point coordinates or null if canvas not available
   */
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  /**
   * Gets touch position relative to canvas
   * @param e Touch event
   * @returns Point coordinates or null if canvas not available
   */
  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>): Point | null => {
    if (e.touches.length === 0) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((pos: Point | null) => {
    if (!pos) return
    setIsDrawing(true)
    setPoints([pos])
    setResult(null)
  }, [])

  const draw = useCallback((pos: Point | null) => {
    if (!pos || !isDrawing || result) return
    setPoints(prev => [...prev, pos])
  }, [isDrawing, result])

  const stopDrawing = useCallback(() => {
    if (!isDrawing || result) return
    setIsDrawing(false)
    
    const evaluation = evaluateCircle(points)
    setResult(evaluation)
    
    const newAttempts = attempts + 1
    setAttempts(newAttempts)
    try {
      localStorage.setItem('perfectCircleAttempts', newAttempts.toString())
    } catch (error) {
      console.warn('Failed to save attempts to localStorage:', error)
    }
    
    if (evaluation.score > bestScore) {
      setBestScore(evaluation.score)
      try {
        localStorage.setItem('perfectCircleBestScore', evaluation.score.toString())
      } catch (error) {
        console.warn('Failed to save best score to localStorage:', error)
      }
    }
  }, [isDrawing, result, points, evaluateCircle, attempts, bestScore])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    startDrawing(getMousePos(e))
  }, [startDrawing, getMousePos])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    draw(getMousePos(e))
  }, [draw, getMousePos])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing()
  }, [stopDrawing])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    startDrawing(getTouchPos(e))
  }, [startDrawing, getTouchPos])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    draw(getTouchPos(e))
  }, [draw, getTouchPos])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing()
  }, [stopDrawing])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Add smooth fade out animation
        let alpha = 1
        const fadeOut = () => {
          alpha -= 0.05
          ctx.globalAlpha = alpha
          ctx.fillStyle = 'rgba(45, 34, 51, 0.4)'
          ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))
          
          if (alpha > 0) {
            requestAnimationFrame(fadeOut)
          } else {
            // Complete reset after fade animation
            ctx.globalAlpha = 1
            ctx.save()
            ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))
            ctx.restore()
            
            // Reset state after fade animation
            setPoints([])
            setResult(null)
            setIsDrawing(false)
            
            // Force complete redraw with proper state
            drawCanvas()
          }
        }
        fadeOut()
      }
    } else {
      // Fallback if canvas is not available
      setPoints([])
      setResult(null)
      setIsDrawing(false)
    }
  }, [drawCanvas])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        clearCanvas()
      } else if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setShowGrid(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, clearCanvas])

  if (!isOpen) return null

  return (
    <div 
      className="circle-game-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Draw Perfect Circle Game"
    >
      <div 
        className="circle-game-panel" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="circle-game-header">
          <h2 className="circle-game-title">Draw Perfect Circle</h2>
          <button 
            className="circle-game-close" 
            onClick={onClose}
            aria-label="Close circle game"
          >
            ×
          </button>
        </div>

        {/* Canvas Container */}
        <div className="circle-game-canvas-container">
          <canvas
            ref={canvasRef}
            className="circle-game-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          
          {/* Instructions */}
          {points.length === 0 && !result && (
            <div className="circle-game-instructions">
              <h3>Draw a perfect circle</h3>
              <p>Click and drag to draw your circle</p>
              <p className="circle-game-stats">
                Best score: {bestScore} | Attempts: {attempts}
              </p>
            </div>
          )}
          
          {/* Result Display */}
          {result && (
            <div className="circle-game-result">
              <div className="circle-game-score">{result.score}/100</div>
              <div className="circle-game-message">{result.message}</div>
              <div className="circle-game-stats">
                Best score: {bestScore} | Attempts: {attempts}
              </div>
              <button
                onClick={clearCanvas}
                className="circle-game-try-again"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="circle-game-controls">
          <button
            onClick={clearCanvas}
            className="circle-game-control-button"
          >
            Clear
          </button>
          <button
            onClick={() => {
              setShowGrid(prev => !prev)
            }}
            className="circle-game-control-button"
          >
            {showGrid ? 'Hide grid' : 'Show grid'}
          </button>
        </div>
      </div>
    </div>
  )
})
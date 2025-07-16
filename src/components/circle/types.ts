/**
 * Circle Game Types
 * 
 * Type definitions for the Draw Perfect Circle game components
 */

/** A 2D point with x and y coordinates */
export interface Point {
  x: number
  y: number
}

/** Results from evaluating a drawn circle */
export interface EvaluationResult {
  /** Score from 0-100 representing how close to a perfect circle */
  score: number
  /** Human-readable message about the result */
  message: string
  /** Whether the circle path was closed (start and end points are close) */
  isClosed?: boolean
}

/** Props for the DrawPerfectCircle component */
export interface DrawPerfectCircleProps {
  /** Whether the circle game modal is open */
  isOpen: boolean
  /** Callback function to close the modal */
  onClose: () => void
}

/** Canvas dimensions and scaling information */
export interface CanvasInfo {
  /** Canvas element width in display pixels */
  displayWidth: number
  /** Canvas element height in display pixels */
  displayHeight: number
  /** Device pixel ratio for high-DPI displays */
  scale: number
}

/** Circle evaluation parameters */
export interface CircleEvaluationParams {
  /** Array of points that make up the drawn circle */
  points: Point[]
  /** Minimum number of points required for evaluation */
  minPoints?: number
  /** Maximum allowed closure distance as a fraction of radius */
  maxClosureDistanceFactor?: number
  /** Weight for variance in scoring (0-1) */
  varianceWeight?: number
  /** Weight for closure in scoring (0-1) */
  closureWeight?: number
}

/** Game statistics stored in localStorage */
export interface GameStats {
  /** Best score achieved */
  bestScore: number
  /** Total number of attempts */
  attempts: number
}

/** Grid configuration for the drawing canvas */
export interface GridConfig {
  /** Whether to show the grid */
  visible: boolean
  /** Grid cell size in pixels */
  size: number
  /** Grid line color */
  color: string
  /** Grid line width */
  lineWidth: number
}

/** Drawing configuration for the circle */
export interface DrawingConfig {
  /** Circle line color */
  strokeColor: string
  /** Circle line width */
  lineWidth: number
  /** Line cap style */
  lineCap: 'butt' | 'round' | 'square'
  /** Line join style */
  lineJoin: 'bevel' | 'round' | 'miter'
  /** Shadow blur radius */
  shadowBlur: number
  /** Shadow color */
  shadowColor: string
}

/** Performance statistics for the canvas */
export interface PerformanceStats {
  /** Average frame time in milliseconds */
  averageFrameTime: number
  /** Number of points drawn */
  pointsDrawn: number
  /** Time taken to evaluate the circle */
  evaluationTime: number
}
/**
 * Physics and Collision Detection Types
 * For RaccoonMascot and UI element interactions
 */

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface PhysicsConstants {
  GROUND_Y: number;
  GRAVITY: number;
  JUMP_FORCE: number;
  MOVE_SPEED: number;
  MAX_JUMPS: number;
  WALL_STICK_FORCE: number;
  CHARGE_MAX: number;
  CHARGE_RATE: number;
}

export interface PhysicsState {
  position: Position;
  velocity: Velocity;
  jumpsUsed: number;
  isOnWall: boolean;
  wallSide: WallSide;
  charging: boolean;
  charge: number;
  isPickedUp: boolean;
  isDragging: boolean;
  isOnUIElement: boolean;
}

export interface UIElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
  element: HTMLElement;
  textBaseline?: number;
  isText?: boolean;
  isPowerButton?: boolean;
}

export interface DragState {
  isDragging: boolean;
  dragOffset: Position;
}

export interface VisualState {
  bounceCount: number;
  showSparkles: boolean;
  showGif: boolean;
  currentMascot: number;
  currentRaccoonEmoji: string;
}

export interface KeyState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface CollisionResult {
  collided: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  element?: UIElement;
}

export interface TextMeasurement {
  width: number;
  height: number;
}

export interface TextBounds {
  top: number;
  baseline: number;
  height: number;
}

export type WallSide = 'left' | 'right' | null;

export type MascotEmoji = '🦝' | '🐾' | '🍃' | '🌰' | '🗑️' | '🌙' | '🐻' | '🍯';

export interface RaccoonMascotProps {
  // Props if any are added in the future
}
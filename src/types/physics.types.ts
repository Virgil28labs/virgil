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
  element: HTMLElement;
  x: number;
  y: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  isText: boolean;
  isPowerButton: boolean;
  isWeatherWidget?: boolean;
  id?: string;
  type?: string;
  textBaseline?: number;
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

export type WallSide = 'left' | 'right' | null;

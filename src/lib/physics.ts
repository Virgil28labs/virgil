// Physics engine utilities for RaccoonMascot

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
}

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  bounceDamping: number;
  angularDamping: number;
  groundLevel: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 0.5,
  friction: 0.98,
  bounceDamping: 0.6,
  angularDamping: 0.95,
  groundLevel: 0
};

export class PhysicsEngine {
  private config: PhysicsConfig;
  
  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  updateConfig(config: Partial<PhysicsConfig>) {
    this.config = { ...this.config, ...config };
  }

  applyGravity(body: PhysicsBody): void {
    body.vy += this.config.gravity;
  }

  applyFriction(body: PhysicsBody): void {
    body.vx *= this.config.friction;
    body.vy *= this.config.friction;
    body.angularVelocity *= this.config.angularDamping;
  }

  updatePosition(body: PhysicsBody, deltaTime: number = 1): void {
    body.x += body.vx * deltaTime;
    body.y += body.vy * deltaTime;
    body.angle += body.angularVelocity * deltaTime;
  }

  handleGroundCollision(body: PhysicsBody, containerHeight: number, bodyHeight: number): boolean {
    const groundY = containerHeight - this.config.groundLevel - bodyHeight;
    
    if (body.y >= groundY) {
      body.y = groundY;
      
      if (Math.abs(body.vy) > 1) {
        body.vy = -body.vy * this.config.bounceDamping;
        body.angularVelocity = (Math.random() - 0.5) * 10;
        return true; // Bounced
      } else {
        body.vy = 0;
        body.angularVelocity *= 0.9;
      }
    }
    
    return false;
  }

  handleWallCollision(body: PhysicsBody, containerWidth: number, bodyWidth: number): boolean {
    let bounced = false;
    
    if (body.x <= 0) {
      body.x = 0;
      body.vx = Math.abs(body.vx) * this.config.bounceDamping;
      body.angularVelocity = (Math.random() - 0.5) * 10;
      bounced = true;
    } else if (body.x >= containerWidth - bodyWidth) {
      body.x = containerWidth - bodyWidth;
      body.vx = -Math.abs(body.vx) * this.config.bounceDamping;
      body.angularVelocity = (Math.random() - 0.5) * 10;
      bounced = true;
    }
    
    return bounced;
  }

  applyImpulse(body: PhysicsBody, impulseX: number, impulseY: number): void {
    body.vx += impulseX;
    body.vy += impulseY;
  }

  applyDrag(body: PhysicsBody, x: number, y: number): void {
    body.x = x;
    body.y = y;
    body.vx = 0;
    body.vy = 0;
    body.angularVelocity = 0;
  }

  throwObject(body: PhysicsBody, throwPower: number, angle: number): void {
    const radians = angle * Math.PI / 180;
    body.vx = Math.cos(radians) * throwPower;
    body.vy = Math.sin(radians) * throwPower;
    body.angularVelocity = (Math.random() - 0.5) * 20;
  }

  isAtRest(body: PhysicsBody, threshold: number = 0.1): boolean {
    return Math.abs(body.vx) < threshold && 
           Math.abs(body.vy) < threshold && 
           Math.abs(body.angularVelocity) < threshold;
  }

  step(body: PhysicsBody, containerDimensions: { width: number; height: number }, bodyDimensions: { width: number; height: number }): { bounced: boolean } {
    this.applyGravity(body);
    this.applyFriction(body);
    this.updatePosition(body);
    
    const groundBounced = this.handleGroundCollision(body, containerDimensions.height, bodyDimensions.height);
    const wallBounced = this.handleWallCollision(body, containerDimensions.width, bodyDimensions.width);
    
    return { bounced: groundBounced || wallBounced };
  }
}
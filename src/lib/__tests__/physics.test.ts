/**
 * Physics Engine Tests
 * 
 * Tests the physics engine for RaccoonMascot including:
 * - Physics body state management (position, velocity, rotation)
 * - Gravity application and acceleration
 * - Friction and damping effects
 * - Position updates with delta time
 * - Ground collision detection and bouncing
 * - Wall collision detection and bouncing  
 * - Impulse application for forces
 * - Object throwing with angle and power
 * - Drag and direct positioning
 * - Rest state detection
 * - Integrated physics step function
 * - Configuration management and defaults
 * - Edge cases and boundary conditions
 */

import type {
  PhysicsBody } from '../physics';
import {
  PhysicsEngine,
  DEFAULT_PHYSICS_CONFIG,
} from '../physics';

// Test helpers
const createTestBody = (overrides: Partial<PhysicsBody> = {}): PhysicsBody => ({
  x: 50,
  y: 50,
  vx: 0,
  vy: 0,
  angle: 0,
  angularVelocity: 0,
  ...overrides,
});

const createTestDimensions = () => ({
  container: { width: 800, height: 600 },
  body: { width: 50, height: 50 },
});

describe('DEFAULT_PHYSICS_CONFIG', () => {
  it('should have sensible default values', () => {
    expect(DEFAULT_PHYSICS_CONFIG).toEqual({
      gravity: 0.5,
      friction: 0.98,
      bounceDamping: 0.6,
      angularDamping: 0.95,
      groundLevel: 0,
    });
  });

  it('should be immutable (not modified by engines)', () => {
    const originalConfig = { ...DEFAULT_PHYSICS_CONFIG };
    
    new PhysicsEngine({ gravity: 2.0 });
    
    expect(DEFAULT_PHYSICS_CONFIG).toEqual(originalConfig);
  });
});

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;
  let body: PhysicsBody;

  beforeEach(() => {
    engine = new PhysicsEngine();
    body = createTestBody();
  });

  describe('Constructor and configuration', () => {
    it('should initialize with default config when no config provided', () => {
      const defaultEngine = new PhysicsEngine();
      const config = (defaultEngine as any).config;
      
      expect(config).toEqual(DEFAULT_PHYSICS_CONFIG);
    });

    it('should merge custom config with defaults', () => {
      const customEngine = new PhysicsEngine({
        gravity: 1.0,
        friction: 0.9,
      });
      const config = (customEngine as any).config;
      
      expect(config).toEqual({
        ...DEFAULT_PHYSICS_CONFIG,
        gravity: 1.0,
        friction: 0.9,
      });
    });

    it('should allow updating config after creation', () => {
      engine.updateConfig({
        gravity: 2.0,
        bounceDamping: 0.8,
      });
      
      const config = (engine as any).config;
      expect(config.gravity).toBe(2.0);
      expect(config.bounceDamping).toBe(0.8);
      expect(config.friction).toBe(DEFAULT_PHYSICS_CONFIG.friction); // Unchanged
    });

    it('should handle partial config updates', () => {
      const originalConfig = (engine as any).config;
      
      engine.updateConfig({ gravity: 3.0 });
      
      const updatedConfig = (engine as any).config;
      expect(updatedConfig.gravity).toBe(3.0);
      expect(updatedConfig.friction).toBe(originalConfig.friction);
      expect(updatedConfig.bounceDamping).toBe(originalConfig.bounceDamping);
    });
  });

  describe('applyGravity', () => {
    it('should increase vertical velocity by gravity amount', () => {
      body.vy = 0;
      
      engine.applyGravity(body);
      
      expect(body.vy).toBe(DEFAULT_PHYSICS_CONFIG.gravity);
      expect(body.vx).toBe(0); // Should not affect horizontal velocity
    });

    it('should accumulate gravity over multiple applications', () => {
      body.vy = 2;
      
      engine.applyGravity(body);
      engine.applyGravity(body);
      
      expect(body.vy).toBe(2 + DEFAULT_PHYSICS_CONFIG.gravity * 2);
    });

    it('should work with custom gravity settings', () => {
      engine.updateConfig({ gravity: 2.0 });
      body.vy = 0;
      
      engine.applyGravity(body);
      
      expect(body.vy).toBe(2.0);
    });

    it('should not modify other body properties', () => {
      const originalBody = { ...body };
      
      engine.applyGravity(body);
      
      expect(body.x).toBe(originalBody.x);
      expect(body.y).toBe(originalBody.y);
      expect(body.vx).toBe(originalBody.vx);
      expect(body.angle).toBe(originalBody.angle);
      expect(body.angularVelocity).toBe(originalBody.angularVelocity);
    });
  });

  describe('applyFriction', () => {
    it('should reduce velocities by friction factors', () => {
      body.vx = 10;
      body.vy = 5;
      body.angularVelocity = 20;
      
      engine.applyFriction(body);
      
      expect(body.vx).toBe(10 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.vy).toBe(5 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.angularVelocity).toBe(20 * DEFAULT_PHYSICS_CONFIG.angularDamping);
    });

    it('should work with negative velocities', () => {
      body.vx = -8;
      body.vy = -4;
      body.angularVelocity = -15;
      
      engine.applyFriction(body);
      
      expect(body.vx).toBe(-8 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.vy).toBe(-4 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.angularVelocity).toBe(-15 * DEFAULT_PHYSICS_CONFIG.angularDamping);
    });

    it('should gradually reduce velocity to near zero', () => {
      body.vx = 10;
      body.angularVelocity = 10;
      
      // Apply friction multiple times
      for (let i = 0; i < 50; i++) {
        engine.applyFriction(body);
      }
      
      expect(Math.abs(body.vx)).toBeLessThan(0.1);
      expect(Math.abs(body.angularVelocity)).toBeLessThan(0.1);
    });

    it('should work with custom friction settings', () => {
      engine.updateConfig({ friction: 0.5, angularDamping: 0.8 });
      body.vx = 10;
      body.angularVelocity = 20;
      
      engine.applyFriction(body);
      
      expect(body.vx).toBe(5); // 10 * 0.5
      expect(body.angularVelocity).toBe(16); // 20 * 0.8
    });
  });

  describe('updatePosition', () => {
    it('should update position based on velocity with default delta time', () => {
      body.x = 100;
      body.y = 200;
      body.vx = 5;
      body.vy = -3;
      body.angle = 45;
      body.angularVelocity = 2;
      
      engine.updatePosition(body);
      
      expect(body.x).toBe(105); // 100 + 5 * 1
      expect(body.y).toBe(197); // 200 + (-3) * 1
      expect(body.angle).toBe(47); // 45 + 2 * 1
    });

    it('should handle custom delta time', () => {
      body.x = 100;
      body.y = 200;
      body.vx = 10;
      body.vy = -5;
      body.angularVelocity = 4;
      
      engine.updatePosition(body, 0.5);
      
      expect(body.x).toBe(105); // 100 + 10 * 0.5
      expect(body.y).toBe(197.5); // 200 + (-5) * 0.5
      expect(body.angle).toBe(2); // 0 + 4 * 0.5
    });

    it('should handle zero velocities', () => {
      const originalX = body.x;
      const originalY = body.y;
      const originalAngle = body.angle;
      
      engine.updatePosition(body);
      
      expect(body.x).toBe(originalX);
      expect(body.y).toBe(originalY);
      expect(body.angle).toBe(originalAngle);
    });

    it('should handle negative velocities', () => {
      body.x = 100;
      body.y = 200;
      body.vx = -8;
      body.vy = -6;
      body.angularVelocity = -3;
      
      engine.updatePosition(body, 2);
      
      expect(body.x).toBe(84); // 100 + (-8) * 2
      expect(body.y).toBe(188); // 200 + (-6) * 2
      expect(body.angle).toBe(-6); // 0 + (-3) * 2
    });
  });

  describe('handleGroundCollision', () => {
    const { container, body: bodyDimensions } = createTestDimensions();

    it('should detect and handle ground collision', () => {
      const groundY = container.height - bodyDimensions.height; // At ground level
      body.y = groundY + 10; // Below ground
      body.vy = 5; // Moving downward
      
      const bounced = engine.handleGroundCollision(body, container.height, bodyDimensions.height);
      
      expect(body.y).toBe(groundY);
      expect(body.vy).toBe(-5 * DEFAULT_PHYSICS_CONFIG.bounceDamping);
      expect(bounced).toBe(true);
      expect(Math.abs(body.angularVelocity)).toBeGreaterThan(0);
    });

    it('should not bounce for low velocity impacts', () => {
      const groundY = container.height - bodyDimensions.height;
      body.y = groundY + 1;
      body.vy = 0.5; // Low velocity
      
      const bounced = engine.handleGroundCollision(body, container.height, bodyDimensions.height);
      
      expect(body.y).toBe(groundY);
      expect(body.vy).toBe(0);
      expect(bounced).toBe(false);
      expect(body.angularVelocity).toBeLessThan(1); // Reduced but not random
    });

    it('should not affect bodies above ground', () => {
      const groundY = container.height - bodyDimensions.height;
      body.y = groundY - 50; // Above ground
      body.vy = 3;
      const originalAngularVelocity = body.angularVelocity;
      
      const bounced = engine.handleGroundCollision(body, container.height, bodyDimensions.height);
      
      expect(body.y).toBe(groundY - 50); // Position unchanged
      expect(body.vy).toBe(3); // Velocity unchanged
      expect(bounced).toBe(false);
      expect(body.angularVelocity).toBe(originalAngularVelocity);
    });

    it('should handle custom ground level', () => {
      engine.updateConfig({ groundLevel: 50 });
      const groundY = container.height - 50 - bodyDimensions.height;
      body.y = groundY + 5;
      body.vy = 8;
      
      const bounced = engine.handleGroundCollision(body, container.height, bodyDimensions.height);
      
      expect(body.y).toBe(groundY);
      expect(body.vy).toBe(-8 * DEFAULT_PHYSICS_CONFIG.bounceDamping);
      expect(bounced).toBe(true);
    });

    it('should handle upward velocity at ground level', () => {
      const groundY = container.height - bodyDimensions.height;
      body.y = groundY;
      body.vy = -5; // Moving upward
      
      const bounced = engine.handleGroundCollision(body, container.height, bodyDimensions.height);
      
      expect(body.y).toBe(groundY);
      expect(body.vy).toBe(-5); // Should not change upward velocity
      expect(bounced).toBe(false);
    });
  });

  describe('handleWallCollision', () => {
    const { container, body: bodyDimensions } = createTestDimensions();

    it('should handle left wall collision', () => {
      body.x = -5; // Past left wall
      body.vx = -3; // Moving left
      
      const bounced = engine.handleWallCollision(body, container.width, bodyDimensions.width);
      
      expect(body.x).toBe(0);
      expect(body.vx).toBe(3 * DEFAULT_PHYSICS_CONFIG.bounceDamping); // Positive (rightward)
      expect(bounced).toBe(true);
      expect(Math.abs(body.angularVelocity)).toBeGreaterThan(0);
    });

    it('should handle right wall collision', () => {
      const rightWallX = container.width - bodyDimensions.width;
      body.x = rightWallX + 10; // Past right wall
      body.vx = 4; // Moving right
      
      const bounced = engine.handleWallCollision(body, container.width, bodyDimensions.width);
      
      expect(body.x).toBe(rightWallX);
      expect(body.vx).toBe(-4 * DEFAULT_PHYSICS_CONFIG.bounceDamping); // Negative (leftward)
      expect(bounced).toBe(true);
      expect(Math.abs(body.angularVelocity)).toBeGreaterThan(0);
    });

    it('should not affect bodies within walls', () => {
      body.x = 100; // Between walls
      body.vx = 2;
      const originalAngularVelocity = body.angularVelocity;
      
      const bounced = engine.handleWallCollision(body, container.width, bodyDimensions.width);
      
      expect(body.x).toBe(100); // Position unchanged
      expect(body.vx).toBe(2); // Velocity unchanged
      expect(bounced).toBe(false);
      expect(body.angularVelocity).toBe(originalAngularVelocity);
    });

    it('should handle both walls in sequence if body is very wide', () => {
      // Test with very wide body
      const wideBodyWidth = container.width + 100;
      body.x = -50;
      body.vx = -2;
      
      const bounced = engine.handleWallCollision(body, container.width, wideBodyWidth);
      
      expect(body.x).toBe(0); // Should hit left wall first
      expect(body.vx).toBeGreaterThan(0); // Should bounce right
      expect(bounced).toBe(true);
    });

    it('should work with rightward velocity at left wall', () => {
      body.x = 0; // At left wall
      body.vx = 3; // Moving right
      
      const bounced = engine.handleWallCollision(body, container.width, bodyDimensions.width);
      
      expect(body.x).toBe(0);
      expect(body.vx).toBe(3); // Should not change rightward velocity at left wall
      expect(bounced).toBe(false);
    });
  });

  describe('applyImpulse', () => {
    it('should add impulse to velocity', () => {
      body.vx = 5;
      body.vy = -2;
      
      engine.applyImpulse(body, 3, 4);
      
      expect(body.vx).toBe(8); // 5 + 3
      expect(body.vy).toBe(2); // -2 + 4
    });

    it('should handle negative impulses', () => {
      body.vx = 5;
      body.vy = 3;
      
      engine.applyImpulse(body, -2, -8);
      
      expect(body.vx).toBe(3); // 5 + (-2)
      expect(body.vy).toBe(-5); // 3 + (-8)
    });

    it('should handle zero impulse', () => {
      const originalVx = body.vx;
      const originalVy = body.vy;
      
      engine.applyImpulse(body, 0, 0);
      
      expect(body.vx).toBe(originalVx);
      expect(body.vy).toBe(originalVy);
    });

    it('should not affect other body properties', () => {
      const originalX = body.x;
      const originalY = body.y;
      const originalAngle = body.angle;
      const originalAngularVelocity = body.angularVelocity;
      
      engine.applyImpulse(body, 5, -3);
      
      expect(body.x).toBe(originalX);
      expect(body.y).toBe(originalY);
      expect(body.angle).toBe(originalAngle);
      expect(body.angularVelocity).toBe(originalAngularVelocity);
    });
  });

  describe('applyDrag', () => {
    it('should set position and zero velocities', () => {
      body.vx = 10;
      body.vy = -5;
      body.angularVelocity = 15;
      
      engine.applyDrag(body, 200, 300);
      
      expect(body.x).toBe(200);
      expect(body.y).toBe(300);
      expect(body.vx).toBe(0);
      expect(body.vy).toBe(0);
      expect(body.angularVelocity).toBe(0);
    });

    it('should handle negative coordinates', () => {
      engine.applyDrag(body, -50, -100);
      
      expect(body.x).toBe(-50);
      expect(body.y).toBe(-100);
      expect(body.vx).toBe(0);
      expect(body.vy).toBe(0);
      expect(body.angularVelocity).toBe(0);
    });

    it('should not affect angle', () => {
      body.angle = 45;
      
      engine.applyDrag(body, 100, 200);
      
      expect(body.angle).toBe(45); // Should remain unchanged
    });
  });

  describe('throwObject', () => {
    it('should set velocity based on angle and power', () => {
      const power = 20;
      const angle = 45; // 45 degrees
      
      engine.throwObject(body, power, angle);
      
      const expectedVx = Math.cos(45 * Math.PI / 180) * power;
      const expectedVy = Math.sin(45 * Math.PI / 180) * power;
      
      expect(body.vx).toBeCloseTo(expectedVx, 2);
      expect(body.vy).toBeCloseTo(expectedVy, 2);
      expect(Math.abs(body.angularVelocity)).toBeGreaterThan(0);
    });

    it('should handle horizontal throw (0 degrees)', () => {
      const power = 15;
      
      engine.throwObject(body, power, 0);
      
      expect(body.vx).toBeCloseTo(power, 2);
      expect(body.vy).toBeCloseTo(0, 2);
    });

    it('should handle vertical throw (90 degrees)', () => {
      const power = 15;
      
      engine.throwObject(body, power, 90);
      
      expect(body.vx).toBeCloseTo(0, 2);
      expect(body.vy).toBeCloseTo(power, 2);
    });

    it('should handle negative angles', () => {
      const power = 10;
      const angle = -30;
      
      engine.throwObject(body, power, angle);
      
      const expectedVx = Math.cos(angle * Math.PI / 180) * power;
      const expectedVy = Math.sin(angle * Math.PI / 180) * power;
      
      expect(body.vx).toBeCloseTo(expectedVx, 2);
      expect(body.vy).toBeCloseTo(expectedVy, 2);
      expect(body.vy).toBeLessThan(0); // Should be negative for downward throw
    });

    it('should handle zero power', () => {
      engine.throwObject(body, 0, 45);
      
      expect(body.vx).toBe(0);
      expect(body.vy).toBe(0);
    });

    it('should generate random angular velocity', () => {
      const angularVelocities: number[] = [];
      
      // Generate multiple throws to test randomness
      for (let i = 0; i < 10; i++) {
        const testBody = createTestBody();
        engine.throwObject(testBody, 10, 45);
        angularVelocities.push(testBody.angularVelocity);
      }
      
      // Should have some variation in angular velocities
      const unique = new Set(angularVelocities);
      expect(unique.size).toBeGreaterThan(1);
      
      // All should be within expected range
      angularVelocities.forEach(av => {
        expect(Math.abs(av)).toBeLessThanOrEqual(10); // Max range is -10 to 10
      });
    });
  });

  describe('isAtRest', () => {
    it('should return true when all velocities are below default threshold', () => {
      body.vx = 0.05;
      body.vy = -0.08;
      body.angularVelocity = 0.03;
      
      expect(engine.isAtRest(body)).toBe(true);
    });

    it('should return false when horizontal velocity exceeds threshold', () => {
      body.vx = 0.2; // Above default threshold of 0.1
      body.vy = 0.05;
      body.angularVelocity = 0.03;
      
      expect(engine.isAtRest(body)).toBe(false);
    });

    it('should return false when vertical velocity exceeds threshold', () => {
      body.vx = 0.05;
      body.vy = -0.15; // Above threshold
      body.angularVelocity = 0.03;
      
      expect(engine.isAtRest(body)).toBe(false);
    });

    it('should return false when angular velocity exceeds threshold', () => {
      body.vx = 0.05;
      body.vy = 0.08;
      body.angularVelocity = 0.12; // Above threshold
      
      expect(engine.isAtRest(body)).toBe(false);
    });

    it('should handle custom threshold', () => {
      body.vx = 0.15;
      body.vy = 0.18;
      body.angularVelocity = 0.12;
      
      expect(engine.isAtRest(body, 0.2)).toBe(true); // All below 0.2
      expect(engine.isAtRest(body, 0.1)).toBe(false); // Some above 0.1
    });

    it('should handle zero velocities', () => {
      body.vx = 0;
      body.vy = 0;
      body.angularVelocity = 0;
      
      expect(engine.isAtRest(body)).toBe(true);
    });

    it('should handle negative velocities', () => {
      body.vx = -0.05;
      body.vy = -0.08;
      body.angularVelocity = -0.03;
      
      expect(engine.isAtRest(body)).toBe(true);
    });
  });

  describe('step', () => {
    const { container, body: bodyDimensions } = createTestDimensions();

    it('should perform complete physics step without collisions', () => {
      body.x = 100;
      body.y = 100;
      body.vx = 5;
      body.vy = 2;
      
      const result = engine.step(body, container, bodyDimensions);
      
      // Should apply gravity
      expect(body.vy).toBeGreaterThan(2); // Increased by gravity
      
      // Should apply friction
      const expectedVx = 5 * DEFAULT_PHYSICS_CONFIG.friction;
      expect(body.vx).toBeCloseTo(expectedVx, 5);
      
      // Should update position
      expect(body.x).toBeGreaterThan(100);
      expect(body.y).toBeGreaterThan(100);
      
      expect(result.bounced).toBe(false);
    });

    it('should detect ground collision and bouncing', () => {
      const groundY = container.height - bodyDimensions.height;
      body.x = 100;
      body.y = groundY - 1; // Just above ground
      body.vx = 0;
      body.vy = 10; // Fast downward velocity
      
      const result = engine.step(body, container, bodyDimensions);
      
      expect(body.y).toBe(groundY); // Should be positioned at ground
      expect(body.vy).toBeLessThan(0); // Should bounce upward
      expect(result.bounced).toBe(true);
    });

    it('should detect wall collision and bouncing', () => {
      body.x = -1; // Past left wall
      body.y = 100;
      body.vx = -5; // Moving left
      body.vy = 0;
      
      const result = engine.step(body, container, bodyDimensions);
      
      expect(body.x).toBe(0); // Should be at wall
      expect(body.vx).toBeGreaterThan(0); // Should bounce right
      expect(result.bounced).toBe(true);
    });

    it('should handle simultaneous ground and wall collisions', () => {
      const groundY = container.height - bodyDimensions.height;
      body.x = -1; // Past left wall
      body.y = groundY + 1; // Below ground
      body.vx = -3;
      body.vy = 5;
      
      const result = engine.step(body, container, bodyDimensions);
      
      expect(body.x).toBe(0); // At wall
      expect(body.y).toBe(groundY); // At ground
      expect(body.vx).toBeGreaterThan(0); // Bounced from wall
      expect(body.vy).toBeLessThan(0); // Bounced from ground
      expect(result.bounced).toBe(true);
    });

    it('should maintain realistic physics over multiple steps', () => {
      // Drop object from height
      body.x = 100;
      body.y = 50;
      body.vx = 2;
      body.vy = 0;
      
      let maxHeight = body.y;
      let bounceCount = 0;
      
      // Simulate 100 physics steps
      for (let i = 0; i < 100; i++) {
        const result = engine.step(body, container, bodyDimensions);
        
        if (result.bounced) {
          bounceCount++;
        }
        
        maxHeight = Math.min(maxHeight, body.y); // Track lowest point
      }
      
      expect(bounceCount).toBeGreaterThan(0); // Should have bounced
      expect(body.y).toBeGreaterThan(maxHeight); // Should settle higher than lowest point
      expect(Math.abs(body.vx)).toBeLessThan(2); // Horizontal velocity should be reduced by friction
    });

    it('should eventually bring object to rest', () => {
      body.x = 100;
      body.y = 100;
      body.vx = 1;
      body.vy = 1;
      body.angularVelocity = 2;
      
      // Run many physics steps
      for (let i = 0; i < 1000; i++) {
        engine.step(body, container, bodyDimensions);
        
        if (engine.isAtRest(body)) {
          break;
        }
      }
      
      expect(engine.isAtRest(body)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very small container dimensions', () => {
      const smallContainer = { width: 10, height: 10 };
      const normalBody = { width: 50, height: 50 };
      
      body.x = 5;
      body.y = 5;
      
      expect(() => {
        engine.step(body, smallContainer, normalBody);
      }).not.toThrow();
      
      // Body should be constrained within container bounds
      expect(body.x).toBeGreaterThanOrEqual(0);
      expect(body.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme velocities', () => {
      body.vx = 1000;
      body.vy = -1000;
      body.angularVelocity = 500;
      
      const { container, body: bodyDimensions } = createTestDimensions();
      
      expect(() => {
        engine.step(body, container, bodyDimensions);
      }).not.toThrow();
      
      // Should still maintain reasonable bounds
      expect(body.x).toBeGreaterThanOrEqual(0);
      expect(body.x).toBeLessThanOrEqual(container.width);
    });

    it('should handle zero dimensions', () => {
      const zeroDimensions = { width: 0, height: 0 };
      
      expect(() => {
        engine.step(body, zeroDimensions, { width: 50, height: 50 });
      }).not.toThrow();
    });

    it('should handle NaN values gracefully', () => {
      body.vx = NaN;
      body.vy = NaN;
      
      const { container, body: bodyDimensions } = createTestDimensions();
      
      expect(() => {
        engine.step(body, container, bodyDimensions);
      }).not.toThrow();
    });
  });
});
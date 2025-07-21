import {
  PhysicsEngine,
  PhysicsBody,
  PhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
} from "./physics";

describe("PhysicsEngine", () => {
  let engine: PhysicsEngine;
  let body: PhysicsBody;

  beforeEach(() => {
    engine = new PhysicsEngine();
    body = {
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
    };
  });

  describe("constructor", () => {
    it("should use default config when no config provided", () => {
      const defaultEngine = new PhysicsEngine();
      // Test by checking behavior matches default config
      const testBody: PhysicsBody = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: 0,
        angularVelocity: 0,
      };
      defaultEngine.applyGravity(testBody);
      expect(testBody.vy).toBe(DEFAULT_PHYSICS_CONFIG.gravity);
    });

    it("should merge partial config with defaults", () => {
      const customEngine = new PhysicsEngine({ gravity: 1.0 });
      const testBody: PhysicsBody = {
        x: 0,
        y: 0,
        vx: 10,
        vy: 0,
        angle: 0,
        angularVelocity: 0,
      };

      // Gravity should be custom
      customEngine.applyGravity(testBody);
      expect(testBody.vy).toBe(1.0);

      // Friction should be default
      customEngine.applyFriction(testBody);
      expect(testBody.vx).toBe(10 * DEFAULT_PHYSICS_CONFIG.friction);
    });

    it("should accept full custom config", () => {
      const customConfig: PhysicsConfig = {
        gravity: 2.0,
        friction: 0.9,
        bounceDamping: 0.5,
        angularDamping: 0.8,
        groundLevel: 10,
      };
      const customEngine = new PhysicsEngine(customConfig);

      const testBody: PhysicsBody = {
        x: 0,
        y: 0,
        vx: 10,
        vy: 10,
        angle: 0,
        angularVelocity: 10,
      };
      customEngine.applyGravity(testBody);
      expect(testBody.vy).toBe(12.0); // 10 + 2.0

      customEngine.applyFriction(testBody);
      expect(testBody.vx).toBe(9.0); // 10 * 0.9
      expect(testBody.angularVelocity).toBe(8.0); // 10 * 0.8
    });
  });

  describe("updateConfig", () => {
    it("should update config while preserving other values", () => {
      engine.updateConfig({ gravity: 2.0 });

      const testBody: PhysicsBody = {
        x: 0,
        y: 0,
        vx: 10,
        vy: 0,
        angle: 0,
        angularVelocity: 0,
      };
      engine.applyGravity(testBody);
      expect(testBody.vy).toBe(2.0);

      // Other config should remain default
      engine.applyFriction(testBody);
      expect(testBody.vx).toBe(10 * DEFAULT_PHYSICS_CONFIG.friction);
    });

    it("should allow multiple config updates", () => {
      engine.updateConfig({ gravity: 2.0 });
      engine.updateConfig({ friction: 0.9 });

      const testBody: PhysicsBody = {
        x: 0,
        y: 0,
        vx: 10,
        vy: 0,
        angle: 0,
        angularVelocity: 0,
      };
      engine.applyGravity(testBody);
      engine.applyFriction(testBody);

      expect(testBody.vy).toBe(2.0);
      expect(testBody.vx).toBe(9.0);
    });
  });

  describe("applyGravity", () => {
    it("should add gravity to vertical velocity", () => {
      body.vy = 5;
      engine.applyGravity(body);
      expect(body.vy).toBe(5 + DEFAULT_PHYSICS_CONFIG.gravity);
    });

    it("should work with negative initial velocity", () => {
      body.vy = -10;
      engine.applyGravity(body);
      expect(body.vy).toBe(-10 + DEFAULT_PHYSICS_CONFIG.gravity);
    });

    it("should not affect other properties", () => {
      const originalBody = { ...body };
      engine.applyGravity(body);

      expect(body.x).toBe(originalBody.x);
      expect(body.y).toBe(originalBody.y);
      expect(body.vx).toBe(originalBody.vx);
      expect(body.angle).toBe(originalBody.angle);
      expect(body.angularVelocity).toBe(originalBody.angularVelocity);
    });
  });

  describe("applyFriction", () => {
    it("should reduce velocities by friction factor", () => {
      body.vx = 10;
      body.vy = 20;
      body.angularVelocity = 5;

      engine.applyFriction(body);

      expect(body.vx).toBe(10 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.vy).toBe(20 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.angularVelocity).toBe(
        5 * DEFAULT_PHYSICS_CONFIG.angularDamping,
      );
    });

    it("should handle negative velocities", () => {
      body.vx = -10;
      body.vy = -20;
      body.angularVelocity = -5;

      engine.applyFriction(body);

      expect(body.vx).toBe(-10 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.vy).toBe(-20 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.angularVelocity).toBe(
        -5 * DEFAULT_PHYSICS_CONFIG.angularDamping,
      );
    });

    it("should handle zero velocities", () => {
      body.vx = 0;
      body.vy = 0;
      body.angularVelocity = 0;

      engine.applyFriction(body);

      expect(body.vx).toBe(0);
      expect(body.vy).toBe(0);
      expect(body.angularVelocity).toBe(0);
    });
  });

  describe("updatePosition", () => {
    it("should update position based on velocity with default deltaTime", () => {
      body.vx = 10;
      body.vy = 20;
      body.angularVelocity = Math.PI;

      engine.updatePosition(body);

      expect(body.x).toBe(110); // 100 + 10 * 1
      expect(body.y).toBe(120); // 100 + 20 * 1
      expect(body.angle).toBe(Math.PI);
    });

    it("should update position with custom deltaTime", () => {
      body.vx = 10;
      body.vy = 20;
      body.angularVelocity = Math.PI;

      engine.updatePosition(body, 0.5);

      expect(body.x).toBe(105); // 100 + 10 * 0.5
      expect(body.y).toBe(110); // 100 + 20 * 0.5
      expect(body.angle).toBe(Math.PI * 0.5);
    });

    it("should handle negative velocities", () => {
      body.vx = -10;
      body.vy = -20;
      body.angularVelocity = -Math.PI;

      engine.updatePosition(body);

      expect(body.x).toBe(90);
      expect(body.y).toBe(80);
      expect(body.angle).toBe(-Math.PI);
    });
  });

  describe("handleGroundCollision", () => {
    const containerHeight = 500;
    const bodyHeight = 50;

    it("should detect ground collision", () => {
      body.y = 450; // At ground
      body.vy = 10;

      const bounced = engine.handleGroundCollision(
        body,
        containerHeight,
        bodyHeight,
      );

      expect(body.y).toBe(450); // Should stay at ground
      expect(body.vy).toBe(-10 * DEFAULT_PHYSICS_CONFIG.bounceDamping);
      expect(bounced).toBe(true);
    });

    it("should stop bouncing when velocity is small", () => {
      body.y = 450;
      body.vy = 0.5; // Small velocity

      const bounced = engine.handleGroundCollision(
        body,
        containerHeight,
        bodyHeight,
      );

      expect(body.y).toBe(450);
      expect(body.vy).toBe(0);
      expect(bounced).toBe(false);
    });

    it("should not affect body above ground", () => {
      body.y = 200;
      body.vy = 10;

      const bounced = engine.handleGroundCollision(
        body,
        containerHeight,
        bodyHeight,
      );

      expect(body.y).toBe(200);
      expect(body.vy).toBe(10);
      expect(bounced).toBe(false);
    });

    it("should add random angular velocity on bounce", () => {
      body.y = 450;
      body.vy = 10;
      body.angularVelocity = 0;

      // Mock Math.random to test angular velocity
      const mockRandom = jest.spyOn(Math, "random").mockReturnValue(0.7);

      engine.handleGroundCollision(body, containerHeight, bodyHeight);

      expect(body.angularVelocity).toBe((0.7 - 0.5) * 10);

      mockRandom.mockRestore();
    });

    it("should handle custom ground level", () => {
      const customEngine = new PhysicsEngine({ groundLevel: 20 });
      body.y = 430; // At ground with offset
      body.vy = 10;

      const bounced = customEngine.handleGroundCollision(
        body,
        containerHeight,
        bodyHeight,
      );

      expect(body.y).toBe(430);
      expect(bounced).toBe(true);
    });
  });

  describe("handleWallCollision", () => {
    const containerWidth = 800;
    const bodyWidth = 50;

    it("should handle left wall collision", () => {
      body.x = -5;
      body.vx = -10;

      const bounced = engine.handleWallCollision(
        body,
        containerWidth,
        bodyWidth,
      );

      expect(body.x).toBe(0);
      expect(body.vx).toBe(10 * DEFAULT_PHYSICS_CONFIG.bounceDamping);
      expect(bounced).toBe(true);
    });

    it("should handle right wall collision", () => {
      body.x = 755;
      body.vx = 10;

      const bounced = engine.handleWallCollision(
        body,
        containerWidth,
        bodyWidth,
      );

      expect(body.x).toBe(750); // containerWidth - bodyWidth
      expect(body.vx).toBe(-10 * DEFAULT_PHYSICS_CONFIG.bounceDamping);
      expect(bounced).toBe(true);
    });

    it("should not affect body away from walls", () => {
      body.x = 400;
      body.vx = 10;

      const bounced = engine.handleWallCollision(
        body,
        containerWidth,
        bodyWidth,
      );

      expect(body.x).toBe(400);
      expect(body.vx).toBe(10);
      expect(bounced).toBe(false);
    });

    it("should add random angular velocity on wall bounce", () => {
      body.x = -5;
      body.vx = -10;
      body.angularVelocity = 0;

      const mockRandom = jest.spyOn(Math, "random").mockReturnValue(0.3);

      engine.handleWallCollision(body, containerWidth, bodyWidth);

      expect(body.angularVelocity).toBe((0.3 - 0.5) * 10);

      mockRandom.mockRestore();
    });
  });

  describe("applyImpulse", () => {
    it("should add impulse to velocity", () => {
      body.vx = 5;
      body.vy = 10;

      engine.applyImpulse(body, 10, -5);

      expect(body.vx).toBe(15);
      expect(body.vy).toBe(5);
    });

    it("should handle negative impulses", () => {
      body.vx = 5;
      body.vy = 10;

      engine.applyImpulse(body, -10, -20);

      expect(body.vx).toBe(-5);
      expect(body.vy).toBe(-10);
    });

    it("should not affect position or rotation", () => {
      const originalX = body.x;
      const originalY = body.y;
      const originalAngle = body.angle;

      engine.applyImpulse(body, 10, 10);

      expect(body.x).toBe(originalX);
      expect(body.y).toBe(originalY);
      expect(body.angle).toBe(originalAngle);
    });
  });

  describe("applyDrag", () => {
    it("should set position and reset velocities", () => {
      body.vx = 10;
      body.vy = 20;
      body.angularVelocity = 5;

      engine.applyDrag(body, 200, 300);

      expect(body.x).toBe(200);
      expect(body.y).toBe(300);
      expect(body.vx).toBe(0);
      expect(body.vy).toBe(0);
      expect(body.angularVelocity).toBe(0);
    });

    it("should handle drag to same position", () => {
      body.vx = 10;
      body.vy = 20;

      engine.applyDrag(body, body.x, body.y);

      expect(body.x).toBe(100);
      expect(body.y).toBe(100);
      expect(body.vx).toBe(0);
      expect(body.vy).toBe(0);
    });
  });

  describe("throwObject", () => {
    it("should apply velocity based on angle and power", () => {
      engine.throwObject(body, 10, 0); // Throw right

      expect(body.vx).toBeCloseTo(10);
      expect(body.vy).toBeCloseTo(0);
    });

    it("should handle different angles", () => {
      engine.throwObject(body, 10, 90); // Throw down

      expect(body.vx).toBeCloseTo(0);
      expect(body.vy).toBeCloseTo(10);
    });

    it("should handle negative angles", () => {
      engine.throwObject(body, 10, -90); // Throw up

      expect(body.vx).toBeCloseTo(0);
      expect(body.vy).toBeCloseTo(-10);
    });

    it("should handle 45 degree angle", () => {
      engine.throwObject(body, 10, 45);

      expect(body.vx).toBeCloseTo(10 * Math.cos(Math.PI / 4));
      expect(body.vy).toBeCloseTo(10 * Math.sin(Math.PI / 4));
    });

    it("should add random angular velocity", () => {
      const mockRandom = jest.spyOn(Math, "random").mockReturnValue(0.8);

      engine.throwObject(body, 10, 0);

      expect(body.angularVelocity).toBe((0.8 - 0.5) * 20);

      mockRandom.mockRestore();
    });
  });

  describe("isAtRest", () => {
    it("should return true when body is at rest", () => {
      body.vx = 0.05;
      body.vy = 0.05;
      body.angularVelocity = 0.05;

      expect(engine.isAtRest(body)).toBe(true);
    });

    it("should return false when body is moving", () => {
      body.vx = 1;
      body.vy = 0;
      body.angularVelocity = 0;

      expect(engine.isAtRest(body)).toBe(false);
    });

    it("should use custom threshold", () => {
      body.vx = 0.5;
      body.vy = 0.5;
      body.angularVelocity = 0.5;

      expect(engine.isAtRest(body, 1)).toBe(true);
      expect(engine.isAtRest(body, 0.4)).toBe(false);
    });

    it("should handle negative velocities", () => {
      body.vx = -0.05;
      body.vy = -0.05;
      body.angularVelocity = -0.05;

      expect(engine.isAtRest(body)).toBe(true);
    });

    it("should check all velocity components", () => {
      // Only vx exceeds threshold
      body.vx = 0.2;
      body.vy = 0.05;
      body.angularVelocity = 0.05;
      expect(engine.isAtRest(body)).toBe(false);

      // Only vy exceeds threshold
      body.vx = 0.05;
      body.vy = 0.2;
      body.angularVelocity = 0.05;
      expect(engine.isAtRest(body)).toBe(false);

      // Only angular velocity exceeds threshold
      body.vx = 0.05;
      body.vy = 0.05;
      body.angularVelocity = 0.2;
      expect(engine.isAtRest(body)).toBe(false);
    });
  });

  describe("step", () => {
    const containerDimensions = { width: 800, height: 600 };
    const bodyDimensions = { width: 50, height: 50 };

    it("should perform complete physics step", () => {
      body.vx = 10;
      body.vy = 0;

      const result = engine.step(body, containerDimensions, bodyDimensions);

      // Should have applied gravity
      expect(body.vy).toBeGreaterThan(0);

      // Should have applied friction
      expect(body.vx).toBeLessThan(10);

      // Should have updated position
      expect(body.x).toBeGreaterThan(100);
      expect(body.y).toBeGreaterThan(100);

      expect(result.bounced).toBe(false);
    });

    it("should detect ground bounce", () => {
      body.y = 540;
      body.vy = 10;

      const result = engine.step(body, containerDimensions, bodyDimensions);

      expect(result.bounced).toBe(true);
      expect(body.vy).toBeLessThan(0); // Should bounce up
    });

    it("should detect wall bounce", () => {
      body.x = 760;
      body.vx = 10;

      const result = engine.step(body, containerDimensions, bodyDimensions);

      expect(result.bounced).toBe(true);
      expect(body.vx).toBeLessThan(0); // Should bounce left
    });

    it("should handle multiple collisions", () => {
      // Body at corner
      body.x = 760;
      body.y = 540;
      body.vx = 10;
      body.vy = 10;

      const result = engine.step(body, containerDimensions, bodyDimensions);

      expect(result.bounced).toBe(true);
      expect(body.vx).toBeLessThan(0);
      expect(body.vy).toBeLessThan(0);
    });

    it("should handle body at rest", () => {
      body.vx = 0;
      body.vy = 0;
      body.angularVelocity = 0;

      const result = engine.step(body, containerDimensions, bodyDimensions);

      // Gravity should still apply
      expect(body.vy).toBeGreaterThan(0);
      expect(result.bounced).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle very small dimensions", () => {
      const smallContainer = { width: 1, height: 1 };
      const smallBody = { width: 0.5, height: 0.5 };

      body.x = 0.5;
      body.y = 0.5;

      const result = engine.step(body, smallContainer, smallBody);

      // Should handle without errors
      expect(result).toBeDefined();
    });

    it("should handle zero dimensions", () => {
      const zeroContainer = { width: 0, height: 0 };
      const zeroBody = { width: 0, height: 0 };

      const result = engine.step(body, zeroContainer, zeroBody);

      // Should handle without errors
      expect(result).toBeDefined();
    });

    it("should handle extreme velocities", () => {
      body.vx = 10000;
      body.vy = 10000;
      body.angularVelocity = 10000;

      engine.applyFriction(body);

      // Should still apply friction correctly
      expect(body.vx).toBe(10000 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.vy).toBe(10000 * DEFAULT_PHYSICS_CONFIG.friction);
      expect(body.angularVelocity).toBe(
        10000 * DEFAULT_PHYSICS_CONFIG.angularDamping,
      );
    });

    it("should handle very large angles", () => {
      body.angle = 1000;
      body.angularVelocity = 100;

      engine.updatePosition(body);

      expect(body.angle).toBe(1100);
    });
  });

  describe("real-world scenarios", () => {
    it("should simulate falling object", () => {
      const containerDimensions = { width: 800, height: 600 };
      const bodyDimensions = { width: 50, height: 50 };

      body.y = 100;
      body.vy = 0;

      // Simulate multiple frames
      for (let i = 0; i < 100; i++) {
        engine.step(body, containerDimensions, bodyDimensions);
      }

      // Should have fallen and be at rest on ground
      expect(body.y).toBeCloseTo(550, 0);
      expect(Math.abs(body.vy)).toBeLessThan(1);
    });

    it("should simulate throwing and bouncing", () => {
      const containerDimensions = { width: 800, height: 600 };
      const bodyDimensions = { width: 50, height: 50 };

      engine.throwObject(body, 20, -45); // Throw up and right

      let bounceCount = 0;

      // Simulate until object comes to rest
      for (let i = 0; i < 1000; i++) {
        const result = engine.step(body, containerDimensions, bodyDimensions);
        if (result.bounced) bounceCount++;

        if (engine.isAtRest(body, 0.5)) break;
      }

      // Should have bounced multiple times
      expect(bounceCount).toBeGreaterThan(0);
      // Should eventually come to rest
      expect(engine.isAtRest(body, 1)).toBe(true);
    });

    it("should simulate dragging and releasing", () => {
      const containerDimensions = { width: 800, height: 600 };
      const bodyDimensions = { width: 50, height: 50 };

      // Drag to top
      engine.applyDrag(body, 400, 50);

      // Release (gravity takes over)
      for (let i = 0; i < 50; i++) {
        engine.step(body, containerDimensions, bodyDimensions);
      }

      // Should have fallen
      expect(body.y).toBeGreaterThan(50);
      expect(body.vy).toBeGreaterThan(0);
    });
  });
});

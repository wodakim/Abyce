// Verlet Physics Components
// Zero-Allocation Policy: Components should not be instantiated during update loop.
// Component structure holds data in TypedArrays.

import { Component } from '../ecs/types';

export const COMPONENT_VERLET_BODY = 1;
export const COMPONENT_CONSTRAINT = 2;
export const COMPONENT_PLAYER = 3;
export const COMPONENT_FOOD = 4;

export class VerletBody implements Component {
  _type = COMPONENT_VERLET_BODY;

  // Stride: x, y, oldX, oldY, radius, pinned (6 floats)
  // Max points per body: e.g., 32
  static readonly STRIDE = 6;
  static readonly MAX_POINTS = 32;

  points: Float32Array;
  pointCount: number = 0;

  // Constraints: pointIndexA, pointIndexB, length, stiffness (4 floats)
  // Max constraints: e.g., 64
  static readonly CONSTRAINT_STRIDE = 4;
  static readonly MAX_CONSTRAINTS = 64;

  constraints: Float32Array;
  constraintCount: number = 0;

  constructor() {
    this.points = new Float32Array(VerletBody.MAX_POINTS * VerletBody.STRIDE);
    this.constraints = new Float32Array(VerletBody.MAX_CONSTRAINTS * VerletBody.CONSTRAINT_STRIDE);
  }

  addPoint(x: number, y: number, radius: number = 10, pinned: boolean = false): number {
    if (this.pointCount >= VerletBody.MAX_POINTS) {
      console.warn("Max points reached for VerletBody");
      return -1;
    }
    const idx = this.pointCount * VerletBody.STRIDE;
    this.points[idx] = x;
    this.points[idx + 1] = y;
    this.points[idx + 2] = x; // oldX = x (start at rest)
    this.points[idx + 3] = y; // oldY = y
    this.points[idx + 4] = radius;
    this.points[idx + 5] = pinned ? 1 : 0;

    return this.pointCount++;
  }

  addConstraint(idxA: number, idxB: number, stiffness: number = 1.0, length: number = -1): number {
    if (this.constraintCount >= VerletBody.MAX_CONSTRAINTS) {
      console.warn("Max constraints reached for VerletBody");
      return -1;
    }

    // Calculate distance if length is -1
    let dist = length;
    if (length < 0) {
      const x1 = this.points[idxA * VerletBody.STRIDE];
      const y1 = this.points[idxA * VerletBody.STRIDE + 1];
      const x2 = this.points[idxB * VerletBody.STRIDE];
      const y2 = this.points[idxB * VerletBody.STRIDE + 1];
      dist = Math.hypot(x2 - x1, y2 - y1);
    }

    const cIdx = this.constraintCount * VerletBody.CONSTRAINT_STRIDE;
    this.constraints[cIdx] = idxA;
    this.constraints[cIdx + 1] = idxB;
    this.constraints[cIdx + 2] = dist;
    this.constraints[cIdx + 3] = stiffness;

    return this.constraintCount++;
  }
}

// Marker Components
export class PlayerComponent implements Component {
  _type = COMPONENT_PLAYER;
  speed: number = 200; // Base speed
}

export class FoodComponent implements Component {
  _type = COMPONENT_FOOD;
  value: number = 10;
}

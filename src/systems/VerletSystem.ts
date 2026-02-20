import { System } from '../ecs/types';
import { World } from '../ecs/World';
import { VerletBody, COMPONENT_VERLET_BODY } from '../components/VerletBody';

export class VerletSystem extends System {
  private friction: number = 0.9;
  private subSteps: number = 8; // Stability

  // Bounds
  private bounds = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };

  constructor() {
    super();
    window.addEventListener('resize', () => {
      this.bounds.width = window.innerWidth;
      this.bounds.height = window.innerHeight;
    });
  }

  update(dt: number): void {
    if (!this.world) return;

    const entities = (this.world as World).getEntitiesWith([COMPONENT_VERLET_BODY]);

    // Fixed Timestep requires sub-stepping constraints for stability
    const subDt = dt / this.subSteps;

    for (let s = 0; s < this.subSteps; s++) {
      for (const entity of entities) {
        const body = (this.world as World).getComponent<VerletBody>(entity, COMPONENT_VERLET_BODY);
        if (!body) continue;

        this.updatePoints(body, subDt);
        this.solveConstraints(body);
        this.constrainToBounds(body);
      }
    }
  }

  private updatePoints(body: VerletBody, _dt: number): void {
    const count = body.pointCount;
    const stride = VerletBody.STRIDE;
    const points = body.points;

    for (let i = 0; i < count; i++) {
      const idx = i * stride;

      // Skip pinned points
      if (points[idx + 5] > 0.5) continue;

      const x = points[idx];
      const y = points[idx + 1];
      const oldX = points[idx + 2];
      const oldY = points[idx + 3];

      // Verlet Integration: x = 2*x - oldX + a*dt*dt
      // With friction: x += (x - oldX) * friction

      const vx = (x - oldX) * this.friction;
      const vy = (y - oldY) * this.friction;

      points[idx + 2] = x; // Update oldX
      points[idx + 3] = y; // Update oldY

      points[idx] = x + vx;
      points[idx + 1] = y + vy;
    }
  }

  private solveConstraints(body: VerletBody): void {
    const pStride = VerletBody.STRIDE;
    const cStride = VerletBody.CONSTRAINT_STRIDE;
    const points = body.points;
    const constraints = body.constraints;
    const count = body.constraintCount;

    for (let i = 0; i < count; i++) {
      const idx = i * cStride;
      const idxA = constraints[idx] * pStride;
      const idxB = constraints[idx + 1] * pStride;
      const length = constraints[idx + 2];
      const stiffness = constraints[idx + 3]; // Usually 1.0 for rigid sticks, <1 for springs

      const x1 = points[idxA];
      const y1 = points[idxA + 1];
      const x2 = points[idxB];
      const y2 = points[idxB + 1];

      const dx = x1 - x2;
      const dy = y1 - y2;
      const dist = Math.hypot(dx, dy);

      // Avoid division by zero
      if (dist < 0.0001) continue;

      const diff = (length - dist) / dist * stiffness * 0.5; // Each point moves half the error

      const offsetX = dx * diff;
      const offsetY = dy * diff;

      // Apply correction if not pinned
      if (points[idxA + 5] < 0.5) {
        points[idxA] += offsetX;
        points[idxA + 1] += offsetY;
      }
      if (points[idxB + 5] < 0.5) {
        points[idxB] -= offsetX;
        points[idxB + 1] -= offsetY;
      }
    }
  }

  private constrainToBounds(body: VerletBody): void {
    const stride = VerletBody.STRIDE;
    const count = body.pointCount;
    const points = body.points;
    const width = this.bounds.width;
    const height = this.bounds.height;

    for (let i = 0; i < count; i++) {
      const idx = i * stride;
      const radius = points[idx + 4];
      const vx = points[idx] - points[idx + 2];
      const vy = points[idx + 1] - points[idx + 3];

      // X Bounds
      if (points[idx] < radius) {
        points[idx] = radius;
        points[idx + 2] = points[idx] + vx * 0.5; // Dampen velocity on bounce
      } else if (points[idx] > width - radius) {
        points[idx] = width - radius;
        points[idx + 2] = points[idx] + vx * 0.5;
      }

      // Y Bounds
      if (points[idx] < radius) {
        points[idx] = radius;
        points[idx + 3] = points[idx] + vy * 0.5;
      } else if (points[idx] > height - radius) {
        points[idx] = height - radius;
        points[idx + 3] = points[idx] + vy * 0.5;
      }
    }
  }
}

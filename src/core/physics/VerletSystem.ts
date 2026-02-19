import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';
import { SpatialHashGrid } from './SpatialHashGrid';

export class VerletSystem {
  private positionManager: ComponentManager<Float32Array>;
  private prevPositionManager: ComponentManager<Float32Array>;
  private accelerationManager: ComponentManager<Float32Array>;
  private verletPointManager: ComponentManager<Float32Array>;
  private constraintManager: ComponentManager<Float32Array>;

  private grid: SpatialHashGrid;
  private bounds: { width: number; height: number };

  constructor(world: World, bounds: { width: number; height: number }, grid: SpatialHashGrid) {
    this.positionManager = world.getComponent('position');
    this.prevPositionManager = world.getComponent('prevPosition');
    this.accelerationManager = world.getComponent('acceleration');
    this.verletPointManager = world.getComponent('verletPoint');
    this.constraintManager = world.getComponent('constraint');
    this.bounds = bounds;
    this.grid = grid;
  }

  update(dt: number) {
    this.populateGrid();

    this.integrate(dt);
    this.resolveConstraints();
    this.resolveCollisions();
    this.applyBoundaries();
  }

  private populateGrid() {
    this.grid.clear();
    const count = this.verletPointManager.getCount();
    const activeEntities = this.verletPointManager.getDenseEntities();
    const positions = this.positionManager.getRawData();

    for (let i = 0; i < count; i++) {
        const entityId = activeEntities[i];
        const posIdx = this.positionManager.getIndex(entityId) * 2;
        if (posIdx < 0) continue;
        const x = positions[posIdx];
        const y = positions[posIdx + 1];
        this.grid.insert(entityId, x, y);
    }
  }

  private integrate(dt: number) {
    const positions = this.positionManager.getRawData();
    const prevPositions = this.prevPositionManager.getRawData();
    const accelerations = this.accelerationManager.getRawData();
    const verletPoints = this.verletPointManager.getRawData();

    const activeEntities = this.verletPointManager.getDenseEntities();
    const count = this.verletPointManager.getCount();

    const dtSq = dt * dt;

    for (let i = 0; i < count; i++) {
      const entityId = activeEntities[i];
      const posIdx = this.positionManager.getIndex(entityId) * 2;
      const prevIdx = this.prevPositionManager.getIndex(entityId) * 2;
      const accIdx = this.accelerationManager.getIndex(entityId) * 2;
      const vPtIdx = this.verletPointManager.getIndex(entityId) * 3;

      const isPinned = verletPoints[vPtIdx + 2];
      if (isPinned > 0) continue;

      const friction = verletPoints[vPtIdx + 1];

      const x = positions[posIdx];
      const y = positions[posIdx + 1];
      const prevX = prevPositions[prevIdx];
      const prevY = prevPositions[prevIdx + 1];
      const accX = accelerations[accIdx];
      const accY = accelerations[accIdx + 1];

      const velX = (x - prevX) * friction;
      const velY = (y - prevY) * friction;

      const newX = x + velX + accX * dtSq;
      const newY = y + velY + accY * dtSq;

      prevPositions[prevIdx] = x;
      prevPositions[prevIdx + 1] = y;

      positions[posIdx] = newX;
      positions[posIdx + 1] = newY;

      accelerations[accIdx] = 0;
      accelerations[accIdx + 1] = 0;
    }
  }

  private resolveConstraints() {
    const iterations = 8;
    const constraints = this.constraintManager.getRawData();
    const count = this.constraintManager.getCount();
    const positions = this.positionManager.getRawData();

    let iter, i, idx, entityA, entityB, dist, stiff;
    let idxA, idxB, x1, y1, x2, y2, dx, dy, currentDistSq, currentDist, delta, percent, offsetX, offsetY;

    for (iter = 0; iter < iterations; iter++) {
        for (i = 0; i < count; i++) {
            idx = i * 4;
            entityA = constraints[idx];
            entityB = constraints[idx + 1];
            dist = constraints[idx + 2];
            stiff = constraints[idx + 3];

            if (!this.positionManager.has(entityA) || !this.positionManager.has(entityB)) continue;

            idxA = this.positionManager.getIndex(entityA) * 2;
            idxB = this.positionManager.getIndex(entityB) * 2;

            x1 = positions[idxA];
            y1 = positions[idxA + 1];
            x2 = positions[idxB];
            y2 = positions[idxB + 1];

            dx = x1 - x2;
            dy = y1 - y2;
            currentDistSq = dx*dx + dy*dy;

            if (currentDistSq < 0.0001) currentDistSq = 0.0001;

            currentDist = Math.sqrt(currentDistSq);

            delta = currentDist - dist;
            percent = (delta / currentDist) * 0.5 * stiff;

            offsetX = dx * percent;
            offsetY = dy * percent;

            positions[idxA] -= offsetX;
            positions[idxA + 1] -= offsetY;
            positions[idxB] += offsetX;
            positions[idxB + 1] += offsetY;
        }
    }
  }

  private resolveCollisions() {
      const positions = this.positionManager.getRawData();
      const verletPoints = this.verletPointManager.getRawData();
      const count = this.verletPointManager.getCount();
      const activeEntities = this.verletPointManager.getDenseEntities();

      let i, idA, idxA, vpIdxA, radiusA;
      let cellX, cellY, cx, cy, neighborId, cellIndex;

      for (i = 0; i < count; i++) {
          idA = activeEntities[i];
          idxA = this.positionManager.getIndex(idA) * 2;
          vpIdxA = this.verletPointManager.getIndex(idA) * 3;
          radiusA = verletPoints[vpIdxA];

          const px = positions[idxA];
          const py = positions[idxA + 1];

          cellX = this.grid.getCellX(px);
          cellY = this.grid.getCellY(py);

          for (let dyCell = -1; dyCell <= 1; dyCell++) {
              for (let dxCell = -1; dxCell <= 1; dxCell++) {
                  cx = cellX + dxCell;
                  cy = cellY + dyCell;

                  if (cx < 0 || cx >= this.grid.getWidthInCells() || cy < 0 || cy >= this.grid.getHeightInCells()) continue;

                  cellIndex = cx + cy * this.grid.getWidthInCells();

                  neighborId = this.grid.heads[cellIndex];

                  while (neighborId !== -1) {
                      if (neighborId > idA) {
                          this.checkCollision(idA, neighborId, idxA, radiusA, positions, verletPoints);
                      }
                      neighborId = this.grid.next[neighborId];
                  }
              }
          }
      }
  }

  private checkCollision(_idA: number, idB: number, idxA: number, radiusA: number, positions: Float32Array, verletPoints: Float32Array) {
      if (!this.verletPointManager.has(idB)) return;

      const idxB = this.positionManager.getIndex(idB) * 2;
      const vpIdxB = this.verletPointManager.getIndex(idB) * 3;
      const radiusB = verletPoints[vpIdxB];

      const dx = positions[idxA] - positions[idxB];
      const dy = positions[idxA + 1] - positions[idxB + 1];
      const distSq = dx*dx + dy*dy;
      const minDist = radiusA + radiusB;

      if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const correction = overlap * 0.5;

          positions[idxA] += nx * correction;
          positions[idxA + 1] += ny * correction;
          positions[idxB] -= nx * correction;
          positions[idxB + 1] -= ny * correction;
      }
  }

  private applyBoundaries() {
      const positions = this.positionManager.getRawData();
      const prevPositions = this.prevPositionManager.getRawData();
      const count = this.positionManager.getCount();
      const { width, height } = this.bounds;
      const damping = 0.8;

      let i, idx, x, y, prevX, prevY, vx, vy;

      for (i = 0; i < count; i++) {
          idx = i * 2;
          x = positions[idx];
          y = positions[idx + 1];

          if (x < 0) {
              prevX = prevPositions[idx];
              vx = (x - prevX) * damping;
              positions[idx] = 0;
              prevPositions[idx] = 0 - vx;
          } else if (x > width) {
              prevX = prevPositions[idx];
              vx = (x - prevX) * damping;
              positions[idx] = width;
              prevPositions[idx] = width - vx;
          }

          if (y < 0) {
              prevY = prevPositions[idx + 1];
              vy = (y - prevY) * damping;
              positions[idx + 1] = 0;
              prevPositions[idx + 1] = 0 - vy;
          } else if (y > height) {
              prevY = prevPositions[idx + 1];
              vy = (y - prevY) * damping;
              positions[idx + 1] = height;
              prevPositions[idx + 1] = height - vy;
          }
      }
  }
}

import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';
import { SpatialHashGrid } from '../physics/SpatialHashGrid';

export class PredationSystem {
  private world: World;
  private grid: SpatialHashGrid;

  private positionManager: ComponentManager<Float32Array>;
  private verletPointManager: ComponentManager<Float32Array>;

  constructor(world: World, grid: SpatialHashGrid) {
    this.world = world;
    this.grid = grid;

    this.positionManager = world.getComponent('position');
    this.verletPointManager = world.getComponent('verletPoint');
  }

  update(_dt: number) {
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

    const verletPoints = this.verletPointManager.getRawData();

    for (let i = count - 1; i >= 0; i--) {
        const predatorId = activeEntities[i];

        if (!this.verletPointManager.has(predatorId)) continue;

        const pPosIdx = this.positionManager.getIndex(predatorId) * 2;
        const pVpIdx = this.verletPointManager.getIndex(predatorId) * 3;

        const px = positions[pPosIdx];
        const py = positions[pPosIdx + 1];
        const pRadius = verletPoints[pVpIdx];

        const cellX = this.grid.getCellX(px);
        const cellY = this.grid.getCellY(py);

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = cellX + dx;
                const cy = cellY + dy;

                if (cx < 0 || cx >= this.grid.getWidthInCells() || cy < 0 || cy >= this.grid.getHeightInCells()) continue;

                const cellIndex = cx + cy * this.grid.getWidthInCells();

                let neighborId = this.grid.heads[cellIndex];
                while (neighborId !== -1) {
                    if (neighborId !== predatorId) {
                        this.checkPredation(predatorId, neighborId, px, py, pRadius);
                    }
                    neighborId = this.grid.next[neighborId];
                }
            }
        }
    }
  }

  private checkPredation(predator: number, prey: number, px: number, py: number, pRadius: number) {
      if (!this.verletPointManager.has(prey)) return;
      if (!this.verletPointManager.has(predator)) return;

      const pVpIdx = this.verletPointManager.getIndex(predator) * 3;

      const preyVpIdx = this.verletPointManager.getIndex(prey) * 3;
      const verletPoints = this.verletPointManager.getRawData();
      const preyRadius = verletPoints[preyVpIdx];

      // Rule: Mass > 1.1 * Mass
      if (pRadius <= preyRadius * 1.1) return;

      const preyPosIdx = this.positionManager.getIndex(prey) * 2;
      const positions = this.positionManager.getRawData();
      const preyX = positions[preyPosIdx];
      const preyY = positions[preyPosIdx + 1];

      const dx = px - preyX;
      const dy = py - preyY;
      const distSq = dx*dx + dy*dy;
      const minDist = pRadius + preyRadius;

      if (distSq < minDist * minDist) {
          // EAT
          this.world.destroyEntity(prey);

          // Grow Predator
          const growth = Math.sqrt(pRadius*pRadius + 0.5 * preyRadius*preyRadius);
          verletPoints[pVpIdx] = growth;
      }
  }
}

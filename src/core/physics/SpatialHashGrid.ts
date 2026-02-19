import { MAX_ENTITIES } from '../ecs/constants';

export class SpatialHashGrid {
  public heads: Int32Array;
  public next: Int32Array;

  private cellSize: number;
  private width: number; // Cells count in X
  private height: number; // Cells count in Y
  private worldWidth: number;
  private worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, cellSize: number = 100) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.cellSize = cellSize;

    this.width = Math.ceil(worldWidth / cellSize);
    this.height = Math.ceil(worldHeight / cellSize);

    const numCells = this.width * this.height;

    // Heads array: index is cell index, value is first entityID in that cell
    this.heads = new Int32Array(numCells).fill(-1);

    // Next array: index is entityID, value is next entityID in the chain
    this.next = new Int32Array(MAX_ENTITIES).fill(-1);
  }

  clear() {
    this.heads.fill(-1);
    // No need to clear 'next' because 'heads' breaks the entry points.
    // 'next' will be overwritten on insert.
  }

  insert(entityId: number, x: number, y: number) {
    // Clamp coordinates to world bounds
    // to ensure valid cell index
    if (x < 0) x = 0;
    if (x >= this.worldWidth) x = this.worldWidth - 1;
    if (y < 0) y = 0;
    if (y >= this.worldHeight) y = this.worldHeight - 1;

    const cellX = (x / this.cellSize) | 0; // Math.floor
    const cellY = (y / this.cellSize) | 0;

    const cellIndex = cellX + cellY * this.width;

    // Linked List Insertion (Prepend)
    this.next[entityId] = this.heads[cellIndex];
    this.heads[cellIndex] = entityId;
  }

  // Helpers for systems to calculate ranges
  getCellIndex(x: number, y: number): number {
    if (x < 0) x = 0;
    if (x >= this.worldWidth) x = this.worldWidth - 1;
    if (y < 0) y = 0;
    if (y >= this.worldHeight) y = this.worldHeight - 1;

    const cellX = (x / this.cellSize) | 0;
    const cellY = (y / this.cellSize) | 0;
    return cellX + cellY * this.width;
  }

  getCellX(x: number): number {
      return Math.min(Math.max((x / this.cellSize) | 0, 0), this.width - 1);
  }

  getCellY(y: number): number {
      return Math.min(Math.max((y / this.cellSize) | 0, 0), this.height - 1);
  }

  getWidthInCells(): number {
      return this.width;
  }

  getHeightInCells(): number {
      return this.height;
  }
}

import { MAX_ENTITIES, EntityID, NULL_ENTITY } from './constants';

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export type TypedArrayConstructor = {
  new (length: number): TypedArray;
  BYTES_PER_ELEMENT: number;
};

/**
 * Enhanced ComponentManager to support multi-value components (e.g., Vec2 [x, y]).
 * The 'stride' parameter defines how many elements per entity.
 */
export class ComponentManager<T extends TypedArray> {
  private sparse: Int32Array;
  private dense: Int32Array;
  public data: T;
  private stride: number;
  private count: number;
  private maxEntities: number;

  constructor(ArrayType: TypedArrayConstructor, maxEntities: number = MAX_ENTITIES, stride: number = 1) {
    this.maxEntities = maxEntities;
    this.stride = stride;
    this.sparse = new Int32Array(maxEntities).fill(NULL_ENTITY);
    this.dense = new Int32Array(maxEntities).fill(NULL_ENTITY);
    this.data = new ArrayType(maxEntities * stride) as T;
    this.count = 0;
  }

  add(entity: EntityID, values: number[]): void {
    if (this.has(entity)) {
      const index = this.sparse[entity];
      for(let i=0; i<this.stride; i++) {
        this.data[index * this.stride + i] = values[i];
      }
      return;
    }

    if (this.count >= this.maxEntities) {
      throw new Error("Component capacity reached.");
    }

    const index = this.count;
    this.sparse[entity] = index;
    this.dense[index] = entity;

    for(let i=0; i<this.stride; i++) {
        this.data[index * this.stride + i] = values[i];
    }

    this.count++;
  }

  remove(entity: EntityID): void {
    if (!this.has(entity)) return;

    const indexToRemove = this.sparse[entity];
    const lastIndex = this.count - 1;
    const lastEntity = this.dense[lastIndex];

    this.dense[indexToRemove] = lastEntity;
    this.sparse[lastEntity] = indexToRemove;

    // Move data block
    for(let i=0; i<this.stride; i++) {
        this.data[indexToRemove * this.stride + i] = this.data[lastIndex * this.stride + i];
    }

    this.sparse[entity] = NULL_ENTITY;
    this.dense[lastIndex] = NULL_ENTITY;
    this.count--;
  }

  has(entity: EntityID): boolean {
    return this.sparse[entity] !== NULL_ENTITY;
  }

  // Returns raw array index for entity, allowing direct access like data[idx+0], data[idx+1]
  getIndex(entity: EntityID): number {
      return this.sparse[entity];
  }

  // Helper to get values (ALLOCATES ARRAY - use carefully or for debugging)
  get(entity: EntityID): number[] | undefined {
    if (!this.has(entity)) return undefined;
    const idx = this.sparse[entity] * this.stride;
    const res = [];
    for(let i=0; i<this.stride; i++) res.push(this.data[idx+i]);
    return res;
  }

  getCount(): number {
    return this.count;
  }

  getDenseEntities(): Int32Array {
    return this.dense;
  }

  getRawData(): T {
    return this.data;
  }
}

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
 * ComponentManager implements the Sparse Set pattern for efficient component storage and retrieval.
 * It uses two TypedArrays:
 * - sparse: maps EntityID -> Index in dense array
 * - dense: maps Index -> EntityID
 *
 * The component data itself is stored in a TypedArray (e.g., Float32Array for positions).
 * This structure allows for O(1) addition, removal, and lookup, as well as cache-friendly iteration.
 */
export class ComponentManager<T extends TypedArray> {
  // Maps EntityID to Index in dense array.
  // Using -1 (NULL_ENTITY) to indicate absence.
  private sparse: Int32Array;

  // Maps Index to EntityID. Used for iterating and for the swap-and-pop removal.
  private dense: Int32Array;

  // The actual component data stored in a TypedArray.
  public data: T;

  private count: number;
  private maxEntities: number;

  constructor(ArrayType: TypedArrayConstructor, maxEntities: number = MAX_ENTITIES) {
    this.maxEntities = maxEntities;
    this.sparse = new Int32Array(maxEntities).fill(NULL_ENTITY);
    this.dense = new Int32Array(maxEntities).fill(NULL_ENTITY);
    this.data = new ArrayType(maxEntities) as T;
    this.count = 0;
  }

  /**
   * Adds a component to an entity.
   * Complexity: O(1)
   */
  add(entity: EntityID, value: number): void {
    if (this.has(entity)) {
      this.data[this.sparse[entity]] = value;
      return;
    }

    if (this.count >= this.maxEntities) {
      throw new Error("Component capacity reached.");
    }

    const index = this.count;
    this.sparse[entity] = index;
    this.dense[index] = entity;
    this.data[index] = value;
    this.count++;
  }

  /**
   * Removes a component from an entity using the swap-and-pop technique.
   * Complexity: O(1)
   */
  remove(entity: EntityID): void {
    if (!this.has(entity)) return;

    const indexToRemove = this.sparse[entity];
    const lastIndex = this.count - 1;
    const lastEntity = this.dense[lastIndex];

    // Move the last element to the hole left by the removed element
    this.dense[indexToRemove] = lastEntity;
    this.sparse[lastEntity] = indexToRemove;
    this.data[indexToRemove] = this.data[lastIndex];

    // Clear the slot for the removed entity
    this.sparse[entity] = NULL_ENTITY;
    this.dense[lastIndex] = NULL_ENTITY;

    // Optional: Reset data value to 0
    this.data[lastIndex] = 0;

    this.count--;
  }

  /**
   * Checks if an entity has this component.
   * Complexity: O(1)
   */
  has(entity: EntityID): boolean {
    return this.sparse[entity] !== NULL_ENTITY;
  }

  /**
   * Retrieves the component data for an entity.
   * Complexity: O(1)
   */
  get(entity: EntityID): number | undefined {
    if (!this.has(entity)) return undefined;
    return this.data[this.sparse[entity]];
  }

  /**
   * Returns the number of active components.
   */
  getCount(): number {
    return this.count;
  }

  /**
   * Returns the dense array of entity IDs that have this component.
   * Useful for iterating over all entities with this component.
   * WARNING: Returns the raw array. Use getCount() to know the valid limit.
   */
  getDenseEntities(): Int32Array {
    return this.dense;
  }

  /**
   * Returns the raw data array.
   * Useful for iterating.
   * WARNING: Returns the raw array. Use getCount() to know the valid limit.
   */
  getRawData(): T {
    return this.data;
  }
}

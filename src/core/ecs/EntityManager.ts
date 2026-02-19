import { MAX_ENTITIES, EntityID, NULL_ENTITY } from './constants';

/**
 * EntityManager manages the creation and recycling of Entity IDs.
 * It uses a stack (LIFO) to store destroyed IDs for reuse, ensuring zero allocation during gameplay.
 */
export class EntityManager {
  // Stack of available IDs to reuse
  private availableIds: Int32Array;
  // Index of the top of the stack
  private stackPointer: number;
  // Counter for generating new IDs if stack is empty
  private nextId: number;

  constructor(maxEntities: number = MAX_ENTITIES) {
    this.availableIds = new Int32Array(maxEntities);
    this.stackPointer = 0;
    this.nextId = 0;
  }

  /**
   * Creates a new entity.
   * Reuse an ID from the stack if available, otherwise creates a new one.
   * Complexity: O(1)
   */
  createEntity(): EntityID {
    if (this.stackPointer > 0) {
      this.stackPointer--;
      return this.availableIds[this.stackPointer];
    }

    if (this.nextId >= MAX_ENTITIES) {
      throw new Error(`Maximum number of entities (${MAX_ENTITIES}) reached.`);
    }

    return this.nextId++;
  }

  /**
   * Destroys an entity, making its ID available for reuse.
   * Complexity: O(1)
   */
  destroyEntity(entity: EntityID): void {
    if (entity === NULL_ENTITY) return;

    // Safety check: Don't destroy if ID is out of bounds
    if (entity < 0 || entity >= MAX_ENTITIES) {
        console.warn(`Attempted to destroy invalid entity ID: ${entity}`);
        return;
    }

    this.availableIds[this.stackPointer] = entity;
    this.stackPointer++;
  }

  /**
   * Debug method to check active entity count
   */
  getActiveCount(): number {
    return this.nextId - this.stackPointer;
  }
}

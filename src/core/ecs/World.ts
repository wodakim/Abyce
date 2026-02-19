import { ComponentManager, TypedArray, TypedArrayConstructor } from './ComponentManager';
import { EntityManager } from './EntityManager';
import { EntityID } from './constants';

/**
 * World is the central container for the ECS.
 * It manages entities and their components.
 */
export class World {
  public entityManager: EntityManager;
  public components: Map<string, ComponentManager<TypedArray>>;

  constructor() {
    this.entityManager = new EntityManager();
    this.components = new Map();
  }

  /**
   * Creates a new entity.
   */
  createEntity(): EntityID {
    return this.entityManager.createEntity();
  }

  /**
   * Destroys an entity and cleans up its components.
   */
  destroyEntity(entity: EntityID): void {
    // Remove all components associated with this entity
    for (const [, manager] of this.components) {
        manager.remove(entity);
    }
    this.entityManager.destroyEntity(entity);
  }

  /**
   * Registers a new component type.
   */
  registerComponent(name: string, ArrayType: TypedArrayConstructor, stride: number = 1): void {
    if (this.components.has(name)) {
      throw new Error(`Component "${name}" already registered.`);
    }
    this.components.set(name, new ComponentManager(ArrayType, undefined, stride));
  }

  /**
   * Gets the ComponentManager for a given component name.
   */
  getComponent<T extends TypedArray>(name: string): ComponentManager<T> {
    const manager = this.components.get(name);
    if (!manager) {
      throw new Error(`Component "${name}" not registered.`);
    }
    return manager as ComponentManager<T>;
  }

  /**
   * Adds a component to an entity.
   */
  addComponent(entity: EntityID, name: string, values: number[]): void {
    const manager = this.getComponent(name);
    manager.add(entity, values);
  }

  /**
   * Removes a component from an entity.
   */
  removeComponent(entity: EntityID, name: string): void {
    const manager = this.getComponent(name);
    manager.remove(entity);
  }

  /**
   * Checks if an entity has a component.
   */
  hasComponent(entity: EntityID, name: string): boolean {
    const manager = this.getComponent(name);
    return manager.has(entity);
  }

  /**
   * Gets a component from an entity.
   */
  getComponentData(entity: EntityID, name: string): number[] | undefined {
    const manager = this.getComponent(name);
    return manager.get(entity);
  }
}

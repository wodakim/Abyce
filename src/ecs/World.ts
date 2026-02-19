import { Entity, MAX_ENTITIES, Component, System } from './types';

export class World {
  private entities: number[] = [];
  private components: Map<number, Map<number, Component>> = new Map(); // Entity -> ComponentType -> Component
  private systems: System[] = [];
  private nextEntityId = 0;
  private freeEntities: number[] = [];

  constructor() {
    // Pre-allocate entity IDs if needed, or just manage them via counter
    // For a robust Sparse Set, we'd have ComponentManagers for each component type.
    // For this skeleton, we'll use a simpler Map approach for flexibility in Phase 1,
    // but the API will allow migration to Sparse Sets later.
  }

  createEntity(): Entity {
    let id: number;
    if (this.freeEntities.length > 0) {
      id = this.freeEntities.pop()!;
    } else {
      id = this.nextEntityId++;
    }

    if (id >= MAX_ENTITIES) {
      console.warn("Max entities reached!");
      return -1;
    }

    this.entities.push(id);
    this.components.set(id, new Map());
    return id;
  }

  destroyEntity(entity: Entity): void {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1); // O(N), slow, swap-and-pop is better for arrays
      // Ideally:
      // const last = this.entities.pop();
      // if (idx < this.entities.length) { this.entities[idx] = last; }

      this.components.delete(entity);
      this.freeEntities.push(entity);
    }
  }

  addComponent(entity: Entity, component: Component): void {
    const entityComponents = this.components.get(entity);
    if (entityComponents) {
      entityComponents.set(component._type, component);
    }
  }

  getComponent<T extends Component>(entity: Entity, typeId: number): T | undefined {
    return this.components.get(entity)?.get(typeId) as T;
  }

  hasComponent(entity: Entity, typeId: number): boolean {
    return this.components.get(entity)?.has(typeId) || false;
  }

  registerSystem(system: System): void {
    system.world = this;
    this.systems.push(system);
  }

  update(dt: number): void {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i].update(dt);
    }
  }

  // Basic query support
  getEntitiesWith(componentTypes: number[]): Entity[] {
    const result: Entity[] = [];
    // Naive implementation for skeleton. Real ECS uses bitmasks or cached queries.
    for (const entity of this.entities) {
      let hasAll = true;
      const comps = this.components.get(entity);
      if (!comps) continue;

      for (const type of componentTypes) {
        if (!comps.has(type)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) {
        result.push(entity);
      }
    }
    return result;
  }
}

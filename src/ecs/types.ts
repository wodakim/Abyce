export type Entity = number;

export const MAX_ENTITIES = 10000;

export interface Component {
  _type: number;
}

export abstract class System {
  public world: any; // Type 'World' will be defined later to avoid circular dependency issues in simple setup
  abstract update(dt: number): void;
}

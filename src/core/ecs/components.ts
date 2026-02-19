// src/core/ecs/components.ts
export const Position = {
  name: 'position',
  stride: 2, // [x, y]
  type: Float32Array
};

export const PrevPosition = {
  name: 'prevPosition',
  stride: 2, // [x, y]
  type: Float32Array
};

export const Acceleration = {
  name: 'acceleration',
  stride: 2, // [x, y]
  type: Float32Array
};

export const VerletPoint = {
  name: 'verletPoint',
  stride: 3, // [radius, friction, isPinned]
  type: Float32Array
};

// Constraints are stored on a separate entity, linking A and B
export const Constraint = {
  name: 'constraint',
  stride: 4, // [entityA_ID, entityB_ID, restingDistance, stiffness]
  type: Float32Array
};

// Player Tag (No data, just existence)
// But ComponentManager needs a TypedArray.
// We can use Uint8Array of size 1 (stride 1) and store 1.
export const PlayerTag = {
  name: 'playerTag',
  stride: 1,
  type: Uint8Array
};

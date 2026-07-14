import { z } from 'zod';

const WHITE_LIST = [
  'scene',
  'composition',
  'lighting',
  'decoration'
];

export function applyRecipePatch(
  recipe: any,
  patch: any[]
): any {
  const newRecipe = JSON.parse(JSON.stringify(recipe)); // Deep clone
  
  for (const op of patch) {
    if (!op.path || typeof op.path !== 'string') throw new Error('Invalid path');
    
    const parts = op.path.split('/').filter(Boolean);
    if (parts.length === 0 || !WHITE_LIST.includes(parts[0])) {
      throw new Error(`Forbidden path: ${op.path}`);
    }

    if (['__proto__', 'prototype', 'constructor'].includes(parts[parts.length - 1])) {
      throw new Error(`Dangerous path: ${op.path}`);
    }

    // Apply patch logic (simple implementation for this phase)
    let current = newRecipe;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }

    const last = parts[parts.length - 1];
    if (op.op === 'add' || op.op === 'replace') {
        if (op.value === undefined) throw new Error('Value required for add/replace');
        current[last] = op.value;
    } else if (op.op === 'remove') {
        delete current[last];
    } else {
        throw new Error(`Invalid op: ${op.op}`);
    }
  }

  return newRecipe;
}

/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RecipeReadyView } from '../components/RecipeReadyView';

describe('Phase 4-C-3c RecipeReadyView Tests', () => {
  it('should display go to external generation button and call the callback', () => {
    const onGoToExternalGeneration = vi.fn();
    const recipe: any = { recipeId: 'r1', version: 1 };
    const promptDocument: any = { fullPrompt: 'prompt', sections: {}, objectJson: {} };

    const { getByText } = render(
      <RecipeReadyView 
        recipe={recipe} 
        promptDocument={promptDocument} 
        onGoToExternalGeneration={onGoToExternalGeneration} 
      />
    );

    const button = getByText('导入外部生成的空场景图');
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onGoToExternalGeneration).toHaveBeenCalledTimes(1);
  });
});

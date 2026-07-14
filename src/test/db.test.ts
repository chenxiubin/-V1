import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveProject, getProject, listProjects, deleteProject, saveAsset, getAsset, deleteAsset, clearAllData } from '../lib/db';

describe('IndexedDB Integration Tests (fake-indexeddb)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('should save and retrieve a structured project successfully', async () => {
    const project = {
      id: 'test-p-1',
      name: 'Test Project 1',
      schemaVersion: '1.0' as const,
      data: { key: 'value' },
    };

    await saveProject(project);

    const saved = await getProject('test-p-1');
    expect(saved).toBeDefined();
    expect(saved!.name).toBe('Test Project 1');
    expect(saved!.data.key).toBe('value');
  });

  it('should correctly list all saved projects', async () => {
    const p1 = { id: 'p1', name: 'Project One', schemaVersion: '1.0' as const };
    const p2 = { id: 'p2', name: 'Project Two', schemaVersion: '1.0' as const };

    await saveProject(p1);
    await saveProject(p2);

    const list = await listProjects();
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.name)).toContain('Project One');
    expect(list.map((p) => p.name)).toContain('Project Two');
  });

  it('should successfully delete a project', async () => {
    const p = { id: 'delete-me', name: 'Trash', schemaVersion: '1.0' as const };
    await saveProject(p);

    const before = await getProject('delete-me');
    expect(before).toBeDefined();

    await deleteProject('delete-me');

    const after = await getProject('delete-me');
    expect(after).toBeUndefined();
  });

  it('should save and load binary blobs into the assets object store', async () => {
    const originalBlob = new Blob(['sample-image-binary-data'], { type: 'image/png' });
    const assetId = 'asset-blob-999';

    await saveAsset(assetId, originalBlob);

    const loadedBlob = await getAsset(assetId);
    expect(loadedBlob).toBeDefined();
    expect(loadedBlob!.type).toBe('image/png');

    const text = await loadedBlob!.text();
    expect(text).toBe('sample-image-binary-data');
  });

  it('should successfully delete an asset from storage', async () => {
    const blob = new Blob(['temp-data'], { type: 'image/jpeg' });
    const assetId = 'temp-asset-id';

    await saveAsset(assetId, blob);

    const before = await getAsset(assetId);
    expect(before).toBeDefined();

    await deleteAsset(assetId);

    const after = await getAsset(assetId);
    expect(after).toBeUndefined();
  });
});

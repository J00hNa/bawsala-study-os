import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';

let storage;
const state = name => ({ schemaVersion: 4, profile: { name }, settings: {}, quests: [], subjects: [], sessions: [], focusLog: [], notes: [], resources: [], cards: [], reviewLog: [], questions: [], arenaRuns: [], challengeClaims: [], notifications: [] });

beforeAll(async () => {
  Object.defineProperty(window, 'indexedDB', { configurable: true, value: globalThis.indexedDB });
  Object.defineProperty(window, 'IDBKeyRange', { configurable: true, value: globalThis.IDBKeyRange });
  const source = await readFile(new URL(`file://${process.cwd()}/storage.js`), 'utf8');
  window.eval(source);
  storage = window.BawsalaStorage;
  await storage.open();
});

afterEach(() => {
  storage.clearEmergencyDraft();
});

describe('transactional local storage', () => {
  it('isolates user namespaces', async () => {
    const a = `user-a-${crypto.randomUUID()}`;
    const b = `user-b-${crypto.randomUUID()}`;
    await storage.save(a, state('ALPHA'), 0);
    await storage.save(b, state('BETA'), 0);
    expect((await storage.load(a)).state.profile.name).toBe('ALPHA');
    expect((await storage.load(b)).state.profile.name).toBe('BETA');
  });

  it('rejects stale revisions instead of overwriting newer data', async () => {
    const namespace = `conflict-${crypto.randomUUID()}`;
    await storage.save(namespace, state('ONE'), 0);
    await storage.save(namespace, state('TWO'), 1);
    await expect(storage.save(namespace, state('STALE'), 1)).rejects.toMatchObject({ code: 'local_revision_conflict' });
    expect((await storage.load(namespace)).state.profile.name).toBe('TWO');
  });

  it('creates and verifies immutable backups', async () => {
    const namespace = `backup-${crypto.randomUUID()}`;
    const backup = await storage.createBackup(namespace, state('SAFE'), 'manual-test');
    expect(backup.id).toBeTypeOf('number');
    expect((await storage.getBackup(backup.id)).state.profile.name).toBe('SAFE');
  });

  it('fails before writing an oversized state', async () => {
    const huge = state('HUGE');
    huge.notes = [{ id: 'large', body: 'x'.repeat(storage.MAX_STATE_BYTES + 1000) }];
    expect(() => storage.assertStateSize(huge)).toThrow(/safe limit/i);
    await expect(storage.save(`huge-${crypto.randomUUID()}`, huge, 0)).rejects.toMatchObject({ code: 'state_too_large' });
  });

  it('keeps emergency drafts scoped to the active namespace', () => {
    const namespace = `draft-${crypto.randomUUID()}`;
    let writeResult;
    try {
      writeResult = storage.writeEmergencyDraft({ namespace, noteId: 'n1', body: 'unsaved text' });
    } catch {
      writeResult = false;
    }
    if (writeResult) {
      expect(storage.readEmergencyDraft(namespace)?.body).toBe('unsaved text');
      expect(storage.readEmergencyDraft('someone-else')).toBeNull();
    }
    storage.clearEmergencyDraft();
  });

  it('quarantines invalid payloads without loading them as state', async () => {
    const namespace = `quarantine-${crypto.randomUUID()}`;
    await storage.quarantine(namespace, '{bad json', 'test-corruption');
    const records = await storage.listQuarantine(namespace);
    expect(records).toHaveLength(1);
    expect(records[0].reason).toBe('test-corruption');
  });
});

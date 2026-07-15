(() => {
  'use strict';

  const DB_NAME = 'bawsala-study-os';
  const DB_VERSION = 1;
  const PROFILE_STORE = 'profiles';
  const BACKUP_STORE = 'backups';
  const QUARANTINE_STORE = 'quarantine';
  const META_STORE = 'meta';
  const LEGACY_KEYS = ['bawsala-study-os-v3', 'bawsala-study-os-v2'];
  const EMERGENCY_DRAFT_KEY = 'bawsala-emergency-note-draft-v2';
  const LEGACY_EMERGENCY_DRAFT_KEY = 'bawsala-emergency-note-draft-v1';
  const MAX_STATE_BYTES = 1_300_000;
  const MAX_IMPORT_BYTES = 1_500_000;
  const MAX_BACKUPS_PER_NAMESPACE = 12;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('bawsala-state-v4') : null;
  let dbPromise = null;
  let fallbackQueue = Promise.resolve();

  class StorageError extends Error {
    constructor(message, code = 'storage_error', details = null) {
      super(message);
      this.name = 'StorageError';
      this.code = code;
      this.details = details;
    }
  }

  class ConflictError extends StorageError {
    constructor(current) {
      super('This profile was changed in another tab.', 'local_revision_conflict', current);
      this.name = 'ConflictError';
    }
  }

  function bytes(value) {
    return new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength;
  }

  function assertStateSize(state) {
    const size = bytes(state);
    if (size > MAX_STATE_BYTES) {
      throw new StorageError(`Your data is ${Math.ceil(size / 1024)} KB; the safe limit is ${Math.floor(MAX_STATE_BYTES / 1024)} KB. Export or remove large notes before saving.`, 'state_too_large', { size, limit: MAX_STATE_BYTES });
    }
    return size;
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new StorageError('IndexedDB request failed.'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new StorageError('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(transaction.error || new StorageError('IndexedDB transaction was aborted.', 'transaction_aborted'));
    });
  }

  function open() {
    if (dbPromise) return dbPromise;
    if (!('indexedDB' in window)) {
      dbPromise = Promise.reject(new StorageError('This browser does not support IndexedDB.', 'indexeddb_unavailable'));
      return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE, { keyPath: 'namespace' });
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          const backups = db.createObjectStore(BACKUP_STORE, { keyPath: 'id', autoIncrement: true });
          backups.createIndex('namespaceCreatedAt', ['namespace', 'createdAt']);
        }
        if (!db.objectStoreNames.contains(QUARANTINE_STORE)) {
          const quarantine = db.createObjectStore(QUARANTINE_STORE, { keyPath: 'id', autoIncrement: true });
          quarantine.createIndex('namespaceCreatedAt', ['namespace', 'createdAt']);
        }
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new StorageError('Could not open the local database.'));
      request.onblocked = () => reject(new StorageError('Close other Bawsala tabs, then reload to finish the storage upgrade.', 'upgrade_blocked'));
    });
    return dbPromise;
  }

  async function withLock(namespace, callback) {
    const name = `bawsala:${namespace}`;
    if (navigator.locks?.request) return navigator.locks.request(name, { mode: 'exclusive' }, callback);
    const run = fallbackQueue.then(callback, callback);
    fallbackQueue = run.catch(() => {});
    return run;
  }

  function clone(value) {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  async function load(namespace) {
    const db = await open();
    const transaction = db.transaction(PROFILE_STORE, 'readonly');
    const record = await requestResult(transaction.objectStore(PROFILE_STORE).get(namespace));
    await transactionDone(transaction);
    return record ? clone(record) : null;
  }

  async function save(namespace, state, expectedRevision = 0, options = {}) {
    assertStateSize(state);
    return withLock(namespace, async () => {
      const db = await open();
      const stores = options.backupReason ? [PROFILE_STORE, BACKUP_STORE] : [PROFILE_STORE];
      const transaction = db.transaction(stores, 'readwrite', { durability: 'strict' });
      const profiles = transaction.objectStore(PROFILE_STORE);
      const current = await requestResult(profiles.get(namespace));
      const currentRevision = Number(current?.revision || 0);
      if (currentRevision !== Number(expectedRevision || 0)) {
        transaction.abort();
        throw new ConflictError(current ? clone(current) : null);
      }
      const now = Date.now();
      if (options.backupReason && current?.state) {
        transaction.objectStore(BACKUP_STORE).add({
          namespace,
          createdAt: now,
          reason: String(options.backupReason).slice(0, 120),
          revision: currentRevision,
          state: clone(current.state),
          bytes: bytes(current.state)
        });
      }
      const record = {
        namespace,
        state: clone(state),
        revision: currentRevision + 1,
        updatedAt: now,
        bytes: bytes(state)
      };
      profiles.put(record);
      await transactionDone(transaction);
      await pruneBackups(namespace).catch(() => {});
      channel?.postMessage({ type: 'saved', namespace, revision: record.revision, updatedAt: now });
      return clone(record);
    });
  }

  async function createBackup(namespace, state, reason = 'manual') {
    assertStateSize(state);
    const db = await open();
    const transaction = db.transaction(BACKUP_STORE, 'readwrite', { durability: 'strict' });
    const backup = {
      namespace,
      createdAt: Date.now(),
      reason: String(reason).slice(0, 120),
      revision: null,
      state: clone(state),
      bytes: bytes(state)
    };
    const id = await requestResult(transaction.objectStore(BACKUP_STORE).add(backup));
    await transactionDone(transaction);
    const verified = await getBackup(id);
    if (!verified?.state) throw new StorageError('The backup could not be verified.', 'backup_verification_failed');
    await pruneBackups(namespace);
    return { ...backup, id };
  }

  async function getBackup(id) {
    const db = await open();
    const transaction = db.transaction(BACKUP_STORE, 'readonly');
    const record = await requestResult(transaction.objectStore(BACKUP_STORE).get(Number(id)));
    await transactionDone(transaction);
    return record ? clone(record) : null;
  }

  async function listBackups(namespace) {
    const db = await open();
    const transaction = db.transaction(BACKUP_STORE, 'readonly');
    const store = transaction.objectStore(BACKUP_STORE);
    const all = await requestResult(store.getAll());
    await transactionDone(transaction);
    return all.filter(item => item.namespace === namespace).sort((a, b) => b.createdAt - a.createdAt).map(clone);
  }

  async function deleteBackup(id) {
    const db = await open();
    const transaction = db.transaction(BACKUP_STORE, 'readwrite');
    transaction.objectStore(BACKUP_STORE).delete(Number(id));
    await transactionDone(transaction);
  }

  async function pruneBackups(namespace) {
    const backups = await listBackups(namespace);
    const obsolete = backups.slice(MAX_BACKUPS_PER_NAMESPACE);
    if (!obsolete.length) return;
    const db = await open();
    const transaction = db.transaction(BACKUP_STORE, 'readwrite');
    for (const item of obsolete) transaction.objectStore(BACKUP_STORE).delete(item.id);
    await transactionDone(transaction);
  }

  async function quarantine(namespace, raw, reason = 'invalid_data') {
    const db = await open();
    const transaction = db.transaction(QUARANTINE_STORE, 'readwrite', { durability: 'strict' });
    const record = {
      namespace,
      createdAt: Date.now(),
      reason: String(reason).slice(0, 160),
      raw: typeof raw === 'string' ? raw : JSON.stringify(raw),
      bytes: bytes(typeof raw === 'string' ? raw : JSON.stringify(raw))
    };
    const id = await requestResult(transaction.objectStore(QUARANTINE_STORE).add(record));
    await transactionDone(transaction);
    return { ...record, id };
  }

  async function listQuarantine(namespace) {
    const db = await open();
    const transaction = db.transaction(QUARANTINE_STORE, 'readonly');
    const all = await requestResult(transaction.objectStore(QUARANTINE_STORE).getAll());
    await transactionDone(transaction);
    return all.filter(item => item.namespace === namespace).sort((a, b) => b.createdAt - a.createdAt).map(clone);
  }

  async function setMeta(key, value) {
    const db = await open();
    const transaction = db.transaction(META_STORE, 'readwrite');
    transaction.objectStore(META_STORE).put({ key, value: clone(value), updatedAt: Date.now() });
    await transactionDone(transaction);
  }

  async function getMeta(key) {
    const db = await open();
    const transaction = db.transaction(META_STORE, 'readonly');
    const record = await requestResult(transaction.objectStore(META_STORE).get(key));
    await transactionDone(transaction);
    return record ? clone(record.value) : null;
  }

  async function migrateLegacy(normalize) {
    const existing = await load('anonymous');
    if (existing) return { migrated: false, record: existing };
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const state = normalize(parsed);
        const record = await save('anonymous', state, 0, { backupReason: `legacy migration from ${key}` });
        localStorage.removeItem(key);
        return { migrated: true, record, source: key };
      } catch (error) {
        await quarantine('anonymous', raw, `corrupt legacy payload in ${key}`).catch(() => {});
        localStorage.removeItem(key);
        throw new StorageError('Legacy data was corrupt and was moved to recovery storage.', 'legacy_corrupt', { key, cause: error?.message || String(error) });
      }
    }
    return { migrated: false, record: null };
  }

  function emergencyDraftKey(namespace) {
    return `${EMERGENCY_DRAFT_KEY}:${encodeURIComponent(String(namespace || 'anonymous'))}`;
  }

  function writeEmergencyDraft(draft) {
    try {
      const safe = {
        namespace: String(draft.namespace || 'anonymous'),
        noteId: String(draft.noteId || ''),
        title: String(draft.title || '').slice(0, 240),
        subject: String(draft.subject || '').slice(0, 100),
        body: String(draft.body || '').slice(0, 100000),
        updatedAt: Date.now()
      };
      localStorage.setItem(emergencyDraftKey(safe.namespace), JSON.stringify(safe));
      return true;
    } catch {
      return false;
    }
  }

  function readEmergencyDraft(namespace) {
    const key = emergencyDraftKey(namespace);
    try {
      const current = localStorage.getItem(key);
      if (current) return JSON.parse(current);
      const legacy = JSON.parse(localStorage.getItem(LEGACY_EMERGENCY_DRAFT_KEY) || 'null');
      if (legacy?.namespace === namespace) {
        localStorage.setItem(key, JSON.stringify(legacy));
        localStorage.removeItem(LEGACY_EMERGENCY_DRAFT_KEY);
        return legacy;
      }
      return null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  function clearEmergencyDraft(namespace = 'anonymous') {
    try { localStorage.removeItem(emergencyDraftKey(namespace)); } catch { /* Best effort only. */ }
  }

  function subscribe(callback) {
    if (!channel) return () => {};
    const listener = event => callback(event.data);
    channel.addEventListener('message', listener);
    return () => channel.removeEventListener('message', listener);
  }

  window.BawsalaStorage = Object.freeze({
    StorageError,
    ConflictError,
    MAX_STATE_BYTES,
    MAX_IMPORT_BYTES,
    bytes,
    assertStateSize,
    open,
    load,
    save,
    createBackup,
    getBackup,
    listBackups,
    deleteBackup,
    quarantine,
    listQuarantine,
    setMeta,
    getMeta,
    migrateLegacy,
    writeEmergencyDraft,
    readEmergencyDraft,
    clearEmergencyDraft,
    subscribe
  });
})();

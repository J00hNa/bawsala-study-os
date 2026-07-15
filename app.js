(() => {
  'use strict';

  const SCHEMA_VERSION = 4;
  const DAY_MS = 86400000;
  const PAGE_META = {
    dashboard: ['COMMAND CENTER', 'Dashboard'],
    quests: ['MISSION CONTROL', 'Quest Log'],
    focus: ['DEEP WORK', 'Focus Room'],
    flashcards: ['MEMORY FORGE', 'Flashcards'],
    arena: ['ACTIVE RECALL', 'Study Arena'],
    planner: ['TIME GRID', 'Planner'],
    subjects: ['KNOWLEDGE MAP', 'Subjects'],
    notes: ['MEMORY BANK', 'Notes'],
    library: ['RESOURCE VAULT', 'Library'],
    stats: ['PLAYER ANALYTICS', 'Stats'],
    settings: ['SYSTEM CONFIG', 'Settings']
  };
  const ROUTES = Object.keys(PAGE_META);
  const COLORS = ['purple', 'blue', 'green'];
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const CLOUD_META_KEY = 'bawsala-cloud-sync-meta-v2';
  const TIMER_STATE_KEY = 'bawsala-focus-timer-v2';
  const LEGACY_TIMER_STATE_KEY = 'bawsala-focus-timer-v1';
  const Cloud = window.BawsalaBackend || null;
  const Storage = window.BawsalaStorage || null;
  const TURNSTILE_SITE_KEY = String(window.BAWSALA_CONFIG?.TURNSTILE_SITE_KEY || '').trim();
  let displayTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const percentClass = (prefix, value) => `${prefix}-${Math.round(clamp(Number(value) || 0, 0, 100))}`;
  const setPercentClass = (element, prefix, value) => {
    if (!element) return;
    [...element.classList].filter(name => name.startsWith(`${prefix}-`)).forEach(name => element.classList.remove(name));
    element.classList.add(percentClass(prefix, value));
  };
  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const localISO = (date = new Date()) => {
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: displayTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      return `${parts.year}-${parts.month}-${parts.day}`;
    } catch {
      const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return copy.toISOString().slice(0, 10);
    }
  };
  const todayISO = () => localISO();
  const addDays = (dateString, days) => {
    const [year, month, day] = String(dateString).split('-').map(Number);
    return localISO(new Date(Date.UTC(year, month - 1, day + Number(days || 0), 12)));
  };
  const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);
  const formatDate = date => date ? new Intl.DateTimeFormat(state.settings.language || 'en', { timeZone: displayTimeZone, month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`)) : 'No date';
  const formatTime = value => {
    if (!value) return 'Any time';
    const [hour, minute] = value.split(':').map(Number);
    return new Intl.DateTimeFormat(state.settings.language || 'en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)));
  };
  const formatMinutes = minutes => {
    const safe = Math.max(0, Math.round(Number(minutes) || 0));
    return safe >= 60 ? `${Math.floor(safe / 60)}h${safe % 60 ? ` ${safe % 60}m` : ''}` : `${safe}m`;
  };
  const normalizeAnswer = value => String(value || '')
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[^\p{L}\p{N}\s.+#()=-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const randomize = items => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  };

  function seedState() {
    const now = Date.now();
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { createdAt: now, updatedAt: now },
      profile: { name: 'PLAYER', avatar: 'P', totalXp: 0, credits: 0, dailyGoal: 60 },
      quests: [], subjects: [], sessions: [], focusLog: [], notes: [], resources: [], cards: [],
      reviewLog: [], questions: [], arenaRuns: [], challengeClaims: [],
      settings: {
        reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
        sound: false,
        compact: false,
        highContrast: false,
        theme: 'dark',
        language: 'en',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        onboardingDone: false
      },
      notifications: []
    };
  }

  function migrateLegacy(legacy) {
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return seedState();
    return normalizeState({ ...legacy, schemaVersion: Number(legacy.schemaVersion || 1) });
  }

  function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function safeText(value, max = 500) {
    return String(value ?? '').replace(/[\u0000\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').slice(0, max);
  }

  function safeId(value) {
    const candidate = String(value ?? '');
    return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : uid();
  }

  function safeRef(value) {
    const candidate = String(value ?? '');
    return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : '';
  }

  function safeNumber(value, min, max, fallback = min) {
    const number = Number(value);
    return clamp(Number.isFinite(number) ? number : fallback, min, max);
  }

  function safeTimestamp(value, fallback = Date.now()) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && number < 4102444800000 ? number : fallback;
  }

  function safeDate(value, fallback = '') {
    const candidate = String(value ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return fallback;
    const parsed = new Date(`${candidate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString().slice(0, 10) === candidate ? candidate : fallback;
  }

  function safeTime(value, fallback = '16:00') {
    const candidate = String(value ?? '');
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
  }

  function safeEnum(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function safeUrl(value) {
    const candidate = safeText(value, 2048).trim();
    if (!candidate) return '';
    try {
      const parsed = new URL(candidate);
      const local = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
      return parsed.protocol === 'https:' || local ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function sanitizeList(value, fallback, limit, mapper) {
    const source = Array.isArray(value) ? value : fallback;
    const seen = new Set();
    return source.slice(0, limit).map((item, index) => mapper(asRecord(item), index)).filter(Boolean).map(item => {
      if (!item.id || seen.has(item.id)) item.id = uid();
      seen.add(item.id);
      return item;
    });
  }

  function normalizeState(value) {
    const fallback = seedState();
    const source = asRecord(value);
    const profile = asRecord(source.profile);
    const settings = asRecord(source.settings);
    const meta = asRecord(source.meta);
    const resourceTypes = ['Documentation', 'PDF', 'Book', 'Course', 'Video', 'Notes', 'Anki', 'Other'];

    const subjects = sanitizeList(source.subjects, [], 100, item => ({
      id: safeId(item.id),
      name: safeText(item.name, 100).trim() || 'Untitled subject',
      symbol: safeText(item.symbol, 3).trim().toUpperCase() || 'ST',
      description: safeText(item.description, 1500),
      progress: Math.round(safeNumber(item.progress, 0, 100, 0)),
      color: safeEnum(item.color, COLORS, 'purple')
    }));
    const subjectById = new Map(subjects.map(item => [item.id, item]));
    const subjectByName = new Map(subjects.map(item => [item.name.toLocaleLowerCase(), item]));
    const subjectData = item => {
      const byId = subjectById.get(safeRef(item.subjectId));
      const byName = subjectByName.get(safeText(item.subject, 100).trim().toLocaleLowerCase());
      const subject = byId || byName || null;
      return { subjectId: subject?.id || '', subject: subject?.name || safeText(item.subject, 100).trim() || 'General' };
    };

    const normalized = {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        createdAt: safeTimestamp(meta.createdAt, Date.now()),
        updatedAt: safeTimestamp(meta.updatedAt, Date.now())
      },
      profile: {
        name: safeText(profile.name || fallback.profile.name, 20).trim() || 'PLAYER',
        avatar: safeText(profile.avatar || fallback.profile.avatar, 2).trim().toUpperCase() || 'P',
        totalXp: Math.round(safeNumber(profile.totalXp, 0, 100000000, 0)),
        credits: Math.round(safeNumber(profile.credits, 0, 100000000, 0)),
        dailyGoal: Math.round(safeNumber(profile.dailyGoal, 15, 600, 60))
      },
      subjects,
      quests: sanitizeList(source.quests, [], 400, item => ({
        id: safeId(item.id), ...subjectData(item),
        title: safeText(item.title, 180).trim() || 'Untitled quest',
        description: safeText(item.description, 2000),
        priority: safeEnum(item.priority, ['high', 'medium', 'low'], 'medium'),
        duration: Math.round(safeNumber(item.duration, 5, 480, 25)),
        xp: Math.round(safeNumber(item.xp, 0, 1000, 100)),
        dueDate: safeDate(item.dueDate, ''),
        completed: Boolean(item.completed),
        rewarded: Boolean(item.rewarded || item.completed),
        createdAt: safeTimestamp(item.createdAt),
        completedAt: item.completedAt ? safeTimestamp(item.completedAt) : null,
        steps: sanitizeList(item.steps, [], 50, step => ({ id: safeId(step.id), text: safeText(step.text, 300).trim() || 'Step', done: Boolean(step.done) }))
      })),
      sessions: sanitizeList(source.sessions, [], 1000, item => ({
        id: safeId(item.id), ...subjectData(item),
        questId: safeRef(item.questId),
        title: safeText(item.title, 180).trim() || 'Study session',
        date: safeDate(item.date, todayISO()),
        time: safeTime(item.time),
        duration: Math.round(safeNumber(item.duration, 5, 480, 25)),
        color: safeEnum(item.color, COLORS, 'purple')
      })),
      focusLog: sanitizeList(source.focusLog, [], 5000, item => ({
        id: safeId(item.id), date: safeDate(item.date, todayISO()),
        minutes: Math.round(safeNumber(item.minutes, 0, 1440, 0)),
        seconds: Math.round(safeNumber(item.seconds, 0, 86400, Number(item.minutes || 0) * 60)),
        xp: Math.round(safeNumber(item.xp, 0, 10000, 0)),
        mode: safeEnum(item.mode, ['sprint', 'deep', 'review'], 'deep'),
        questId: safeRef(item.questId), note: safeText(item.note, 1500), proof: safeText(item.proof, 1500),
        distractions: Math.round(safeNumber(item.distractions, 0, 1000, 0)), createdAt: safeTimestamp(item.createdAt)
      })),
      notes: sanitizeList(source.notes, [], 300, item => ({
        id: safeId(item.id), ...subjectData(item),
        title: safeText(item.title, 240).trim() || 'Untitled note', body: safeText(item.body, 50000), updatedAt: safeTimestamp(item.updatedAt)
      })),
      resources: sanitizeList(source.resources, [], 500, item => ({
        id: safeId(item.id), ...subjectData(item), title: safeText(item.title, 240).trim() || 'Untitled resource',
        type: safeEnum(item.type, resourceTypes, 'Other'), description: safeText(item.description, 3000),
        tags: (Array.isArray(item.tags) ? item.tags : []).slice(0, 20).map(tag => safeText(tag, 40).trim()).filter(Boolean), url: safeUrl(item.url)
      })),
      cards: sanitizeList(source.cards, [], 3000, item => ({
        id: safeId(item.id), ...subjectData(item), front: safeText(item.front, 3000).trim() || 'Empty prompt',
        back: safeText(item.back, 6000).trim() || 'Empty answer', dueDate: safeDate(item.dueDate, todayISO()),
        dueAt: safeTimestamp(item.dueAt, new Date(`${safeDate(item.dueDate, todayISO())}T00:00:00`).getTime()),
        interval: Math.round(safeNumber(item.interval, 0, 36500, 0)), ease: safeNumber(item.ease, 1.3, 4, 2.5),
        reps: Math.round(safeNumber(item.reps, 0, 100000, 0)), lapses: Math.round(safeNumber(item.lapses, 0, 100000, 0))
      })),
      reviewLog: sanitizeList(source.reviewLog, [], 10000, item => ({
        id: safeId(item.id), cardId: safeRef(item.cardId), date: safeDate(item.date, todayISO()),
        reviewedAt: safeTimestamp(item.reviewedAt, Date.now()), rating: safeEnum(item.rating, ['again', 'hard', 'good', 'easy'], 'again'),
        correct: item.correct === undefined ? item.rating !== 'again' : Boolean(item.correct), ...subjectData(item)
      })),
      questions: sanitizeList(source.questions, [], 3000, item => ({
        id: safeId(item.id), ...subjectData(item), prompt: safeText(item.prompt, 3000).trim() || 'Untitled question',
        answer: safeText(item.answer, 3000).trim() || 'No answer',
        accepted: (Array.isArray(item.accepted) ? item.accepted : []).slice(0, 20).map(answer => safeText(answer, 300).trim()).filter(Boolean),
        hint: safeText(item.hint, 1200)
      })),
      arenaRuns: sanitizeList(source.arenaRuns, [], 5000, item => ({
        id: safeId(item.id), date: safeDate(item.date, todayISO()), createdAt: safeTimestamp(item.createdAt, Date.now()),
        correct: Math.round(safeNumber(item.correct, 0, 1000, 0)), total: Math.round(safeNumber(item.total, 0, 1000, 0)),
        bestCombo: Math.round(safeNumber(item.bestCombo, 0, 1000, 0)), xp: Math.round(safeNumber(item.xp, 0, 100000, 0)),
        answers: (Array.isArray(item.answers) ? item.answers : []).slice(0, 100).map(answer => ({ questionId: safeRef(answer.questionId), correct: Boolean(answer.correct), answeredAt: safeTimestamp(answer.answeredAt, Date.now()) }))
      })),
      challengeClaims: [...new Set((Array.isArray(source.challengeClaims) ? source.challengeClaims : []).slice(0, 1000).map(date => safeDate(date, '')).filter(Boolean))],
      settings: {
        reducedMotion: Boolean(settings.reducedMotion), sound: Boolean(settings.sound), compact: Boolean(settings.compact), highContrast: Boolean(settings.highContrast),
        theme: safeEnum(settings.theme, ['dark', 'light', 'system'], 'dark'), language: safeEnum(settings.language, ['en', 'ar'], 'en'),
        timeZone: safeText(settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', 80),
        onboardingDone: Boolean(settings.onboardingDone)
      },
      notifications: sanitizeList(source.notifications, [], 100, item => ({
        id: safeId(item.id), title: safeText(item.title, 180).trim() || 'Notification', message: safeText(item.message, 1200),
        createdAt: safeTimestamp(item.createdAt, Date.now()), read: Boolean(item.read), time: safeText(item.time, 80)
      }))
    };
    return normalized;
  }

  function hasMeaningfulData(value = state) {
    return ['quests', 'subjects', 'sessions', 'focusLog', 'notes', 'resources', 'cards', 'reviewLog', 'questions', 'arenaRuns'].some(key => value[key]?.length);
  }

  let state = seedState();
  let activeNamespace = 'anonymous';
  let localRevision = 0;
  let lastDurableState = clone(state);
  let persistChain = Promise.resolve(true);
  let stateReady = false;
  let currentRoute = 'dashboard';
  let questFilter = 'all';
  let plannerOffset = 0;
  let selectedNoteId = null;
  let noteSaveTimer = null;
  let modalContext = null;
  let modalReturnFocus = null;
  let modalInitialSnapshot = '';
  let searchReturnFocus = null;
  let searchSelection = 0;
  let searchItems = [];
  let backupCatalog = { local: [], cloud: [] };
  let searchTimer = null;
  const visibleLimits = { cards: 120, questions: 80, resources: 120 };
  let audioContext = null;
  let turnstileLoadPromise = null;
  let turnstileWidgetId = null;
  let currentDistractions = [];
  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewStats = { reviewed: 0, remembered: 0 };
  let reviewAttempts = new Map();
  let arena = { active: false, questions: [], index: 0, correct: 0, combo: 0, bestCombo: 0, answered: false, answers: [] };

  const timer = { duration: 25 * 60, remaining: 25 * 60, running: false, interval: null, mode: 'deep', startedAt: null, endsAt: null, completing: false };
  const cloudSync = {
    configured: Boolean(Cloud?.isConfigured?.()), user: null, revision: 0, dirty: false, syncing: false,
    status: 'local', detail: '', timer: null, pendingConflict: null, localChangeVersion: 0, lastSyncedAt: null,
    deletionRequest: null
  };

  function cloudMetaKey() {
    return `${CLOUD_META_KEY}:${cloudSync.user?.id || 'anonymous'}`;
  }

  function readCloudMeta() {
    try {
      const value = JSON.parse(localStorage.getItem(cloudMetaKey()) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch { return null; }
  }

  function writeCloudMeta() {
    if (!cloudSync.user?.id) return false;
    try {
      localStorage.setItem(cloudMetaKey(), JSON.stringify({
        userId: cloudSync.user.id, revision: Number(cloudSync.revision || 0), dirty: Boolean(cloudSync.dirty),
        syncedAt: cloudSync.lastSyncedAt || null, deviceId: null
      }));
      return true;
    } catch {
      return false;
    }
  }

  async function createLocalBackup(reason = 'automatic') {
    if (!Storage) throw new Error('Safe local storage is unavailable.');
    return Storage.createBackup(activeNamespace, normalizeState(state), reason);
  }

  async function switchNamespace(namespace, options = {}) {
    if (activeNamespace && activeNamespace !== namespace) persistTimer();
    activeNamespace = namespace;
    resetTransientSessionState();
    restoreTimer();
    const record = await Storage.load(namespace);
    state = normalizeState(record?.state || options.fallbackState || seedState());
    localRevision = Number(record?.revision || 0);
    lastDurableState = clone(state);
    selectedNoteId = state.notes[0]?.id || null;
    const draft = Storage.readEmergencyDraft(namespace);
    if (draft?.noteId) {
      const note = state.notes.find(item => item.id === draft.noteId);
      if (note && Number(draft.updatedAt || 0) > Number(note.updatedAt || 0)) {
        Object.assign(note, { title: draft.title || note.title, subject: draft.subject || note.subject, body: draft.body, updatedAt: draft.updatedAt });
        toast('Unsaved note recovered', 'The last editor draft was restored after an interrupted close.', 'success');
        await saveState({ localOnly: true, backupReason: 'emergency draft recovery', bootstrap: true });
      }
      Storage.clearEmergencyDraft(activeNamespace);
    }
    return record;
  }

  function setCloudStatus(status, detail = '') {
    cloudSync.status = status;
    cloudSync.detail = detail;
    updateCloudUI();
  }

  function updateCloudUI() {
    const chip = q('#cloudStatusButton');
    const chipText = q('#cloudStatusText');
    const card = q('.cloud-account-card');
    const title = q('#cloudAccountTitle');
    const detail = q('#cloudAccountDetail');
    if (!chip || !chipText || !card || !title || !detail) return;
    const labels = { local: 'LOCAL', signed_out: 'LOCAL', dirty: 'PENDING', syncing: 'SYNCING', synced: 'SYNCED', offline: 'OFFLINE', error: 'ERROR', conflict: 'CONFLICT' };
    chip.dataset.status = cloudSync.status;
    card.dataset.status = cloudSync.status;
    chipText.textContent = labels[cloudSync.status] || 'LOCAL';
    const signedIn = Boolean(cloudSync.user);
    q('#cloudSignedOutActions')?.classList.toggle('hidden', signedIn);
    q('#cloudSignedInActions')?.classList.toggle('hidden', !signedIn);
    q('#copyLocalProfileButton')?.classList.toggle('hidden', !signedIn);
    q('#cloudCancelDeletionButton')?.classList.toggle('hidden', !signedIn || !cloudSync.deletionRequest);
    if (!cloudSync.configured) {
      title.textContent = 'Cloud sync is not configured';
      detail.textContent = 'Add your Supabase project URL and publishable key in config.js.';
      q('#cloudSignedOutActions')?.classList.add('hidden');
      return;
    }
    if (!signedIn) {
      title.textContent = 'Local-only profile';
      detail.textContent = cloudSync.detail || 'This profile is isolated from every cloud account.';
      return;
    }
    title.textContent = cloudSync.status === 'conflict' ? 'Sync conflict needs a decision' : (cloudSync.user.email || 'Cloud account connected');
    const synced = cloudSync.lastSyncedAt ? ` · ${new Date(cloudSync.lastSyncedAt).toLocaleString()}` : '';
    const deletionNotice = cloudSync.deletionRequest?.delete_after
      ? `Deletion scheduled for ${new Date(cloudSync.deletionRequest.delete_after).toLocaleString()}. Cancel before the deadline.`
      : '';
    detail.textContent = [deletionNotice, cloudSync.detail || `Account profile · cloud revision ${cloudSync.revision || 0}${synced}`].filter(Boolean).join(' ');
  }

  function scheduleCloudSync() {
    if (!cloudSync.configured || !cloudSync.user || cloudSync.pendingConflict) return;
    window.clearTimeout(cloudSync.timer);
    const delay = clamp(Number(window.BAWSALA_CONFIG?.SYNC_DEBOUNCE_MS) || 1800, 750, 10000);
    cloudSync.timer = window.setTimeout(() => syncCloudNow(), delay);
  }

  function stateSignature(value) {
    const normalized = normalizeState(value);
    normalized.meta.updatedAt = 0;
    return JSON.stringify(normalized);
  }

  function saveState(options = {}) {
    if (!stateReady && !options.bootstrap) return Promise.resolve(false);
    const snapshot = normalizeState(state);
    snapshot.meta.updatedAt = Date.now();
    const snapshotSignature = stateSignature(snapshot);
    const task = persistChain.then(async () => {
      try {
        const record = await Storage.save(activeNamespace, snapshot, localRevision, { backupReason: options.backupReason || '' });
        localRevision = record.revision;
        const durable = normalizeState(record.state);
        lastDurableState = clone(durable);
        if (stateSignature(state) === snapshotSignature) state = durable;
        Storage.clearEmergencyDraft(activeNamespace);
        if (!options.localOnly) {
          cloudSync.localChangeVersion += 1;
          if (cloudSync.user) {
            cloudSync.dirty = true;
            writeCloudMeta();
            setCloudStatus(navigator.onLine ? 'dirty' : 'offline', navigator.onLine ? 'Saved on this device; waiting to sync.' : 'Saved on this device; cloud sync will resume online.');
            scheduleCloudSync();
          }
        }
        return true;
      } catch (error) {
        console.error('Durable save failed:', error);
        if (error?.code === 'local_revision_conflict') {
          setCloudStatus('conflict', 'Another tab saved a newer local revision. Reload before continuing.');
          openLocalConflictModal(error.details);
        } else {
          state = clone(lastDurableState);
          selectedNoteId = state.notes.some(item => item.id === selectedNoteId) ? selectedNoteId : state.notes[0]?.id || null;
          renderAll();
          toast('Save failed', error?.message || 'The change was rolled back because it could not be stored safely.', 'error');
        }
        return false;
      }
    });
    persistChain = task.catch(() => false);
    return task;
  }

  async function flushPendingSave() {
    flushNoteEditorToState();
    await saveState({ localOnly: true });
    return persistChain;
  }

  function openLocalConflictModal(record) {
    openModal({
      kind: 'local-conflict', kicker: 'MULTI-TAB SAFETY', title: 'Newer Data Exists in Another Tab', hideSubmit: true,
      html: `<div class="cloud-conflict-copy"><strong>Your current tab was prevented from overwriting newer data.</strong><span>Load the latest saved revision, or export this tab before closing it.</span></div><div class="cloud-conflict-actions"><button type="button" class="secondary-button" data-action="export-current-tab">EXPORT THIS TAB</button><button type="button" class="primary-button" data-action="reload-local-state">LOAD LATEST</button></div>`
    });
    cloudSync.pendingConflict = record || true;
  }

  function getLevelData() {
    const total = Math.max(0, Number(state.profile.totalXp) || 0);
    const level = Math.floor(total / 1000) + 1;
    const xp = total % 1000;
    const ranks = ['NOVICE I', 'NOVICE II', 'LEARNER I', 'LEARNER II', 'SCHOLAR I', 'SCHOLAR II', 'SCHOLAR III', 'TACTICIAN I', 'TACTICIAN II', 'MASTERMIND'];
    return { total, level, xp, rank: ranks[Math.min(level - 1, ranks.length - 1)] || 'LEGEND' };
  }

  function getTodayFocus() {
    return state.focusLog.filter(item => item.date === todayISO()).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  }

  function getTodayFocusXp() {
    return state.focusLog.filter(item => item.date === todayISO()).reduce((sum, item) => sum + Number(item.xp || 0), 0);
  }

  function getTodayReviews() {
    return state.reviewLog.filter(item => item.date === todayISO()).length;
  }

  function getDueCards(subject = 'all', includeFuture = false) {
    const now = Date.now();
    return state.cards.filter(card => {
      const subjectMatches = subject === 'all' || card.subjectId === subject || card.subject === subject;
      return subjectMatches && (includeFuture || Number(card.dueAt || 0) <= now);
    });
  }

  function getRetention() {
    const recent = [...state.reviewLog].sort((a, b) => Number(b.reviewedAt || 0) - Number(a.reviewedAt || 0)).slice(0, 200);
    if (!recent.length) return 0;
    return Math.round(recent.filter(item => item.correct).length / recent.length * 100);
  }

  function getArenaAccuracy() {
    const answered = state.arenaRuns.reduce((sum, run) => sum + Number(run.total || 0), 0);
    const correct = state.arenaRuns.reduce((sum, run) => sum + Number(run.correct || 0), 0);
    return answered ? Math.round(correct / answered * 100) : 0;
  }

  function getActivityDates() {
    const dates = new Set(state.focusLog.filter(item => Number(item.minutes) > 0).map(item => item.date));
    state.quests.filter(item => item.completed && item.completedAt).forEach(item => dates.add(localISO(new Date(item.completedAt))));
    state.reviewLog.forEach(item => dates.add(item.date));
    state.arenaRuns.forEach(item => dates.add(item.date));
    return [...dates].filter(Boolean).sort();
  }

  function calculateStreak() {
    const dates = getActivityDates();
    if (!dates.length) return { current: 0, longest: 0 };
    let longest = 1;
    let run = 1;
    for (let index = 1; index < dates.length; index += 1) {
      if (daysBetween(dates[index - 1], dates[index]) === 1) run += 1;
      else if (dates[index] !== dates[index - 1]) run = 1;
      longest = Math.max(longest, run);
    }
    const today = todayISO();
    const yesterday = addDays(today, -1);
    const anchor = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : null);
    if (!anchor) return { current: 0, longest };
    let current = 1;
    let cursor = anchor;
    while (dates.includes(addDays(cursor, -1))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
    return { current, longest };
  }

  function awardXp(amount, reason, credits = 0) {
    const xp = Math.max(0, Math.round(Number(amount) || 0));
    const currency = Math.max(0, Math.round(Number(credits) || 0));
    if (!xp && !currency) return null;
    const before = getLevelData().level;
    state.profile.totalXp += xp;
    state.profile.credits += currency;
    const after = getLevelData().level;
    return { xp, currency, reason, levelUp: after > before, level: after };
  }

  function announceAward(result) {
    if (!result) return;
    if (result.levelUp) {
      toast(`Level ${result.level} unlocked`, `${result.reason} pushed you to the next rank.`, 'success');
      beep(760, .16);
    } else {
      toast(`+${result.xp} XP${result.currency ? ` · +${result.currency} credits` : ''}`, result.reason, 'success');
      beep(520, .07);
    }
  }

  function beep(frequency = 440, duration = .06) {
    if (!state.settings.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.value = .025;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Audio unavailable:', error);
    }
  }

  function notify(title, message) {
    state.notifications.unshift({ id: uid(), title, message, createdAt: Date.now(), read: false, time: 'Now' });
    state.notifications = state.notifications.slice(0, 100);
    renderNotifications();
  }

  function toast(title, message, type = '', action = null) {
    const element = document.createElement('div');
    element.className = `toast ${type}`.trim();
    element.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const actionButton = action?.label ? `<button type="button" class="toast-action">${escapeHTML(action.label)}</button>` : '';
    element.innerHTML = `<div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></div>${actionButton}`;
    const removeTimer = window.setTimeout(() => element.remove(), action ? 8000 : 3800);
    if (action?.run) {
      q('.toast-action', element)?.addEventListener('click', async () => {
        window.clearTimeout(removeTimer);
        q('.toast-action', element).disabled = true;
        try { await action.run(); } finally { element.remove(); }
      }, { once: true });
    }
    q('#toastRegion').appendChild(element);
  }

  function navigate(route) {
    if (!PAGE_META[route]) route = 'dashboard';
    currentRoute = route;
    qa('[data-page]').forEach(page => page.classList.toggle('active', page.dataset.page === route));
    qa('.nav-item[data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === route));
    q('#pageEyebrow').textContent = PAGE_META[route][0];
    q('#pageTitle').textContent = PAGE_META[route][1];
    q('#sidebar').classList.remove('open');
    history.replaceState(null, '', `#${route}`);
    renderRoute(route);
    window.scrollTo({ top: 0, behavior: state.settings.reducedMotion ? 'auto' : 'smooth' });
    beep(330, .025);
  }

  function renderRoute(route) {
    const renderers = {
      dashboard: renderDashboard,
      quests: renderQuests,
      focus: renderFocus,
      flashcards: renderFlashcards,
      arena: renderArena,
      planner: renderPlanner,
      subjects: renderSubjects,
      notes: renderNotes,
      library: renderLibrary,
      stats: renderStats,
      settings: renderSettings
    };
    renderers[route]?.();
  }

  function renderAll() {
    applySettings();
    renderSidebar();
    renderRoute(currentRoute);
    renderNotifications();
  }

  function renderSidebar() {
    const level = getLevelData();
    const avatar = String(state.profile.avatar || state.profile.name || 'J').slice(0, 2).toUpperCase();
    q('#sidebarPlayerName').textContent = state.profile.name || 'PLAYER';
    q('#sidebarAvatar').textContent = avatar;
    q('#sidebarLevel').textContent = level.level;
    q('#sidebarXpText').textContent = `${level.xp} / 1000 XP`;
    setPercentClass(q('#sidebarXpBar'), 'w-pct', level.xp / 10);
    q('#creditsCount').textContent = Number(state.profile.credits || 0).toLocaleString();
  }

  function getMainQuest() {
    return [...state.quests]
      .filter(item => !item.completed)
      .sort((a, b) => {
        const overdueA = a.dueDate && a.dueDate < todayISO() ? -2 : 0;
        const overdueB = b.dueDate && b.dueDate < todayISO() ? -2 : 0;
        return overdueA - overdueB || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      })[0] || null;
  }

  function getCompanionMessage() {
    const focus = getTodayFocus();
    const cards = getTodayReviews();
    const active = state.quests.filter(item => !item.completed).length;
    if (!active && getDueCards().length === 0) return 'Your queue is clear. Use the spare capacity for recovery or deeper practice.';
    if (focus === 0) return 'Do not optimize the plan again. Start one focused block and create evidence of progress.';
    if (cards === 0 && getDueCards().length) return 'Focus is logged. Now test memory before the material fades.';
    if (focus >= state.profile.dailyGoal) return 'Daily focus target secured. Stop chasing points and protect tomorrow’s energy.';
    return 'Momentum is active. Finish the next smallest meaningful step.';
  }

  function checkDailyChallenge() {
    const date = todayISO();
    const progress = Math.min(5, getTodayReviews());
    if (progress < 5 || state.challengeClaims.includes(date)) return null;
    state.challengeClaims.push(date);
    const award = awardXp(100, 'Daily Recall Rush completed', 20);
    notify('Daily challenge cleared', 'Five honest flashcard reviews completed.');
    return award;
  }

  function renderDashboard() {
    const level = getLevelData();
    const main = getMainQuest();
    const streak = calculateStreak();
    const todayFocus = getTodayFocus();
    const completed = state.quests.filter(item => item.completed).length;
    const active = state.quests.length - completed;
    const dueCards = getDueCards().length;
    const retention = getRetention();

    q('#dailyQuestTitle').textContent = main?.title || 'Daily objectives cleared';
    q('#dailyQuestDescription').textContent = main?.description || 'Use the extra space for review, recovery, or planning tomorrow.';
    q('#dailyQuestMeta').innerHTML = main
      ? `<span>+${main.xp} XP</span><span>${main.duration} MIN</span><span>PRIORITY: ${escapeHTML(main.priority.toUpperCase())}</span>`
      : '<span>QUEUE CLEAR</span><span>RECOVERY ALLOWED</span><span>PLAN TOMORROW</span>';
    q('#startDailyQuest').dataset.questId = main?.id || '';
    q('#startDailyQuest').textContent = main ? 'START MISSION' : 'OPEN QUEST LOG';
    q('#dashboardLevel').textContent = level.level;
    q('#rankBadge').textContent = level.rank;
    q('#dashboardXpText').textContent = `${level.xp} / 1000 XP`;
    setPercentClass(q('#dashboardXpBar'), 'w-pct', level.xp / 10);
    q('#nextMilestone').textContent = level.level < 5 ? 'Reach Scholar rank' : level.level < 10 ? 'Reach Mastermind rank' : 'Build a 30-day streak';
    q('#companionMessage').textContent = getCompanionMessage();
    q('#todayFocusStat').textContent = formatMinutes(todayFocus);
    q('#focusTargetText').textContent = `Goal: ${state.profile.dailyGoal}m`;
    q('#questsClearedStat').textContent = completed;
    q('#questTotalText').textContent = `${active} active`;
    q('#cardsDueStat').textContent = dueCards;
    q('#cardRetentionText').textContent = `${retention}% retention`;
    q('#streakStat').textContent = streak.current;

    const questDoneToday = state.quests.some(item => item.completedAt && localISO(new Date(item.completedAt)) === todayISO());
    const focusDone = todayFocus > 0;
    const recallDone = getTodayReviews() > 0;
    const route = [
      { icon: '◆', title: main ? main.title : 'Plan one meaningful quest', sub: main ? `${main.duration} min · ${main.subject}` : 'Keep the queue intentional', done: questDoneToday || !main, route: 'quests', action: main ? 'OPEN' : 'PLAN' },
      { icon: '◉', title: 'Complete one focus block', sub: focusDone ? `${formatMinutes(todayFocus)} logged today` : 'Start with 25 focused minutes', done: focusDone, route: 'focus', action: focusDone ? 'DONE' : 'START' },
      { icon: '▣', title: 'Run active recall', sub: recallDone ? `${getTodayReviews()} cards reviewed` : `${dueCards} cards currently due`, done: recallDone || dueCards === 0, route: 'flashcards', action: recallDone ? 'DONE' : 'REVIEW' }
    ];
    const routeScore = route.filter(item => item.done).length;
    q('#routeScore').textContent = `${routeScore}/3`;
    q('#dailyRoute').innerHTML = route.map(item => `<div class="route-item ${item.done ? 'done' : ''}"><span class="route-icon">${item.done ? '✓' : item.icon}</span><div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.sub)}</small></div><button data-route="${item.route}">${item.action} →</button></div>`).join('');

    const upcoming = [...state.sessions]
      .filter(item => item.date >= todayISO())
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 5);
    q('#dashboardSchedule').innerHTML = upcoming.length ? upcoming.map(item => `<div class="timeline-item"><div class="timeline-time">${item.date === todayISO() ? formatTime(item.time) : formatDate(item.date)}</div><div class="timeline-marker"></div><div class="timeline-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.subject)} · ${item.duration} min</span></div></div>`).join('') : '<div class="empty-state"><div class="empty-icon">▥</div><h3>No sessions planned</h3><p>Map the week before it maps itself.</p></div>';

    const activity = new Set(getActivityDates());
    const days = [];
    for (let offset = -6; offset <= 0; offset += 1) {
      const date = new Date(Date.now() + offset * DAY_MS);
      const iso = localISO(date);
      days.push(`<div class="day-pixel ${activity.has(iso) ? 'done' : ''} ${iso === todayISO() ? 'today' : ''}"><span>${activity.has(iso) ? '✓' : date.getDate()}</span><small>${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date).slice(0, 2)}</small></div>`);
    }
    q('#weekStrip').innerHTML = days.join('');
    q('#streakMessageTitle').textContent = streak.current ? `${streak.current}-day chain active` : 'Start your chain';
    q('#streakMessageText').textContent = activity.has(todayISO()) ? 'Today is secured. Do not turn one good day into exhaustion.' : 'One focused action is enough to secure today.';

    const challengeProgress = Math.min(5, getTodayReviews());
    const claimed = state.challengeClaims.includes(todayISO());
    q('#challengeTitle').textContent = claimed ? 'Recall Rush Cleared' : 'Recall Rush';
    q('#challengeDescription').textContent = claimed ? 'Daily reward secured. Continue only if more review is genuinely useful.' : 'Review five cards using honest active recall.';
    setPercentClass(q('#challengeProgressBar'), 'w-pct', challengeProgress / 5 * 100);
    q('#challengeProgressText').textContent = `${challengeProgress} / 5`;
    q('#challengeStatus').textContent = claimed ? 'CLEARED' : 'ACTIVE';
    q('#challengeAction').textContent = claimed ? 'OPEN MEMORY FORGE' : 'ENTER CHALLENGE';
    renderSidebar();
  }

  function questProgress(item) {
    if (!item.steps.length) return item.completed ? 100 : 0;
    return Math.round(item.steps.filter(step => step.done).length / item.steps.length * 100);
  }

  function renderQuests() {
    let items = [...state.quests].sort((a, b) => Number(a.completed) - Number(b.completed) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    if (questFilter === 'active') items = items.filter(item => !item.completed);
    if (questFilter === 'today') items = items.filter(item => !item.completed && item.dueDate && item.dueDate <= todayISO());
    if (questFilter === 'high') items = items.filter(item => !item.completed && item.priority === 'high');
    if (questFilter === 'completed') items = items.filter(item => item.completed);
    qa('#questFilters button').forEach(button => button.classList.toggle('active', button.dataset.filter === questFilter));

    const active = state.quests.filter(item => !item.completed);
    const overdue = active.filter(item => item.dueDate && item.dueDate < todayISO()).length;
    const todayMinutes = active.filter(item => item.dueDate && item.dueDate <= todayISO()).reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const possibleXp = active.reduce((sum, item) => sum + Number(item.xp || 0), 0);
    q('#questSummaryStrip').innerHTML = [
      ['ACTIVE QUESTS', active.length],
      ['OVERDUE', overdue],
      ['TODAY LOAD', formatMinutes(todayMinutes)],
      ['AVAILABLE XP', possibleXp.toLocaleString()]
    ].map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');

    q('#questBoard').innerHTML = items.map(questCardHTML).join('');
    q('#questEmptyState').classList.toggle('hidden', items.length > 0);
  }

  function questCardHTML(item) {
    const progress = questProgress(item);
    const dueLabel = item.dueDate ? (item.dueDate < todayISO() && !item.completed ? `OVERDUE · ${formatDate(item.dueDate)}` : formatDate(item.dueDate)) : 'NO DUE DATE';
    return `<article class="quest-card pixel-panel priority-${escapeHTML(item.priority)} ${item.completed ? 'completed' : ''}">
      <div class="quest-card-head">
        <button class="quest-check" data-action="toggle-quest" data-id="${item.id}" aria-label="${item.completed ? 'Reopen' : 'Complete'} quest">✓</button>
        <div class="quest-copy"><strong class="quest-title">${escapeHTML(item.title)}</strong><p class="quest-description">${escapeHTML(item.description || 'No description.')}</p><div class="quest-subline"><span>${escapeHTML(item.subject)}</span><span>${item.duration} MIN</span><span>${dueLabel}</span><span class="quest-reward">+${item.xp} XP</span></div></div>
      </div>
      ${item.steps.length ? `<div class="quest-steps">${item.steps.map(step => `<label class="step-row ${step.done ? 'done' : ''}"><input type="checkbox" data-action="toggle-step" data-quest-id="${item.id}" data-step-id="${step.id}" ${step.done ? 'checked' : ''}><span>${escapeHTML(step.text)}</span></label>`).join('')}</div><div class="quest-progress"><span class="${percentClass('w-pct', progress)}"></span></div>` : ''}
      <div class="quest-actions"><button data-action="start-quest" data-id="${item.id}">FOCUS</button><button data-action="edit-quest" data-id="${item.id}">EDIT</button><button data-action="delete-quest" data-id="${item.id}">DELETE</button></div>
    </article>`;
  }

  async function toggleQuest(id) {
    const item = state.quests.find(quest => quest.id === id);
    if (!item) return;
    const wasCompleted = item.completed;
    item.completed = !item.completed;
    item.completedAt = item.completed ? Date.now() : null;
    let award = null;
    if (item.completed && !item.rewarded) {
      item.rewarded = true;
      award = awardXp(item.xp, `Quest cleared: ${item.title}`, Math.max(5, Math.round(item.xp / 20)));
    } else if (!item.completed && wasCompleted && item.rewarded) {
      const xpUndo = Math.max(0, Math.round(Number(item.xp) || 0));
      const creditsUndo = Math.max(0, Math.round(Math.max(5, Math.round(xpUndo / 20))));
      state.profile.totalXp = Math.max(0, state.profile.totalXp - xpUndo);
      state.profile.credits = Math.max(0, state.profile.credits - creditsUndo);
      item.rewarded = false;
    }
    const saved = await saveState();
    if (!saved) return;
    renderAll();
    if (award) announceAward(award);
    else if (!item.completed && wasCompleted) toast('Quest reopened', `${item.title} — XP revoked.`, '');
    else toast(item.completed ? 'Quest cleared' : 'Quest reopened', item.title, item.completed ? 'success' : '');
  }

  async function toggleStep(questId, stepId, checked) {
    const quest = state.quests.find(item => item.id === questId);
    const step = quest?.steps.find(item => item.id === stepId);
    if (!step) return;
    step.done = checked;
    if (!await saveState()) return;
    renderQuests();
    if (currentRoute === 'dashboard') renderDashboard();
  }

  function deleteQuest(id) {
    const item = state.quests.find(quest => quest.id === id);
    if (!item) return;
    openConfirmModal({
      title: 'Delete Quest?',
      message: `“${item.title}” will be removed. Linked planner sessions will remain but lose their quest link.`,
      submitLabel: 'DELETE QUEST',
      action: async () => {
        const index = state.quests.findIndex(quest => quest.id === id);
        const removed = clone(state.quests[index]);
        state.quests.splice(index, 1);
        state.sessions.forEach(session => { if (session.questId === id) session.questId = ''; });
        if (!await saveState()) return false;
        closeModal(true);
        renderAll();
        toast('Quest deleted', 'The mission was removed.', '', { label: 'UNDO', run: async () => {
          if (state.quests.some(quest => quest.id === removed.id)) return;
          state.quests.splice(Math.min(index, state.quests.length), 0, removed);
          if (await saveState()) renderAll();
        }});
        return true;
      }
    });
  }

  function populateFocusQuestSelect() {
    const select = q('#focusQuestSelect');
    const current = select.value;
    const active = state.quests.filter(item => !item.completed);
    select.innerHTML = `<option value="">No quest selected</option>${active.map(item => `<option value="${item.id}">${escapeHTML(item.title)}</option>`).join('')}`;
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function renderFocus() {
    populateFocusQuestSelect();
    q('#focusSessionsToday').textContent = state.focusLog.filter(item => item.date === todayISO()).length;
    q('#focusMinutesToday').textContent = getTodayFocus();
    q('#focusXpToday').textContent = getTodayFocusXp();
    q('#focusModeLabel').textContent = ({ sprint: 'Focus Sprint', deep: 'Deep Focus', review: 'Recall Review' })[timer.mode];
    q('#focusBonus').textContent = `+${timer.mode === 'sprint' ? 3 : 2} XP / MIN`;
    qa('#focusModeTabs button').forEach(button => button.classList.toggle('active', button.dataset.mode === timer.mode));
    renderDistractions();
    updateTimerDisplay();
    const recent = [...state.focusLog].reverse().slice(0, 6);
    q('#recentFocusLog').innerHTML = recent.length ? recent.map(item => `<div class="session-log-item"><strong>${formatMinutes(item.minutes)} · ${escapeHTML((item.mode || 'deep').toUpperCase())}</strong><span>${formatDate(item.date)} · +${item.xp || 0} XP</span><span>${item.distractions || 0} distractions parked</span></div>`).join('') : '<div class="empty-state"><div class="empty-icon">◉</div><h3>No focus sessions yet</h3><p>Start with a short, honest run.</p></div>';
  }

  function timerStorageKey(namespace = activeNamespace) {
    return `${TIMER_STATE_KEY}:${encodeURIComponent(namespace || 'anonymous')}`;
  }

  function resetTransientSessionState() {
    clearTimerInterval();
    Object.assign(timer, { duration: 25 * 60, remaining: 25 * 60, running: false, mode: 'deep', startedAt: null, endsAt: null, completing: false });
    currentDistractions = [];
    reviewQueue = [];
    reviewIndex = 0;
    reviewStats = { reviewed: 0, remembered: 0 };
    reviewAttempts = new Map();
    arena = { active: false, questions: [], index: 0, correct: 0, combo: 0, bestCombo: 0, answered: false, answers: [] };
  }

  function persistTimer() {
    try {
      localStorage.setItem(timerStorageKey(), JSON.stringify({
        namespace: activeNamespace,
        duration: timer.duration,
        remaining: timer.remaining,
        running: timer.running,
        mode: timer.mode,
        startedAt: timer.startedAt,
        endsAt: timer.endsAt
      }));
    } catch { /* The durable study state is unaffected if timer persistence is unavailable. */ }
  }

  function clearTimerInterval() {
    if (timer.interval) window.clearInterval(timer.interval);
    timer.interval = null;
  }

  function updateTimerFromClock() {
    if (!timer.running || !timer.endsAt) return;
    timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  }

  function tickTimer() {
    updateTimerFromClock();
    updateTimerDisplay();
    persistTimer();
    if (timer.running && timer.remaining <= 0) completeFocusSession(true);
  }

  function restoreTimer() {
    try {
      const key = timerStorageKey();
      let raw = localStorage.getItem(key);
      if (!raw) {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_TIMER_STATE_KEY) || 'null');
        if (legacy?.namespace === activeNamespace) {
          raw = JSON.stringify(legacy);
          localStorage.setItem(key, raw);
          localStorage.removeItem(LEGACY_TIMER_STATE_KEY);
        }
      }
      const stored = JSON.parse(raw || 'null');
      if (!stored) return;
      timer.duration = clamp(Number(stored.duration) || 1500, 60, 14400);
      timer.remaining = clamp(Number(stored.remaining) || timer.duration, 0, timer.duration);
      timer.mode = ['sprint', 'deep', 'review'].includes(stored.mode) ? stored.mode : 'deep';
      timer.startedAt = Number(stored.startedAt) || null;
      timer.endsAt = Number(stored.endsAt) || null;
      timer.running = Boolean(stored.running && timer.endsAt);
      updateTimerFromClock();
      if (timer.running && timer.remaining > 0) {
        clearTimerInterval();
        timer.interval = window.setInterval(tickTimer, 250);
      } else if (timer.remaining <= 0) {
        timer.running = false;
        clearTimerInterval();
      }
    } catch {
      localStorage.removeItem(timerStorageKey());
    }
  }

  function setTimerMinutes(minutes) {
    if (timer.running) return toast('Timer is running', 'Pause or reset before changing duration.', 'error');
    timer.duration = clamp(Number(minutes) || 25, 1, 240) * 60;
    timer.remaining = timer.duration;
    timer.startedAt = null;
    timer.endsAt = null;
    qa('#focusPresets button').forEach(button => button.classList.toggle('active', Number(button.dataset.minutes) === Number(minutes)));
    persistTimer();
    updateTimerDisplay();
  }

  function setFocusMode(mode) {
    if (!['sprint', 'deep', 'review'].includes(mode)) return;
    timer.mode = mode;
    const defaults = { sprint: 15, deep: 45, review: 25 };
    if (!timer.running && timer.remaining === timer.duration) setTimerMinutes(defaults[mode]);
    renderFocus();
  }

  function updateTimerDisplay() {
    if (timer.running) updateTimerFromClock();
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    const display = q('#timerDisplay');
    if (!display) return;
    display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    q('#timerState').textContent = timer.running ? 'FOCUSING' : (timer.remaining < timer.duration ? (timer.remaining === 0 ? 'COMPLETE' : 'PAUSED') : 'READY');
    q('#startTimerButton').textContent = timer.running ? 'PAUSE' : (timer.remaining < timer.duration && timer.remaining > 0 ? 'RESUME' : 'START');
    const elapsed = timer.duration ? (timer.duration - timer.remaining) / timer.duration : 0;
    setPercentClass(q('#timerRing'), 'ring-pct', clamp(elapsed, 0, 1) * 100);
    display.setAttribute('aria-label', `${minutes} minutes ${seconds} seconds remaining`);
    document.title = timer.running ? `${display.textContent} · Bawsala` : 'Bawsala Study OS';
  }

  function startPauseTimer() {
    if (timer.completing) return;
    if (timer.running) {
      updateTimerFromClock();
      clearTimerInterval();
      timer.running = false;
      timer.endsAt = null;
      persistTimer();
      updateTimerDisplay();
      return;
    }
    if (timer.remaining <= 0) timer.remaining = timer.duration;
    timer.startedAt = timer.startedAt || Date.now();
    timer.endsAt = Date.now() + timer.remaining * 1000;
    timer.running = true;
    clearTimerInterval();
    timer.interval = window.setInterval(tickTimer, 250);
    persistTimer();
    updateTimerDisplay();
  }

  function resetTimer() {
    clearTimerInterval();
    timer.running = false;
    timer.remaining = timer.duration;
    timer.startedAt = null;
    timer.endsAt = null;
    timer.completing = false;
    persistTimer();
    updateTimerDisplay();
    toast('Timer reset', 'The current run was not logged.');
  }

  async function completeFocusSession(natural = false) {
    if (timer.completing) return;
    timer.completing = true;
    if (timer.running) updateTimerFromClock();
    const elapsedSeconds = natural ? timer.duration : Math.max(0, timer.duration - timer.remaining);
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 1) {
      timer.completing = false;
      return toast('Nothing to log', 'Complete at least one full focused minute.', 'error');
    }
    clearTimerInterval();
    timer.running = false;
    timer.endsAt = null;
    const rate = timer.mode === 'sprint' ? 3 : 2;
    const xp = minutes * rate;
    const questId = q('#focusQuestSelect').value || '';
    const quest = state.quests.find(item => item.id === questId);
    const award = awardXp(xp, `${minutes}-minute ${timer.mode} session`, Math.max(2, Math.round(minutes / 5)));
    state.focusLog.push({
      id: uid(), date: todayISO(), minutes, seconds: Math.floor(elapsedSeconds), xp, mode: timer.mode, questId,
      note: q('#sessionNote').value.trim().slice(0, 1500), proof: q('#sessionProof').value.trim().slice(0, 1500),
      distractions: currentDistractions.length, createdAt: Date.now()
    });
    if (quest && !quest.completed) notify('Focus evidence logged', `Return to “${quest.title}” and clear it only when the proof is complete.`);
    const saved = await saveState();
    if (!saved) {
      timer.completing = false;
      restoreTimer();
      updateTimerDisplay();
      return;
    }
    timer.remaining = timer.duration;
    timer.startedAt = null;
    timer.completing = false;
    currentDistractions = [];
    q('#sessionNote').value = '';
    q('#sessionProof').value = '';
    localStorage.removeItem(`bawsala-focus-timer-${activeNamespace}`);
    persistTimer();
    renderAll();
    announceAward(award);
  }

  function addDistraction() {
    const input = q('#distractionInput');
    const text = input.value.trim();
    if (!text) return;
    currentDistractions.push({ id: uid(), text });
    input.value = '';
    renderDistractions();
    toast('Distraction parked', 'Return to the target. You can process it after the session.');
  }

  function renderDistractions() {
    q('#distractionCount').textContent = currentDistractions.length;
    q('#distractionList').innerHTML = currentDistractions.map(item => `<div class="distraction-item"><span>${escapeHTML(item.text)}</span><button data-action="remove-distraction" data-id="${item.id}">×</button></div>`).join('');
  }

  function populateSubjectSelect(select, includeAll = false, selected = '') {
    if (!select) return;
    const options = [];
    if (includeAll) options.push('<option value="all">All subjects</option>');
    else options.push('<option value="">General</option>');
    options.push(...state.subjects.map(item => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`));
    select.innerHTML = options.join('');
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
    else select.value = includeAll ? 'all' : '';
  }

  function renderFlashcards() {
    const subjectSelect = q('#cardSubjectFilter');
    const selected = subjectSelect?.value || 'all';
    populateSubjectSelect(subjectSelect, true, selected);
    const matches = card => selected === 'all' || card.subjectId === selected;
    const due = getDueCards(selected).length;
    const total = state.cards.filter(matches).length;
    const mature = state.cards.filter(card => matches(card) && Number(card.interval) >= 14).length;
    q('#flashcardStats').innerHTML = [
      ['DUE NOW', due], ['TOTAL CARDS', total], ['MATURE CARDS', mature], ['RETENTION', `${getRetention()}%`]
    ].map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
    q('#memoryRetention').textContent = `${getRetention()}%`;
    setPercentClass(q('#memoryRetentionBar'), 'w-pct', getRetention());
    renderCardBrowser();
  }

  function startReview(includeFuture = false) {
    const subject = q('#cardSubjectFilter').value || 'all';
    reviewQueue = randomize(getDueCards(subject, includeFuture));
    reviewIndex = 0;
    reviewStats = { reviewed: 0, remembered: 0 };
    reviewAttempts = new Map();
    if (!reviewQueue.length) {
      q('#reviewPlaceholder').classList.remove('hidden');
      q('#reviewCardWrap').classList.add('hidden');
      q('#reviewComplete').classList.add('hidden');
      q('#reviewPlaceholder h3').textContent = includeFuture ? 'No cards in this deck' : 'Review queue cleared';
      q('#reviewPlaceholder p').textContent = includeFuture ? 'Add cards before starting a review.' : 'There are no cards due for this subject.';
      return;
    }
    q('#reviewPlaceholder').classList.add('hidden');
    q('#reviewComplete').classList.add('hidden');
    q('#reviewCardWrap').classList.remove('hidden');
    showReviewCard();
  }

  function showReviewCard() {
    const card = reviewQueue[reviewIndex];
    if (!card) return completeReview();
    q('#reviewSubject').textContent = card.subject.toUpperCase();
    q('#reviewCounter').textContent = `${reviewIndex + 1} / ${reviewQueue.length}`;
    q('#cardFrontText').textContent = card.front;
    q('#cardBackText').textContent = card.back;
    q('#flashcard').classList.remove('flipped');
    q('#ratingControls').classList.add('hidden');
  }

  function flipReviewCard() {
    if (!reviewQueue[reviewIndex]) return;
    q('#flashcard').classList.add('flipped');
    q('#ratingControls').classList.remove('hidden');
  }

  async function rateCard(rating) {
    const card = reviewQueue[reviewIndex];
    if (!card || !['again', 'hard', 'good', 'easy'].includes(rating)) return;
    qa('#ratingControls button').forEach(button => { button.disabled = true; });
    const now = Date.now();
    const today = todayISO();
    const oldInterval = Math.max(1, Number(card.interval) || 1);
    const attempts = Number(reviewAttempts.get(card.id) || 0) + 1;
    reviewAttempts.set(card.id, attempts);
    if (rating === 'again') {
      card.interval = 0;
      card.dueAt = now + 10 * 60 * 1000;
      card.dueDate = today;
      card.ease = Math.max(1.3, Number(card.ease || 2.5) - .2);
      card.reps = 0;
      card.lapses = Number(card.lapses || 0) + 1;
      if (attempts <= 2) reviewQueue.push(card);
    } else if (rating === 'hard') {
      card.interval = Math.max(2, Math.round(oldInterval * 1.2));
      card.ease = Math.max(1.3, Number(card.ease || 2.5) - .05);
      card.reps = Number(card.reps || 0) + 1;
      reviewStats.remembered += 1;
    } else if (rating === 'good') {
      const reps = Number(card.reps || 0);
      card.interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(3, Math.round(oldInterval * Number(card.ease || 2.5)));
      card.reps = reps + 1;
      reviewStats.remembered += 1;
    } else {
      card.interval = Math.max(4, Math.round(oldInterval * Number(card.ease || 2.5) * 1.3));
      card.ease = Math.min(3.2, Number(card.ease || 2.5) + .15);
      card.reps = Number(card.reps || 0) + 1;
      reviewStats.remembered += 1;
    }
    if (rating !== 'again') {
      card.dueDate = addDays(today, card.interval);
      card.dueAt = new Date(`${card.dueDate}T00:00:00`).getTime();
    }
    reviewStats.reviewed += 1;
    state.reviewLog.push({
      id: uid(), cardId: card.id, date: today, reviewedAt: now, rating, correct: rating !== 'again',
      subjectId: card.subjectId, subject: card.subject
    });
    const xp = { again: 2, hard: 5, good: 8, easy: 10 }[rating];
    awardXp(xp, `Flashcard rated ${rating}`, Math.max(1, Math.round(xp / 3)));
    const challengeAward = checkDailyChallenge();
    const nextIndex = reviewIndex + 1;
    const willComplete = nextIndex >= reviewQueue.length;
    if (willComplete) {
      const accuracy = reviewStats.reviewed ? Math.round(reviewStats.remembered / reviewStats.reviewed * 100) : 0;
      notify('Memory run complete', `${reviewStats.reviewed} attempts completed with ${accuracy}% remembered.`);
    }
    const saved = await saveState();
    qa('#ratingControls button').forEach(button => { button.disabled = false; });
    if (!saved) return;
    reviewIndex = nextIndex;
    if (challengeAward) announceAward(challengeAward);
    if (reviewIndex >= reviewQueue.length) completeReview();
    else showReviewCard();
    renderSidebar();
    if (currentRoute === 'dashboard') renderDashboard();
  }

  function completeReview() {
    q('#reviewCardWrap').classList.add('hidden');
    q('#reviewPlaceholder').classList.add('hidden');
    q('#reviewComplete').classList.remove('hidden');
    const accuracy = reviewStats.reviewed ? Math.round(reviewStats.remembered / reviewStats.reviewed * 100) : 0;
    q('#reviewCompleteText').textContent = `${reviewStats.reviewed} attempts · ${accuracy}% remembered. Failed recalls were scheduled again instead of being hidden.`;
    if (reviewStats.reviewed) beep(680, .12);
    renderFlashcards();
  }

  function renderCardBrowser() {
    const selected = q('#cardSubjectFilter').value || 'all';
    const items = state.cards.filter(card => selected === 'all' || card.subjectId === selected);
    const visible = items.slice(0, visibleLimits.cards);
    const more = items.length > visible.length ? `<button class="secondary-button full-width list-more" data-action="load-more" data-list="cards">SHOW ${Math.min(120, items.length - visible.length)} MORE · ${items.length - visible.length} REMAINING</button>` : '';
    q('#cardList').innerHTML = items.length ? visible.map(card => `<div class="card-list-item" data-card-id="${card.id}"><div><strong>${escapeHTML(card.front)}</strong><span>${escapeHTML(card.subject)} · Due ${formatDate(card.dueDate)} · Interval ${card.interval}d</span></div><div class="card-list-actions"><button data-action="edit-card" data-id="${card.id}">EDIT</button><button aria-label="Delete flashcard" data-action="delete-card" data-id="${card.id}">DELETE</button></div></div>`).join('') + more : '<div class="empty-state"><div class="empty-icon">▣</div><h3>No cards</h3><p>Add only facts or procedures worth remembering.</p></div>';
  }

  // ── Search highlighting for global search results ──
  function highlightSearchResult(text, query) {
    if (!query || !text) return escapeHTML(text || '');
    const escaped = escapeHTML(text);
    const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${queryEscaped})`, 'gi'), '<mark>$1</mark>');
  }

  function deleteCard(id) {
    const card = state.cards.find(item => item.id === id);
    if (!card) return;
    openConfirmModal({
      title: 'Delete Flashcard?',
      message: card.front,
      submitLabel: 'DELETE CARD',
      action: async () => {
        const index = state.cards.findIndex(item => item.id === id);
        const removed = clone(state.cards[index]);
        state.cards.splice(index, 1);
        if (!await saveState()) return false;
        closeModal(true);
        renderFlashcards();
        toast('Card deleted', 'The memory item was removed.', '', { label: 'UNDO', run: async () => {
          if (!state.cards.some(item => item.id === removed.id)) state.cards.splice(Math.min(index, state.cards.length), 0, removed);
          if (await saveState()) renderFlashcards();
        }});
        return true;
      }
    });
  }

  function renderArena() {
    const selected = q('#arenaSubjectSelect').value || 'all';
    populateSubjectSelect(q('#arenaSubjectSelect'), true, selected);
    const accuracy = getArenaAccuracy();
    const bestCombo = state.arenaRuns.reduce((max, run) => Math.max(max, Number(run.bestCombo || 0)), 0);
    const wins = state.arenaRuns.filter(run => Number(run.correct || 0) >= Math.ceil(Number(run.total || 0) * .6)).length;
    q('#arenaAccuracy').textContent = `${accuracy}%`;
    q('#arenaBestCombo').textContent = `${bestCombo}x`;
    q('#arenaWins').textContent = wins;
    q('#arenaCombo').textContent = arena.combo;
    renderArenaState();
    renderQuestionBank();
  }

  function renderQuestionBank() {
    const container = q('#questionBankList');
    if (!container) return;
    const items = [...state.questions].sort((a, b) => String(a.subject).localeCompare(String(b.subject)) || String(a.prompt).localeCompare(String(b.prompt)));
    const visible = items.slice(0, visibleLimits.questions);
    const more = items.length > visible.length ? `<button class="secondary-button full-width list-more" data-action="load-more" data-list="questions">SHOW ${Math.min(80, items.length - visible.length)} MORE · ${items.length - visible.length} REMAINING</button>` : '';
    container.innerHTML = items.length ? visible.map(item => `<div class="card-list-item"><div><strong>${escapeHTML(item.prompt)}</strong><span>${escapeHTML(item.subject)} · Answer: ${escapeHTML(item.answer)}</span></div><div class="card-list-actions"><button data-action="edit-question" data-id="${item.id}">EDIT</button><button aria-label="Delete typed-recall question" data-action="delete-question" data-id="${item.id}">DELETE</button></div></div>`).join('') + more : '<div class="empty-state"><p>No typed-recall questions yet.</p></div>';
  }

  function deleteQuestion(id) {
    const question = state.questions.find(item => item.id === id);
    if (!question) return;
    openConfirmModal({
      title: 'Delete Arena Question?', message: question.prompt, submitLabel: 'DELETE QUESTION',
      action: async () => {
        const index = state.questions.findIndex(item => item.id === id);
        const removed = clone(state.questions[index]);
        state.questions.splice(index, 1);
        if (!await saveState()) return false;
        closeModal(true); renderArena();
        toast('Question deleted', 'The typed-recall item was removed.', '', { label: 'UNDO', run: async () => {
          if (!state.questions.some(item => item.id === removed.id)) state.questions.splice(Math.min(index, state.questions.length), 0, removed);
          if (await saveState()) renderArena();
        }});
        return true;
      }
    });
  }

  function startArena() {
    const subjectId = q('#arenaSubjectSelect').value || 'all';
    const pool = state.questions.filter(item => subjectId === 'all' || item.subjectId === subjectId);
    if (!pool.length) return toast('No questions available', 'Add questions for this subject first.', 'error');
    arena = {
      active: true,
      questions: randomize(pool).slice(0, Math.min(10, pool.length)),
      index: 0,
      correct: 0,
      combo: 0,
      bestCombo: 0,
      answered: false,
      answers: []
    };
    q('#arenaIdle').classList.add('hidden');
    q('#arenaResult').classList.add('hidden');
    q('#arenaQuestion').classList.remove('hidden');
    q('#pixelBoss').classList.remove('defeated');
    showArenaQuestion();
  }

  function showArenaQuestion() {
    const question = arena.questions[arena.index];
    if (!question) return finishArena();
    arena.answered = false;
    q('#arenaQuestionSubject').textContent = question.subject.toUpperCase();
    q('#arenaProgress').textContent = `${arena.index + 1} / ${arena.questions.length}`;
    q('#arenaPrompt').textContent = question.prompt;
    q('#arenaAnswerInput').value = '';
    q('#arenaAnswerInput').disabled = false;
    q('#arenaFeedback').className = 'arena-feedback hidden';
    q('#arenaFeedback').textContent = '';
    q('#arenaSubmitButton').classList.remove('hidden');
    q('#arenaNextButton').classList.add('hidden');
    q('#arenaHintButton').disabled = false;
    q('#arenaCombo').textContent = arena.combo;
    updateBossHp();
    window.setTimeout(() => q('#arenaAnswerInput').focus(), 30);
  }

  function isArenaAnswerCorrect(question, answer) {
    const normalized = normalizeAnswer(answer);
    if (!normalized) return false;
    const accepted = [question.answer, ...(question.accepted || [])].map(normalizeAnswer).filter(Boolean);
    return accepted.includes(normalized);
  }

  function submitArenaAnswer() {
    if (!arena.active || arena.answered) return;
    const question = arena.questions[arena.index];
    const answer = q('#arenaAnswerInput').value.trim();
    if (!answer) return toast('Answer required', 'Commit to an answer before checking.', 'error');
    const correct = isArenaAnswerCorrect(question, answer);
    arena.answered = true;
    arena.answers.push({ questionId: question.id, correct, answer: answer.slice(0, 3000), answeredAt: Date.now() });
    q('#arenaAnswerInput').disabled = true;
    q('#arenaSubmitButton').classList.add('hidden');
    q('#arenaNextButton').classList.remove('hidden');
    q('#arenaHintButton').disabled = true;
    const feedback = q('#arenaFeedback');
    feedback.className = `arena-feedback ${correct ? 'correct' : 'wrong'}`;
    if (correct) {
      arena.correct += 1;
      arena.combo += 1;
      arena.bestCombo = Math.max(arena.bestCombo, arena.combo);
      feedback.textContent = `Correct. ${question.answer}`;
      q('#pixelBoss').classList.add('hit');
      window.setTimeout(() => q('#pixelBoss').classList.remove('hit'), 320);
      beep(650 + arena.combo * 35, .09);
    } else {
      arena.combo = 0;
      feedback.textContent = `Not correct. Expected: ${question.answer}`;
      beep(180, .12);
    }
    q('#arenaCombo').textContent = arena.combo;
    updateBossHp();
  }

  function updateBossHp() {
    const total = Math.max(1, arena.questions.length || 1);
    const requiredCorrect = Math.max(1, Math.ceil(total * .6));
    const hp = Math.max(0, Math.round(100 - arena.correct * (100 / requiredCorrect)));
    q('#bossHpText').textContent = `${hp} / 100`;
    setPercentClass(q('#bossHpBar'), 'w-pct', hp);
    q('#pixelBoss').classList.toggle('defeated', hp === 0);
  }

  function showArenaHint() {
    const question = arena.questions[arena.index];
    if (!question || arena.answered) return;
    const hint = question.hint || `The answer starts with “${String(question.answer).slice(0, 1)}” and has ${String(question.answer).length} characters.`;
    const feedback = q('#arenaFeedback');
    feedback.className = 'arena-feedback';
    feedback.textContent = `Hint: ${hint}`;
  }

  function nextArenaQuestion() {
    if (!arena.answered) return;
    arena.index += 1;
    if (arena.index >= arena.questions.length) finishArena();
    else showArenaQuestion();
  }

  async function finishArena() {
    if (!arena.active) return;
    const total = arena.questions.length;
    const correct = arena.correct;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    const won = correct >= Math.ceil(total * .6);
    const xp = correct * 45 + arena.bestCombo * 8;
    const credits = correct * 5;
    const award = awardXp(xp, won ? 'Knowledge Guardian defeated' : 'Arena practice completed', credits);
    state.arenaRuns.push({ id: uid(), date: todayISO(), createdAt: Date.now(), correct, total, bestCombo: arena.bestCombo, xp, answers: arena.answers });
    notify(won ? 'Arena cleared' : 'Arena run recorded', `${correct} of ${total} answers were correct.`);
    arena.active = false;
    if (!await saveState()) return;
    q('#arenaQuestion').classList.add('hidden');
    q('#arenaIdle').classList.add('hidden');
    q('#arenaResult').classList.remove('hidden');
    q('#arenaResultTitle').textContent = won ? 'Guardian defeated' : 'Guardian survived';
    q('#arenaResultText').textContent = won ? `Accuracy ${accuracy}%. The damage came from retrieval, not recognition.` : `Accuracy ${accuracy}%. Review the exact missed answers, then return.`;
    q('#arenaResultScore').textContent = `${correct} / ${total}`;
    updateBossHp();
    renderSidebar();
    announceAward(award);
  }

  function renderArenaState() {
    if (arena.active) {
      q('#arenaIdle').classList.add('hidden');
      q('#arenaResult').classList.add('hidden');
      q('#arenaQuestion').classList.remove('hidden');
    } else if (q('#arenaResult').classList.contains('hidden')) {
      q('#arenaIdle').classList.remove('hidden');
      q('#arenaQuestion').classList.add('hidden');
      updateBossHp();
    }
  }

  function getWeekStart(offset = 0) {
    const date = new Date();
    const day = (date.getDay() + 6) % 7;
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - day + offset * 7);
    return date;
  }

  function renderPlanner() {
    const start = getWeekStart(plannerOffset);
    const end = new Date(start.getTime() + 6 * DAY_MS);
    const locale = state.settings.language || 'en';
    q('#plannerRange').textContent = `${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(start)} — ${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(end)}`;
    const weekDates = Array.from({ length: 7 }, (_, index) => localISO(new Date(start.getTime() + index * DAY_MS)));
    const weekSessions = state.sessions.filter(item => weekDates.includes(item.date)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const totalMinutes = weekSessions.reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const busiest = weekDates.map(date => ({ date, minutes: weekSessions.filter(item => item.date === date).reduce((sum, item) => sum + Number(item.duration || 0), 0) })).sort((a, b) => b.minutes - a.minutes)[0];
    const scheduledQuestIds = new Set(state.sessions.map(session => session.questId).filter(Boolean));
    const unscheduled = state.quests.filter(item => !item.completed && !scheduledQuestIds.has(item.id)).length;
    q('#plannerInsights').innerHTML = [
      ['PLANNED TIME', formatMinutes(totalMinutes)],
      ['BUSIEST DAY', busiest?.minutes ? `${formatDate(busiest.date)} · ${formatMinutes(busiest.minutes)}` : 'None'],
      ['UNSCHEDULED QUESTS', unscheduled]
    ].map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');

    if (window.matchMedia('(max-width: 760px)').matches) {
      q('#calendarGrid').className = 'calendar-grid planner-agenda';
      q('#calendarGrid').innerHTML = weekDates.map(date => {
        const events = weekSessions.filter(item => item.date === date);
        return `<section class="agenda-day"><header><strong>${new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(`${date}T12:00:00`))}</strong><span>${formatDate(date)}</span><button type="button" data-action="add-session-at" data-date="${date}" data-time="16:00">ADD</button></header>${events.length ? events.map(item => `<button class="agenda-event ${escapeHTML(item.color || 'purple')}" data-action="edit-session" data-id="${item.id}"><strong>${escapeHTML(item.title)}</strong><span>${formatTime(item.time)} · ${formatMinutes(item.duration)} · ${escapeHTML(item.subject)}</span></button>`).join('') : '<p>No sessions planned.</p>'}</section>`;
      }).join('');
      return;
    }

    q('#calendarGrid').className = 'calendar-grid';
    const times = Array.from({ length: 12 }, (_, index) => `${String(index * 2).padStart(2, '0')}:00`);
    let html = '<div class="calendar-head" aria-hidden="true"></div>';
    weekDates.forEach(date => {
      const parsed = new Date(`${date}T12:00:00`);
      html += `<div class="calendar-head ${date === todayISO() ? 'today' : ''}"><strong>${new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(parsed).toUpperCase()}</strong><span>${formatDate(date)}</span></div>`;
    });
    times.forEach(time => {
      html += `<div class="calendar-time">${formatTime(time)}</div>`;
      weekDates.forEach(date => {
        const startMinute = Number(time.slice(0, 2)) * 60;
        const events = weekSessions.filter(item => {
          if (item.date !== date) return false;
          const eventMinute = Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3, 5));
          return eventMinute >= startMinute && eventMinute < startMinute + 120;
        });
        html += `<div class="calendar-cell" role="button" tabindex="0" aria-label="Add session on ${date} at ${time}" data-date="${date}" data-time="${time}">${events.map(item => `<button class="calendar-event ${escapeHTML(item.color || 'purple')}" data-action="edit-session" data-id="${item.id}"><strong>${escapeHTML(item.title)}</strong><span>${formatTime(item.time)} · ${formatMinutes(item.duration)}</span></button>`).join('')}</div>`;
      });
    });
    q('#calendarGrid').innerHTML = html;
  }

  function renderSubjects() {
    q('#subjectGrid').innerHTML = state.subjects.length ? state.subjects.map(subject => {
      const quests = state.quests.filter(item => item.subjectId === subject.id);
      const cards = state.cards.filter(item => item.subjectId === subject.id);
      const questions = state.questions.filter(item => item.subjectId === subject.id);
      const completed = quests.filter(item => item.completed).length;
      const questRate = quests.length ? Math.round(completed / quests.length * 100) : null;
      const cardStrength = cards.length ? Math.round(cards.reduce((sum, item) => sum + Math.min(100, Math.max(0, Number(item.interval || 0)) * 5), 0) / cards.length) : null;
      const signals = [questRate, cardStrength].filter(value => value !== null);
      const mastery = signals.length ? Math.round(signals.reduce((sum, value) => sum + value, 0) / signals.length) : Number(subject.progress || 0);
      return `<article class="subject-card pixel-panel ${escapeHTML(subject.color || 'purple')}"><div class="subject-card-head"><div class="subject-symbol">${escapeHTML(subject.symbol || subject.name.slice(0, 2).toUpperCase())}</div><div><span class="section-kicker">MASTERY ${mastery}%</span><h3>${escapeHTML(subject.name)}</h3></div></div><p>${escapeHTML(subject.description || 'No description.')}</p><div class="large-progress"><span class="${percentClass('w-pct', mastery)}"></span></div><div class="subject-metrics"><div><strong>${quests.length}</strong><span>QUESTS</span></div><div><strong>${cards.length}</strong><span>CARDS</span></div><div><strong>${questions.length}</strong><span>QUESTIONS</span></div></div><div class="subject-actions"><button data-action="subject-cards" data-subject-id="${subject.id}">REVIEW</button><button data-action="subject-notes" data-subject="${escapeHTML(subject.name)}">NOTES</button><button data-action="edit-subject" data-id="${subject.id}">EDIT</button><button data-action="delete-subject" data-id="${subject.id}">DELETE</button></div></article>`;
    }).join('') : '<div class="empty-state pixel-panel panel-padding"><div class="empty-icon">▤</div><h3>No subjects yet</h3><p>Create a subject before linking tasks, cards, or notes.</p></div>';
  }

  function deleteSubject(id) {
    const subject = state.subjects.find(item => item.id === id);
    if (!subject) return;
    const linked = ['quests', 'sessions', 'notes', 'resources', 'cards', 'questions'].reduce((sum, key) => sum + state[key].filter(item => item.subjectId === id).length, 0);
    if (linked) return toast('Subject is in use', `${linked} linked items must be moved or deleted first.`, 'error');
    openConfirmModal({
      title: 'Delete Subject?', message: `“${subject.name}” has no linked items and will be removed.`, submitLabel: 'DELETE SUBJECT',
      action: async () => {
        const index = state.subjects.findIndex(item => item.id === id);
        const removed = clone(state.subjects[index]);
        state.subjects.splice(index, 1);
        if (!await saveState()) return false;
        closeModal(true); renderSubjects();
        toast('Subject deleted', subject.name, '', { label: 'UNDO', run: async () => {
          if (!state.subjects.some(item => item.id === removed.id)) state.subjects.splice(Math.min(index, state.subjects.length), 0, removed);
          if (await saveState()) renderSubjects();
        }});
        return true;
      }
    });
  }

  function renderNotes(filter = q('#notesSearch')?.value.trim().toLocaleLowerCase() || '') {
    const items = [...state.notes]
      .filter(note => !filter || `${note.title} ${note.subject} ${note.body}`.toLocaleLowerCase().includes(filter))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    q('#noteList').innerHTML = items.length ? items.map(note => `<button class="note-list-item ${note.id === selectedNoteId ? 'active' : ''}" data-note-id="${note.id}"><strong>${escapeHTML(note.title || 'Untitled note')}</strong><span>${escapeHTML(note.subject)} · ${new Intl.RelativeTimeFormat(state.settings.language || 'en', { numeric: 'auto' }).format(Math.round((Number(note.updatedAt || Date.now()) - Date.now()) / DAY_MS), 'day')}</span></button>`).join('') : '<div class="empty-state"><div class="empty-icon">✦</div><h3>No notes found</h3><p>Search again or create a new note.</p></div>';

    const note = state.notes.find(item => item.id === selectedNoteId);
    q('#emptyEditor').classList.toggle('hidden', Boolean(note));
    q('#editorContent').classList.toggle('hidden', !note);
    if (!note) return;
    q('#noteTitleInput').value = note.title || '';
    populateSubjectSelect(q('#noteSubjectSelect'), false, note.subjectId || '');
    q('#noteBodyInput').value = note.body || '';
    q('#noteSavedStatus').textContent = 'SAVED';
  }

  async function createNote() {
    flushNoteEditorToState();
    if (noteSaveTimer) window.clearTimeout(noteSaveTimer);
    const selection = getSubjectSelection(state.subjects[0]?.id || '');
    const note = { id: uid(), title: 'Untitled Note', ...selection, body: '', updatedAt: Date.now() };
    state.notes.unshift(note);
    selectedNoteId = note.id;
    if (!await saveState()) return;
    renderNotes();
    q('#noteTitleInput').focus();
  }

  function flushNoteEditorToState() {
    const note = state.notes.find(item => item.id === selectedNoteId);
    if (!note || q('#editorContent')?.classList.contains('hidden')) return false;
    note.title = safeText(q('#noteTitleInput').value, 240).trim() || 'Untitled Note';
    Object.assign(note, getSubjectSelection(q('#noteSubjectSelect').value || ''));
    note.body = safeText(q('#noteBodyInput').value, 50000);
    note.updatedAt = Date.now();
    Storage?.writeEmergencyDraft({ namespace: activeNamespace, noteId: note.id, title: note.title, subject: note.subject, body: note.body });
    return true;
  }

  function scheduleNoteSave() {
    if (!flushNoteEditorToState()) return;
    q('#noteSavedStatus').textContent = 'UNSAVED';
    window.clearTimeout(noteSaveTimer);
    noteSaveTimer = window.setTimeout(async () => {
      q('#noteSavedStatus').textContent = 'SAVING…';
      const saved = await saveState();
      q('#noteSavedStatus').textContent = saved ? 'SAVED' : 'SAVE FAILED';
      if (saved) renderNotes(q('#notesSearch').value.trim().toLocaleLowerCase());
    }, 350);
  }

  function deleteSelectedNote() {
    const note = state.notes.find(item => item.id === selectedNoteId);
    if (!note) return;
    openConfirmModal({
      title: 'Delete Note?', message: `“${note.title}” will be removed.`, submitLabel: 'DELETE NOTE',
      action: async () => {
        const index = state.notes.findIndex(item => item.id === note.id);
        const removed = clone(state.notes[index]);
        state.notes.splice(index, 1);
        selectedNoteId = state.notes[0]?.id || null;
        Storage.clearEmergencyDraft(activeNamespace);
        if (!await saveState()) return false;
        closeModal(true); q('#recallPanel')?.classList.add('hidden'); renderNotes();
        toast('Note deleted', 'The memory page was removed.', '', { label: 'UNDO', run: async () => {
          if (!state.notes.some(item => item.id === removed.id)) state.notes.splice(Math.min(index, state.notes.length), 0, removed);
          selectedNoteId = removed.id;
          if (await saveState()) renderNotes();
        }});
        return true;
      }
    });
  }

  function openRecallMode() {
    const note = state.notes.find(item => item.id === selectedNoteId);
    if (!note) return;
    q('#recallInput').value = '';
    q('#recallOriginal').textContent = note.body || '(Empty note)';
    q('#recallOriginal').classList.add('hidden');
    q('#revealNoteButton').textContent = 'REVEAL ORIGINAL';
    q('#recallPanel').classList.remove('hidden');
    q('#recallInput').focus();
  }

  function toggleRecallOriginal() {
    const original = q('#recallOriginal');
    const hidden = original.classList.toggle('hidden');
    q('#revealNoteButton').textContent = hidden ? 'REVEAL ORIGINAL' : 'HIDE ORIGINAL';
  }

  function renderLibrary() {
    const query = q('#librarySearch').value.trim().toLocaleLowerCase();
    const items = state.resources.filter(item => !query || `${item.title} ${item.type} ${item.subject} ${item.description} ${(item.tags || []).join(' ')}`.toLocaleLowerCase().includes(query));
    const visible = items.slice(0, visibleLimits.resources);
    const more = items.length > visible.length ? `<button class="secondary-button full-width list-more" data-action="load-more" data-list="resources">SHOW ${Math.min(120, items.length - visible.length)} MORE · ${items.length - visible.length} REMAINING</button>` : '';
    q('#libraryGrid').innerHTML = visible.map(item => `<article class="resource-card pixel-panel" data-resource-id="${item.id}"><span class="resource-type">${escapeHTML(item.type.toUpperCase())}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description || 'No description.')}</p><div class="tag-list"><span>${escapeHTML(item.subject)}</span>${(item.tags || []).map(tag => `<span>#${escapeHTML(tag)}</span>`).join('')}</div><div class="resource-actions"><button class="secondary-button" data-action="open-resource" data-id="${item.id}">OPEN</button><button class="secondary-button" data-action="edit-resource" data-id="${item.id}">EDIT</button><button class="danger-button" data-action="delete-resource" data-id="${item.id}">DELETE</button></div></article>`).join('') + more;
    q('#libraryEmptyState').classList.toggle('hidden', items.length > 0);
  }

  function openResource(id) {
    const resource = state.resources.find(item => item.id === id);
    if (!resource) return;
    if (resource.url && /^https:\/\//i.test(resource.url)) window.open(resource.url, '_blank', 'noopener,noreferrer');
    else toast(resource.title, `No secure HTTPS link is attached. Use the description to locate the ${resource.type.toLowerCase()} resource.`);
  }

  function deleteResource(id) {
    const resource = state.resources.find(item => item.id === id);
    if (!resource) return;
    openConfirmModal({
      title: 'Delete Resource?', message: `“${resource.title}” will be removed from the library.`, submitLabel: 'DELETE RESOURCE',
      action: async () => {
        const index = state.resources.findIndex(item => item.id === id);
        const removed = clone(state.resources[index]);
        state.resources.splice(index, 1);
        if (!await saveState()) return false;
        closeModal(true); renderLibrary();
        toast('Resource deleted', 'The library entry was removed.', '', { label: 'UNDO', run: async () => {
          if (!state.resources.some(item => item.id === removed.id)) state.resources.splice(Math.min(index, state.resources.length), 0, removed);
          if (await saveState()) renderLibrary();
        }});
        return true;
      }
    });
  }

  function getAchievements() {
    const streak = calculateStreak();
    const focusMinutes = state.focusLog.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const completedQuests = state.quests.filter(item => item.completed).length;
    const reviews = state.reviewLog.length;
    const wins = state.arenaRuns.filter(run => Number(run.correct || 0) >= Math.ceil(Number(run.total || 0) * .6)).length;
    return [
      { icon: '◉', name: 'First Focus', description: 'Log one focus session', unlocked: state.focusLog.length > 0 },
      { icon: '◆', name: 'Quest Runner', description: 'Clear 10 quests', unlocked: completedQuests >= 10 },
      { icon: '♨', name: 'Seven-Day Chain', description: 'Reach a 7-day streak', unlocked: streak.longest >= 7 },
      { icon: '▣', name: 'Memory Smith', description: 'Review 50 cards', unlocked: reviews >= 50 },
      { icon: '⚔', name: 'Arena Victor', description: 'Win 5 battles', unlocked: wins >= 5 },
      { icon: '⌛', name: 'Deep Worker', description: 'Focus for 10 hours', unlocked: focusMinutes >= 600 },
      { icon: 'Σ', name: 'Balanced Build', description: 'Use 4 subjects this week', unlocked: new Set(state.focusLog.filter(item => item.date >= addDays(todayISO(), -6)).map(item => state.quests.find(quest => quest.id === item.questId)?.subject).filter(Boolean)).size >= 4 },
      { icon: '✦', name: 'Knowledge Base', description: 'Create 20 notes', unlocked: state.notes.length >= 20 },
      { icon: '◇', name: 'Mastermind', description: 'Reach level 10', unlocked: getLevelData().level >= 10 }
    ];
  }

  function renderStats() {
    const totalFocus = state.focusLog.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const completed = state.quests.filter(item => item.completed).length;
    const clearRate = state.quests.length ? Math.round(completed / state.quests.length * 100) : 0;
    q('#statsTotalFocus').textContent = formatMinutes(totalFocus);
    q('#statsClearRate').textContent = `${clearRate}%`;
    q('#statsRetention').textContent = `${getRetention()}%`;
    q('#statsArenaAccuracy').textContent = `${getArenaAccuracy()}%`;

    const chartDays = [];
    let maxMinutes = 1;
    for (let offset = -13; offset <= 0; offset += 1) {
      const date = addDays(todayISO(), offset);
      const minutes = state.focusLog.filter(item => item.date === date).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
      maxMinutes = Math.max(maxMinutes, minutes);
      chartDays.push({ date, minutes });
    }
    q('#focusChart').innerHTML = chartDays.map(item => `<div class="bar-column"><div class="bar-value ${percentClass('h-pct', Math.max(2, item.minutes / maxMinutes * 100))}" data-value="${item.minutes}m"></div><div class="bar-label">${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${item.date}T12:00:00`)).slice(0, 1)}</div></div>`).join('');

    q('#subjectProgressList').innerHTML = state.subjects.map(subject => {
      const questItems = state.quests.filter(item => item.subject === subject.name);
      const questRate = questItems.length ? questItems.filter(item => item.completed).length / questItems.length * 100 : Number(subject.progress || 0);
      const cardItems = state.cards.filter(item => item.subject === subject.name);
      const cardRate = cardItems.length ? cardItems.reduce((sum, item) => sum + Math.min(100, Number(item.interval || 1) * 5), 0) / cardItems.length : 0;
      const score = Math.round(questRate * .6 + cardRate * .4);
      return `<div class="subject-progress-row"><span>${escapeHTML(subject.name)}</span><div class="large-progress"><span class="${percentClass('w-pct', score)}"></span></div><strong>${score}%</strong></div>`;
    }).join('');

    q('#achievementGrid').innerHTML = getAchievements().map(item => `<div class="achievement ${item.unlocked ? '' : 'locked'}"><div class="achievement-icon">${item.icon}</div><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.description)}</span></div>`).join('');

    const last7 = state.focusLog.filter(item => item.date >= addDays(todayISO(), -6));
    const weeklyMinutes = last7.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const averageSession = last7.length ? Math.round(weeklyMinutes / last7.length) : 0;
    const overdue = state.quests.filter(item => !item.completed && item.dueDate && item.dueDate < todayISO()).length;
    const due = getDueCards().length;
    const diagnoses = [
      { icon: weeklyMinutes >= state.profile.dailyGoal * 4 ? '✓' : '!', title: 'Weekly focus volume', text: weeklyMinutes >= state.profile.dailyGoal * 4 ? `${formatMinutes(weeklyMinutes)} logged. Protect recovery and quality.` : `${formatMinutes(weeklyMinutes)} logged. Reduce planning friction and start shorter sessions.` },
      { icon: averageSession >= 25 ? '✓' : '!', title: 'Session depth', text: averageSession >= 25 ? `Average session is ${averageSession} minutes.` : `Average session is ${averageSession} minutes. Remove distractions before increasing duration.` },
      { icon: overdue === 0 ? '✓' : '!', title: 'Quest load', text: overdue === 0 ? 'No overdue quests.' : `${overdue} overdue quests. Delete, shrink, or reschedule them.` },
      { icon: due < 20 ? '✓' : '!', title: 'Memory backlog', text: due < 20 ? `${due} cards due. The queue is controlled.` : `${due} cards due. Stop adding cards until the backlog drops.` }
    ];
    q('#diagnosisList').innerHTML = diagnoses.map(item => `<div class="diagnosis-item"><i>${item.icon}</i><div><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.text)}</span></div></div>`).join('');
  }

  function renderSettings() {
    q('#settingsName').value = state.profile.name || '';
    q('#settingsAvatar').value = state.profile.avatar || '';
    q('#settingsGoal').value = state.profile.dailyGoal || 60;
    q('#motionToggle').setAttribute('aria-pressed', String(Boolean(state.settings.reducedMotion)));
    q('#soundToggle').setAttribute('aria-pressed', String(Boolean(state.settings.sound)));
    q('#compactToggle').setAttribute('aria-pressed', String(Boolean(state.settings.compact)));
    q('#contrastToggle')?.setAttribute('aria-pressed', String(Boolean(state.settings.highContrast)));
    if (q('#themeSelect')) q('#themeSelect').value = state.settings.theme || 'dark';
    if (q('#languageSelect')) q('#languageSelect').value = state.settings.language || 'en';
    const timezone = q('#timezoneSelect');
    if (timezone && !timezone.options.length) {
      const current = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const zones = Intl.supportedValuesOf?.('timeZone') || [current, 'UTC'];
      timezone.innerHTML = [...new Set([current, 'UTC', ...zones])].map(zone => `<option value="${escapeHTML(zone)}">${escapeHTML(zone)}</option>`).join('');
    }
    if (timezone) {
      const selected = state.settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (![...timezone.options].some(option => option.value === selected)) timezone.add(new Option(selected, selected));
      timezone.value = selected;
    }
    updateCloudUI();
  }

  function applySettings() {
    const systemLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const light = state.settings.theme === 'light' || (state.settings.theme === 'system' && systemLight);
    document.body.classList.toggle('light-theme', light);
    document.body.classList.toggle('reduced-motion', Boolean(state.settings.reducedMotion));
    document.body.classList.toggle('compact', Boolean(state.settings.compact));
    document.body.classList.toggle('high-contrast', Boolean(state.settings.highContrast));
    displayTimeZone = state.settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    document.documentElement.lang = state.settings.language || 'en';
    document.documentElement.dir = state.settings.language === 'ar' ? 'rtl' : 'ltr';
    q('meta[name="theme-color"]')?.setAttribute('content', light ? '#f5f7ff' : '#080912');
  }

  async function saveProfile() {
    const name = safeText(q('#settingsName').value, 20).trim() || 'PLAYER';
    const avatar = safeText(q('#settingsAvatar').value, 2).trim().toUpperCase() || name.slice(0, 1).toUpperCase();
    const goal = clamp(Number(q('#settingsGoal').value) || 60, 15, 600);
    state.profile.name = name;
    state.profile.avatar = avatar;
    state.profile.dailyGoal = goal;
    if (!await saveState()) return;
    renderAll();
    toast('Profile saved', 'Profile settings were stored.', 'success');
  }

  async function toggleSetting(key, button) {
    const previous = Boolean(state.settings[key]);
    state.settings[key] = !previous;
    button.setAttribute('aria-pressed', String(state.settings[key]));
    applySettings();
    if (!await saveState()) {
      state.settings[key] = previous;
      button.setAttribute('aria-pressed', String(previous));
      applySettings();
      return;
    }
    if (key === 'sound' && state.settings.sound) beep(620, .08);
  }

  async function setInterfaceSetting(key, value) {
    const previous = state.settings[key];
    state.settings[key] = value;
    applySettings();
    if (!await saveState()) {
      state.settings[key] = previous;
      applySettings();
      renderSettings();
      return;
    }
    renderRoute(currentRoute);
  }

  function renderNotifications() {
    const unread = state.notifications.filter(item => !item.read).length;
    q('#notificationButton')?.setAttribute('aria-label', unread ? `Notifications, ${unread} unread` : 'Notifications');
    q('#notificationButton')?.classList.toggle('has-unread', unread > 0);
    q('#notificationList').innerHTML = state.notifications.length ? `${state.notifications.map(item => {
      const relativeMinutes = Math.round((Number(item.createdAt || Date.now()) - Date.now()) / 60000);
      const relative = Math.abs(relativeMinutes) < 1 ? 'now' : new Intl.RelativeTimeFormat(state.settings.language || 'en', { numeric: 'auto' }).format(relativeMinutes, 'minute');
      return `<div class="notification-item ${item.read ? '' : 'unread'}"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.message)}</span><small>${escapeHTML(relative)}</small></div>`;
    }).join('')}<button type="button" class="secondary-button notification-clear" data-action="clear-notifications">CLEAR ALL</button>` : '<div class="empty-state"><div class="empty-icon">!</div><h3>No notifications</h3></div>';
  }

  async function markNotificationsRead() {
    let changed = false;
    state.notifications.forEach(item => { if (!item.read) { item.read = true; changed = true; } });
    if (changed) await saveState();
    renderNotifications();
  }

  function modalField(label, name, type = 'text', value = '', options = {}) {
    const classes = options.full ? 'field-label full-span' : 'field-label';
    const attrs = [
      options.required ? 'required' : '',
      options.min !== undefined ? `min="${options.min}"` : '',
      options.max !== undefined ? `max="${options.max}"` : '',
      options.minlength !== undefined ? `minlength="${options.minlength}"` : '',
      options.maxlength !== undefined ? `maxlength="${options.maxlength}"` : '',
      options.step !== undefined ? `step="${options.step}"` : '',
      options.autocomplete ? `autocomplete="${escapeHTML(options.autocomplete)}"` : '',
      options.placeholder ? `placeholder="${escapeHTML(options.placeholder)}"` : ''
    ].filter(Boolean).join(' ');
    if (type === 'textarea') return `<label class="${classes}">${escapeHTML(label)}<textarea class="pixel-input" name="${name}" rows="${options.rows || 4}" ${attrs}>${escapeHTML(value)}</textarea></label>`;
    return `<label class="${classes}">${escapeHTML(label)}<input class="pixel-input" name="${name}" type="${type}" value="${escapeHTML(value)}" ${attrs}></label>`;
  }

  function modalSelect(label, name, values, selected = '', full = false) {
    const options = values.map(value => {
      const item = typeof value === 'string' ? { value, label: value } : value;
      return `<option value="${escapeHTML(item.value)}" ${item.value === selected ? 'selected' : ''}>${escapeHTML(item.label)}</option>`;
    }).join('');
    return `<label class="field-label ${full ? 'full-span' : ''}">${escapeHTML(label)}<select class="pixel-input" name="${name}">${options}</select></label>`;
  }


  function ensureTurnstile() {
    if (!TURNSTILE_SITE_KEY) return Promise.resolve(null);
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    if (turnstileLoadPromise) return turnstileLoadPromise;
    turnstileLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-bawsala-turnstile]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load bot protection.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.bawsalaTurnstile = 'true';
      script.addEventListener('load', () => window.turnstile?.render ? resolve(window.turnstile) : reject(new Error('Bot protection did not initialize.')), { once: true });
      script.addEventListener('error', () => reject(new Error('Could not load bot protection.')), { once: true });
      document.head.appendChild(script);
    }).catch(error => {
      turnstileLoadPromise = null;
      throw error;
    });
    return turnstileLoadPromise;
  }

  async function renderAuthCaptcha() {
    const container = q('#turnstileContainer');
    if (!container || !TURNSTILE_SITE_KEY) return;
    try {
      const turnstile = await ensureTurnstile();
      if (!turnstile || q('#turnstileContainer') !== container) return;
      turnstileWidgetId = turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback(token) {
          const input = q('input[name="captchaToken"]');
          if (input) input.value = token;
        },
        'expired-callback'() {
          const input = q('input[name="captchaToken"]');
          if (input) input.value = '';
        },
        'error-callback'() {
          const input = q('input[name="captchaToken"]');
          if (input) input.value = '';
          showFormError('Bot protection failed. Reload the challenge and try again.');
        }
      });
    } catch (error) {
      if (q('#turnstileContainer') === container) showFormError(String(error?.message || 'Bot protection failed to load.'));
    }
  }

  function resetAuthCaptcha() {
    const input = q('input[name="captchaToken"]');
    if (input) input.value = '';
    if (turnstileWidgetId !== null && window.turnstile?.reset) {
      try { window.turnstile.reset(turnstileWidgetId); } catch { /* Widget may already be gone. */ }
    }
  }

  function removeAuthCaptcha() {
    if (turnstileWidgetId !== null && window.turnstile?.remove) {
      try { window.turnstile.remove(turnstileWidgetId); } catch { /* Widget may already be gone. */ }
    }
    turnstileWidgetId = null;
  }

  function openModal({ kind, kicker, title, html, data = null, submitLabel = 'SAVE', hideSubmit = false, cancelLabel = 'CANCEL', cancelAction = 'close-modal' }) {
    modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalContext = { kind, data };
    q('#modalKicker').textContent = kicker;
    q('#modalTitle').textContent = title;
    const submit = hideSubmit ? '' : `<button type="submit" class="primary-button">${escapeHTML(submitLabel)}</button>`;
    q('#modalForm').innerHTML = `${html}<div class="form-error hidden" id="modalError" role="alert"></div><div class="modal-actions"><button type="button" class="secondary-button" data-action="${escapeHTML(cancelAction)}">${escapeHTML(cancelLabel)}</button>${submit}</div>`;
    q('#modalBackdrop').classList.remove('hidden');
    q('.app-shell')?.setAttribute('inert', '');
    document.body.classList.add('dialog-open');
    modalInitialSnapshot = new URLSearchParams(new FormData(q('#modalForm'))).toString();
    window.setTimeout(() => q('#modalForm input, #modalForm textarea, #modalForm select, #modalForm button')?.focus(), 0);
  }

  function closeModal(force = false) {
    if (!force && modalContext && !['confirm-action', 'cloud-conflict', 'local-conflict', 'backup-manager', 'import-preview', 'cloud-auth'].includes(modalContext.kind)) {
      const current = new URLSearchParams(new FormData(q('#modalForm'))).toString();
      if (current !== modalInitialSnapshot) {
        return openConfirmModal({
          title: 'Discard Unsaved Changes?',
          message: 'This form contains changes that have not been saved.',
          submitLabel: 'DISCARD',
          action: async () => { closeModal(true); return true; }
        });
      }
    }
    removeAuthCaptcha();
    q('#modalBackdrop').classList.add('hidden');
    q('#modalForm').innerHTML = '';
    q('.app-shell')?.removeAttribute('inert');
    document.body.classList.remove('dialog-open');
    modalContext = null;
    modalInitialSnapshot = '';
    const target = modalReturnFocus;
    modalReturnFocus = null;
    if (target?.isConnected) window.setTimeout(() => target.focus(), 0);
  }

  function openConfirmModal({ title, message, confirmation = '', submitLabel = 'CONFIRM', action }) {
    openModal({
      kind: 'confirm-action',
      kicker: 'CONFIRM ACTION',
      title,
      submitLabel,
      data: { action, confirmation },
      html: `<p class="muted-copy full-span">${escapeHTML(message)}</p>${confirmation ? modalField(`Type ${confirmation} to continue`, 'confirmation', 'text', '', { required: true, full: true, maxlength: confirmation.length, autocomplete: 'off' }) : ''}`
    });
  }


  function openOnboarding() {
    openModal({
      kind: 'onboarding',
      kicker: 'FIRST RUN',
      title: 'Set Up a Real Study Profile',
      submitLabel: 'CREATE PROFILE',
      cancelLabel: 'SKIP FOR NOW',
      cancelAction: 'skip-onboarding',
      html:
        `<p class="muted-copy full-span">Start with real information. Nothing is pre-filled with fake XP, sample tasks, or demo subjects.</p>` +
        modalField('Display name', 'name', 'text', state.profile.name === 'PLAYER' ? '' : state.profile.name, { required: true, maxlength: 20, placeholder: 'Your name or nickname', autocomplete: 'nickname' }) +
        modalField('Daily focus goal in minutes', 'goal', 'number', state.profile.dailyGoal || 60, { required: true, min: 15, max: 600, step: 15 }) +
        modalField('First subject (optional)', 'subject', 'text', '', { full: true, maxlength: 100, placeholder: 'Mathematics, Biology, Arabic…' })
    });
  }

  function showFormError(message) {
    const box = q('#modalError');
    box.textContent = message;
    box.classList.remove('hidden');
  }

  function getSubjectOptions() {
    return [{ value: '', label: 'General' }, ...state.subjects.map(item => ({ value: item.id, label: item.name }))];
  }

  function getSubjectSelection(subjectId, subjectName = 'General') {
    const subject = state.subjects.find(item => item.id === subjectId) || state.subjects.find(item => item.name === subjectName);
    return { subjectId: subject?.id || '', subject: subject?.name || 'General' };
  }

  function sessionsOverlap(candidate, ignoredId = '') {
    const start = Number(candidate.time.slice(0, 2)) * 60 + Number(candidate.time.slice(3, 5));
    const end = start + Number(candidate.duration || 0);
    return state.sessions.some(item => {
      if (item.id === ignoredId || item.date !== candidate.date) return false;
      const otherStart = Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3, 5));
      const otherEnd = otherStart + Number(item.duration || 0);
      return start < otherEnd && otherStart < end;
    });
  }

  function openQuestModal(existing = null) {
    const options = getSubjectOptions();
    openModal({
      kind: 'quest', kicker: existing ? 'EDIT MISSION' : 'NEW MISSION', title: existing ? 'Edit Quest' : 'Create Quest', data: existing?.id || null,
      html:
        modalField('Quest title', 'title', 'text', existing?.title || '', { required: true, full: true, maxlength: 180, placeholder: 'Finish chapter 4 practice' }) +
        modalSelect('Subject', 'subjectId', options, existing?.subjectId || '') +
        modalSelect('Priority', 'priority', ['high', 'medium', 'low'], existing?.priority || 'medium') +
        modalField('Duration in minutes', 'duration', 'number', existing?.duration || 25, { required: true, min: 5, max: 480, step: 5 }) +
        modalField('XP reward', 'xp', 'number', existing?.xp || 100, { required: true, min: 0, max: 1000, step: 10 }) +
        modalField('Due date', 'dueDate', 'date', existing?.dueDate || todayISO(), { full: true }) +
        modalField('Description', 'description', 'textarea', existing?.description || '', { full: true, rows: 3, maxlength: 2000, placeholder: 'Define what finished looks like.' }) +
        modalField('Steps — one per line', 'steps', 'textarea', (existing?.steps || []).map(step => step.text).join('\n'), { full: true, rows: 4, maxlength: 15000, placeholder: 'Read section\nSolve examples\nCheck mistakes' })
    });
  }

  function openSubjectModal(existing = null) {
    openModal({
      kind: 'subject', kicker: existing ? 'EDIT KNOWLEDGE NODE' : 'NEW KNOWLEDGE NODE', title: existing ? 'Edit Subject' : 'Add Subject', data: existing?.id || null,
      html:
        modalField('Subject name', 'name', 'text', existing?.name || '', { required: true, maxlength: 100 }) +
        modalField('Symbol', 'symbol', 'text', existing?.symbol || '', { required: true, maxlength: 3, placeholder: 'CS' }) +
        modalSelect('Color', 'color', COLORS, existing?.color || 'purple') +
        modalField('Starting progress', 'progress', 'number', existing?.progress || 0, { min: 0, max: 100, step: 1 }) +
        modalField('Description', 'description', 'textarea', existing?.description || '', { full: true, rows: 4, maxlength: 1500 })
    });
  }

  function openSessionModal(existing = null, date = todayISO(), time = '16:00') {
    const options = getSubjectOptions();
    const questOptions = [{ value: '', label: 'No linked quest' }, ...state.quests.filter(item => !item.completed || item.id === existing?.questId).map(item => ({ value: item.id, label: item.title }))];
    openModal({
      kind: 'session', kicker: existing ? 'EDIT TIME BLOCK' : 'NEW TIME BLOCK', title: existing ? 'Edit Session' : 'Schedule Session', data: existing?.id || null,
      html:
        modalField('Session title', 'title', 'text', existing?.title || '', { required: true, full: true, maxlength: 180 }) +
        modalSelect('Subject', 'subjectId', options, existing?.subjectId || '') +
        modalSelect('Linked quest', 'questId', questOptions, existing?.questId || '', true) +
        modalSelect('Color', 'color', COLORS, existing?.color || 'purple') +
        modalField('Date', 'date', 'date', existing?.date || date, { required: true }) +
        modalField('Start time', 'time', 'time', existing?.time || time, { required: true }) +
        modalField('Duration', 'duration', 'number', existing?.duration || 25, { required: true, min: 5, max: 480, step: 5 }) +
        (existing ? `<div class="field-label"><span>Delete this block</span><button type="button" class="danger-button" data-action="delete-session" data-id="${existing.id}">DELETE SESSION</button></div>` : '')
    });
  }

  function openCardModal(existing = null) {
    const options = getSubjectOptions();
    openModal({
      kind: 'card', kicker: existing ? 'EDIT MEMORY' : 'NEW MEMORY', title: existing ? 'Edit Flashcard' : 'Create Flashcard', data: existing?.id || null,
      html:
        modalSelect('Subject', 'subjectId', options, existing?.subjectId || '', true) +
        modalField('Prompt', 'front', 'textarea', existing?.front || '', { required: true, full: true, rows: 4, maxlength: 3000, placeholder: 'Ask one clear question.' }) +
        modalField('Answer', 'back', 'textarea', existing?.back || '', { required: true, full: true, rows: 4, maxlength: 6000, placeholder: 'Write the minimum complete answer.' })
    });
  }

  function openQuestionModal(existing = null) {
    const options = getSubjectOptions();
    openModal({
      kind: 'question', kicker: existing ? 'EDIT ARENA ITEM' : 'NEW ARENA ITEM', title: existing ? 'Edit Typed-Recall Question' : 'Add Typed-Recall Question', data: existing?.id || null,
      html:
        modalSelect('Subject', 'subjectId', options, existing?.subjectId || '', true) +
        modalField('Question', 'prompt', 'textarea', existing?.prompt || '', { required: true, full: true, rows: 3, maxlength: 3000 }) +
        modalField('Correct answer', 'answer', 'text', existing?.answer || '', { required: true, full: true, maxlength: 3000 }) +
        modalField('Other accepted answers — comma separated', 'accepted', 'text', (existing?.accepted || []).join(', '), { full: true, maxlength: 6000 }) +
        modalField('Hint', 'hint', 'text', existing?.hint || '', { full: true, maxlength: 1200 })
    });
  }

  function openResourceModal(existing = null) {
    const options = getSubjectOptions();
    openModal({
      kind: 'resource', kicker: existing ? 'EDIT VAULT ENTRY' : 'NEW VAULT ENTRY', title: existing ? 'Edit Resource' : 'Add Resource', data: existing?.id || null,
      html:
        modalField('Title', 'title', 'text', existing?.title || '', { required: true, full: true, maxlength: 240 }) +
        modalSelect('Subject', 'subjectId', options, existing?.subjectId || '') +
        modalSelect('Type', 'type', ['Documentation', 'PDF', 'Book', 'Course', 'Video', 'Notes', 'Anki', 'Other'], existing?.type || 'Documentation') +
        modalField('URL — optional', 'url', 'url', existing?.url || '', { full: true, maxlength: 2048, placeholder: 'https://...' }) +
        modalField('Tags — comma separated', 'tags', 'text', (existing?.tags || []).join(', '), { full: true, maxlength: 1000 }) +
        modalField('Description', 'description', 'textarea', existing?.description || '', { full: true, rows: 4, maxlength: 3000 })
    });
  }

  function openCloudAuthModal(mode = 'signin') {
    if (!cloudSync.configured) {
      toast('Cloud not configured', 'Add the Supabase URL and publishable key in config.js first.', 'error');
      return;
    }
    const isReset = mode === 'reset';
    const isSignup = mode === 'signup';
    const isNewPassword = mode === 'new-password';
    const captcha = TURNSTILE_SITE_KEY && !isNewPassword
      ? '<div class="turnstile-shell full-span"><div id="turnstileContainer"></div><input type="hidden" name="captchaToken" value=""></div>'
      : '';
    openModal({
      kind: 'cloud-auth',
      kicker: (isReset || isNewPassword) ? 'ACCOUNT RECOVERY' : 'SECURE CLOUD ACCOUNT',
      title: isReset ? 'Reset Password' : (isNewPassword ? 'Set New Password' : (isSignup ? 'Create Account' : 'Sign In')),
      data: mode,
      submitLabel: isReset ? 'SEND RESET LINK' : (isNewPassword ? 'UPDATE PASSWORD' : (isSignup ? 'CREATE ACCOUNT' : 'SIGN IN')),
      html: isNewPassword
        ? modalField('New password', 'password', 'password', '', { required: true, full: true, minlength: 12, maxlength: 128, autocomplete: 'new-password' }) + modalField('Confirm new password', 'passwordConfirm', 'password', '', { required: true, full: true, minlength: 12, maxlength: 128, autocomplete: 'new-password' })
        : modalField('Email address', 'email', 'email', '', { required: true, full: true, maxlength: 254, autocomplete: 'email' }) +
          (isReset ? '' : modalField('Password', 'password', 'password', '', { required: true, full: true, minlength: isSignup ? 12 : 1, maxlength: 128, autocomplete: isSignup ? 'new-password' : 'current-password' })) +
          (isSignup ? '<p class="muted-copy full-span">Use 12–128 characters. Email confirmation may be required by your Supabase Auth settings.</p>' : '') + captcha
    });
    if (captcha) renderAuthCaptcha();
  }

  function openCloudConflictModal(serverResult) {
    cloudSync.pendingConflict = serverResult;
    const local = stateSummary(state);
    const remote = stateSummary(serverResult?.state || {});
    setCloudStatus('conflict', 'This account profile and the cloud both changed. Review the summaries before choosing.');
    openModal({
      kind: 'cloud-conflict', kicker: 'SYNC SAFETY', title: 'Choose the Correct Account Copy', hideSubmit: true,
      html: `<div class="conflict-compare full-span"><article><strong>THIS DEVICE</strong><span>${local.quests} quests · ${local.notes} notes · ${local.cards} cards</span><small>Updated ${new Date(local.updatedAt).toLocaleString()}</small></article><article><strong>CLOUD</strong><span>${remote.quests} quests · ${remote.notes} notes · ${remote.cards} cards</span><small>Updated ${new Date(remote.updatedAt).toLocaleString()}</small></article></div><div class="cloud-conflict-copy"><strong>Neither copy will be replaced unless a verified local backup succeeds first.</strong><span>You can export either copy later from the backup manager.</span></div><div class="cloud-conflict-actions"><button type="button" class="secondary-button" data-action="resolve-cloud-conflict" data-resolution="cloud">USE CLOUD COPY</button><button type="button" class="primary-button" data-action="resolve-cloud-conflict" data-resolution="local">KEEP THIS DEVICE</button></div>`
    });
  }

  async function resolveCloudConflict(resolution) {
    const conflict = cloudSync.pendingConflict;
    if (!conflict) return;
    try {
      await createLocalBackup(`sync-conflict-before-${resolution}`);
    } catch (error) {
      toast('Conflict not resolved', `A verified backup could not be created: ${error.message}`, 'error');
      return;
    }
    if (resolution === 'cloud') {
      const replacement = normalizeState(conflict.state);
      state = replacement;
      const saved = await saveState({ localOnly: true });
      if (!saved) return;
      selectedNoteId = state.notes[0]?.id || null;
      cloudSync.revision = Number(conflict.revision || 0);
      cloudSync.dirty = false;
      cloudSync.pendingConflict = null;
      cloudSync.lastSyncedAt = Date.now();
      writeCloudMeta();
      closeModal(true);
      renderAll();
      setCloudStatus('synced', `Cloud copy loaded · revision ${cloudSync.revision}.`);
      toast('Cloud copy loaded', 'The previous device copy is available in Backups.', 'success');
      return;
    }
    cloudSync.revision = Number(conflict.revision || 0);
    cloudSync.dirty = true;
    cloudSync.pendingConflict = null;
    writeCloudMeta();
    closeModal(true);
    await syncCloudNow({ manual: true });
  }

  async function syncCloudNow(options = {}) {
    if (cloudSync.pendingConflict) {
      openCloudConflictModal(cloudSync.pendingConflict);
      return false;
    }
    if (!cloudSync.configured || !cloudSync.user || cloudSync.syncing) return false;
    if (!navigator.onLine) {
      setCloudStatus('offline', 'Offline. Changes are safely stored in this account profile on this device.');
      return false;
    }
    await persistChain;
    cloudSync.syncing = true;
    const versionAtStart = cloudSync.localChangeVersion;
    setCloudStatus('syncing', 'Sending the current account revision over HTTPS...');
    try {
      Storage.assertStateSize(state);
      const result = await Cloud.pushState(normalizeState(state), cloudSync.revision);
      if (!result || result.conflict) {
        openCloudConflictModal(result);
        return false;
      }
      cloudSync.revision = Number(result?.revision || cloudSync.revision + 1);
      cloudSync.dirty = cloudSync.localChangeVersion !== versionAtStart;
      cloudSync.lastSyncedAt = Date.now();
      writeCloudMeta();
      if (cloudSync.dirty) {
        setCloudStatus('dirty', 'New local changes arrived during sync. Another sync is queued.');
        scheduleCloudSync();
      } else {
        setCloudStatus('synced', `Cloud revision ${cloudSync.revision} · last sync ${new Date(cloudSync.lastSyncedAt).toLocaleTimeString()}.`);
        if (options.manual) toast('Cloud sync complete', 'This account profile and the cloud are up to date.', 'success');
      }
      return true;
    } catch (error) {
      console.error('Cloud sync failed:', error);
      const offline = !navigator.onLine || ['network_error', 'timeout', 'AbortError'].includes(error?.code);
      setCloudStatus(offline ? 'offline' : 'error', offline ? 'Could not reach the cloud. The account profile remains safe on this device.' : String(error?.message || 'Cloud sync failed.'));
      if (options.manual) toast('Cloud sync failed', String(error?.message || 'Try again later.'), 'error');
      return false;
    } finally {
      cloudSync.syncing = false;
    }
  }

  async function initializeCloud(initialUser = undefined) {
    if (!cloudSync.configured) {
      if (activeNamespace !== 'anonymous') await switchNamespace('anonymous');
      setCloudStatus('local', 'Supabase is not configured. The anonymous profile remains local.');
      return;
    }
    try {
      const user = initialUser === undefined ? await Cloud.getCurrentUser() : initialUser;
      if (!user) {
        cloudSync.user = null;
        cloudSync.revision = 0;
        cloudSync.deletionRequest = null;
        cloudSync.dirty = false;
        cloudSync.pendingConflict = null;
        if (activeNamespace !== 'anonymous') {
          await switchNamespace('anonymous');
          renderAll();
        }
        setCloudStatus('signed_out', 'Signed out. You are viewing the separate anonymous profile.');
        return;
      }

      cloudSync.user = user;
      const deletionRequest = await Cloud.getDeletionRequest?.().catch(() => null);
      cloudSync.deletionRequest = deletionRequest;
      const namespace = `user:${user.id}`;
      const localRecord = activeNamespace === namespace ? await Storage.load(namespace) : await switchNamespace(namespace);
      const meta = readCloudMeta();
      cloudSync.revision = Number(meta?.revision || 0);
      cloudSync.dirty = Boolean(meta?.dirty);
      cloudSync.lastSyncedAt = Number(meta?.syncedAt || 0) || null;
      updateCloudUI();
      renderAll();

      if (!navigator.onLine) {
        setCloudStatus('offline', `Signed in as ${user.email || 'user'}; account data is isolated locally until connection returns.`);
        return;
      }

      setCloudStatus('syncing', 'Checking the latest cloud revision for this account...');
      const remote = await Cloud.pullState();
      if (!remote) {
        cloudSync.revision = 0;
        if (localRecord?.state && hasMeaningfulData(localRecord.state)) {
          cloudSync.dirty = true;
          writeCloudMeta();
          await syncCloudNow();
        } else {
          cloudSync.dirty = false;
          cloudSync.lastSyncedAt = Date.now();
          writeCloudMeta();
          setCloudStatus('synced', 'This account has a new, empty study profile. Anonymous data was not copied.');
        }
        return;
      }

      const remoteRevision = Number(remote.revision || 0);
      if (!localRecord || !hasMeaningfulData(localRecord.state)) {
        state = normalizeState(remote.state);
        const saved = await saveState({ localOnly: true, backupReason: localRecord ? 'before first cloud download' : '' });
        if (!saved) return;
        cloudSync.revision = remoteRevision;
        cloudSync.dirty = false;
        cloudSync.lastSyncedAt = Date.now();
        writeCloudMeta();
        renderAll();
        setCloudStatus('synced', `Account cloud copy loaded · revision ${remoteRevision}.`);
        return;
      }

      if (cloudSync.dirty && Number(meta?.revision || 0) === remoteRevision) {
        await syncCloudNow();
        return;
      }

      const localComparable = JSON.stringify(normalizeState(localRecord.state));
      const remoteComparable = JSON.stringify(normalizeState(remote.state));
      if (localComparable === remoteComparable) {
        cloudSync.revision = remoteRevision;
        cloudSync.dirty = false;
        cloudSync.lastSyncedAt = Date.now();
        writeCloudMeta();
        setCloudStatus('synced', `Account data verified · revision ${remoteRevision}.`);
        return;
      }
      openCloudConflictModal({ ...remote, revision: remoteRevision });
    } catch (error) {
      console.error('Cloud initialization failed:', error);
      const offline = !navigator.onLine || ['network_error', 'timeout', 'AbortError'].includes(error?.code);
      setCloudStatus(offline ? 'offline' : 'error', offline ? 'Cloud unavailable. The isolated local profile still works.' : String(error?.message || 'Could not initialize cloud sync.'));
    }
  }

  async function cloudSignOut() {
    const flushed = await flushPendingSave();
    if (flushed === false) {
      toast('Sign-out paused', 'The latest local changes could not be stored. Resolve the storage error before signing out.', 'error');
      return;
    }
    if (cloudSync.dirty) {
      const synced = await syncCloudNow({ manual: true });
      if (!synced) {
        toast('Sign-out paused', 'Cloud sync failed. Retry sync or export a backup before signing out.', 'error');
        return;
      }
    }
    try {
      await Cloud.signOut();
    } catch (error) {
      toast('Sign-out failed', error.message || 'The server session could not be closed.', 'error');
      return;
    }
    cloudSync.user = null;
    cloudSync.revision = 0;
    cloudSync.dirty = false;
    cloudSync.pendingConflict = null;
    cloudSync.deletionRequest = null;
    await switchNamespace('anonymous');
    renderAll();
    setCloudStatus('signed_out', 'Signed out. The account profile remains isolated; you are now viewing the anonymous profile.');
    toast('Signed out', 'No account data was exposed to the anonymous profile.', 'success');
  }

  async function copyAnonymousProfileToAccount() {
    if (!cloudSync.user) return;
    const anonymous = await Storage.load('anonymous');
    if (!anonymous?.state || !hasMeaningfulData(anonymous.state)) {
      toast('Nothing to copy', 'The anonymous profile is empty.', 'error');
      return;
    }
    openModal({
      kind: 'copy-anonymous', kicker: 'ACCOUNT ISOLATION', title: 'Copy Anonymous Profile to This Account',
      submitLabel: 'COPY AFTER BACKUP',
      html: `<p class="muted-copy full-span">This is the only path that copies anonymous data into ${escapeHTML(cloudSync.user.email || 'the account')}. The current account profile will be backed up first.</p>${modalField('Type COPY to confirm', 'confirmation', 'text', '', { required: true, full: true, maxlength: 4, autocomplete: 'off' })}`
    });
  }

  function openDeleteAccountModal() {
    if (!cloudSync.user) return;
    openModal({
      kind: 'delete-account', kicker: 'ACCOUNT DELETION', title: 'Schedule Cloud Account Deletion', submitLabel: 'SCHEDULE DELETION',
      html: `<p class="muted-copy full-span">Deletion is scheduled with a grace period. Re-enter your password and type DELETE MY ACCOUNT. Your anonymous and account profiles on this browser remain separate.</p>${modalField('Current password', 'password', 'password', '', { required: true, full: true, minlength: 1, maxlength: 128, autocomplete: 'current-password' })}${modalField('Confirmation phrase', 'confirmation', 'text', '', { required: true, full: true, maxlength: 17, autocomplete: 'off' })}`
    });
  }

  async function handleModalSubmit(event) {
    event.preventDefault();
    if (!modalContext) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const submitButton = q('#modalForm button[type="submit"]');

    if (modalContext.kind === 'confirm-action') {
      const context = modalContext;
      if (context.data.confirmation && String(data.confirmation || '').trim() !== context.data.confirmation) {
        return showFormError(`Type ${context.data.confirmation} exactly.`);
      }
      if (submitButton) submitButton.disabled = true;
      try {
        const result = await context.data.action();
        if (result !== false && modalContext === context) closeModal(true);
      } catch (error) {
        showFormError(error.message || 'The action could not be completed.');
        if (submitButton) submitButton.disabled = false;
      }
      return;
    }

    if (modalContext.kind === 'import-preview') {
      if (String(data.confirmation || '').trim() !== 'IMPORT') return showFormError('Type IMPORT exactly.');
      if (submitButton) submitButton.disabled = true;
      const context = modalContext;
      try {
        await createLocalBackup('before import replacement');
        state = normalizeState(context.data.state);
        selectedNoteId = state.notes[0]?.id || null;
        const saved = await saveState();
        if (!saved) throw new Error('Imported data could not be stored. The previous profile remains active.');
        closeModal(true);
        renderAll();
        navigate('dashboard');
        toast('Data imported', 'The previous profile is available in Backups.', 'success');
      } catch (error) {
        showFormError(error.message || 'Import failed.');
        if (submitButton) submitButton.disabled = false;
      }
      return;
    }

    if (modalContext.kind === 'cloud-auth') {
      if (submitButton) submitButton.disabled = true;
      try {
        const captchaRequired = Boolean(TURNSTILE_SITE_KEY && modalContext.data !== 'new-password');
        if (captchaRequired && !data.captchaToken) throw new Error('Complete the bot-protection check first.');
        if (modalContext.data === 'new-password') {
          if (data.password !== data.passwordConfirm) throw new Error('The passwords do not match.');
          await Cloud.updatePassword(data.password);
          closeModal(true);
          toast('Password updated', 'Your account password has been changed.', 'success');
          await initializeCloud();
          return;
        }
        if (modalContext.data === 'reset') {
          await Cloud.sendPasswordReset(data.email, data.captchaToken);
          closeModal(true);
          toast('Reset link requested', 'Check your email. The message may take a minute to arrive.', 'success');
          return;
        }
        if (modalContext.data === 'signup') {
          const result = await Cloud.signUp(data.email, data.password, data.captchaToken);
          closeModal(true);
          if (result?.session) {
            toast('Account created', 'A separate account profile is now active. Anonymous data was not copied.', 'success');
            await initializeCloud(result.user || result.session.user);
          } else {
            toast('Confirm your email', 'Open the confirmation message, then sign in.', 'success');
          }
          return;
        }
        const session = await Cloud.signIn(data.email, data.password, data.captchaToken);
        closeModal(true);
        toast('Signed in', 'Loading this account’s isolated profile.', 'success');
        await initializeCloud(session?.user);
        return;
      } catch (error) {
        showFormError(String(error?.message || 'Authentication failed.'));
        resetAuthCaptcha();
        if (submitButton) submitButton.disabled = false;
        return;
      }
    }

    if (modalContext.kind === 'onboarding') {
      if (submitButton) submitButton.disabled = true;
      const previous = clone(state);
      try {
        const name = String(data.name || '').trim().slice(0, 20);
        if (!name) throw new Error('Display name is required.');
        state.profile.name = name;
        state.profile.avatar = [...name][0]?.toLocaleUpperCase() || 'P';
        state.profile.dailyGoal = clamp(Number(data.goal), 15, 600);
        const subjectName = String(data.subject || '').trim().slice(0, 100);
        if (subjectName && !state.subjects.some(item => item.name.toLocaleLowerCase() === subjectName.toLocaleLowerCase())) {
          state.subjects.push({ id: uid(), name: subjectName, symbol: [...subjectName].slice(0, 2).join('').toLocaleUpperCase() || 'S', description: '', progress: 0, color: 'purple' });
        }
        state.settings.onboardingDone = true;
        if (!await saveState()) throw new Error('The profile could not be stored safely.');
        closeModal(true);
        renderAll();
        toast('Profile ready', 'Add one concrete quest, then schedule a focus block.', 'success');
      } catch (error) {
        state = previous;
        showFormError(error.message || 'The profile could not be created.');
        if (submitButton) submitButton.disabled = false;
      }
      return;
    }

    if (modalContext.kind === 'copy-anonymous') {
      if (String(data.confirmation || '').trim() !== 'COPY') return showFormError('Type COPY exactly.');
      if (submitButton) submitButton.disabled = true;
      try {
        const anonymous = await Storage.load('anonymous');
        if (!anonymous?.state || !hasMeaningfulData(anonymous.state)) throw new Error('The anonymous profile is empty.');
        await createLocalBackup('before copying anonymous profile');
        state = normalizeState(anonymous.state);
        state.meta.createdAt = Date.now();
        state.meta.updatedAt = Date.now();
        const saved = await saveState();
        if (!saved) throw new Error('The account profile could not be saved.');
        closeModal(true);
        renderAll();
        toast('Profile copied', 'Anonymous data was copied only after a verified account backup.', 'success');
        await syncCloudNow({ manual: true });
      } catch (error) {
        showFormError(error.message || 'The profile could not be copied.');
        if (submitButton) submitButton.disabled = false;
      }
      return;
    }

    if (modalContext.kind === 'delete-account') {
      if (String(data.confirmation || '').trim() !== 'DELETE MY ACCOUNT') return showFormError('Type DELETE MY ACCOUNT exactly.');
      if (submitButton) submitButton.disabled = true;
      try {
        await Cloud.reauthenticate(data.password);
        const result = await Cloud.scheduleAccountDeletion();
        closeModal(true);
        await Cloud.signOut();
        cloudSync.user = null;
        cloudSync.revision = 0;
        cloudSync.dirty = false;
        await switchNamespace('anonymous');
        renderAll();
        setCloudStatus('signed_out', 'Account deletion is scheduled. Sign in before the deadline to cancel it.');
        const deadline = result?.delete_after ? new Date(result.delete_after).toLocaleString() : 'the grace-period deadline';
        toast('Deletion scheduled', `The cloud account is scheduled for deletion after ${deadline}.`, 'success');
      } catch (error) {
        showFormError(error.message || 'Account deletion could not be scheduled.');
        if (submitButton) submitButton.disabled = false;
      }
      return;
    }

    if (['cloud-conflict', 'local-conflict', 'backup-manager', 'import-preview'].includes(modalContext.kind)) return;

    const previous = clone(state);
    try {
      if (modalContext.kind === 'quest') {
        if (!data.title.trim()) return showFormError('Quest title is required.');
        const existing = state.quests.find(item => item.id === modalContext.data);
        const oldSteps = existing?.steps || [];
        const steps = String(data.steps || '').split('\n').map(text => text.trim()).filter(Boolean).slice(0, 50).map(text => ({
          id: oldSteps.find(step => step.text === text)?.id || uid(), text: text.slice(0, 300), done: oldSteps.find(step => step.text === text)?.done || false
        }));
        const values = {
          title: data.title.trim().slice(0, 180), description: data.description.trim().slice(0, 2000),
          ...getSubjectSelection(data.subjectId), priority: data.priority,
          duration: clamp(Number(data.duration), 5, 480), xp: clamp(Number(data.xp), 0, 1000), dueDate: data.dueDate, steps
        };
        if (existing) Object.assign(existing, values);
        else state.quests.push({ id: uid(), ...values, completed: false, rewarded: false, createdAt: Date.now(), completedAt: null });
      }

      if (modalContext.kind === 'subject') {
        const name = data.name.trim().slice(0, 100);
        if (!name) return showFormError('Subject name is required.');
        const existing = state.subjects.find(item => item.id === modalContext.data);
        if (state.subjects.some(item => item.id !== existing?.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return showFormError('A subject with this name already exists.');
        const values = { name, symbol: data.symbol.trim().slice(0, 3).toUpperCase() || name.slice(0, 2).toUpperCase(), description: data.description.trim().slice(0, 1500), progress: clamp(Number(data.progress), 0, 100), color: data.color };
        if (existing) {
          Object.assign(existing, values);
          for (const key of ['quests', 'sessions', 'notes', 'resources', 'cards', 'reviewLog', 'questions']) {
            state[key].forEach(item => { if (item.subjectId === existing.id) item.subject = name; });
          }
        } else state.subjects.push({ id: uid(), ...values });
      }

      if (modalContext.kind === 'session') {
        if (!data.title.trim()) return showFormError('Session title is required.');
        const values = {
          title: data.title.trim().slice(0, 180), ...getSubjectSelection(data.subjectId), questId: safeRef(data.questId),
          color: data.color, date: data.date, time: data.time, duration: clamp(Number(data.duration), 5, 480)
        };
        if (sessionsOverlap(values, modalContext.data || '')) return showFormError('This session overlaps another block. Move it or shorten its duration.');
        const existing = state.sessions.find(item => item.id === modalContext.data);
        if (existing) Object.assign(existing, values);
        else state.sessions.push({ id: uid(), ...values });
      }

      if (modalContext.kind === 'card') {
        if (!data.front.trim() || !data.back.trim()) return showFormError('Both prompt and answer are required.');
        const existing = state.cards.find(item => item.id === modalContext.data);
        const values = { front: data.front.trim().slice(0, 3000), back: data.back.trim().slice(0, 6000), ...getSubjectSelection(data.subjectId) };
        if (existing) {
          const contentChanged = existing.front !== values.front || existing.back !== values.back || existing.subjectId !== values.subjectId;
          Object.assign(existing, values);
          if (contentChanged) Object.assign(existing, { dueDate: todayISO(), dueAt: Date.now(), interval: 0, ease: 2.5, reps: 0, lapses: 0 });
        } else state.cards.push({ id: uid(), ...values, dueDate: todayISO(), dueAt: Date.now(), interval: 0, ease: 2.5, reps: 0, lapses: 0 });
      }

      if (modalContext.kind === 'question') {
        if (!data.prompt.trim() || !data.answer.trim()) return showFormError('Question and answer are required.');
        const values = {
          prompt: data.prompt.trim().slice(0, 3000), answer: data.answer.trim().slice(0, 3000),
          accepted: String(data.accepted || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, 20),
          ...getSubjectSelection(data.subjectId), hint: data.hint.trim().slice(0, 1200)
        };
        const existing = state.questions.find(item => item.id === modalContext.data);
        if (existing) Object.assign(existing, values); else state.questions.push({ id: uid(), ...values });
      }

      if (modalContext.kind === 'resource') {
        if (!data.title.trim()) return showFormError('Resource title is required.');
        if (data.url && !/^https:\/\//i.test(data.url)) return showFormError('Only HTTPS URLs are allowed.');
        const values = {
          title: data.title.trim().slice(0, 240), ...getSubjectSelection(data.subjectId), type: data.type,
          url: data.url.trim(), tags: String(data.tags || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, 20),
          description: data.description.trim().slice(0, 3000)
        };
        const existing = state.resources.find(item => item.id === modalContext.data);
        if (existing) Object.assign(existing, values); else state.resources.push({ id: uid(), ...values });
      }

      const saved = await saveState();
      if (!saved) return;
      closeModal(true);
      renderSidebar();
      renderRoute(currentRoute);
      if (currentRoute !== 'dashboard') renderDashboard();
      renderNotifications();
      toast('Saved', 'The change is stored durably on this device.', 'success');
    } catch (error) {
      state = previous;
      showFormError(error.message || 'The change could not be saved.');
    }
  }

  function deleteSession(id) {
    const item = state.sessions.find(session => session.id === id);
    if (!item) return;
    openConfirmModal({
      title: 'Delete Planned Session?', message: `“${item.title}” on ${formatDate(item.date)} at ${formatTime(item.time)} will be removed.`, submitLabel: 'DELETE SESSION',
      action: async () => {
        const index = state.sessions.findIndex(session => session.id === id);
        const removed = clone(state.sessions[index]);
        state.sessions.splice(index, 1);
        if (!await saveState()) return false;
        closeModal(true); renderPlanner();
        toast('Session deleted', 'The time block was removed.', '', { label: 'UNDO', run: async () => {
          if (!state.sessions.some(session => session.id === removed.id)) state.sessions.splice(Math.min(index, state.sessions.length), 0, removed);
          if (await saveState()) renderPlanner();
        }});
        return true;
      }
    });
  }

  function getSearchItems(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return ROUTES.map(route => ({ type: 'PAGE', title: PAGE_META[route][1], meta: PAGE_META[route][0], route }));
    const items = [];
    state.quests.forEach(item => items.push({ type: 'QUEST', title: item.title, meta: item.subject, route: 'quests', id: item.id, text: `${item.title} ${item.description} ${item.subject}` }));
    state.cards.forEach(item => items.push({ type: 'CARD', title: item.front, meta: item.subject, route: 'flashcards', id: item.id, text: `${item.front} ${item.back} ${item.subject}` }));
    state.notes.forEach(item => items.push({ type: 'NOTE', title: item.title, meta: item.subject, route: 'notes', id: item.id, text: `${item.title} ${item.body} ${item.subject}` }));
    state.questions.forEach(item => items.push({ type: 'QUESTION', title: item.prompt, meta: item.subject, route: 'arena', id: item.id, text: `${item.prompt} ${item.answer} ${item.subject}` }));
    state.resources.forEach(item => items.push({ type: 'RESOURCE', title: item.title, meta: item.subject, route: 'library', id: item.id, text: `${item.title} ${item.description} ${item.subject} ${(item.tags || []).join(' ')}` }));
    state.subjects.forEach(item => items.push({ type: 'SUBJECT', title: item.name, meta: `${item.progress || 0}% progress`, route: 'subjects', id: item.id, text: `${item.name} ${item.description}` }));
    ROUTES.forEach(route => items.push({ type: 'PAGE', title: PAGE_META[route][1], meta: PAGE_META[route][0], route, text: `${route} ${PAGE_META[route].join(' ')}` }));
    return items.filter(item => String(item.text || item.title).toLowerCase().includes(needle)).slice(0, 30);
  }

  function openGlobalSearch() {
    searchReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    q('#searchOverlay').classList.remove('hidden');
    q('.app-shell')?.setAttribute('inert', '');
    document.body.classList.add('dialog-open');
    q('#globalSearchInput').value = '';
    searchSelection = 0;
    renderSearchResults('');
    window.setTimeout(() => q('#globalSearchInput').focus(), 30);
  }

  function closeGlobalSearch() {
    q('#searchOverlay').classList.add('hidden');
    if (q('#modalBackdrop').classList.contains('hidden')) {
      q('.app-shell')?.removeAttribute('inert');
      document.body.classList.remove('dialog-open');
    }
    if (searchReturnFocus?.isConnected) searchReturnFocus.focus();
    searchReturnFocus = null;
  }

  function renderSearchResults(query) {
    searchItems = getSearchItems(query);
    searchSelection = clamp(searchSelection, 0, Math.max(0, searchItems.length - 1));
    q('#searchResults').innerHTML = searchItems.length ? searchItems.map((item, index) => `<button class="search-result ${index === searchSelection ? 'selected' : ''}" data-search-index="${index}"><span>${escapeHTML(item.type)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.meta || '')}</small></button>`).join('') : '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No results</h3><p>Try a subject, task, card, or page name.</p></div>';
  }

  async function openSearchItem(index) {
    const item = searchItems[index];
    if (!item) return;
    closeGlobalSearch();
    if (item.type === 'PAGE') return navigate(item.route);
    if (item.type === 'NOTE') {
      flushNoteEditorToState();
      await saveState({ localOnly: true });
      selectedNoteId = item.id;
      navigate('notes');
      renderNotes();
      q('#noteTitleInput')?.focus();
      return;
    }
    if (item.type === 'CARD') {
      const card = state.cards.find(entry => entry.id === item.id);
      navigate('flashcards');
      q('#cardSubjectFilter').value = card?.subjectId || 'all';
      q('#cardBrowser').classList.remove('hidden');
      renderFlashcards();
      const row = q(`[data-card-id="${CSS.escape(item.id)}"]`);
      row?.scrollIntoView({ block: 'center' });
      row?.classList.add('search-highlight');
      window.setTimeout(() => row?.classList.remove('search-highlight'), 1800);
      return;
    }
    if (item.type === 'QUEST') return openQuestModal(state.quests.find(entry => entry.id === item.id));
    if (item.type === 'QUESTION') return openQuestionModal(state.questions.find(entry => entry.id === item.id));
    if (item.type === 'RESOURCE') return openResourceModal(state.resources.find(entry => entry.id === item.id));
    if (item.type === 'SUBJECT') return openSubjectModal(state.subjects.find(entry => entry.id === item.id));
    navigate(item.route);
  }

  function stateSummary(value) {
    const normalized = normalizeState(value);
    return {
      quests: normalized.quests.length,
      subjects: normalized.subjects.length,
      sessions: normalized.sessions.length,
      cards: normalized.cards.length,
      notes: normalized.notes.length,
      questions: normalized.questions.length,
      resources: normalized.resources.length,
      focusSessions: normalized.focusLog.length,
      updatedAt: normalized.meta.updatedAt
    };
  }

  function backupEnvelope(data = state, metadata = {}) {
    return {
      app: 'bawsala-study-os',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      namespace: activeNamespace,
      metadata,
      data: normalizeState(data)
    };
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportData() {
    downloadJson(`bawsala-study-os-${todayISO()}.json`, backupEnvelope(state, { source: 'manual-export', revision: localRevision }));
    toast('Data exported', 'A versioned JSON backup was downloaded.', 'success');
  }

  async function openBackupManager() {
    try {
      backupCatalog.local = await Storage.listBackups(activeNamespace);
      backupCatalog.cloud = cloudSync.user ? await Cloud.listCloudBackups(20).catch(() => []) : [];
      const localRows = backupCatalog.local.map(item => `<div class="backup-row"><div><strong>${new Date(item.createdAt).toLocaleString()}</strong><span>${escapeHTML(item.reason || 'Local backup')} · ${Math.ceil(Number(item.bytes || 0) / 1024)} KB</span></div><div><button type="button" data-action="download-local-backup" data-id="${item.id}">DOWNLOAD</button><button type="button" data-action="restore-local-backup" data-id="${item.id}">RESTORE</button><button type="button" data-action="delete-local-backup" data-id="${item.id}">DELETE</button></div></div>`).join('') || '<p class="muted-copy">No local backups exist yet.</p>';
      const cloudRows = backupCatalog.cloud.map(item => `<div class="backup-row"><div><strong>${new Date(item.created_at).toLocaleString()}</strong><span>Cloud revision ${item.revision}</span></div><div><button type="button" data-action="download-cloud-backup" data-id="${item.id}">DOWNLOAD</button><button type="button" data-action="restore-cloud-backup" data-id="${item.id}">RESTORE</button></div></div>`).join('') || '<p class="muted-copy">No cloud backups are available for this profile.</p>';
      openModal({
        kind: 'backup-manager', kicker: 'RECOVERY CENTER', title: 'Backups & Restore', hideSubmit: true,
        html: `<div class="backup-manager full-span"><section><div class="backup-section-head"><h3>Local Backups</h3><button type="button" data-action="create-manual-backup">CREATE BACKUP</button></div>${localRows}</section><section><h3>Cloud Backups</h3>${cloudRows}</section></div>`
      });
    } catch (error) {
      toast('Backups unavailable', error.message || 'The backup catalog could not be opened.', 'error');
    }
  }

  async function restoreBackupState(backupState, label) {
    await createLocalBackup(`before restoring ${label}`);
    state = normalizeState(backupState);
    selectedNoteId = state.notes[0]?.id || null;
    const saved = await saveState();
    if (!saved) throw new Error('The restored profile could not be stored.');
    closeModal(true);
    renderAll();
    navigate('dashboard');
    toast('Backup restored', `Restored ${label}. The replaced profile was backed up first.`, 'success');
  }

  async function importData(file) {
    if (!file) return;
    try {
      if (file.size > Storage.MAX_IMPORT_BYTES) throw new Error(`The file exceeds the ${Math.floor(Storage.MAX_IMPORT_BYTES / 1024)} KB import limit.`);
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const payload = parsed?.app === 'bawsala-study-os' ? parsed.data : parsed;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('The backup does not contain an application state.');
      const sourceVersion = Number(parsed?.schemaVersion || payload.schemaVersion || 0);
      if (!Number.isInteger(sourceVersion) || sourceVersion < 1 || sourceVersion > SCHEMA_VERSION) throw new Error('This backup schema version is unsupported.');
      const imported = normalizeState(payload);
      Storage.assertStateSize(imported);
      const before = stateSummary(state);
      const after = stateSummary(imported);
      const row = summary => Object.entries(summary).map(([key, value]) => `<span><strong>${value}</strong> ${escapeHTML(key)}</span>`).join('');
      openModal({
        kind: 'import-preview', kicker: 'DESTRUCTIVE IMPORT', title: 'Review Import Before Replacement', submitLabel: 'IMPORT AFTER BACKUP',
        data: { state: imported, fileName: file.name },
        html: `<div class="import-compare full-span"><article><h3>Current profile</h3>${row(before)}</article><article><h3>Imported profile</h3>${row(after)}</article></div><p class="muted-copy full-span">The current profile will be replaced only after a verified backup succeeds. Invalid or oversized data is rejected before mutation.</p>${modalField('Type IMPORT to confirm', 'confirmation', 'text', '', { required: true, full: true, maxlength: 6, autocomplete: 'off' })}`
      });
    } catch (error) {
      console.error('Import rejected:', error);
      toast('Import failed', error.message || 'This is not a valid Bawsala backup.', 'error');
    } finally {
      q('#importDataInput').value = '';
    }
  }

  function resetAllData() {
    openConfirmModal({
      title: 'Reset This Profile?',
      message: 'All study entities, history, rewards, and settings in the active profile will be replaced with a genuinely empty profile. A verified backup is mandatory first.',
      confirmation: 'RESET ALL',
      submitLabel: 'BACK UP AND RESET',
      action: async () => {
        await createLocalBackup('before full profile reset');
        state = seedState();
        selectedNoteId = null;
        reviewQueue = [];
        reviewAttempts = new Map();
        arena = { active: false, questions: [], index: 0, correct: 0, combo: 0, bestCombo: 0, answered: false, answers: [] };
        resetTimer();
        Storage.clearEmergencyDraft(activeNamespace);
        if (!await saveState()) return false;
        closeModal(true);
        renderAll();
        navigate('dashboard');
        toast('Profile reset', 'The active profile is empty. The previous copy is in Backups.', 'success');
        return true;
      }
    });
  }

  async function handleAction(target) {
    const { action, id } = target.dataset;
    if (action === 'toggle-quest') return toggleQuest(id);
    if (action === 'toggle-step') return toggleStep(target.dataset.questId, target.dataset.stepId, target.checked);
    if (action === 'start-quest') {
      navigate('focus');
      q('#focusQuestSelect').value = id;
      return;
    }
    if (action === 'edit-quest') return openQuestModal(state.quests.find(item => item.id === id));
    if (action === 'delete-quest') return deleteQuest(id);
    if (action === 'remove-distraction') {
      currentDistractions = currentDistractions.filter(item => item.id !== id);
      return renderDistractions();
    }
    if (action === 'edit-card') return openCardModal(state.cards.find(item => item.id === id));
    if (action === 'delete-card') return deleteCard(id);
    if (action === 'edit-question') return openQuestionModal(state.questions.find(item => item.id === id));
    if (action === 'delete-question') return deleteQuestion(id);
    if (action === 'load-more') {
      const list = target.dataset.list;
      const increments = { cards: 120, questions: 80, resources: 120 };
      if (!increments[list]) return;
      visibleLimits[list] += increments[list];
      if (list === 'cards') renderCardBrowser();
      else if (list === 'questions') renderQuestionBank();
      else renderLibrary();
      return;
    }
    if (action === 'edit-session') return openSessionModal(state.sessions.find(item => item.id === id));
    if (action === 'delete-session') return deleteSession(id);
    if (action === 'add-session-at') return openSessionModal(null, target.dataset.date, target.dataset.time);
    if (action === 'subject-cards') {
      navigate('flashcards');
      q('#cardSubjectFilter').value = target.dataset.subjectId || 'all';
      return renderFlashcards();
    }
    if (action === 'subject-notes') {
      q('#notesSearch').value = target.dataset.subject || '';
      navigate('notes');
      return renderNotes((target.dataset.subject || '').toLocaleLowerCase());
    }
    if (action === 'edit-subject') return openSubjectModal(state.subjects.find(item => item.id === id));
    if (action === 'delete-subject') return deleteSubject(id);
    if (action === 'open-resource') return openResource(id);
    if (action === 'edit-resource') return openResourceModal(state.resources.find(item => item.id === id));
    if (action === 'delete-resource') return deleteResource(id);
    if (action === 'resolve-cloud-conflict') return resolveCloudConflict(target.dataset.resolution);
    if (action === 'export-current-tab') return exportData();
    if (action === 'reload-local-state') {
      const record = await Storage.load(activeNamespace);
      if (record) {
        state = normalizeState(record.state); localRevision = record.revision; lastDurableState = clone(state);
        selectedNoteId = state.notes[0]?.id || null;
        cloudSync.pendingConflict = null;
        closeModal(true); renderAll();
        toast('Latest tab data loaded', `Local revision ${localRevision} is active.`, 'success');
      }
      return;
    }
    if (action === 'create-manual-backup') {
      await createLocalBackup('manual backup');
      closeModal(true);
      toast('Backup created', 'The backup was written and verified.', 'success');
      return openBackupManager();
    }
    if (action === 'download-local-backup') {
      const backup = backupCatalog.local.find(item => String(item.id) === String(id)) || await Storage.getBackup(id);
      if (backup) downloadJson(`bawsala-local-backup-${id}.json`, backupEnvelope(backup.state, { source: 'local-backup', reason: backup.reason, createdAt: backup.createdAt }));
      return;
    }
    if (action === 'restore-local-backup') {
      const backup = backupCatalog.local.find(item => String(item.id) === String(id)) || await Storage.getBackup(id);
      if (backup) return restoreBackupState(backup.state, `local backup from ${new Date(backup.createdAt).toLocaleString()}`);
      return;
    }
    if (action === 'delete-local-backup') {
      return openConfirmModal({ title: 'Delete Backup?', message: 'This recovery copy will be permanently removed.', submitLabel: 'DELETE BACKUP', action: async () => {
        await Storage.deleteBackup(id); closeModal(true); toast('Backup deleted', 'The selected recovery copy was removed.'); await openBackupManager(); return true;
      }});
    }
    if (action === 'download-cloud-backup') {
      const backup = backupCatalog.cloud.find(item => String(item.id) === String(id));
      if (backup) downloadJson(`bawsala-cloud-backup-${id}.json`, backupEnvelope(backup.state, { source: 'cloud-backup', revision: backup.revision, createdAt: backup.created_at }));
      return;
    }
    if (action === 'restore-cloud-backup') {
      const backup = backupCatalog.cloud.find(item => String(item.id) === String(id));
      if (backup) return restoreBackupState(backup.state, `cloud revision ${backup.revision}`);
      return;
    }
    if (action === 'skip-onboarding') {
      state.settings.onboardingDone = true;
      if (await saveState()) {
        closeModal(true);
        toast('Setup skipped', 'Open Settings at any time to edit your profile.', 'success');
      }
      return;
    }
    if (action === 'clear-notifications') {
      if (!state.notifications.length) return;
      state.notifications = [];
      if (await saveState()) renderNotifications();
      return;
    }
    if (action === 'close-modal') return closeModal();
  }

  function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const focusable = qa('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', container).filter(item => item.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function setSidebarOpen(open) {
    q('#sidebar').classList.toggle('open', open);
    q('#sidebarBackdrop')?.classList.toggle('hidden', !open);
    q('#menuButton')?.setAttribute('aria-expanded', String(open));
    if (open) q('#sidebar .nav-item')?.focus();
  }

  function bindEvents() {
    document.addEventListener('click', async event => {
      const actionTarget = event.target.closest('[data-action]');
      if (actionTarget) {
        try {
          await handleAction(actionTarget);
        } catch (error) {
          console.error('Action handler failed:', error);
          toast('Action failed', error?.message || 'An unexpected error occurred.', 'error');
        }
        return;
      }
      const routeTarget = event.target.closest('[data-route]');
      if (routeTarget) {
        navigate(routeTarget.dataset.route);
        return;
      }
      const noteTarget = event.target.closest('[data-note-id]');
      if (noteTarget) {
        flushNoteEditorToState();
        window.clearTimeout(noteSaveTimer);
        await saveState({ localOnly: true });
        selectedNoteId = noteTarget.dataset.noteId;
        renderNotes();
        return;
      }
      const searchTarget = event.target.closest('[data-search-index]');
      if (searchTarget) await openSearchItem(Number(searchTarget.dataset.searchIndex));
    });

    q('#menuButton')?.addEventListener('click', () => setSidebarOpen(!q('#sidebar').classList.contains('open')));
    q('#sidebarBackdrop')?.addEventListener('click', () => setSidebarOpen(false));
    q('#searchButton')?.addEventListener('click', openGlobalSearch);
    q('#closeSearchButton')?.addEventListener('click', closeGlobalSearch);
    q('#searchOverlay')?.addEventListener('click', event => { if (event.target === q('#searchOverlay')) closeGlobalSearch(); });
    q('#globalSearchInput')?.addEventListener('input', event => {
      searchSelection = 0;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => renderSearchResults(event.target.value), 120);
    });
    q('#globalSearchInput')?.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); searchSelection = clamp(searchSelection + 1, 0, Math.max(0, searchItems.length - 1)); renderSearchResults(event.currentTarget.value); }
      if (event.key === 'ArrowUp') { event.preventDefault(); searchSelection = clamp(searchSelection - 1, 0, Math.max(0, searchItems.length - 1)); renderSearchResults(event.currentTarget.value); }
      if (event.key === 'Enter') { event.preventDefault(); openSearchItem(searchSelection); }
    });

    q('#notificationButton')?.addEventListener('click', async () => {
      const panel = q('#notificationPanel');
      const opening = panel.classList.contains('hidden');
      panel.classList.toggle('hidden');
      if (opening) { await markNotificationsRead(); q('#closeNotifications')?.focus(); }
    });
    q('#closeNotifications')?.addEventListener('click', () => q('#notificationPanel').classList.add('hidden'));
    q('#cloudStatusButton')?.addEventListener('click', () => navigate('settings'));
    q('#quickFocusButton')?.addEventListener('click', () => navigate('focus'));
    q('#quickReviewButton')?.addEventListener('click', () => navigate('flashcards'));
    q('#challengeAction')?.addEventListener('click', () => { navigate('flashcards'); startReview(false); });
    q('#startDailyQuest')?.addEventListener('click', event => {
      const id = event.currentTarget.dataset.questId;
      if (!id) return navigate('quests');
      navigate('focus');
      q('#focusQuestSelect').value = id;
    });

    qa('#questFilters button').forEach(button => button.addEventListener('click', () => { questFilter = button.dataset.filter; renderQuests(); }));
    q('#addQuestButton')?.addEventListener('click', () => openQuestModal());
    q('#emptyAddQuest')?.addEventListener('click', () => openQuestModal());

    q('#startTimerButton')?.addEventListener('click', startPauseTimer);
    q('#resetTimerButton')?.addEventListener('click', resetTimer);
    q('#finishTimerButton')?.addEventListener('click', () => completeFocusSession(false));
    qa('#focusPresets button').forEach(button => button.addEventListener('click', () => setTimerMinutes(Number(button.dataset.minutes))));
    qa('#focusModeTabs button').forEach(button => button.addEventListener('click', () => setFocusMode(button.dataset.mode)));
    q('#addDistractionButton')?.addEventListener('click', addDistraction);
    q('#distractionInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addDistraction(); } });

    q('#cardSubjectFilter')?.addEventListener('change', renderFlashcards);
    q('#addCardButton')?.addEventListener('click', () => openCardModal());
    q('#browseCardsButton')?.addEventListener('click', () => q('#cardBrowser').classList.toggle('hidden'));
    q('#closeCardBrowser')?.addEventListener('click', () => q('#cardBrowser').classList.add('hidden'));
    q('#startReviewButton')?.addEventListener('click', () => startReview(false));
    q('#reviewAgainButton')?.addEventListener('click', () => startReview(true));
    q('#flashcard')?.addEventListener('click', flipReviewCard);
    qa('#ratingControls button').forEach(button => button.addEventListener('click', () => rateCard(button.dataset.rating)));

    q('#startArenaButton')?.addEventListener('click', startArena);
    q('#arenaReplayButton')?.addEventListener('click', () => {
      q('#arenaResult').classList.add('hidden'); q('#arenaIdle').classList.remove('hidden');
      q('#pixelBoss').classList.remove('defeated'); setPercentClass(q('#bossHpBar'), 'w-pct', 100); q('#bossHpText').textContent = '100 / 100';
    });
    q('#arenaSubmitButton')?.addEventListener('click', submitArenaAnswer);
    q('#arenaNextButton')?.addEventListener('click', nextArenaQuestion);
    q('#arenaHintButton')?.addEventListener('click', showArenaHint);
    q('#arenaAnswerInput')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); if (arena.answered) nextArenaQuestion(); else submitArenaAnswer(); }
    });
    q('#addQuestionButton')?.addEventListener('click', () => openQuestionModal());

    q('#addSessionButton')?.addEventListener('click', () => openSessionModal());
    q('#prevWeek')?.addEventListener('click', () => { plannerOffset -= 1; renderPlanner(); });
    q('#nextWeek')?.addEventListener('click', () => { plannerOffset += 1; renderPlanner(); });
    q('#todayButton')?.addEventListener('click', () => { plannerOffset = 0; renderPlanner(); });
    q('#calendarGrid')?.addEventListener('click', event => {
      const cell = event.target.closest('.calendar-cell[data-date]');
      if (cell && event.target === cell) openSessionModal(null, cell.dataset.date, cell.dataset.time);
    });
    q('#calendarGrid')?.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      const cell = event.target.closest('.calendar-cell[data-date]');
      if (cell) { event.preventDefault(); openSessionModal(null, cell.dataset.date, cell.dataset.time); }
    });

    q('#addSubjectButton')?.addEventListener('click', () => openSubjectModal());
    q('#addNoteButton')?.addEventListener('click', createNote);
    q('#notesSearch')?.addEventListener('input', event => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => renderNotes(event.target.value.trim().toLocaleLowerCase()), 120);
    });
    q('#noteTitleInput')?.addEventListener('input', scheduleNoteSave);
    q('#noteBodyInput')?.addEventListener('input', scheduleNoteSave);
    q('#noteSubjectSelect')?.addEventListener('change', scheduleNoteSave);
    q('#deleteNoteButton')?.addEventListener('click', deleteSelectedNote);
    q('#recallModeButton')?.addEventListener('click', openRecallMode);
    q('#closeRecallMode')?.addEventListener('click', () => q('#recallPanel').classList.add('hidden'));
    q('#revealNoteButton')?.addEventListener('click', toggleRecallOriginal);

    q('#librarySearch')?.addEventListener('input', () => {
      window.clearTimeout(searchTimer); searchTimer = window.setTimeout(renderLibrary, 120);
    });
    q('#addResourceButton')?.addEventListener('click', () => openResourceModal());

    q('#saveSettingsButton')?.addEventListener('click', saveProfile);
    q('#motionToggle')?.addEventListener('click', event => toggleSetting('reducedMotion', event.currentTarget));
    q('#soundToggle')?.addEventListener('click', event => toggleSetting('sound', event.currentTarget));
    q('#compactToggle')?.addEventListener('click', event => toggleSetting('compact', event.currentTarget));
    q('#contrastToggle')?.addEventListener('click', event => toggleSetting('highContrast', event.currentTarget));
    q('#themeSelect')?.addEventListener('change', event => setInterfaceSetting('theme', event.target.value));
    q('#languageSelect')?.addEventListener('change', event => setInterfaceSetting('language', event.target.value));
    q('#timezoneSelect')?.addEventListener('change', event => setInterfaceSetting('timeZone', event.target.value));
    q('#cloudSignInButton')?.addEventListener('click', () => openCloudAuthModal('signin'));
    q('#cloudSignUpButton')?.addEventListener('click', () => openCloudAuthModal('signup'));
    q('#cloudResetPasswordButton')?.addEventListener('click', () => openCloudAuthModal('reset'));
    q('#cloudSyncNowButton')?.addEventListener('click', () => syncCloudNow({ manual: true }));
    q('#cloudSignOutButton')?.addEventListener('click', cloudSignOut);
    q('#cloudDeleteAccountButton')?.addEventListener('click', openDeleteAccountModal);
    q('#copyLocalProfileButton')?.addEventListener('click', copyAnonymousProfileToAccount);
    q('#cloudCancelDeletionButton')?.addEventListener('click', async () => {
      try { await Cloud.cancelAccountDeletion(); toast('Deletion cancelled', 'The account is no longer scheduled for deletion.', 'success'); await initializeCloud(); }
      catch (error) { toast('Cancellation failed', error.message, 'error'); }
    });
    q('#exportDataButton')?.addEventListener('click', exportData);
    q('#backupManagerButton')?.addEventListener('click', openBackupManager);
    q('#importDataInput')?.addEventListener('change', event => importData(event.target.files[0]));
    q('#resetDataButton')?.addEventListener('click', resetAllData);

    q('#closeModalButton')?.addEventListener('click', () => closeModal());
    q('#modalBackdrop')?.addEventListener('click', event => { if (event.target === q('#modalBackdrop')) closeModal(); });
    q('#modalForm')?.addEventListener('submit', handleModalSubmit);
    q('#applyUpdateButton')?.addEventListener('click', () => {
      navigator.serviceWorker.getRegistration().then(registration => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' }));
    });
    q('#dismissUpdateButton')?.addEventListener('click', () => q('#updateBanner').classList.add('hidden'));

    window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
    window.addEventListener('pagehide', () => {
      flushNoteEditorToState();
      persistTimer();
    });
    window.addEventListener('online', () => {
      if (cloudSync.user) {
        setCloudStatus(cloudSync.dirty ? 'dirty' : 'syncing', 'Connection restored. Checking cloud state...');
        if (cloudSync.dirty) scheduleCloudSync(); else initializeCloud();
      }
    });
    window.addEventListener('offline', () => { if (cloudSync.user) setCloudStatus('offline', 'Offline. Changes remain safe on this device.'); });
    window.addEventListener('resize', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => { if (currentRoute === 'planner') renderPlanner(); }, 120);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushNoteEditorToState();
        saveState({ localOnly: true });
        persistTimer();
      } else tickTimer();
    });
    document.addEventListener('keydown', event => {
      if (!q('#modalBackdrop').classList.contains('hidden')) trapFocus(q('#modalBackdrop'), event);
      else if (!q('#searchOverlay').classList.contains('hidden')) trapFocus(q('#searchOverlay'), event);
      if (event.key === 'Escape') {
        if (!q('#searchOverlay').classList.contains('hidden')) closeGlobalSearch();
        else if (!q('#modalBackdrop').classList.contains('hidden')) closeModal();
        else if (!q('#notificationPanel').classList.contains('hidden')) q('#notificationPanel').classList.add('hidden');
        else setSidebarOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') { event.preventDefault(); openGlobalSearch(); }
      const tag = document.activeElement?.tagName || '';
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && /^[1-9]$/.test(event.key)) navigate(ROUTES[Number(event.key) - 1]);
    });
  }

  function showUpdateAvailable(registration) {
    if (!registration?.waiting) return;
    q('#updateBanner')?.classList.remove('hidden');
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      if (registration.waiting) showUpdateAvailable(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateAvailable(registration);
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) { reloading = true; location.reload(); }
      });
    } catch (error) {
      console.warn('Offline cache unavailable:', error);
    }
  }

  async function init() {
    bindEvents();
    window.addEventListener('error', event => {
      console.error('Unhandled application error:', event.error || event.message);
      if (stateReady) toast('Unexpected error', 'The current data remains in durable storage. Reload if this view stops responding.', 'error');
    });
    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled promise rejection:', event.reason);
      if (stateReady) toast('Operation failed', event.reason?.message || 'An asynchronous operation failed safely.', 'error');
    });

    try {
      if (!Storage) throw new Error('The safe storage module did not load.');
      await Storage.open();
      try {
        const migration = await Storage.migrateLegacy(normalizeState);
        if (migration.migrated) toast('Local data upgraded', 'Legacy data was moved into isolated transactional storage.', 'success');
      } catch (error) {
        console.error('Legacy migration issue:', error);
        toast('Recovery copy created', error.message || 'Corrupt legacy data was quarantined instead of replaced.', 'error');
      }
      const local = await switchNamespace('anonymous');
      stateReady = true;
      if (!local) await saveState({ localOnly: true, bootstrap: true });
      restoreTimer();
      applySettings();
      renderAll();
      const initialRoute = PAGE_META[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
      navigate(initialRoute);

      Storage.subscribe(async message => {
        if (message?.type !== 'saved' || message.namespace !== activeNamespace || Number(message.revision) <= localRevision) return;
        const editorUnsaved = q('#noteSavedStatus')?.textContent !== 'SAVED';
        if (editorUnsaved) {
          setCloudStatus('conflict', 'Another tab saved newer data while this note has unsaved edits. Export or reload deliberately.');
          return openLocalConflictModal(await Storage.load(activeNamespace));
        }
        const record = await Storage.load(activeNamespace);
        if (!record || Number(record.revision) <= localRevision) return;
        state = normalizeState(record.state);
        localRevision = record.revision;
        lastDurableState = clone(state);
        selectedNoteId = state.notes.some(item => item.id === selectedNoteId) ? selectedNoteId : state.notes[0]?.id || null;
        renderAll();
        toast('Updated from another tab', `Loaded local revision ${localRevision}.`, 'success');
      });

      let authResult = { user: null, event: null };
      if (cloudSync.configured) authResult = await Cloud.initialize();
      await initializeCloud(authResult.user);
      if (authResult.event === 'PASSWORD_RECOVERY') openCloudAuthModal('new-password');
      else if (!state.settings.onboardingDone && !hasMeaningfulData(state)) openOnboarding();
      Cloud?.onAuthStateChange?.((event, session) => {
        if (event === 'PASSWORD_RECOVERY') return openCloudAuthModal('new-password');
        if (event === 'SIGNED_OUT' && cloudSync.user) window.setTimeout(() => initializeCloud(null), 0);
        if (event === 'SIGNED_IN' && session?.user?.id !== cloudSync.user?.id) window.setTimeout(() => initializeCloud(session.user), 0);
      });
      await registerServiceWorker();
      q('#bootScreen')?.classList.add('done');
      window.setTimeout(() => q('#bootScreen')?.remove(), 0);
    } catch (error) {
      console.error('Initialization failed:', error);
      const boot = q('#bootScreen');
      if (boot) {
        boot.classList.add('boot-error');
        boot.innerHTML = `<div class="boot-logo">STARTUP FAILED</div><p>${escapeHTML(error.message || 'The application could not initialize safely.')}</p><button type="button" class="primary-button" id="retryBoot">RELOAD</button>`;
        boot.setAttribute('aria-hidden', 'false');
        q('#retryBoot')?.addEventListener('click', () => location.reload());
      }
    }
  }

  init();
})();

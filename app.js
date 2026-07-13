(() => {
  'use strict';

  const STORAGE_KEY = 'bawsala-study-os-v3';
  const OLD_STORAGE_KEY = 'bawsala-study-os-v2';
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
  const CLOUD_META_KEY = 'bawsala-cloud-sync-meta-v1';
  const LOCAL_BACKUP_PREFIX = 'bawsala-local-backup-';
  const Cloud = window.BawsalaBackend || null;
  const TURNSTILE_SITE_KEY = String(window.BAWSALA_CONFIG?.TURNSTILE_SITE_KEY || '').trim();

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const localISO = (date = new Date()) => {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 10);
  };
  const todayISO = () => localISO();
  const addDays = (dateString, days) => localISO(new Date(new Date(`${dateString}T12:00:00`).getTime() + days * DAY_MS));
  const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY_MS);
  const formatDate = date => date ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'No date';
  const formatTime = value => {
    if (!value) return 'Any time';
    const [hour, minute] = value.split(':').map(Number);
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute));
  };
  const formatMinutes = minutes => {
    const safe = Math.max(0, Math.round(Number(minutes) || 0));
    return safe >= 60 ? `${Math.floor(safe / 60)}h${safe % 60 ? ` ${safe % 60}m` : ''}` : `${safe}m`;
  };
  const normalizeAnswer = value => String(value || '').toLowerCase().replace(/[^a-z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
  const randomize = items => [...items].sort(() => Math.random() - 0.5);

  function seedState() {
    const now = todayISO();
    const at = offset => addDays(now, offset);
    return {
      profile: { name: 'PLAYER', avatar: 'J', totalXp: 6450, credits: 320, dailyGoal: 120 },
      quests: [
        { id: uid(), title: 'Finish Python functions lesson', description: 'Review parameters and return values, then write three practice functions.', subject: 'Python', priority: 'high', duration: 45, xp: 250, dueDate: at(0), completed: false, rewarded: false, createdAt: Date.now() - 300000, steps: [{ id: uid(), text: 'Read the lesson', done: true }, { id: uid(), text: 'Write three functions', done: false }, { id: uid(), text: 'Test edge cases', done: false }] },
        { id: uid(), title: 'Solve algebra practice set', description: 'Complete exercises 12–24 and record every mistake.', subject: 'Mathematics', priority: 'medium', duration: 35, xp: 180, dueDate: at(0), completed: false, rewarded: false, createdAt: Date.now() - 200000, steps: [] },
        { id: uid(), title: 'Review biology flashcards', description: 'Run one honest active-recall round for cell biology.', subject: 'Biology', priority: 'low', duration: 20, xp: 100, dueDate: at(1), completed: false, rewarded: false, createdAt: Date.now() - 100000, steps: [] },
        { id: uid(), title: 'Write weekly learning review', description: 'Summarize wins, blockers, and next-week priorities.', subject: 'General', priority: 'medium', duration: 25, xp: 140, dueDate: at(-1), completed: true, rewarded: true, completedAt: Date.now() - DAY_MS, createdAt: Date.now() - DAY_MS * 3, steps: [] }
      ],
      subjects: [
        { id: uid(), name: 'Python', symbol: 'PY', description: 'Programming fundamentals, problem solving, and small projects.', progress: 68, color: 'purple' },
        { id: uid(), name: 'Mathematics', symbol: 'Σ', description: 'Algebra, functions, geometry, and structured practice.', progress: 52, color: 'blue' },
        { id: uid(), name: 'Biology', symbol: 'BIO', description: 'Cell systems, genetics, terminology, and recall drills.', progress: 41, color: 'green' },
        { id: uid(), name: 'English', symbol: 'EN', description: 'Reading, writing, vocabulary, and communication.', progress: 73, color: 'blue' },
        { id: uid(), name: 'Computer Science', symbol: 'CS', description: 'Algorithms, systems, data structures, and concepts.', progress: 34, color: 'purple' },
        { id: uid(), name: 'General', symbol: 'XP', description: 'Planning, reviews, habits, and cross-subject work.', progress: 60, color: 'green' }
      ],
      sessions: [
        { id: uid(), title: 'Python deep work', subject: 'Python', date: at(0), time: '16:00', duration: 45, color: 'purple' },
        { id: uid(), title: 'Math problem set', subject: 'Mathematics', date: at(0), time: '18:00', duration: 35, color: 'blue' },
        { id: uid(), title: 'Biology recall', subject: 'Biology', date: at(1), time: '17:00', duration: 25, color: 'green' },
        { id: uid(), title: 'Weekly review', subject: 'General', date: at(3), time: '19:00', duration: 30, color: 'purple' }
      ],
      focusLog: [
        { id: uid(), date: at(-6), minutes: 30, xp: 60, mode: 'deep', distractions: 1 },
        { id: uid(), date: at(-5), minutes: 55, xp: 110, mode: 'deep', distractions: 2 },
        { id: uid(), date: at(-4), minutes: 45, xp: 90, mode: 'review', distractions: 0 },
        { id: uid(), date: at(-3), minutes: 80, xp: 160, mode: 'deep', distractions: 3 },
        { id: uid(), date: at(-2), minutes: 50, xp: 100, mode: 'sprint', distractions: 1 },
        { id: uid(), date: at(-1), minutes: 70, xp: 140, mode: 'deep', distractions: 1 }
      ],
      notes: [
        { id: uid(), title: 'Python Functions — Core Ideas', subject: 'Python', body: 'A function groups reusable behavior.\n\nKey checklist:\n- Give it one clear responsibility.\n- Use descriptive parameters.\n- Return values instead of printing when possible.\n- Test normal and edge cases.\n\nPractice: write a function that checks whether a number is prime.', updatedAt: Date.now() - 3600000 },
        { id: uid(), title: 'Algebra Error Log', subject: 'Mathematics', body: 'Common mistakes to watch:\n\n1. Sign errors when moving terms.\n2. Dividing only one side of an equation.\n3. Expanding brackets incorrectly.\n4. Skipping the final substitution check.', updatedAt: Date.now() - DAY_MS },
        { id: uid(), title: 'Cell Biology Recall Sheet', subject: 'Biology', body: 'Explain these without looking:\n\n- Cell membrane\n- Nucleus\n- Ribosome\n- Mitochondria\n- Diffusion and osmosis\n\nAny weak answer becomes a flashcard.', updatedAt: Date.now() - DAY_MS * 2 }
      ],
      resources: [
        { id: uid(), title: 'Python Documentation', type: 'Documentation', description: 'Language reference, tutorial, and standard library notes.', subject: 'Python', tags: ['python', 'reference'], url: 'https://docs.python.org/3/' },
        { id: uid(), title: 'Algebra Formula Sheet', type: 'PDF', description: 'A compact reference for identities, equations, and transformations.', subject: 'Mathematics', tags: ['math', 'formulas'], url: '' },
        { id: uid(), title: 'Biology Flashcard Deck', type: 'Anki', description: 'Active-recall deck covering cell biology and genetics.', subject: 'Biology', tags: ['biology', 'recall'], url: '' },
        { id: uid(), title: 'Algorithms Notes', type: 'Notes', description: 'Complexity, search, sorting, and common algorithm patterns.', subject: 'Computer Science', tags: ['cs', 'algorithms'], url: '' }
      ],
      cards: [
        { id: uid(), front: 'What does a Python function return when no return statement is used?', back: 'None', subject: 'Python', dueDate: at(0), interval: 1, ease: 2.5, reps: 0, lapses: 0 },
        { id: uid(), front: 'What is the difference between a parameter and an argument?', back: 'A parameter is the variable in the function definition; an argument is the value passed during a call.', subject: 'Python', dueDate: at(0), interval: 2, ease: 2.5, reps: 1, lapses: 0 },
        { id: uid(), front: 'State the distributive property.', back: 'a(b + c) = ab + ac', subject: 'Mathematics', dueDate: at(0), interval: 3, ease: 2.4, reps: 2, lapses: 1 },
        { id: uid(), front: 'What organelle produces most cellular ATP?', back: 'The mitochondrion.', subject: 'Biology', dueDate: at(0), interval: 1, ease: 2.5, reps: 0, lapses: 0 },
        { id: uid(), front: 'What is osmosis?', back: 'The movement of water across a selectively permeable membrane from lower solute concentration to higher solute concentration.', subject: 'Biology', dueDate: at(1), interval: 4, ease: 2.6, reps: 2, lapses: 0 },
        { id: uid(), front: 'What is the time complexity of binary search?', back: 'O(log n)', subject: 'Computer Science', dueDate: at(0), interval: 6, ease: 2.5, reps: 3, lapses: 0 }
      ],
      reviewLog: [],
      questions: [
        { id: uid(), prompt: 'What value does Python return implicitly when a function has no return statement?', answer: 'None', accepted: ['none'], subject: 'Python', hint: 'It is a special null-like value.' },
        { id: uid(), prompt: 'What keyword defines a function in Python?', answer: 'def', accepted: ['def'], subject: 'Python', hint: 'Three letters.' },
        { id: uid(), prompt: 'Simplify: 3(x + 4)', answer: '3x + 12', accepted: ['3x + 12', '3x+12'], subject: 'Mathematics', hint: 'Distribute 3 to both terms.' },
        { id: uid(), prompt: 'Solve for x: 2x + 6 = 14', answer: '4', accepted: ['4', 'x = 4', 'x=4'], subject: 'Mathematics', hint: 'Subtract 6, then divide by 2.' },
        { id: uid(), prompt: 'Which organelle contains most of a eukaryotic cell’s genetic material?', answer: 'Nucleus', accepted: ['nucleus', 'the nucleus'], subject: 'Biology', hint: 'It acts like the cell’s control center.' },
        { id: uid(), prompt: 'What process moves water across a selectively permeable membrane?', answer: 'Osmosis', accepted: ['osmosis'], subject: 'Biology', hint: 'It starts with O.' },
        { id: uid(), prompt: 'What data structure follows LIFO order?', answer: 'Stack', accepted: ['stack', 'a stack'], subject: 'Computer Science', hint: 'Last in, first out.' },
        { id: uid(), prompt: 'What is the worst-case time complexity of linear search?', answer: 'O(n)', accepted: ['o(n)', 'on', 'linear'], subject: 'Computer Science', hint: 'It may inspect every item.' },
        { id: uid(), prompt: 'What is the past tense of “go”?', answer: 'Went', accepted: ['went'], subject: 'English', hint: 'It is irregular.' },
        { id: uid(), prompt: 'Name one purpose of a weekly review.', answer: 'Identify progress and adjust the next plan.', accepted: ['identify progress', 'adjust the plan', 'review progress', 'plan next week'], subject: 'General', hint: 'Look backward to plan forward.' }
      ],
      arenaRuns: [],
      challengeClaims: [],
      settings: { reducedMotion: false, sound: false, compact: false },
      notifications: [
        { id: uid(), title: 'Daily route generated', message: 'One priority quest, one focus block, and one recall round are ready.', time: 'Now' },
        { id: uid(), title: 'Memory queue ready', message: 'Due flashcards are waiting in the Memory Forge.', time: 'Today' }
      ]
    };
  }

  function migrateLegacy(legacy) {
    const base = seedState();
    if (!legacy || typeof legacy !== 'object') return base;
    const migrated = { ...base, ...legacy };
    migrated.profile = { ...base.profile, ...(legacy.profile || {}), avatar: legacy.profile?.avatar || String(legacy.profile?.name || 'J').slice(0, 1).toUpperCase(), credits: legacy.profile?.credits ?? 320 };
    migrated.settings = { ...base.settings, ...(legacy.settings || {}) };
    migrated.quests = Array.isArray(legacy.quests) ? legacy.quests.map(item => ({ rewarded: Boolean(item.completed), steps: [], ...item })) : base.quests;
    for (const key of ['subjects', 'sessions', 'focusLog', 'notes', 'resources', 'notifications']) {
      if (!Array.isArray(migrated[key])) migrated[key] = base[key];
    }
    migrated.cards = Array.isArray(legacy.cards) ? legacy.cards : base.cards;
    migrated.reviewLog = Array.isArray(legacy.reviewLog) ? legacy.reviewLog : [];
    migrated.questions = Array.isArray(legacy.questions) ? legacy.questions : base.questions;
    migrated.arenaRuns = Array.isArray(legacy.arenaRuns) ? legacy.arenaRuns : [];
    migrated.challengeClaims = Array.isArray(legacy.challengeClaims) ? legacy.challengeClaims : [];
    return migrated;
  }

  function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function safeText(value, max = 500) {
    return String(value ?? '').replace(/\u0000/g, '').slice(0, max);
  }

  function safeId(value) {
    const candidate = String(value ?? '');
    return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : uid();
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
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
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
    const colors = ['purple', 'blue', 'green'];
    const resourceTypes = ['Documentation', 'PDF', 'Book', 'Course', 'Video', 'Notes', 'Anki', 'Other'];

    return {
      profile: {
        name: safeText(profile.name || fallback.profile.name, 20).trim() || 'PLAYER',
        avatar: safeText(profile.avatar || fallback.profile.avatar, 2).trim().toUpperCase() || 'J',
        totalXp: Math.round(safeNumber(profile.totalXp, 0, 100000000, fallback.profile.totalXp)),
        credits: Math.round(safeNumber(profile.credits, 0, 100000000, fallback.profile.credits)),
        dailyGoal: Math.round(safeNumber(profile.dailyGoal, 15, 600, fallback.profile.dailyGoal))
      },
      quests: sanitizeList(source.quests, fallback.quests, 1200, item => ({
        id: safeId(item.id),
        title: safeText(item.title, 180).trim() || 'Untitled quest',
        description: safeText(item.description, 4000),
        subject: safeText(item.subject, 100).trim() || 'General',
        priority: safeEnum(item.priority, ['high', 'medium', 'low'], 'medium'),
        duration: Math.round(safeNumber(item.duration, 5, 480, 25)),
        xp: Math.round(safeNumber(item.xp, 10, 1000, 100)),
        dueDate: safeDate(item.dueDate, ''),
        completed: Boolean(item.completed),
        rewarded: Boolean(item.rewarded || item.completed),
        createdAt: safeTimestamp(item.createdAt),
        completedAt: item.completedAt ? safeTimestamp(item.completedAt) : null,
        steps: sanitizeList(item.steps, [], 100, step => ({
          id: safeId(step.id),
          text: safeText(step.text, 500).trim() || 'Step',
          done: Boolean(step.done)
        }))
      })),
      subjects: sanitizeList(source.subjects, fallback.subjects, 150, item => ({
        id: safeId(item.id),
        name: safeText(item.name, 100).trim() || 'General',
        symbol: safeText(item.symbol, 3).trim().toUpperCase() || 'XP',
        description: safeText(item.description, 2000),
        progress: Math.round(safeNumber(item.progress, 0, 100, 0)),
        color: safeEnum(item.color, colors, 'purple')
      })),
      sessions: sanitizeList(source.sessions, fallback.sessions, 3000, item => ({
        id: safeId(item.id),
        title: safeText(item.title, 180).trim() || 'Study session',
        subject: safeText(item.subject, 100).trim() || 'General',
        date: safeDate(item.date, todayISO()),
        time: safeTime(item.time),
        duration: Math.round(safeNumber(item.duration, 5, 480, 25)),
        color: safeEnum(item.color, colors, 'purple')
      })),
      focusLog: sanitizeList(source.focusLog, fallback.focusLog, 15000, item => ({
        id: safeId(item.id),
        date: safeDate(item.date, todayISO()),
        minutes: Math.round(safeNumber(item.minutes, 0, 1440, 0)),
        xp: Math.round(safeNumber(item.xp, 0, 10000, 0)),
        mode: safeEnum(item.mode, ['sprint', 'deep', 'review'], 'deep'),
        questId: item.questId ? safeId(item.questId) : '',
        note: safeText(item.note, 3000),
        proof: safeText(item.proof, 3000),
        distractions: Math.round(safeNumber(item.distractions, 0, 1000, 0)),
        createdAt: safeTimestamp(item.createdAt)
      })),
      notes: sanitizeList(source.notes, fallback.notes, 1200, item => ({
        id: safeId(item.id),
        title: safeText(item.title, 240).trim() || 'Untitled note',
        subject: safeText(item.subject, 100).trim() || 'General',
        body: safeText(item.body, 200000),
        updatedAt: safeTimestamp(item.updatedAt)
      })),
      resources: sanitizeList(source.resources, fallback.resources, 1500, item => ({
        id: safeId(item.id),
        title: safeText(item.title, 240).trim() || 'Untitled resource',
        type: safeEnum(item.type, resourceTypes, 'Other'),
        description: safeText(item.description, 5000),
        subject: safeText(item.subject, 100).trim() || 'General',
        tags: (Array.isArray(item.tags) ? item.tags : []).slice(0, 40).map(tag => safeText(tag, 60).trim()).filter(Boolean),
        url: safeUrl(item.url)
      })),
      cards: sanitizeList(source.cards, fallback.cards, 8000, item => ({
        id: safeId(item.id),
        front: safeText(item.front, 4000).trim() || 'Empty prompt',
        back: safeText(item.back, 8000).trim() || 'Empty answer',
        subject: safeText(item.subject, 100).trim() || 'General',
        dueDate: safeDate(item.dueDate, todayISO()),
        interval: Math.round(safeNumber(item.interval, 1, 36500, 1)),
        ease: safeNumber(item.ease, 1.3, 4, 2.5),
        reps: Math.round(safeNumber(item.reps, 0, 100000, 0)),
        lapses: Math.round(safeNumber(item.lapses, 0, 100000, 0))
      })),
      reviewLog: sanitizeList(source.reviewLog, [], 30000, item => ({
        id: safeId(item.id),
        cardId: item.cardId ? safeId(item.cardId) : '',
        date: safeDate(item.date, todayISO()),
        rating: safeEnum(item.rating, ['again', 'hard', 'good', 'easy'], 'again'),
        subject: safeText(item.subject, 100).trim() || 'General'
      })),
      questions: sanitizeList(source.questions, fallback.questions, 8000, item => ({
        id: safeId(item.id),
        prompt: safeText(item.prompt, 5000).trim() || 'Untitled question',
        answer: safeText(item.answer, 5000).trim() || 'No answer',
        accepted: (Array.isArray(item.accepted) ? item.accepted : []).slice(0, 50).map(answer => safeText(answer, 500).trim()).filter(Boolean),
        subject: safeText(item.subject, 100).trim() || 'General',
        hint: safeText(item.hint, 2000)
      })),
      arenaRuns: sanitizeList(source.arenaRuns, [], 15000, item => ({
        id: safeId(item.id),
        date: safeDate(item.date, todayISO()),
        correct: Math.round(safeNumber(item.correct, 0, 1000, 0)),
        total: Math.round(safeNumber(item.total, 0, 1000, 0)),
        bestCombo: Math.round(safeNumber(item.bestCombo, 0, 1000, 0)),
        xp: Math.round(safeNumber(item.xp, 0, 100000, 0))
      })),
      challengeClaims: [...new Set((Array.isArray(source.challengeClaims) ? source.challengeClaims : []).slice(0, 5000).map(date => safeDate(date, '')).filter(Boolean))],
      settings: {
        reducedMotion: Boolean(settings.reducedMotion),
        sound: Boolean(settings.sound),
        compact: Boolean(settings.compact)
      },
      notifications: sanitizeList(source.notifications, fallback.notifications, 100, item => ({
        id: safeId(item.id),
        title: safeText(item.title, 180).trim() || 'Notification',
        message: safeText(item.message, 2000),
        time: safeText(item.time, 80)
      }))
    };
  }

  function loadState() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return normalizeState(JSON.parse(current));
      const legacy = localStorage.getItem(OLD_STORAGE_KEY);
      if (legacy) {
        const migrated = migrateLegacy(JSON.parse(legacy));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return normalizeState(migrated);
      }
      return seedState();
    } catch (error) {
      console.error('Failed to load data:', error);
      return seedState();
    }
  }

  let state = loadState();
  let currentRoute = 'dashboard';
  let questFilter = 'all';
  let plannerOffset = 0;
  let selectedNoteId = state.notes[0]?.id || null;
  let noteSaveTimer = null;
  let modalContext = null;
  let searchSelection = 0;
  let searchItems = [];
  let audioContext = null;
  let turnstileLoadPromise = null;
  let turnstileWidgetId = null;
  let currentDistractions = [];
  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewStats = { reviewed: 0, remembered: 0 };
  let reviewAllMode = false;
  let arena = { active: false, questions: [], index: 0, correct: 0, combo: 0, bestCombo: 0, answered: false };

  const timer = { duration: 25 * 60, remaining: 25 * 60, running: false, interval: null, mode: 'deep' };
  const cloudSync = {
    configured: Boolean(Cloud?.isConfigured?.()),
    user: null,
    revision: 0,
    dirty: false,
    syncing: false,
    status: 'local',
    detail: '',
    timer: null,
    pendingConflict: null,
    localChangeVersion: 0
  };

  function readCloudMeta() {
    try {
      const value = JSON.parse(localStorage.getItem(CLOUD_META_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  function writeCloudMeta() {
    if (!cloudSync.user?.id) return;
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({
      userId: cloudSync.user.id,
      revision: Number(cloudSync.revision || 0),
      dirty: Boolean(cloudSync.dirty),
      syncedAt: Date.now()
    }));
  }

  function createLocalBackup(reason = 'automatic') {
    try {
      const key = `${LOCAL_BACKUP_PREFIX}${Date.now()}`;
      localStorage.setItem(key, JSON.stringify({ reason, createdAt: new Date().toISOString(), state }));
      Object.keys(localStorage)
        .filter(item => item.startsWith(LOCAL_BACKUP_PREFIX))
        .sort()
        .slice(0, -3)
        .forEach(item => localStorage.removeItem(item));
      return key;
    } catch (error) {
      console.warn('Could not create local backup:', error);
      return null;
    }
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

    const labels = {
      local: 'LOCAL', signed_out: 'LOCAL', dirty: 'PENDING', syncing: 'SYNCING',
      synced: 'SYNCED', offline: 'OFFLINE', error: 'ERROR', conflict: 'CONFLICT'
    };
    chip.dataset.status = cloudSync.status;
    card.dataset.status = cloudSync.status;
    chipText.textContent = labels[cloudSync.status] || 'LOCAL';

    const signedIn = Boolean(cloudSync.user);
    q('#cloudSignedOutActions')?.classList.toggle('hidden', signedIn);
    q('#cloudSignedInActions')?.classList.toggle('hidden', !signedIn);

    if (!cloudSync.configured) {
      title.textContent = 'Cloud sync is not configured';
      detail.textContent = 'Add your Supabase project URL and publishable key in config.js.';
      q('#cloudSignedOutActions')?.classList.add('hidden');
      return;
    }
    if (!signedIn) {
      title.textContent = 'Local-only mode';
      detail.textContent = cloudSync.detail || 'Sign in to sync this device securely.';
      return;
    }
    title.textContent = cloudSync.status === 'conflict' ? 'Sync conflict needs a decision' : (cloudSync.user.email || 'Cloud account connected');
    detail.textContent = cloudSync.detail || `Revision ${cloudSync.revision || 0} · local-first sync enabled.`;
  }

  function scheduleCloudSync() {
    if (!cloudSync.configured || !cloudSync.user || cloudSync.pendingConflict) return;
    window.clearTimeout(cloudSync.timer);
    const delay = clamp(Number(window.BAWSALA_CONFIG?.SYNC_DEBOUNCE_MS) || 1400, 500, 10000);
    cloudSync.timer = window.setTimeout(() => syncCloudNow(), delay);
  }

  function saveState(options = {}) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (!options.localOnly) {
        cloudSync.localChangeVersion += 1;
        if (cloudSync.user) {
          cloudSync.dirty = true;
          writeCloudMeta();
          setCloudStatus(navigator.onLine ? 'dirty' : 'offline', navigator.onLine ? 'Changes are waiting to sync.' : 'Changes are safe locally and will sync when online.');
          scheduleCloudSync();
        }
      }
    } catch (error) {
      console.error('Failed to save data:', error);
      toast('Storage error', 'Your changes could not be saved in this browser.', 'error');
    }
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
    return state.cards.filter(card => (subject === 'all' || card.subject === subject) && (includeFuture || !card.dueDate || card.dueDate <= todayISO()));
  }

  function getRetention() {
    if (!state.reviewLog.length) return 0;
    const remembered = state.reviewLog.filter(item => item.rating !== 'again').length;
    return Math.round(remembered / state.reviewLog.length * 100);
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
    if (!xp && !currency) return;
    const before = getLevelData().level;
    state.profile.totalXp += xp;
    state.profile.credits += currency;
    const after = getLevelData().level;
    saveState();
    if (after > before) {
      toast(`Level ${after} unlocked`, `${reason} pushed you to the next rank.`, 'success');
      notify('Level up', `You reached level ${after}.`);
      beep(760, .16);
    } else {
      toast(`+${xp} XP${currency ? ` · +${currency} credits` : ''}`, reason, 'success');
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
    state.notifications.unshift({ id: uid(), title, message, time: 'Now' });
    state.notifications = state.notifications.slice(0, 30);
    saveState();
    renderNotifications();
  }

  function toast(title, message, type = '') {
    const element = document.createElement('div');
    element.className = `toast ${type}`.trim();
    element.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span>`;
    q('#toastRegion').appendChild(element);
    window.setTimeout(() => element.remove(), 3800);
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
    renderDashboard();
    renderQuests();
    renderFocus();
    renderFlashcards();
    renderArena();
    renderPlanner();
    renderSubjects();
    renderNotes();
    renderLibrary();
    renderStats();
    renderSettings();
    renderNotifications();
  }

  function renderSidebar() {
    const level = getLevelData();
    const avatar = String(state.profile.avatar || state.profile.name || 'J').slice(0, 2).toUpperCase();
    q('#sidebarPlayerName').textContent = state.profile.name || 'PLAYER';
    q('#sidebarAvatar').textContent = avatar;
    q('#sidebarLevel').textContent = level.level;
    q('#sidebarXpText').textContent = `${level.xp} / 1000 XP`;
    q('#sidebarXpBar').style.width = `${level.xp / 10}%`;
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
    if (progress >= 5 && !state.challengeClaims.includes(date)) {
      state.challengeClaims.push(date);
      awardXp(100, 'Daily Recall Rush completed', 20);
      notify('Daily challenge cleared', 'Five honest flashcard reviews completed.');
    }
  }

  function renderDashboard() {
    checkDailyChallenge();
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
    q('#dashboardXpBar').style.width = `${level.xp / 10}%`;
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
    q('#challengeProgressBar').style.width = `${challengeProgress / 5 * 100}%`;
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
      ${item.steps.length ? `<div class="quest-steps">${item.steps.map(step => `<label class="step-row ${step.done ? 'done' : ''}"><input type="checkbox" data-action="toggle-step" data-quest-id="${item.id}" data-step-id="${step.id}" ${step.done ? 'checked' : ''}><span>${escapeHTML(step.text)}</span></label>`).join('')}</div><div class="quest-progress"><span style="width:${progress}%"></span></div>` : ''}
      <div class="quest-actions"><button data-action="start-quest" data-id="${item.id}">FOCUS</button><button data-action="edit-quest" data-id="${item.id}">EDIT</button><button data-action="delete-quest" data-id="${item.id}">DELETE</button></div>
    </article>`;
  }

  function toggleQuest(id) {
    const item = state.quests.find(quest => quest.id === id);
    if (!item) return;
    item.completed = !item.completed;
    item.completedAt = item.completed ? Date.now() : null;
    if (item.completed && !item.rewarded) {
      item.rewarded = true;
      awardXp(item.xp, `Quest cleared: ${item.title}`, Math.max(5, Math.round(item.xp / 20)));
    } else {
      saveState();
      toast(item.completed ? 'Quest cleared' : 'Quest reopened', item.title, item.completed ? 'success' : '');
    }
    renderAll();
  }

  function toggleStep(questId, stepId, checked) {
    const quest = state.quests.find(item => item.id === questId);
    const step = quest?.steps.find(item => item.id === stepId);
    if (!step) return;
    step.done = checked;
    saveState();
    renderQuests();
    renderDashboard();
  }

  function deleteQuest(id) {
    const item = state.quests.find(quest => quest.id === id);
    if (!item || !confirm(`Delete “${item.title}”?`)) return;
    state.quests = state.quests.filter(quest => quest.id !== id);
    saveState();
    renderAll();
    toast('Quest deleted', 'The mission was removed.');
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

  function setTimerMinutes(minutes) {
    if (timer.running) return toast('Timer is running', 'Pause or reset before changing duration.', 'error');
    timer.duration = clamp(Number(minutes) || 25, 1, 240) * 60;
    timer.remaining = timer.duration;
    qa('#focusPresets button').forEach(button => button.classList.toggle('active', Number(button.dataset.minutes) === Number(minutes)));
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
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    q('#timerDisplay').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    q('#timerState').textContent = timer.running ? 'FOCUSING' : (timer.remaining < timer.duration ? 'PAUSED' : 'READY');
    q('#startTimerButton').textContent = timer.running ? 'PAUSE' : (timer.remaining < timer.duration ? 'RESUME' : 'START');
    const elapsed = timer.duration ? (timer.duration - timer.remaining) / timer.duration : 0;
    q('#timerRing').style.setProperty('--progress', `${elapsed * 360}deg`);
    document.title = timer.running ? `${q('#timerDisplay').textContent} · Bawsala` : 'Bawsala Study OS';
  }

  function startPauseTimer() {
    if (timer.running) {
      clearInterval(timer.interval);
      timer.interval = null;
      timer.running = false;
      updateTimerDisplay();
      return;
    }
    timer.running = true;
    updateTimerDisplay();
    timer.interval = window.setInterval(() => {
      timer.remaining = Math.max(0, timer.remaining - 1);
      updateTimerDisplay();
      if (timer.remaining <= 0) completeFocusSession(true);
    }, 1000);
  }

  function resetTimer() {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
    timer.remaining = timer.duration;
    updateTimerDisplay();
    toast('Timer reset', 'The current run was not logged.');
  }

  function completeFocusSession(natural = false) {
    const elapsedSeconds = natural ? timer.duration : timer.duration - timer.remaining;
    const minutes = Math.round(elapsedSeconds / 60);
    if (minutes < 1) return toast('Nothing to log', 'Complete at least one focused minute.', 'error');
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
    const rate = timer.mode === 'sprint' ? 3 : 2;
    const xp = minutes * rate;
    const questId = q('#focusQuestSelect').value || '';
    const quest = state.quests.find(item => item.id === questId);
    state.focusLog.push({
      id: uid(), date: todayISO(), minutes, xp, mode: timer.mode, questId,
      note: q('#sessionNote').value.trim(), proof: q('#sessionProof').value.trim(),
      distractions: currentDistractions.length, createdAt: Date.now()
    });
    timer.remaining = timer.duration;
    currentDistractions = [];
    q('#sessionNote').value = '';
    q('#sessionProof').value = '';
    awardXp(xp, `${minutes}-minute ${timer.mode} session`, Math.max(2, Math.round(minutes / 5)));
    if (quest && !quest.completed) notify('Focus evidence logged', `Return to “${quest.title}” and clear it only when the proof is complete.`);
    renderAll();
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
    select.innerHTML = `${includeAll ? '<option value="all">All subjects</option>' : ''}${state.subjects.map(item => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join('')}`;
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  function renderFlashcards() {
    const subjectSelect = q('#cardSubjectFilter');
    const selected = subjectSelect.value || 'all';
    populateSubjectSelect(subjectSelect, true, selected);
    const due = getDueCards(selected).length;
    const total = state.cards.filter(card => selected === 'all' || card.subject === selected).length;
    const mature = state.cards.filter(card => (selected === 'all' || card.subject === selected) && Number(card.interval) >= 14).length;
    q('#flashcardStats').innerHTML = [
      ['DUE NOW', due], ['TOTAL CARDS', total], ['MATURE CARDS', mature], ['RETENTION', `${getRetention()}%`]
    ].map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
    q('#memoryRetention').textContent = `${getRetention()}%`;
    q('#memoryRetentionBar').style.width = `${getRetention()}%`;
    renderCardBrowser();
  }

  function startReview(all = false) {
    const subject = q('#cardSubjectFilter').value || 'all';
    reviewAllMode = all;
    reviewQueue = randomize(getDueCards(subject, all));
    reviewIndex = 0;
    reviewStats = { reviewed: 0, remembered: 0 };
    if (!reviewQueue.length) {
      q('#reviewPlaceholder').classList.remove('hidden');
      q('#reviewCardWrap').classList.add('hidden');
      q('#reviewComplete').classList.add('hidden');
      q('#reviewPlaceholder h3').textContent = all ? 'No cards in this deck' : 'Review queue cleared';
      q('#reviewPlaceholder p').textContent = all ? 'Add cards before starting a review.' : 'There are no due cards for this subject. Do not manufacture busywork.';
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

  function rateCard(rating) {
    const card = reviewQueue[reviewIndex];
    if (!card || !['again', 'hard', 'good', 'easy'].includes(rating)) return;
    const today = todayISO();
    const oldInterval = Math.max(1, Number(card.interval) || 1);
    if (rating === 'again') {
      card.interval = 1;
      card.ease = Math.max(1.3, Number(card.ease || 2.5) - .2);
      card.reps = 0;
      card.lapses = Number(card.lapses || 0) + 1;
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
    card.dueDate = addDays(today, card.interval);
    card.lastRating = rating;
    card.lastReviewed = Date.now();
    reviewStats.reviewed += 1;
    state.reviewLog.push({ id: uid(), cardId: card.id, date: today, rating, subject: card.subject });
    const xp = { again: 2, hard: 5, good: 8, easy: 10 }[rating];
    state.profile.totalXp += xp;
    state.profile.credits += Math.max(1, Math.round(xp / 3));
    saveState();
    reviewIndex += 1;
    checkDailyChallenge();
    if (reviewIndex >= reviewQueue.length) completeReview();
    else showReviewCard();
    renderSidebar();
    renderDashboard();
  }

  function completeReview() {
    q('#reviewCardWrap').classList.add('hidden');
    q('#reviewPlaceholder').classList.add('hidden');
    q('#reviewComplete').classList.remove('hidden');
    const accuracy = reviewStats.reviewed ? Math.round(reviewStats.remembered / reviewStats.reviewed * 100) : 0;
    q('#reviewCompleteText').textContent = `${reviewStats.reviewed} cards reviewed · ${accuracy}% remembered. Honest failures are useful data.`;
    if (reviewStats.reviewed) {
      notify('Memory run complete', `${reviewStats.reviewed} cards reviewed with ${accuracy}% retention.`);
      beep(680, .12);
    }
    renderFlashcards();
    renderStats();
  }

  function renderCardBrowser() {
    const query = '';
    const selected = q('#cardSubjectFilter').value || 'all';
    const items = state.cards.filter(card => selected === 'all' || card.subject === selected);
    q('#cardList').innerHTML = items.length ? items.map(card => `<div class="card-list-item"><div><strong>${escapeHTML(card.front)}</strong><span>${escapeHTML(card.subject)} · Due ${formatDate(card.dueDate)} · Interval ${card.interval}d</span></div><div class="card-list-actions"><button data-action="edit-card" data-id="${card.id}">EDIT</button><button data-action="delete-card" data-id="${card.id}">×</button></div></div>`).join('') : '<div class="empty-state"><div class="empty-icon">▣</div><h3>No cards</h3><p>Add only facts or procedures worth remembering.</p></div>';
  }

  function deleteCard(id) {
    const card = state.cards.find(item => item.id === id);
    if (!card || !confirm(`Delete this flashcard?\n\n${card.front}`)) return;
    state.cards = state.cards.filter(item => item.id !== id);
    saveState();
    renderFlashcards();
    toast('Card deleted', 'The memory item was removed.');
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
  }

  function startArena() {
    const subject = q('#arenaSubjectSelect').value || 'all';
    const pool = state.questions.filter(item => subject === 'all' || item.subject === subject);
    if (!pool.length) return toast('No questions available', 'Add questions for this subject first.', 'error');
    arena = {
      active: true,
      questions: randomize(pool).slice(0, Math.min(5, pool.length)),
      index: 0,
      correct: 0,
      combo: 0,
      bestCombo: 0,
      answered: false
    };
    q('#arenaIdle').classList.add('hidden');
    q('#arenaResult').classList.add('hidden');
    q('#arenaQuestion').classList.remove('hidden');
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
    const accepted = [question.answer, ...(question.accepted || [])].map(normalizeAnswer);
    return accepted.some(value => value === normalized || (value.length > 8 && normalized.includes(value)));
  }

  function submitArenaAnswer() {
    if (!arena.active || arena.answered) return;
    const question = arena.questions[arena.index];
    const answer = q('#arenaAnswerInput').value.trim();
    if (!answer) return toast('Answer required', 'Commit to an answer before checking.', 'error');
    const correct = isArenaAnswerCorrect(question, answer);
    arena.answered = true;
    q('#arenaAnswerInput').disabled = true;
    q('#arenaSubmitButton').classList.add('hidden');
    q('#arenaNextButton').classList.remove('hidden');
    q('#arenaHintButton').disabled = true;
    const feedback = q('#arenaFeedback');
    feedback.classList.remove('hidden');
    feedback.classList.add(correct ? 'correct' : 'wrong');
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
    const total = Math.max(1, arena.questions.length || 5);
    const answered = arena.index + (arena.answered ? 1 : 0);
    const damage = arena.correct * (100 / total);
    const hp = Math.max(0, Math.round(100 - damage));
    q('#bossHpText').textContent = `${hp} / 100`;
    q('#bossHpBar').style.width = `${hp}%`;
    q('#pixelBoss').style.opacity = hp === 0 ? '.25' : '1';
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

  function finishArena() {
    const total = arena.questions.length;
    const correct = arena.correct;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    const won = correct >= Math.ceil(total * .6);
    const xp = correct * 45 + arena.bestCombo * 8;
    const credits = correct * 5;
    state.arenaRuns.push({ id: uid(), date: todayISO(), correct, total, bestCombo: arena.bestCombo, xp });
    awardXp(xp, won ? 'Knowledge Guardian defeated' : 'Arena practice completed', credits);
    q('#arenaQuestion').classList.add('hidden');
    q('#arenaIdle').classList.add('hidden');
    q('#arenaResult').classList.remove('hidden');
    q('#arenaResultTitle').textContent = won ? 'Guardian defeated' : 'Guardian survived';
    q('#arenaResultText').textContent = won ? `Accuracy ${accuracy}%. The damage came from retrieval, not recognition.` : `Accuracy ${accuracy}%. Review weak answers, then return.`;
    q('#arenaResultScore').textContent = `${correct} / ${total}`;
    arena.active = false;
    updateBossHp();
    renderSidebar();
    renderDashboard();
    renderStats();
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
    q('#plannerRange').textContent = `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(start)} — ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(end)}`;
    const weekDates = Array.from({ length: 7 }, (_, index) => localISO(new Date(start.getTime() + index * DAY_MS)));
    const weekSessions = state.sessions.filter(item => weekDates.includes(item.date));
    const totalMinutes = weekSessions.reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const busiest = weekDates.map(date => ({ date, minutes: weekSessions.filter(item => item.date === date).reduce((sum, item) => sum + Number(item.duration || 0), 0) })).sort((a, b) => b.minutes - a.minutes)[0];
    const unscheduled = state.quests.filter(item => !item.completed && !state.sessions.some(session => session.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 12)))).length;
    q('#plannerInsights').innerHTML = [
      ['PLANNED TIME', formatMinutes(totalMinutes)],
      ['BUSIEST DAY', busiest?.minutes ? `${formatDate(busiest.date)} · ${formatMinutes(busiest.minutes)}` : 'None'],
      ['UNSCHEDULED QUESTS', unscheduled]
    ].map(([label, value]) => `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');

    const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    let html = '<div class="calendar-head"></div>';
    weekDates.forEach(date => {
      const parsed = new Date(`${date}T12:00:00`);
      html += `<div class="calendar-head ${date === todayISO() ? 'today' : ''}"><strong>${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(parsed).toUpperCase()}</strong><span>${formatDate(date)}</span></div>`;
    });
    times.forEach(time => {
      html += `<div class="calendar-time">${formatTime(time)}</div>`;
      weekDates.forEach(date => {
        const hour = Number(time.slice(0, 2));
        const events = weekSessions.filter(item => item.date === date && Number(item.time.slice(0, 2)) >= hour && Number(item.time.slice(0, 2)) < hour + 2);
        html += `<div class="calendar-cell" data-date="${date}" data-time="${time}">${events.map(item => `<button class="calendar-event ${escapeHTML(item.color || 'purple')}" data-action="edit-session" data-id="${item.id}"><strong>${escapeHTML(item.title)}</strong><span>${formatTime(item.time)} · ${item.duration}m</span></button>`).join('')}</div>`;
      });
    });
    q('#calendarGrid').innerHTML = html;
  }

  function renderSubjects() {
    q('#subjectGrid').innerHTML = state.subjects.map(subject => {
      const quests = state.quests.filter(item => item.subject === subject.name);
      const cards = state.cards.filter(item => item.subject === subject.name);
      const questions = state.questions.filter(item => item.subject === subject.name);
      const completed = quests.filter(item => item.completed).length;
      const questRate = quests.length ? Math.round(completed / quests.length * 100) : Number(subject.progress || 0);
      const cardStrength = cards.length ? Math.round(cards.reduce((sum, item) => sum + Math.min(100, Number(item.interval || 1) * 5), 0) / cards.length) : 0;
      const mastery = Math.round((questRate * .6) + (cardStrength * .4));
      return `<article class="subject-card pixel-panel ${escapeHTML(subject.color || 'purple')}"><div class="subject-card-head"><div class="subject-symbol">${escapeHTML(subject.symbol || subject.name.slice(0, 2).toUpperCase())}</div><div><span class="section-kicker">MASTERY ${mastery}%</span><h3>${escapeHTML(subject.name)}</h3></div></div><p>${escapeHTML(subject.description || 'No description.')}</p><div class="large-progress"><span style="width:${mastery}%"></span></div><div class="subject-metrics"><div><strong>${quests.length}</strong><span>QUESTS</span></div><div><strong>${cards.length}</strong><span>CARDS</span></div><div><strong>${questions.length}</strong><span>QUESTIONS</span></div></div><div class="subject-actions"><button data-action="subject-cards" data-subject="${escapeHTML(subject.name)}">REVIEW</button><button data-action="subject-notes" data-subject="${escapeHTML(subject.name)}">NOTES</button><button data-action="delete-subject" data-id="${subject.id}">DELETE</button></div></article>`;
    }).join('');
  }

  function deleteSubject(id) {
    const subject = state.subjects.find(item => item.id === id);
    if (!subject) return;
    const used = ['quests', 'sessions', 'notes', 'resources', 'cards', 'questions'].some(key => state[key].some(item => item.subject === subject.name));
    if (used) return toast('Subject is in use', 'Move or delete its linked study items first.', 'error');
    if (!confirm(`Delete subject “${subject.name}”?`)) return;
    state.subjects = state.subjects.filter(item => item.id !== id);
    saveState();
    renderAll();
  }

  function renderNotes(filter = q('#notesSearch')?.value.trim().toLowerCase() || '') {
    const items = [...state.notes]
      .filter(note => !filter || `${note.title} ${note.subject} ${note.body}`.toLowerCase().includes(filter))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    q('#noteList').innerHTML = items.length ? items.map(note => `<button class="note-list-item ${note.id === selectedNoteId ? 'active' : ''}" data-note-id="${note.id}"><strong>${escapeHTML(note.title || 'Untitled note')}</strong><span>${escapeHTML(note.subject)} · ${new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((Number(note.updatedAt || Date.now()) - Date.now()) / DAY_MS), 'day')}</span></button>`).join('') : '<div class="empty-state"><div class="empty-icon">✦</div><h3>No notes found</h3><p>Search again or create a new memory page.</p></div>';

    const note = state.notes.find(item => item.id === selectedNoteId);
    q('#emptyEditor').classList.toggle('hidden', Boolean(note));
    q('#editorContent').classList.toggle('hidden', !note);
    if (!note) return;
    q('#noteTitleInput').value = note.title || '';
    populateSubjectSelect(q('#noteSubjectSelect'), false, note.subject);
    q('#noteBodyInput').value = note.body || '';
    q('#noteSavedStatus').textContent = 'SAVED';
  }

  function createNote() {
    const note = { id: uid(), title: 'Untitled Note', subject: state.subjects[0]?.name || 'General', body: '', updatedAt: Date.now() };
    state.notes.unshift(note);
    selectedNoteId = note.id;
    saveState();
    renderNotes();
    q('#noteTitleInput').focus();
  }

  function scheduleNoteSave() {
    q('#noteSavedStatus').textContent = 'SAVING...';
    clearTimeout(noteSaveTimer);
    noteSaveTimer = window.setTimeout(() => {
      const note = state.notes.find(item => item.id === selectedNoteId);
      if (!note) return;
      note.title = q('#noteTitleInput').value.trim() || 'Untitled Note';
      note.subject = q('#noteSubjectSelect').value;
      note.body = q('#noteBodyInput').value;
      note.updatedAt = Date.now();
      saveState();
      q('#noteSavedStatus').textContent = 'SAVED';
      renderNotes(q('#notesSearch').value.trim().toLowerCase());
    }, 500);
  }

  function deleteSelectedNote() {
    const note = state.notes.find(item => item.id === selectedNoteId);
    if (!note || !confirm(`Delete “${note.title}”?`)) return;
    state.notes = state.notes.filter(item => item.id !== note.id);
    selectedNoteId = state.notes[0]?.id || null;
    saveState();
    q('#recallPanel').classList.add('hidden');
    renderNotes();
    toast('Note deleted', 'The memory page was removed.');
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
    const query = q('#librarySearch').value.trim().toLowerCase();
    const items = state.resources.filter(item => !query || `${item.title} ${item.type} ${item.subject} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase().includes(query));
    q('#libraryGrid').innerHTML = items.map(item => `<article class="resource-card pixel-panel"><span class="resource-type">${escapeHTML(item.type.toUpperCase())}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description || 'No description.')}</p><div class="tag-list"><span>${escapeHTML(item.subject)}</span>${(item.tags || []).map(tag => `<span>#${escapeHTML(tag)}</span>`).join('')}</div><div class="resource-actions"><button class="secondary-button" data-action="open-resource" data-id="${item.id}">OPEN</button><button class="danger-button" data-action="delete-resource" data-id="${item.id}">DELETE</button></div></article>`).join('');
    q('#libraryEmptyState').classList.toggle('hidden', items.length > 0);
  }

  function openResource(id) {
    const resource = state.resources.find(item => item.id === id);
    if (!resource) return;
    if (resource.url && /^https?:\/\//i.test(resource.url)) window.open(resource.url, '_blank', 'noopener,noreferrer');
    else toast(resource.title, `No web link is attached. Use the description to locate the ${resource.type.toLowerCase()} resource.`);
  }

  function deleteResource(id) {
    const resource = state.resources.find(item => item.id === id);
    if (!resource || !confirm(`Delete “${resource.title}”?`)) return;
    state.resources = state.resources.filter(item => item.id !== id);
    saveState();
    renderLibrary();
    toast('Resource deleted', 'The vault entry was removed.');
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
    q('#focusChart').innerHTML = chartDays.map(item => `<div class="bar-column"><div class="bar-value" data-value="${item.minutes}m" style="height:${Math.max(2, item.minutes / maxMinutes * 100)}%"></div><div class="bar-label">${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${item.date}T12:00:00`)).slice(0, 1)}</div></div>`).join('');

    q('#subjectProgressList').innerHTML = state.subjects.map(subject => {
      const questItems = state.quests.filter(item => item.subject === subject.name);
      const questRate = questItems.length ? questItems.filter(item => item.completed).length / questItems.length * 100 : Number(subject.progress || 0);
      const cardItems = state.cards.filter(item => item.subject === subject.name);
      const cardRate = cardItems.length ? cardItems.reduce((sum, item) => sum + Math.min(100, Number(item.interval || 1) * 5), 0) / cardItems.length : 0;
      const score = Math.round(questRate * .6 + cardRate * .4);
      return `<div class="subject-progress-row"><span>${escapeHTML(subject.name)}</span><div class="large-progress"><span style="width:${score}%"></span></div><strong>${score}%</strong></div>`;
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
    q('#settingsGoal').value = state.profile.dailyGoal || 120;
    q('#motionToggle').setAttribute('aria-pressed', String(Boolean(state.settings.reducedMotion)));
    q('#soundToggle').setAttribute('aria-pressed', String(Boolean(state.settings.sound)));
    q('#compactToggle').setAttribute('aria-pressed', String(Boolean(state.settings.compact)));
    updateCloudUI();
  }

  function applySettings() {
    document.body.classList.toggle('reduced-motion', Boolean(state.settings.reducedMotion));
    document.body.classList.toggle('compact', Boolean(state.settings.compact));
  }

  function saveProfile() {
    const name = q('#settingsName').value.trim().slice(0, 20) || 'PLAYER';
    const avatar = q('#settingsAvatar').value.trim().slice(0, 2).toUpperCase() || name.slice(0, 1).toUpperCase();
    const goal = clamp(Number(q('#settingsGoal').value) || 120, 15, 600);
    state.profile.name = name;
    state.profile.avatar = avatar;
    state.profile.dailyGoal = goal;
    saveState();
    renderAll();
    toast('Profile saved', 'Player settings updated.', 'success');
  }

  function toggleSetting(key, button) {
    state.settings[key] = !state.settings[key];
    button.setAttribute('aria-pressed', String(state.settings[key]));
    saveState();
    applySettings();
    if (key === 'sound' && state.settings.sound) beep(620, .08);
  }

  function renderNotifications() {
    q('#notificationList').innerHTML = state.notifications.length ? state.notifications.map(item => `<div class="notification-item"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.message)} · ${escapeHTML(item.time || '')}</span></div>`).join('') : '<div class="empty-state"><div class="empty-icon">!</div><h3>No notifications</h3></div>';
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

  function openModal({ kind, kicker, title, html, data = null, submitLabel = 'SAVE', hideSubmit = false }) {
    modalContext = { kind, data };
    q('#modalKicker').textContent = kicker;
    q('#modalTitle').textContent = title;
    const submit = hideSubmit ? '' : `<button type="submit" class="primary-button">${escapeHTML(submitLabel)}</button>`;
    q('#modalForm').innerHTML = `${html}<div class="form-error hidden" id="modalError"></div><div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">CANCEL</button>${submit}</div>`;
    q('#modalBackdrop').classList.remove('hidden');
    q('#modalForm input, #modalForm textarea, #modalForm select')?.focus();
  }

  function closeModal() {
    removeAuthCaptcha();
    q('#modalBackdrop').classList.add('hidden');
    q('#modalForm').innerHTML = '';
    modalContext = null;
  }

  function showFormError(message) {
    const box = q('#modalError');
    box.textContent = message;
    box.classList.remove('hidden');
  }

  function openQuestModal(existing = null) {
    const subjectOptions = state.subjects.map(item => item.name);
    openModal({
      kind: 'quest', kicker: existing ? 'EDIT MISSION' : 'NEW MISSION', title: existing ? 'Edit Quest' : 'Create Quest', data: existing?.id || null,
      html:
        modalField('Quest title', 'title', 'text', existing?.title || '', { required: true, full: true, placeholder: 'Finish chapter 4 practice' }) +
        modalSelect('Subject', 'subject', subjectOptions, existing?.subject || subjectOptions[0]) +
        modalSelect('Priority', 'priority', ['high', 'medium', 'low'], existing?.priority || 'medium') +
        modalField('Duration in minutes', 'duration', 'number', existing?.duration || 25, { required: true, min: 5, max: 480, step: 5 }) +
        modalField('XP reward', 'xp', 'number', existing?.xp || 100, { required: true, min: 10, max: 1000, step: 10 }) +
        modalField('Due date', 'dueDate', 'date', existing?.dueDate || todayISO(), { full: true }) +
        modalField('Description', 'description', 'textarea', existing?.description || '', { full: true, rows: 3, placeholder: 'Define what finished looks like.' }) +
        modalField('Steps — one per line', 'steps', 'textarea', (existing?.steps || []).map(step => step.text).join('\n'), { full: true, rows: 4, placeholder: 'Read section\nSolve examples\nCheck mistakes' })
    });
  }

  function openSubjectModal() {
    openModal({
      kind: 'subject', kicker: 'NEW KNOWLEDGE NODE', title: 'Add Subject',
      html:
        modalField('Subject name', 'name', 'text', '', { required: true }) +
        modalField('Symbol', 'symbol', 'text', '', { required: true, placeholder: 'CS' }) +
        modalSelect('Color', 'color', COLORS, 'purple') +
        modalField('Starting progress', 'progress', 'number', 0, { min: 0, max: 100, step: 1 }) +
        modalField('Description', 'description', 'textarea', '', { full: true, rows: 4 })
    });
  }

  function openSessionModal(existing = null, date = todayISO(), time = '16:00') {
    const subjectOptions = state.subjects.map(item => item.name);
    openModal({
      kind: 'session', kicker: existing ? 'EDIT TIME BLOCK' : 'NEW TIME BLOCK', title: existing ? 'Edit Session' : 'Schedule Session', data: existing?.id || null,
      html:
        modalField('Session title', 'title', 'text', existing?.title || '', { required: true, full: true }) +
        modalSelect('Subject', 'subject', subjectOptions, existing?.subject || subjectOptions[0]) +
        modalSelect('Color', 'color', COLORS, existing?.color || 'purple') +
        modalField('Date', 'date', 'date', existing?.date || date, { required: true }) +
        modalField('Start time', 'time', 'time', existing?.time || time, { required: true }) +
        modalField('Duration', 'duration', 'number', existing?.duration || 25, { required: true, min: 5, max: 480, step: 5 }) +
        (existing ? `<div class="field-label"><span>Delete this block</span><button type="button" class="danger-button" data-action="delete-session" data-id="${existing.id}">DELETE SESSION</button></div>` : '')
    });
  }

  function openCardModal(existing = null) {
    const subjectOptions = state.subjects.map(item => item.name);
    openModal({
      kind: 'card', kicker: existing ? 'EDIT MEMORY' : 'NEW MEMORY', title: existing ? 'Edit Flashcard' : 'Create Flashcard', data: existing?.id || null,
      html:
        modalSelect('Subject', 'subject', subjectOptions, existing?.subject || subjectOptions[0], true) +
        modalField('Prompt', 'front', 'textarea', existing?.front || '', { required: true, full: true, rows: 4, placeholder: 'Ask one clear question.' }) +
        modalField('Answer', 'back', 'textarea', existing?.back || '', { required: true, full: true, rows: 4, placeholder: 'Write the minimum complete answer.' })
    });
  }

  function openQuestionModal() {
    const subjectOptions = state.subjects.map(item => item.name);
    openModal({
      kind: 'question', kicker: 'NEW ARENA ITEM', title: 'Add Typed-Recall Question',
      html:
        modalSelect('Subject', 'subject', subjectOptions, subjectOptions[0], true) +
        modalField('Question', 'prompt', 'textarea', '', { required: true, full: true, rows: 3 }) +
        modalField('Correct answer', 'answer', 'text', '', { required: true, full: true }) +
        modalField('Other accepted answers — comma separated', 'accepted', 'text', '', { full: true }) +
        modalField('Hint', 'hint', 'text', '', { full: true })
    });
  }

  function openResourceModal() {
    const subjectOptions = state.subjects.map(item => item.name);
    openModal({
      kind: 'resource', kicker: 'NEW VAULT ENTRY', title: 'Add Resource',
      html:
        modalField('Title', 'title', 'text', '', { required: true, full: true }) +
        modalSelect('Subject', 'subject', subjectOptions, subjectOptions[0]) +
        modalSelect('Type', 'type', ['Documentation', 'PDF', 'Book', 'Course', 'Video', 'Notes', 'Anki', 'Other'], 'Documentation') +
        modalField('URL — optional', 'url', 'url', '', { full: true, placeholder: 'https://...' }) +
        modalField('Tags — comma separated', 'tags', 'text', '', { full: true }) +
        modalField('Description', 'description', 'textarea', '', { full: true, rows: 4 })
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
        ? modalField('New password', 'password', 'password', '', { required: true, full: true, minlength: 10, maxlength: 128, autocomplete: 'new-password' }) + modalField('Confirm new password', 'passwordConfirm', 'password', '', { required: true, full: true, minlength: 10, maxlength: 128, autocomplete: 'new-password' })
        : modalField('Email address', 'email', 'email', '', { required: true, full: true, maxlength: 254, autocomplete: 'email' }) +
          (isReset ? '' : modalField('Password', 'password', 'password', '', { required: true, full: true, minlength: isSignup ? 10 : 1, maxlength: 128, autocomplete: isSignup ? 'new-password' : 'current-password' })) +
          (isSignup ? '<p class="muted-copy full-span">Use at least 10 characters. Email confirmation may be required by your Supabase Auth settings.</p>' : '') + captcha
    });
    if (captcha) renderAuthCaptcha();
  }

  function openCloudConflictModal(serverResult) {
    cloudSync.pendingConflict = serverResult;
    setCloudStatus('conflict', 'This device and the cloud both changed. Choose which copy to keep.');
    openModal({
      kind: 'cloud-conflict',
      kicker: 'SYNC SAFETY',
      title: 'Choose the Correct Copy',
      hideSubmit: true,
      html: '<div class="cloud-conflict-copy"><strong>No data will be destroyed silently.</strong><span>Use cloud copy to replace this device, or keep this device and overwrite the cloud after a local backup is created.</span></div><div class="cloud-conflict-actions"><button type="button" class="secondary-button" data-action="resolve-cloud-conflict" data-resolution="cloud">USE CLOUD COPY</button><button type="button" class="primary-button" data-action="resolve-cloud-conflict" data-resolution="local">KEEP THIS DEVICE</button></div>'
    });
  }

  async function resolveCloudConflict(resolution) {
    const conflict = cloudSync.pendingConflict;
    if (!conflict) return;
    createLocalBackup(`sync-conflict-${resolution}`);
    if (resolution === 'cloud') {
      state = normalizeState(conflict.state);
      selectedNoteId = state.notes[0]?.id || null;
      cloudSync.revision = Number(conflict.revision || 0);
      cloudSync.dirty = false;
      cloudSync.pendingConflict = null;
      saveState({ localOnly: true });
      writeCloudMeta();
      closeModal();
      renderAll();
      setCloudStatus('synced', `Cloud copy loaded · revision ${cloudSync.revision}.`);
      toast('Cloud copy loaded', 'A backup of the previous local copy was kept in this browser.', 'success');
      return;
    }
    cloudSync.revision = Number(conflict.revision || 0);
    cloudSync.dirty = true;
    cloudSync.pendingConflict = null;
    writeCloudMeta();
    closeModal();
    await syncCloudNow({ manual: true });
  }

  async function syncCloudNow(options = {}) {
    if (cloudSync.pendingConflict) {
      openCloudConflictModal(cloudSync.pendingConflict);
      return false;
    }
    if (!cloudSync.configured || !cloudSync.user || cloudSync.syncing) return false;
    if (!navigator.onLine) {
      setCloudStatus('offline', 'Offline. Changes remain safe on this device.');
      return false;
    }
    cloudSync.syncing = true;
    const versionAtStart = cloudSync.localChangeVersion;
    setCloudStatus('syncing', 'Encrypting transport and writing your latest revision...');
    try {
      const result = await Cloud.pushState(state, cloudSync.revision);
      if (result?.conflict) {
        openCloudConflictModal(result);
        return false;
      }
      cloudSync.revision = Number(result?.revision || cloudSync.revision + 1);
      cloudSync.dirty = cloudSync.localChangeVersion !== versionAtStart;
      writeCloudMeta();
      if (cloudSync.dirty) {
        setCloudStatus('dirty', 'New changes arrived during sync. Another sync is queued.');
        scheduleCloudSync();
      } else {
        setCloudStatus('synced', `Synced securely · revision ${cloudSync.revision}.`);
        if (options.manual) toast('Cloud sync complete', 'This device and the cloud are up to date.', 'success');
      }
      return true;
    } catch (error) {
      console.error('Cloud sync failed:', error);
      const offline = !navigator.onLine || error?.code === 'network_error' || error?.code === 'timeout';
      setCloudStatus(offline ? 'offline' : 'error', offline ? 'Could not reach the cloud. Changes remain local.' : String(error?.message || 'Cloud sync failed.'));
      if (options.manual) toast('Cloud sync failed', String(error?.message || 'Try again later.'), 'error');
      return false;
    } finally {
      cloudSync.syncing = false;
    }
  }

  async function initializeCloud() {
    if (!cloudSync.configured) {
      setCloudStatus('local', 'Supabase is not configured. The app remains fully local.');
      return;
    }
    try {
      const user = await Cloud.getCurrentUser();
      if (!user) {
        cloudSync.user = null;
        setCloudStatus('signed_out', 'Sign in to enable secure cross-device sync.');
        return;
      }
      cloudSync.user = user;
      const meta = readCloudMeta();
      const sameUser = meta?.userId === user.id;
      cloudSync.revision = sameUser ? Number(meta.revision || 0) : 0;
      cloudSync.dirty = sameUser ? Boolean(meta.dirty) : false;
      updateCloudUI();

      if (!navigator.onLine) {
        setCloudStatus('offline', `Signed in as ${user.email || 'user'}; waiting for a connection.`);
        return;
      }

      setCloudStatus('syncing', 'Checking the latest cloud revision...');
      const remote = await Cloud.pullState();
      if (!remote) {
        cloudSync.revision = 0;
        cloudSync.dirty = true;
        writeCloudMeta();
        await syncCloudNow();
        return;
      }

      if (sameUser && cloudSync.dirty) {
        await syncCloudNow();
        return;
      }

      if (!sameUser) createLocalBackup('before-first-cloud-download');
      state = normalizeState(remote.state);
      selectedNoteId = state.notes[0]?.id || null;
      cloudSync.revision = Number(remote.revision || 0);
      cloudSync.dirty = false;
      saveState({ localOnly: true });
      writeCloudMeta();
      renderAll();
      setCloudStatus('synced', `Latest cloud copy loaded · revision ${cloudSync.revision}.`);
    } catch (error) {
      console.error('Cloud initialization failed:', error);
      const offline = !navigator.onLine || error?.code === 'network_error' || error?.code === 'timeout';
      setCloudStatus(offline ? 'offline' : 'error', offline ? 'Cloud unavailable. The local app still works.' : String(error?.message || 'Could not initialize cloud sync.'));
    }
  }

  async function cloudSignOut() {
    if (cloudSync.dirty) await syncCloudNow();
    await Cloud.signOut();
    cloudSync.user = null;
    cloudSync.revision = 0;
    cloudSync.dirty = false;
    cloudSync.pendingConflict = null;
    setCloudStatus('signed_out', 'Signed out. Local data remains on this device.');
    toast('Signed out', 'Your local data was not deleted.', 'success');
  }

  async function deleteCloudAccount() {
    if (!cloudSync.user) return;
    if (!confirm('Delete your cloud account and all cloud data? Your current local copy will remain on this device.')) return;
    if (!confirm('Final confirmation: permanently delete the cloud account?')) return;
    try {
      setCloudStatus('syncing', 'Deleting the cloud account...');
      await Cloud.deleteAccount();
      await Cloud.signOut();
      localStorage.removeItem(CLOUD_META_KEY);
      cloudSync.user = null;
      cloudSync.revision = 0;
      cloudSync.dirty = false;
      setCloudStatus('signed_out', 'Cloud account deleted. Local data remains available.');
      toast('Cloud account deleted', 'The local copy remains on this device.', 'success');
    } catch (error) {
      setCloudStatus('error', String(error?.message || 'Account deletion failed.'));
      toast('Deletion failed', 'Deploy the delete-account Edge Function and verify its allowed origin.', 'error');
    }
  }

  async function handleModalSubmit(event) {
    event.preventDefault();
    if (!modalContext) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (modalContext.kind === 'cloud-auth') {
      const submitButton = q('#modalForm button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        const captchaRequired = Boolean(TURNSTILE_SITE_KEY && modalContext.data !== 'new-password');
        if (captchaRequired && !data.captchaToken) throw new Error('Complete the bot-protection check first.');
        if (modalContext.data === 'new-password') {
          if (data.password !== data.passwordConfirm) throw new Error('The passwords do not match.');
          await Cloud.updatePassword(data.password);
          closeModal();
          toast('Password updated', 'Your account password has been changed.', 'success');
          await initializeCloud();
          return;
        }
        if (modalContext.data === 'reset') {
          await Cloud.sendPasswordReset(data.email, data.captchaToken);
          closeModal();
          toast('Reset link requested', 'Check your email. The message may take a minute to arrive.', 'success');
          return;
        }
        if (modalContext.data === 'signup') {
          const result = await Cloud.signUp(data.email, data.password, data.captchaToken);
          closeModal();
          if (result?.access_token) {
            toast('Account created', 'Secure cloud sync is now active.', 'success');
            await initializeCloud();
          } else {
            toast('Confirm your email', 'Open the confirmation message, then sign in.', 'success');
          }
          return;
        }
        await Cloud.signIn(data.email, data.password, data.captchaToken);
        closeModal();
        toast('Signed in', 'Checking your cloud revision now.', 'success');
        await initializeCloud();
        return;
      } catch (error) {
        showFormError(String(error?.message || 'Authentication failed.'));
        resetAuthCaptcha();
        if (submitButton) submitButton.disabled = false;
        return;
      }
    }
    if (modalContext.kind === 'cloud-conflict') return;
    if (modalContext.kind === 'quest') {
      if (!data.title.trim()) return showFormError('Quest title is required.');
      const existing = state.quests.find(item => item.id === modalContext.data);
      const oldSteps = existing?.steps || [];
      const steps = data.steps.split('\n').map(text => text.trim()).filter(Boolean).map(text => ({ id: oldSteps.find(step => step.text === text)?.id || uid(), text, done: oldSteps.find(step => step.text === text)?.done || false }));
      const values = { title: data.title.trim(), description: data.description.trim(), subject: data.subject, priority: data.priority, duration: clamp(Number(data.duration), 5, 480), xp: clamp(Number(data.xp), 10, 1000), dueDate: data.dueDate, steps };
      if (existing) Object.assign(existing, values);
      else state.quests.push({ id: uid(), ...values, completed: false, rewarded: false, createdAt: Date.now() });
    }
    if (modalContext.kind === 'subject') {
      if (!data.name.trim()) return showFormError('Subject name is required.');
      if (state.subjects.some(item => item.name.toLowerCase() === data.name.trim().toLowerCase())) return showFormError('A subject with this name already exists.');
      state.subjects.push({ id: uid(), name: data.name.trim(), symbol: data.symbol.trim().slice(0, 3).toUpperCase() || data.name.slice(0, 2).toUpperCase(), description: data.description.trim(), progress: clamp(Number(data.progress), 0, 100), color: data.color });
    }
    if (modalContext.kind === 'session') {
      if (!data.title.trim()) return showFormError('Session title is required.');
      const values = { title: data.title.trim(), subject: data.subject, color: data.color, date: data.date, time: data.time, duration: clamp(Number(data.duration), 5, 480) };
      const existing = state.sessions.find(item => item.id === modalContext.data);
      if (existing) Object.assign(existing, values);
      else state.sessions.push({ id: uid(), ...values });
    }
    if (modalContext.kind === 'card') {
      if (!data.front.trim() || !data.back.trim()) return showFormError('Both prompt and answer are required.');
      const existing = state.cards.find(item => item.id === modalContext.data);
      if (existing) Object.assign(existing, { front: data.front.trim(), back: data.back.trim(), subject: data.subject });
      else state.cards.push({ id: uid(), front: data.front.trim(), back: data.back.trim(), subject: data.subject, dueDate: todayISO(), interval: 1, ease: 2.5, reps: 0, lapses: 0 });
    }
    if (modalContext.kind === 'question') {
      if (!data.prompt.trim() || !data.answer.trim()) return showFormError('Question and answer are required.');
      state.questions.push({ id: uid(), prompt: data.prompt.trim(), answer: data.answer.trim(), accepted: data.accepted.split(',').map(item => item.trim()).filter(Boolean), subject: data.subject, hint: data.hint.trim() });
    }
    if (modalContext.kind === 'resource') {
      if (!data.title.trim()) return showFormError('Resource title is required.');
      if (data.url && !/^https?:\/\//i.test(data.url)) return showFormError('URL must begin with http:// or https://');
      state.resources.push({ id: uid(), title: data.title.trim(), subject: data.subject, type: data.type, url: data.url.trim(), tags: data.tags.split(',').map(item => item.trim()).filter(Boolean), description: data.description.trim() });
    }
    saveState();
    closeModal();
    renderAll();
    toast('Saved', 'The study system was updated.', 'success');
  }

  function deleteSession(id) {
    const item = state.sessions.find(session => session.id === id);
    if (!item || !confirm(`Delete “${item.title}”?`)) return;
    state.sessions = state.sessions.filter(session => session.id !== id);
    saveState();
    closeModal();
    renderPlanner();
    renderDashboard();
    toast('Session deleted', 'The time block was removed.');
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
    q('#searchOverlay').classList.remove('hidden');
    q('#globalSearchInput').value = '';
    searchSelection = 0;
    renderSearchResults('');
    window.setTimeout(() => q('#globalSearchInput').focus(), 30);
  }

  function closeGlobalSearch() {
    q('#searchOverlay').classList.add('hidden');
  }

  function renderSearchResults(query) {
    searchItems = getSearchItems(query);
    searchSelection = clamp(searchSelection, 0, Math.max(0, searchItems.length - 1));
    q('#searchResults').innerHTML = searchItems.length ? searchItems.map((item, index) => `<button class="search-result ${index === searchSelection ? 'selected' : ''}" data-search-index="${index}"><span>${escapeHTML(item.type)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.meta || '')}</small></button>`).join('') : '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No results</h3><p>Try a subject, task, card, or page name.</p></div>';
  }

  function openSearchItem(index) {
    const item = searchItems[index];
    if (!item) return;
    closeGlobalSearch();
    if (item.type === 'NOTE') selectedNoteId = item.id;
    if (item.type === 'CARD') {
      q('#cardSubjectFilter').value = 'all';
      q('#cardBrowser').classList.remove('hidden');
    }
    if (item.type === 'RESOURCE') q('#librarySearch').value = item.title;
    navigate(item.route);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bawsala-study-os-${todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Data exported', 'Your study backup was downloaded.', 'success');
  }

  async function importData(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      state = normalizeState(parsed);
      selectedNoteId = state.notes[0]?.id || null;
      saveState();
      renderAll();
      navigate('dashboard');
      toast('Data imported', 'Your study system was restored.', 'success');
    } catch (error) {
      console.error(error);
      toast('Import failed', 'This is not a valid Bawsala backup.', 'error');
    } finally {
      q('#importDataInput').value = '';
    }
  }

  function resetAllData() {
    if (!confirm('Reset all quests, cards, notes, sessions, stats, and settings? Export first if you need the data.')) return;
    if (!confirm('Final confirmation: erase all local Bawsala data?')) return;
    state = seedState();
    selectedNoteId = state.notes[0]?.id || null;
    reviewQueue = [];
    arena = { active: false, questions: [], index: 0, correct: 0, combo: 0, bestCombo: 0, answered: false };
    saveState();
    renderAll();
    navigate('dashboard');
    toast('System reset', 'Starter data has been restored.');
  }

  function handleAction(target) {
    const { action, id } = target.dataset;
    if (action === 'toggle-quest') toggleQuest(id);
    if (action === 'toggle-step') toggleStep(target.dataset.questId, target.dataset.stepId, target.checked);
    if (action === 'start-quest') {
      navigate('focus');
      q('#focusQuestSelect').value = id;
    }
    if (action === 'edit-quest') openQuestModal(state.quests.find(item => item.id === id));
    if (action === 'delete-quest') deleteQuest(id);
    if (action === 'remove-distraction') {
      currentDistractions = currentDistractions.filter(item => item.id !== id);
      renderDistractions();
    }
    if (action === 'edit-card') openCardModal(state.cards.find(item => item.id === id));
    if (action === 'delete-card') deleteCard(id);
    if (action === 'edit-session') openSessionModal(state.sessions.find(item => item.id === id));
    if (action === 'delete-session') deleteSession(id);
    if (action === 'subject-cards') {
      navigate('flashcards');
      q('#cardSubjectFilter').value = target.dataset.subject;
      renderFlashcards();
    }
    if (action === 'subject-notes') {
      q('#notesSearch').value = target.dataset.subject;
      navigate('notes');
      renderNotes(target.dataset.subject.toLowerCase());
    }
    if (action === 'delete-subject') deleteSubject(id);
    if (action === 'open-resource') openResource(id);
    if (action === 'delete-resource') deleteResource(id);
    if (action === 'resolve-cloud-conflict') resolveCloudConflict(target.dataset.resolution);
    if (action === 'close-modal') closeModal();
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const actionTarget = event.target.closest('[data-action]');
      if (actionTarget) {
        handleAction(actionTarget);
        return;
      }
      const routeTarget = event.target.closest('[data-route]');
      if (routeTarget) {
        navigate(routeTarget.dataset.route);
        return;
      }
      const noteTarget = event.target.closest('[data-note-id]');
      if (noteTarget) {
        selectedNoteId = noteTarget.dataset.noteId;
        renderNotes();
        return;
      }
      const searchTarget = event.target.closest('[data-search-index]');
      if (searchTarget) openSearchItem(Number(searchTarget.dataset.searchIndex));
    });

    q('#menuButton').addEventListener('click', () => q('#sidebar').classList.toggle('open'));
    q('#searchButton').addEventListener('click', openGlobalSearch);
    q('#closeSearchButton').addEventListener('click', closeGlobalSearch);
    q('#searchOverlay').addEventListener('click', event => { if (event.target === q('#searchOverlay')) closeGlobalSearch(); });
    q('#globalSearchInput').addEventListener('input', event => { searchSelection = 0; renderSearchResults(event.target.value); });
    q('#globalSearchInput').addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); searchSelection = clamp(searchSelection + 1, 0, Math.max(0, searchItems.length - 1)); renderSearchResults(event.currentTarget.value); }
      if (event.key === 'ArrowUp') { event.preventDefault(); searchSelection = clamp(searchSelection - 1, 0, Math.max(0, searchItems.length - 1)); renderSearchResults(event.currentTarget.value); }
      if (event.key === 'Enter') { event.preventDefault(); openSearchItem(searchSelection); }
    });

    q('#notificationButton').addEventListener('click', () => q('#notificationPanel').classList.toggle('hidden'));
    q('#closeNotifications').addEventListener('click', () => q('#notificationPanel').classList.add('hidden'));
    q('#cloudStatusButton').addEventListener('click', () => navigate('settings'));
    q('#quickFocusButton').addEventListener('click', () => navigate('focus'));
    q('#quickReviewButton').addEventListener('click', () => navigate('flashcards'));
    q('#challengeAction').addEventListener('click', () => { navigate('flashcards'); startReview(false); });
    q('#startDailyQuest').addEventListener('click', event => {
      const id = event.currentTarget.dataset.questId;
      if (!id) return navigate('quests');
      navigate('focus');
      q('#focusQuestSelect').value = id;
    });

    qa('#questFilters button').forEach(button => button.addEventListener('click', () => { questFilter = button.dataset.filter; renderQuests(); }));
    q('#addQuestButton').addEventListener('click', () => openQuestModal());
    q('#emptyAddQuest').addEventListener('click', () => openQuestModal());

    q('#startTimerButton').addEventListener('click', startPauseTimer);
    q('#resetTimerButton').addEventListener('click', resetTimer);
    q('#finishTimerButton').addEventListener('click', () => completeFocusSession(false));
    qa('#focusPresets button').forEach(button => button.addEventListener('click', () => setTimerMinutes(Number(button.dataset.minutes))));
    qa('#focusModeTabs button').forEach(button => button.addEventListener('click', () => setFocusMode(button.dataset.mode)));
    q('#addDistractionButton').addEventListener('click', addDistraction);
    q('#distractionInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addDistraction(); } });

    q('#cardSubjectFilter').addEventListener('change', renderFlashcards);
    q('#addCardButton').addEventListener('click', () => openCardModal());
    q('#browseCardsButton').addEventListener('click', () => q('#cardBrowser').classList.toggle('hidden'));
    q('#closeCardBrowser').addEventListener('click', () => q('#cardBrowser').classList.add('hidden'));
    q('#startReviewButton').addEventListener('click', () => startReview(false));
    q('#reviewAgainButton').addEventListener('click', () => startReview(true));
    q('#flashcard').addEventListener('click', flipReviewCard);
    qa('#ratingControls button').forEach(button => button.addEventListener('click', () => rateCard(button.dataset.rating)));

    q('#startArenaButton').addEventListener('click', startArena);
    q('#arenaReplayButton').addEventListener('click', () => { q('#arenaResult').classList.add('hidden'); q('#arenaIdle').classList.remove('hidden'); q('#pixelBoss').style.opacity = '1'; q('#bossHpBar').style.width = '100%'; q('#bossHpText').textContent = '100 / 100'; });
    q('#arenaSubmitButton').addEventListener('click', submitArenaAnswer);
    q('#arenaNextButton').addEventListener('click', nextArenaQuestion);
    q('#arenaHintButton').addEventListener('click', showArenaHint);
    q('#arenaAnswerInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (arena.answered) nextArenaQuestion(); else submitArenaAnswer();
      }
    });
    q('#addQuestionButton').addEventListener('click', openQuestionModal);

    q('#addSessionButton').addEventListener('click', () => openSessionModal());
    q('#prevWeek').addEventListener('click', () => { plannerOffset -= 1; renderPlanner(); });
    q('#nextWeek').addEventListener('click', () => { plannerOffset += 1; renderPlanner(); });
    q('#todayButton').addEventListener('click', () => { plannerOffset = 0; renderPlanner(); });
    q('#calendarGrid').addEventListener('dblclick', event => {
      const cell = event.target.closest('.calendar-cell[data-date]');
      if (cell) openSessionModal(null, cell.dataset.date, cell.dataset.time);
    });

    q('#addSubjectButton').addEventListener('click', openSubjectModal);
    q('#addNoteButton').addEventListener('click', createNote);
    q('#notesSearch').addEventListener('input', event => renderNotes(event.target.value.trim().toLowerCase()));
    q('#noteTitleInput').addEventListener('input', scheduleNoteSave);
    q('#noteBodyInput').addEventListener('input', scheduleNoteSave);
    q('#noteSubjectSelect').addEventListener('change', scheduleNoteSave);
    q('#deleteNoteButton').addEventListener('click', deleteSelectedNote);
    q('#recallModeButton').addEventListener('click', openRecallMode);
    q('#closeRecallMode').addEventListener('click', () => q('#recallPanel').classList.add('hidden'));
    q('#revealNoteButton').addEventListener('click', toggleRecallOriginal);

    q('#librarySearch').addEventListener('input', renderLibrary);
    q('#addResourceButton').addEventListener('click', openResourceModal);

    q('#saveSettingsButton').addEventListener('click', saveProfile);
    q('#motionToggle').addEventListener('click', event => toggleSetting('reducedMotion', event.currentTarget));
    q('#soundToggle').addEventListener('click', event => toggleSetting('sound', event.currentTarget));
    q('#compactToggle').addEventListener('click', event => toggleSetting('compact', event.currentTarget));
    q('#cloudSignInButton').addEventListener('click', () => openCloudAuthModal('signin'));
    q('#cloudSignUpButton').addEventListener('click', () => openCloudAuthModal('signup'));
    q('#cloudResetPasswordButton').addEventListener('click', () => openCloudAuthModal('reset'));
    q('#cloudSyncNowButton').addEventListener('click', () => syncCloudNow({ manual: true }));
    q('#cloudSignOutButton').addEventListener('click', cloudSignOut);
    q('#cloudDeleteAccountButton').addEventListener('click', deleteCloudAccount);
    q('#exportDataButton').addEventListener('click', exportData);
    q('#importDataInput').addEventListener('change', event => importData(event.target.files[0]));
    q('#resetDataButton').addEventListener('click', resetAllData);

    q('#closeModalButton').addEventListener('click', closeModal);
    q('#modalBackdrop').addEventListener('click', event => { if (event.target === q('#modalBackdrop')) closeModal(); });
    q('#modalForm').addEventListener('submit', handleModalSubmit);

    window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
    window.addEventListener('beforeunload', () => saveState({ localOnly: true }));
    window.addEventListener('online', () => {
      if (cloudSync.user) {
        setCloudStatus(cloudSync.dirty ? 'dirty' : 'syncing', 'Connection restored. Checking cloud state...');
        if (cloudSync.dirty) scheduleCloudSync(); else initializeCloud();
      }
    });
    window.addEventListener('offline', () => {
      if (cloudSync.user) setCloudStatus('offline', 'Offline. Changes remain safe on this device.');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && cloudSync.dirty) syncCloudNow();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!q('#searchOverlay').classList.contains('hidden')) closeGlobalSearch();
        else if (!q('#modalBackdrop').classList.contains('hidden')) closeModal();
        else if (!q('#notificationPanel').classList.contains('hidden')) q('#notificationPanel').classList.add('hidden');
        else q('#sidebar').classList.remove('open');
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openGlobalSearch(); }
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && /^[1-9]$/.test(event.key)) {
        navigate(ROUTES[Number(event.key) - 1]);
      }
    });
  }

  function init() {
    const authRedirect = Cloud?.consumeAuthRedirect?.() || null;
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline cache unavailable:', error));
    }
    bindEvents();
    renderAll();
    const initialRoute = PAGE_META[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
    navigate(initialRoute);
    initializeCloud();
    if (authRedirect?.type === 'recovery') openCloudAuthModal('new-password');
    window.setTimeout(() => q('#bootScreen').classList.add('done'), 850);
    window.setTimeout(() => q('#bootScreen')?.remove(), 1350);
  }

  init();
})();

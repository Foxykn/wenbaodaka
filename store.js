// 本地打卡与想去清单：只写入 localStorage
const KEY = 'guobao.trail.v1';
const listeners = new Set();

function blank() {
  return { version: 1, visited: {}, wish: {}, notes: {} };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    return {
      version: 1,
      visited: data.visited && typeof data.visited === 'object' ? data.visited : {},
      wish: data.wish && typeof data.wish === 'object' ? data.wish : {},
      notes: data.notes && typeof data.notes === 'object' ? data.notes : {},
    };
  } catch {
    return blank();
  }
}

let state = load();

function persist(type, id) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 隐私模式或空间不足时静默失败
  }
  for (const fn of listeners) fn({ type, id, state });
}

function nowISO() {
  return new Date().toISOString();
}

export const store = {
  get state() {
    return state;
  },
  isVisited(id) {
    return Boolean(state.visited[id]);
  },
  isWished(id) {
    return Boolean(state.wish[id]);
  },
  visitedAt(id) {
    return state.visited[id]?.at || '';
  },
  wishedAt(id) {
    return state.wish[id]?.at || '';
  },
  toggleVisited(id) {
    if (state.visited[id]) {
      delete state.visited[id];
      persist('unvisit', id);
      return false;
    }
    state.visited[id] = { at: nowISO() };
    delete state.wish[id];
    persist('visit', id);
    return true;
  },
  toggleWish(id) {
    if (state.wish[id]) {
      delete state.wish[id];
      persist('unwish', id);
      return false;
    }
    state.wish[id] = { at: nowISO() };
    persist('wish', id);
    return true;
  },
  getNote(id) {
    return state.notes[id] || '';
  },
  setNote(id, text) {
    const v = String(text || '').slice(0, 500);
    if (v) state.notes[id] = v;
    else delete state.notes[id];
    persist('note', id);
  },
  get visitedIds() {
    return Object.keys(state.visited);
  },
  get wishIds() {
    return Object.keys(state.wish);
  },
  get visitedCount() {
    return Object.keys(state.visited).length;
  },
  get wishCount() {
    return Object.keys(state.wish).length;
  },
  exportData() {
    return {
      app: '文保打卡',
      version: 1,
      exportedAt: nowISO(),
      visited: state.visited,
      wish: state.wish,
      notes: state.notes,
    };
  },
  importData(data) {
    if (!data || typeof data !== 'object') throw new Error('文件格式不正确');
    const v = data.visited && typeof data.visited === 'object' ? data.visited : {};
    const w = data.wish && typeof data.wish === 'object' ? data.wish : {};
    const n = data.notes && typeof data.notes === 'object' ? data.notes : {};
    let added = 0;
    for (const [id, entry] of Object.entries(v)) {
      if (!state.visited[id]) {
        state.visited[id] = { at: entry?.at || nowISO() };
        added++;
      }
    }
    for (const [id, entry] of Object.entries(w)) {
      if (!state.wish[id] && !state.visited[id]) {
        state.wish[id] = { at: entry?.at || nowISO() };
        added++;
      }
    }
    for (const [id, text] of Object.entries(n)) {
      if (text && !state.notes[id]) state.notes[id] = String(text).slice(0, 500);
    }
    persist('import', '');
    return added;
  },
  clear() {
    state = blank();
    persist('clear', '');
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// 多标签页同步
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  state = load();
  for (const fn of listeners) fn({ type: 'sync', id: '', state });
});

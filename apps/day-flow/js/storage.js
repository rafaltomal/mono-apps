// Storage for Day Flow
// Day plans live here. Task text and tracked time also sync to Daily Tasks.

export const STORAGE_KEY = 'mono-day-flow';

export const START_MIN = 6 * 60;
export const END_MIN = 17 * 60;
export const SNAP = 15;

export const TASK_COLOR = '#e8eaed';

export const BLOCKS = [
    { type: 'work', title: 'Work', duration: 60, color: '#8ab4f8' },
    { type: 'deep-work', title: 'Deep work', duration: 90, color: '#78d9ec' },
    { type: 'call', title: 'Call', duration: 30, color: '#fdd663' },
    { type: 'meeting', title: 'Meeting', duration: 45, color: '#c58af9' },
    { type: 'email', title: 'Email', duration: 30, color: '#f28b82' },
    { type: 'break', title: 'Break', duration: 15, color: '#81c995' }
];

const DEFAULT_WORK = 25;
const DEFAULT_BREAK = 5;

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function clampPlacement(start, duration) {
    let dur = Math.max(SNAP, Math.round(Number(duration) || SNAP));
    const maxDur = END_MIN - START_MIN;
    if (dur > maxDur) dur = maxDur;

    let s = Math.round(Number(start) / SNAP) * SNAP;
    if (!Number.isFinite(s)) s = START_MIN;
    if (s < START_MIN) s = START_MIN;
    if (s + dur > END_MIN) s = END_MIN - dur;
    s = Math.round(s / SNAP) * SNAP;
    if (s < START_MIN) s = START_MIN;
    if (s + dur > END_MIN) {
        dur = END_MIN - s;
        if (dur < SNAP) {
            dur = SNAP;
            s = END_MIN - SNAP;
        }
    }
    return { start: s, duration: dur };
}

export function layoutEvents(events) {
    const items = events.map((ev) => ({ ...ev }));
    items.sort((a, b) => a.start - b.start || b.duration - a.duration);

    const placed = [];
    let cluster = [];
    let clusterEnd = -1;

    const flush = () => {
        if (!cluster.length) return;
        const columns = [];
        for (const ev of cluster) {
            let col = columns.findIndex((end) => end <= ev.start);
            if (col === -1) {
                col = columns.length;
                columns.push(ev.start + ev.duration);
            } else {
                columns[col] = ev.start + ev.duration;
            }
            ev.col = col;
        }
        const cols = columns.length;
        for (const ev of cluster) placed.push({ ...ev, cols });
        cluster = [];
        clusterEnd = -1;
    };

    for (const ev of items) {
        if (cluster.length && ev.start >= clusterEnd) flush();
        cluster.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.start + ev.duration);
    }
    flush();
    return placed;
}

function clampDuration(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(60, Math.max(1, Math.round(n)));
}

function sanitizeEvent(ev) {
    if (!ev || typeof ev.id !== 'string') return null;
    const kind = ev.kind === 'task' ? 'task' : 'block';
    const slot = clampPlacement(ev.start, ev.duration);
    const title = typeof ev.title === 'string' && ev.title.trim() ? ev.title : 'Block';
    return {
        id: ev.id,
        kind,
        blockType: typeof ev.blockType === 'string' ? ev.blockType : null,
        taskId: typeof ev.taskId === 'string' ? ev.taskId : null,
        title,
        color: typeof ev.color === 'string' ? ev.color : '#8ab4f8',
        start: slot.start,
        duration: slot.duration,
        timeSpent: Math.max(0, Math.round(Number(ev.timeSpent) || 0))
    };
}

export function loadState() {
    const fallback = {
        days: {},
        workDuration: DEFAULT_WORK,
        breakDuration: DEFAULT_BREAK
    };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        const days = {};
        const source = parsed.days && typeof parsed.days === 'object' ? parsed.days : {};
        for (const [key, list] of Object.entries(source)) {
            if (!Array.isArray(list)) continue;
            days[key] = list.map(sanitizeEvent).filter(Boolean);
        }
        return {
            days,
            workDuration: clampDuration(parsed.workDuration, DEFAULT_WORK),
            breakDuration: clampDuration(parsed.breakDuration, DEFAULT_BREAK)
        };
    } catch (error) {
        console.error('Error loading day flow:', error);
        return fallback;
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            days: state.days,
            workDuration: state.workDuration,
            breakDuration: state.breakDuration
        }));
        return true;
    } catch (error) {
        console.error('Error saving day flow:', error);
        return false;
    }
}

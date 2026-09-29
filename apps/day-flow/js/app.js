// Day Flow — plan a single day, then run a focus timer on the current block.

import {
    BLOCKS,
    END_MIN,
    SNAP,
    START_MIN,
    TASK_COLOR,
    clampPlacement,
    generateId,
    layoutEvents,
    loadState,
    saveState
} from './storage.js';

import {
    createTask,
    formatDateKey,
    getTasksForDate,
    loadTasks,
    saveTasksForDate
} from '../../daily-tasks/js/storage.js';

const HOUR_PX = 120;
const PAD = 16;
const RING_RADIUS = 36;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

const paletteEl = document.getElementById('palette');
const dayCol = document.getElementById('day-col');
const eventsLayer = document.getElementById('events');
const hourLines = document.getElementById('hour-lines');
const timeGutter = document.getElementById('time-gutter');
const calendar = document.getElementById('calendar');
const calendarScroll = document.getElementById('calendar-scroll');
const nowLine = document.getElementById('now-line');
const preview = document.getElementById('drop-preview');
const dateWeekday = document.getElementById('date-weekday');
const dateRest = document.getElementById('date-rest');

const miniTimer = document.getElementById('mini-timer');
const timerDisplay = document.getElementById('timer-display');
const timerTask = document.getElementById('timer-task');
const timerName = document.getElementById('timer-task-name');
const timerIcon = document.getElementById('timer-icon');
const timerMeta = document.getElementById('timer-meta');
const timerKicker = document.getElementById('timer-kicker');
const timerHint = document.getElementById('timer-hint');
const ringProgress = document.getElementById('ring-progress');
const playBtn = document.getElementById('play-btn');
const modeWork = document.getElementById('mode-work');
const modeBreak = document.getElementById('mode-break');
const decreaseBtn = document.getElementById('decrease-time');
const increaseBtn = document.getElementById('increase-time');

let currentDate = startOfDay(new Date());
let state = loadState();
let allTasks = loadTasks();
let selectedId = null;
let drag = null;
let lastNowEventId;

const timer = {
    running: false,
    mode: 'work',
    eventId: null,
    dateKey: null,
    endsAt: 0,
    startedAt: 0,
    remaining: state.workDuration * 60,
    total: state.workDuration * 60
};

const ghost = document.createElement('div');
ghost.className = 'drag-ghost';
ghost.hidden = true;
document.body.appendChild(ghost);

const ICON_PATHS = {
    work: '<rect x="2.5" y="6.5" width="11" height="7" rx="1.2"/><path d="M6 6.5V5.2a1.2 1.2 0 0 1 1.2-1.2h1.6A1.2 1.2 0 0 1 10 5.2V6.5"/><path d="M2.5 9.5h11"/>',
    'deep-work': '<circle cx="8" cy="8" r="2"/><circle cx="8" cy="8" r="5.25"/>',
    call: '<path d="M6.2 3.2H4.4a1 1 0 0 0-1 1A8.6 8.6 0 0 0 12 12.8a1 1 0 0 0 1-1V10l-2.1-.8-1.1 1.1a6.2 6.2 0 0 1-3.1-3.1l1.1-1.1L6.2 3.2z"/>',
    meeting: '<circle cx="5.5" cy="5.2" r="1.7"/><circle cx="10.6" cy="5.8" r="1.4"/><path d="M2.6 12.4c.5-1.9 1.8-2.8 2.9-2.8s2.4.9 2.9 2.8"/><path d="M8.8 12.4c.3-1.4 1.3-2.1 2.2-2.1 1 0 1.8.7 2.1 2.1"/>',
    email: '<rect x="2.5" y="4" width="11" height="8" rx="1.2"/><path d="M3.2 5.2 8 8.6l4.8-3.4"/>',
    break: '<path d="M4 6.2h6.2v4.2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.2z"/><path d="M10.2 7.2h1.1a1.5 1.5 0 0 1 0 3H10.2"/><path d="M5.8 3.4v1.3M8 2.8v1.6M10 3.4v1.3"/>',
    lunch: '<path d="M4.2 2.8v3.2a1.3 1.3 0 0 0 1.3 1.3H6"/><path d="M4.2 4.4h2.6"/><path d="M5.5 7.3v6"/><path d="M11.4 2.8c.9 1.5.9 3 0 4.4l-.6.8v5.3"/>',
    task: '<rect x="2.8" y="2.8" width="10.4" height="10.4" rx="1.6"/><path d="M5.2 8.1 7.1 10l3.7-4"/>'
};

function iconKey(kind, blockType) {
    if (kind === 'task') return 'task';
    return ICON_PATHS[blockType] ? blockType : 'work';
}

function iconEl(key) {
    const span = document.createElement('span');
    span.className = 'block-icon';
    span.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${ICON_PATHS[key] || ICON_PATHS.task}</svg>`;
    return span;
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isToday(date) {
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
}

function currentKey() {
    return formatDateKey(currentDate);
}

function currentEvents() {
    return state.days[currentKey()] || [];
}

function saveCurrent(events) {
    if (events.length) state.days[currentKey()] = events;
    else delete state.days[currentKey()];
    saveState(state);
}

function minutesToY(mins) {
    return PAD + ((mins - START_MIN) / 60) * HOUR_PX;
}

function clientYToMinutes(clientY, offsetY = 0) {
    const rect = dayCol.getBoundingClientRect();
    const y = clientY - offsetY - rect.top;
    return START_MIN + ((y - PAD) / HOUR_PX) * 60;
}

function columnViewport() {
    const col = dayCol.getBoundingClientRect();
    const sc = calendarScroll.getBoundingClientRect();
    return {
        left: Math.max(col.left, sc.left),
        right: Math.min(col.right, sc.right),
        top: Math.max(col.top, sc.top),
        bottom: Math.min(col.bottom, sc.bottom)
    };
}

function pointInColumn(clientX, clientY) {
    const box = columnViewport();
    return clientX >= box.left && clientX <= box.right
        && clientY >= box.top && clientY <= box.bottom;
}

function formatHourLabel(hour) {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${suffix}`;
}

function formatMinutes(mins) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h = h24 % 12 || 12;
    if (m === 0) return `${h} ${suffix}`;
    return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatRange(start, duration) {
    return `${formatMinutes(start)} – ${formatMinutes(start + duration)}`;
}

function formatClock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function formatSpent(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    if (total < 60) return `${total}s`;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m`;
}

function tasksForDay() {
    return getTasksForDate(currentKey(), allTasks);
}

function displayTitle(ev) {
    if (ev.kind === 'task' && ev.taskId) {
        const task = tasksForDay().find((item) => item.id === ev.taskId);
        if (task) return task.text;
    }
    return ev.title;
}

function eventAtNow(events) {
    if (!isToday(currentDate)) return null;
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const hits = events.filter((ev) => m >= ev.start && m < ev.start + ev.duration);
    hits.sort((a, b) => b.start - a.start);
    return hits[0] || null;
}

function sessionLocked() {
    if (timer.running) return true;
    if (!timer.eventId) return false;
    if (timer.mode === 'break') return true;
    return timer.remaining !== state.workDuration * 60;
}

function getDisplayEvent() {
    const events = currentEvents();
    if (timer.dateKey === currentKey() && timer.eventId && (timer.running || sessionLocked())) {
        const tied = events.find((ev) => ev.id === timer.eventId);
        if (tied) return tied;
    }
    if (selectedId) {
        const selected = events.find((ev) => ev.id === selectedId);
        if (selected) return selected;
    }
    return eventAtNow(events);
}

function liveSpent(ev) {
    let seconds = ev.timeSpent || 0;
    if (timer.running && timer.mode === 'work' && timer.eventId === ev.id && timer.startedAt) {
        seconds += Math.floor((Date.now() - timer.startedAt) / 1000);
    }
    return seconds;
}

function resetRemaining() {
    const mins = timer.mode === 'work' ? state.workDuration : state.breakDuration;
    timer.total = mins * 60;
    timer.remaining = timer.total;
}

function focusEvent(id) {
    if (timer.eventId !== id) {
        if (timer.running) pauseTimer();
        timer.mode = 'work';
        resetRemaining();
        timer.eventId = id;
        timer.dateKey = currentKey();
    }
    selectedId = id;
}

function commitFocusTime() {
    if (!timer.startedAt || timer.mode !== 'work') return;
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
    if (timer.running) timer.startedAt = Date.now();
    if (elapsed <= 0 || !timer.dateKey || !timer.eventId) return;

    const events = (state.days[timer.dateKey] || []).slice();
    const ev = events.find((item) => item.id === timer.eventId);
    if (!ev) return;
    ev.timeSpent = (ev.timeSpent || 0) + elapsed;
    state.days[timer.dateKey] = events;
    saveState(state);

    if (ev.kind === 'task' && ev.taskId) {
        allTasks = loadTasks();
        const tasks = getTasksForDate(timer.dateKey, allTasks);
        const task = tasks.find((item) => item.id === ev.taskId);
        if (task) {
            task.timeSpent = (task.timeSpent || 0) + elapsed;
            allTasks = saveTasksForDate(timer.dateKey, tasks, allTasks);
        }
    }
}

function pauseTimer() {
    if (!timer.running) return;
    timer.remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
    commitFocusTime();
    timer.running = false;
    timer.startedAt = 0;
}

function startTimer() {
    const ev = getDisplayEvent();
    if (!ev) return;
    timer.eventId = ev.id;
    timer.dateKey = currentKey();
    selectedId = ev.id;
    timer.running = true;
    timer.startedAt = Date.now();
    timer.endsAt = Date.now() + timer.remaining * 1000;
    renderEvents();
    updateTimer();
}

function toggleTimer() {
    if (timer.running) {
        pauseTimer();
        renderEvents();
        updateTimer();
        return;
    }
    startTimer();
}

function completeSession() {
    const finishedWork = timer.mode === 'work';
    timer.remaining = 0;
    commitFocusTime();
    timer.running = false;
    timer.startedAt = 0;
    playChime();
    timer.mode = finishedWork ? 'break' : 'work';
    resetRemaining();
    renderEvents();
    updateTimer();
}

function playChime() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        // Audio can be blocked until a gesture; the mode switch still happens.
    }
}

function adjustDuration(delta) {
    if (timer.running) return;
    if (timer.mode === 'work') {
        state.workDuration = Math.min(60, Math.max(1, state.workDuration + delta));
    } else {
        state.breakDuration = Math.min(60, Math.max(1, state.breakDuration + delta));
    }
    saveState(state);
    resetRemaining();
    updateTimer();
}

function setMode(mode) {
    if (timer.running || mode === timer.mode) return;
    timer.mode = mode;
    resetRemaining();
    updateTimer();
}

function placeNew(spec, startMin) {
    const slot = clampPlacement(startMin, spec.duration);
    const ev = {
        id: generateId(),
        kind: spec.kind,
        blockType: spec.blockType || null,
        taskId: spec.taskId || null,
        title: spec.title,
        color: spec.color,
        start: slot.start,
        duration: slot.duration,
        timeSpent: 0
    };
    const events = currentEvents().slice();
    events.push(ev);
    saveCurrent(events);
    focusEvent(ev.id);
    renderAll();
}

function moveExisting(id, startMin) {
    const events = currentEvents().slice();
    const ev = events.find((item) => item.id === id);
    if (!ev) return;
    const slot = clampPlacement(startMin, ev.duration);
    ev.start = slot.start;
    ev.duration = slot.duration;
    saveCurrent(events);
    focusEvent(id);
    renderAll();
    scrollEventIntoView(id);
}

function resizeEvent(id, duration) {
    const events = currentEvents().slice();
    const ev = events.find((item) => item.id === id);
    if (!ev) return;
    const snapped = Math.max(SNAP, Math.round(duration / SNAP) * SNAP);
    ev.duration = Math.min(snapped, END_MIN - ev.start);
    saveCurrent(events);
    renderEvents();
    updateTimer();
}

function deleteEvent(id) {
    if (timer.eventId === id) {
        if (timer.running) pauseTimer();
        timer.eventId = null;
        timer.mode = 'work';
        resetRemaining();
    }
    if (selectedId === id) selectedId = null;
    saveCurrent(currentEvents().filter((ev) => ev.id !== id));
    renderAll();
}

function setDate(next) {
    const day = startOfDay(next);
    if (formatDateKey(day) === currentKey()) {
        if (isToday(day)) scrollToNow();
        return;
    }
    if (timer.running) pauseTimer();
    timer.eventId = null;
    timer.mode = 'work';
    resetRemaining();
    selectedId = null;
    currentDate = day;
    allTasks = loadTasks();
    renderAll();
    if (isToday(currentDate)) scrollToNow();
}

function shiftDay(delta) {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + delta);
    setDate(next);
}

function buildGrid() {
    const height = PAD + ((END_MIN - START_MIN) / 60) * HOUR_PX + PAD;
    calendar.style.height = `${height}px`;
    timeGutter.style.minHeight = `${height}px`;
    dayCol.style.minHeight = `${height}px`;

    for (let hour = 6; hour <= 17; hour += 1) {
        const top = minutesToY(hour * 60);

        const label = document.createElement('div');
        label.className = 'time-label';
        label.style.top = `${top}px`;
        label.textContent = formatHourLabel(hour);
        timeGutter.appendChild(label);

        const line = document.createElement('div');
        line.className = 'hour-line';
        line.style.top = `${top}px`;
        hourLines.appendChild(line);

        if (hour < 17) {
            const half = document.createElement('div');
            half.className = 'half-line';
            half.style.top = `${minutesToY(hour * 60 + 30)}px`;
            hourLines.appendChild(half);
        }
    }
}

function renderDate() {
    dateWeekday.textContent = isToday(currentDate)
        ? 'Today'
        : currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    dateRest.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderPalette() {
    paletteEl.replaceChildren();
    const events = currentEvents();

    const blocksSection = document.createElement('section');
    blocksSection.className = 'palette-section';
    const blocksLabel = document.createElement('div');
    blocksLabel.className = 'palette-label';
    blocksLabel.textContent = 'Blocks';
    const blockList = document.createElement('div');
    blockList.className = 'chip-list';

    for (const block of BLOCKS) {
        blockList.appendChild(makeChip({
            kind: 'block',
            blockType: block.type,
            title: block.title,
            color: block.color,
            duration: block.duration,
            meta: `${block.duration}m`
        }));
    }
    blocksSection.append(blocksLabel, blockList);

    const tasksSection = document.createElement('section');
    tasksSection.className = 'palette-section';
    const tasksHead = document.createElement('div');
    tasksHead.className = 'palette-head';
    const tasksLabel = document.createElement('div');
    tasksLabel.className = 'palette-label';
    tasksLabel.textContent = 'Tasks';
    const tasksLink = document.createElement('a');
    tasksLink.className = 'palette-link';
    tasksLink.href = '../daily-tasks/index.html';
    tasksLink.textContent = 'Edit';
    tasksHead.append(tasksLabel, tasksLink);

    const taskList = document.createElement('div');
    taskList.className = 'chip-list';
    const openTasks = tasksForDay().filter((task) => !task.completed);

    for (const task of openTasks) {
        const placed = events.find((ev) => ev.kind === 'task' && ev.taskId === task.id);
        taskList.appendChild(makeChip({
            kind: 'task',
            taskId: task.id,
            eventId: placed ? placed.id : '',
            title: task.text,
            color: TASK_COLOR,
            duration: placed ? placed.duration : 25,
            meta: placed ? formatMinutes(placed.start) : '25m',
            scheduled: Boolean(placed)
        }));
    }

    const previousInput = document.getElementById('new-task-input');
    const keepFocus = document.activeElement === previousInput;
    const draft = previousInput?.value || '';

    const row = document.createElement('form');
    row.className = 'task-input-row';
    const input = document.createElement('input');
    input.id = 'new-task-input';
    input.type = 'text';
    input.placeholder = 'Add a task...';
    input.value = draft;
    input.setAttribute('aria-label', 'New task');
    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'btn btn-icon';
    addBtn.textContent = '+';
    addBtn.setAttribute('aria-label', 'Add task');
    row.append(input, addBtn);
    row.addEventListener('submit', (event) => {
        event.preventDefault();
        addTask(input.value);
    });

    const doneList = document.createElement('div');
    doneList.className = 'chip-list done-list';
    const doneTasks = tasksForDay().filter((task) => task.completed);
    for (const task of doneTasks) {
        const placed = events.find((ev) => ev.kind === 'task' && ev.taskId === task.id);
        doneList.appendChild(makeChip({
            kind: 'task',
            taskId: task.id,
            eventId: placed ? placed.id : '',
            title: task.text,
            color: TASK_COLOR,
            duration: placed ? placed.duration : 25,
            meta: placed ? formatMinutes(placed.start) : '',
            scheduled: Boolean(placed),
            completed: true
        }));
    }

    tasksSection.append(tasksHead, taskList, row);
    if (doneTasks.length) tasksSection.append(doneList);
    paletteEl.append(blocksSection, tasksSection);
    if (keepFocus) input.focus();
}

function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const input = document.getElementById('new-task-input');
    if (input) input.value = '';
    allTasks = loadTasks();
    const tasks = getTasksForDate(currentKey(), allTasks).slice();
    tasks.push(createTask(trimmed));
    allTasks = saveTasksForDate(currentKey(), tasks, allTasks);
    renderPalette();
    document.getElementById('new-task-input')?.focus();
}

function makeChip(spec) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'block-chip';
    if (spec.scheduled) btn.classList.add('is-scheduled');
    btn.dataset.kind = spec.kind;
    btn.dataset.blockType = spec.blockType || '';
    btn.dataset.taskId = spec.taskId || '';
    btn.dataset.eventId = spec.eventId || '';
    btn.dataset.title = spec.title;
    btn.dataset.color = spec.color;
    btn.dataset.duration = String(spec.duration);
    btn.style.setProperty('--chip-color', spec.color);

    const name = document.createElement('span');
    name.className = 'chip-name';
    const label = document.createElement('span');
    label.className = 'chip-label';
    label.textContent = spec.title;
    name.append(iconEl(iconKey(spec.kind, spec.blockType)), label);
    const meta = document.createElement('span');
    meta.className = 'chip-meta';
    meta.textContent = spec.meta;
    btn.append(name, meta);
    if (spec.kind !== 'task') return btn;

    const row = document.createElement('div');
    row.className = 'task-row';
    if (spec.completed) row.classList.add('is-done');
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'task-done';
    done.dataset.taskId = spec.taskId;
    done.setAttribute('aria-label', spec.completed ? `Reopen ${spec.title}` : `Complete ${spec.title}`);
    done.textContent = '✓';
    row.append(btn, done);
    return row;
}

function completeTask(taskId) {
    const placed = currentEvents().find((ev) => ev.kind === 'task' && ev.taskId === taskId);
    const markingDone = !tasksForDay().find((item) => item.id === taskId)?.completed;
    if (markingDone && placed && timer.running && timer.eventId === placed.id) pauseTimer();

    allTasks = loadTasks();
    const tasks = getTasksForDate(currentKey(), allTasks).slice();
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    task.completed = markingDone;
    if (markingDone) {
        task.isActive = false;
        task.startTime = null;
    }
    allTasks = saveTasksForDate(currentKey(), tasks, allTasks);
    renderPalette();
    renderEvents();
    updateTimer();
}

function renderEvents() {
    const scrollTop = calendarScroll.scrollTop;
    eventsLayer.replaceChildren();
    const laid = layoutEvents(currentEvents());
    const display = getDisplayEvent();

    if (!laid.length) {
        const empty = document.createElement('div');
        empty.className = 'day-empty';
        empty.textContent = 'Drag a block onto the day';
        eventsLayer.appendChild(empty);
    }

    for (const ev of laid) {
        const height = Math.max(18, (ev.duration / 60) * HOUR_PX - 4);
        const el = document.createElement('div');
        el.className = 'cal-event';
        el.dataset.id = ev.id;
        el.style.top = `${minutesToY(ev.start)}px`;
        el.style.height = `${height}px`;
        el.style.left = `calc(4px + (100% - 8px) * ${ev.col} / ${ev.cols})`;
        el.style.width = `calc((100% - 8px) / ${ev.cols} - 3px)`;
        el.style.setProperty('--event-color', ev.color);
        el.title = formatRange(ev.start, ev.duration);
        if (height < 56) el.classList.add('is-compact');
        if (display && display.id === ev.id) el.classList.add('is-current');
        if (timer.running && timer.eventId === ev.id) el.classList.add('is-running');
        if (ev.kind === 'task' && tasksForDay().find((task) => task.id === ev.taskId)?.completed) {
            el.classList.add('is-done');
        }

        const title = document.createElement('div');
        title.className = 'event-title';
        const label = document.createElement('span');
        label.className = 'event-label';
        label.textContent = displayTitle(ev);
        title.append(iconEl(iconKey(ev.kind, ev.blockType)), label);

        const range = document.createElement('div');
        range.className = 'event-range';
        let rangeText = formatRange(ev.start, ev.duration);
        if (display && display.id === ev.id) {
            if (timer.running) rangeText += timer.mode === 'break' ? ' · Break' : ' · In progress';
            else rangeText += ' · Current';
        }
        range.textContent = rangeText;

        const spent = document.createElement('div');
        spent.className = 'event-spent';
        spent.dataset.spentFor = ev.id;
        const seconds = liveSpent(ev);
        spent.hidden = seconds <= 0;
        if (seconds > 0) spent.textContent = formatSpent(seconds);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'event-remove';
        remove.dataset.removeId = ev.id;
        remove.setAttribute('aria-label', `Remove ${displayTitle(ev)}`);
        remove.textContent = '×';

        const handle = document.createElement('div');
        handle.className = 'event-resize';
        handle.dataset.resizeId = ev.id;

        el.append(title, range, spent, remove, handle);
        eventsLayer.appendChild(el);
    }

    calendarScroll.scrollTop = scrollTop;
}

function updateNowLine() {
    if (!isToday(currentDate)) {
        nowLine.hidden = true;
        return;
    }
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    if (mins < START_MIN || mins > END_MIN) {
        nowLine.hidden = true;
        return;
    }
    nowLine.hidden = false;
    nowLine.style.top = `${minutesToY(mins)}px`;
}

function updateTimer() {
    const ev = getDisplayEvent();
    timerDisplay.textContent = formatClock(timer.remaining);

    const progress = timer.total > 0 ? 1 - (timer.remaining / timer.total) : 0;
    ringProgress.style.strokeDashoffset = String(RING_CIRC * (1 - progress));

    miniTimer.classList.toggle('break-mode', timer.mode === 'break');
    miniTimer.classList.toggle('is-running', timer.running);
    modeWork.classList.toggle('active', timer.mode === 'work');
    modeBreak.classList.toggle('active', timer.mode === 'break');

    const locked = timer.running;
    decreaseBtn.disabled = locked;
    increaseBtn.disabled = locked;
    modeWork.disabled = locked;
    modeBreak.disabled = locked;

    timerHint.textContent = `${state.workDuration}m focus · ${state.breakDuration}m break`;

    if (!ev) {
        const hasBlocks = currentEvents().length > 0;
        miniTimer.classList.add('is-idle');
        timerIcon.hidden = true;
        timerName.textContent = hasBlocks ? 'Select a block' : 'Nothing scheduled';
        timerMeta.textContent = hasBlocks ? 'Click a block to focus on it' : 'Drop a block on the day';
        timerKicker.textContent = timer.mode === 'break' ? 'Break' : 'Focus';
        playBtn.disabled = true;
        playBtn.textContent = '▶';
        playBtn.classList.remove('active');
        playBtn.setAttribute('aria-label', 'Play');
        document.title = 'Day Flow — Mono Apps';
        return;
    }

    miniTimer.classList.remove('is-idle');
    const title = displayTitle(ev);
    const key = iconKey(ev.kind, ev.blockType);
    if (timerIcon.dataset.icon !== key) {
        timerIcon.dataset.icon = key;
        timerIcon.replaceChildren(iconEl(key));
    }
    timerIcon.hidden = false;
    timerName.textContent = title;
    timerTask.title = title;
    timerTask.style.setProperty('--task-color', ev.color);

    const spent = liveSpent(ev);
    timerMeta.textContent = spent > 0
        ? `${formatRange(ev.start, ev.duration)} · ${formatSpent(spent)} tracked`
        : formatRange(ev.start, ev.duration);

    if (timer.mode === 'break') timerKicker.textContent = 'Break';
    else if (timer.running) timerKicker.textContent = 'Focus';
    else timerKicker.textContent = 'Current';

    playBtn.disabled = false;
    playBtn.textContent = timer.running ? '❚❚' : '▶';
    playBtn.classList.toggle('active', timer.running);
    playBtn.setAttribute('aria-label', timer.running ? 'Pause' : 'Play');
    document.title = `${formatClock(timer.remaining)} · ${title} — Day Flow`;
}

function updateLiveSpent() {
    if (!timer.running || timer.mode !== 'work') return;
    const ev = currentEvents().find((item) => item.id === timer.eventId);
    if (!ev) return;
    const label = formatSpent(liveSpent(ev));
    const badge = eventsLayer.querySelector(`[data-spent-for="${ev.id}"]`);
    if (badge) {
        badge.hidden = false;
        badge.textContent = label;
    }
}

function renderAll() {
    renderDate();
    renderPalette();
    renderEvents();
    updateNowLine();
    updateTimer();
}

function scrollToNow() {
    if (!isToday(currentDate)) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const target = Math.min(Math.max(mins, START_MIN), END_MIN);
    calendarScroll.scrollTop = Math.max(0, minutesToY(target) - calendarScroll.clientHeight * 0.35);
}

function scrollEventIntoView(id) {
    const ev = currentEvents().find((item) => item.id === id);
    if (!ev) return;
    const y = minutesToY(ev.start);
    const viewTop = calendarScroll.scrollTop;
    const viewBottom = viewTop + calendarScroll.clientHeight;
    if (y < viewTop + 20 || y > viewBottom - 80) {
        calendarScroll.scrollTop = Math.max(0, y - 48);
    }
}

function beginDrag(event, spec) {
    drag = {
        ...spec,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        moved: false,
        offsetY: spec.offsetY || 0,
        nextDuration: spec.duration
    };
    document.body.classList.add('is-dragging');
    document.body.classList.toggle('is-resizing', spec.type === 'resize');
    if (event.target instanceof Element) {
        try {
            event.target.setPointerCapture(event.pointerId);
        } catch (error) {
            // Capture can fail if the pointer is already gone.
        }
    }
}

function hideDragUi() {
    ghost.hidden = true;
    preview.hidden = true;
    dayCol.classList.remove('is-drop-target');
    document.body.classList.remove('is-dragging', 'is-resizing');
}

function updateDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) > 5) {
        drag.moved = true;
    }

    const sc = calendarScroll.getBoundingClientRect();
    if (drag.moved && event.clientY > sc.bottom - 36 && event.clientY < sc.bottom + 28) {
        calendarScroll.scrollTop += 16;
    } else if (drag.moved && event.clientY < sc.top + 36 && event.clientY > sc.top - 28) {
        calendarScroll.scrollTop -= 16;
    }

    if (!drag.moved) return;

    if (drag.type === 'resize') {
        const ev = currentEvents().find((item) => item.id === drag.eventId);
        if (!ev) return;
        let end = Math.round(clientYToMinutes(event.clientY) / SNAP) * SNAP;
        end = Math.max(ev.start + SNAP, Math.min(END_MIN, end));
        drag.nextDuration = end - ev.start;
        const card = eventsLayer.querySelector(`[data-id="${drag.eventId}"]`);
        if (card) {
            card.style.height = `${Math.max(18, (drag.nextDuration / 60) * HOUR_PX - 4)}px`;
            const range = card.querySelector('.event-range');
            if (range) range.textContent = formatRange(ev.start, drag.nextDuration);
        }
        return;
    }

    ghost.hidden = false;
    ghost.replaceChildren(iconEl(drag.icon || 'work'), document.createTextNode(drag.title));
    ghost.style.left = `${event.clientX + 14}px`;
    ghost.style.top = `${event.clientY + 14}px`;
    ghost.style.setProperty('--chip-color', drag.color || '#fff');

    const over = pointInColumn(event.clientX, event.clientY);
    dayCol.classList.toggle('is-drop-target', over);
    if (!over) {
        preview.hidden = true;
        return;
    }

    const duration = drag.duration;
    const slot = clampPlacement(clientYToMinutes(event.clientY, drag.offsetY), duration);
    preview.hidden = false;
    preview.style.top = `${minutesToY(slot.start)}px`;
    preview.style.height = `${Math.max(18, (slot.duration / 60) * HOUR_PX - 4)}px`;
    preview.style.setProperty('--event-color', drag.color || '#fff');
    preview.textContent = `${drag.title} · ${formatRange(slot.start, slot.duration)}`;

    if (drag.type === 'move' && drag.eventId) {
        const card = eventsLayer.querySelector(`[data-id="${drag.eventId}"]`);
        if (card) card.classList.add('is-ghosted');
    }
}

function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const spec = drag;
    drag = null;
    hideDragUi();

    if (spec.type === 'resize') {
        if (spec.moved) resizeEvent(spec.eventId, spec.nextDuration);
        else renderEvents();
        return;
    }

    if (!spec.moved) {
        if (spec.type === 'move' || spec.eventId) {
            const id = spec.eventId;
            focusEvent(id);
            renderEvents();
            updateTimer();
            scrollEventIntoView(id);
        }
        return;
    }

    if (!event || !pointInColumn(event.clientX, event.clientY)) {
        renderEvents();
        return;
    }

    const start = clientYToMinutes(event.clientY, spec.offsetY);
    if (spec.type === 'move' || spec.eventId) {
        moveExisting(spec.eventId, start);
        return;
    }
    if (spec.kind === 'task' && spec.taskId) {
        const existing = currentEvents().find((ev) => ev.taskId === spec.taskId);
        if (existing) {
            moveExisting(existing.id, start);
            return;
        }
    }
    placeNew(spec, start);
}

function onPalettePointerDown(event) {
    const done = event.target.closest('.task-done');
    if (done) {
        event.preventDefault();
        completeTask(done.dataset.taskId);
        return;
    }
    const chip = event.target.closest('.block-chip');
    if (!chip || event.button !== 0 || chip.closest('.task-row.is-done')) return;
    event.preventDefault();
    beginDrag(event, {
        type: 'place',
        kind: chip.dataset.kind,
        blockType: chip.dataset.blockType,
        taskId: chip.dataset.taskId,
        eventId: chip.dataset.eventId,
        title: chip.dataset.title,
        color: chip.dataset.color,
        duration: Number(chip.dataset.duration) || 30,
        icon: iconKey(chip.dataset.kind, chip.dataset.blockType)
    });
}

function onDayPointerDown(event) {
    if (event.button !== 0) return;
    const removeBtn = event.target.closest('.event-remove');
    if (removeBtn) {
        event.preventDefault();
        event.stopPropagation();
        deleteEvent(removeBtn.dataset.removeId);
        return;
    }
    const handle = event.target.closest('.event-resize');
    if (handle) {
        event.preventDefault();
        const id = handle.dataset.resizeId;
        const ev = currentEvents().find((item) => item.id === id);
        beginDrag(event, {
            type: 'resize',
            eventId: id,
            title: ev ? displayTitle(ev) : '',
            color: ev?.color || '#fff',
            duration: ev?.duration || SNAP,
            icon: iconKey(ev?.kind, ev?.blockType)
        });
        return;
    }
    const card = event.target.closest('.cal-event');
    if (!card) return;
    event.preventDefault();
    const id = card.dataset.id;
    const ev = currentEvents().find((item) => item.id === id);
    beginDrag(event, {
        type: 'move',
        eventId: id,
        title: ev ? displayTitle(ev) : '',
        color: ev?.color || '#fff',
        duration: ev?.duration || SNAP,
        icon: iconKey(ev?.kind, ev?.blockType),
        offsetY: event.clientY - card.getBoundingClientRect().top
    });
}

function onDayPointerUp(event) {
    if (drag) return;
    if (event.target.closest('.cal-event')) return;
    if (timer.running || sessionLocked()) return;
    if (!selectedId && !timer.eventId) return;
    selectedId = null;
    timer.eventId = null;
    timer.mode = 'work';
    resetRemaining();
    renderEvents();
    updateTimer();
}

function tick() {
    if (timer.running) {
        const left = Math.round((timer.endsAt - Date.now()) / 1000);
        if (left <= 0) {
            completeSession();
            return;
        }
        timer.remaining = left;
    }
    updateNowLine();
    if (!drag) updateTimer();
    updateLiveSpent();

    if (drag || timer.running || selectedId || sessionLocked()) return;
    const nowId = eventAtNow(currentEvents())?.id || null;
    if (nowId === lastNowEventId) return;
    lastNowEventId = nowId;
    renderEvents();
    updateTimer();
}

function bind() {
    paletteEl.addEventListener('pointerdown', onPalettePointerDown);
    dayCol.addEventListener('pointerdown', onDayPointerDown);
    dayCol.addEventListener('pointerup', onDayPointerUp);
    window.addEventListener('pointermove', updateDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag = null;
        hideDragUi();
        renderEvents();
    });

    playBtn.addEventListener('click', toggleTimer);
    decreaseBtn.addEventListener('click', () => adjustDuration(-1));
    increaseBtn.addEventListener('click', () => adjustDuration(1));
    modeWork.addEventListener('click', () => setMode('work'));
    modeBreak.addEventListener('click', () => setMode('break'));
    document.getElementById('prev-day').addEventListener('click', () => shiftDay(-1));
    document.getElementById('next-day').addEventListener('click', () => shiftDay(1));
    document.getElementById('today-btn').addEventListener('click', () => setDate(new Date()));

    document.addEventListener('keydown', (event) => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (event.code === 'Space' && tag !== 'BUTTON') {
            event.preventDefault();
            toggleTimer();
        } else if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId) {
            event.preventDefault();
            deleteEvent(selectedId);
        }
    });

    window.addEventListener('pagehide', () => {
        if (timer.running) commitFocusTime();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && timer.running) commitFocusTime();
    });

    window.addEventListener('storage', (event) => {
        if (event.key !== 'mono-daily-tasks' && event.key !== 'mono-day-flow') return;
        if (drag || timer.running) return;
        allTasks = loadTasks();
        state = loadState();
        renderAll();
    });
}

function init() {
    ringProgress.style.strokeDasharray = String(RING_CIRC);
    ringProgress.style.strokeDashoffset = String(RING_CIRC);
    buildGrid();
    bind();
    renderAll();
    scrollToNow();
    lastNowEventId = eventAtNow(currentEvents())?.id || null;
    setInterval(tick, 250);
}

init();

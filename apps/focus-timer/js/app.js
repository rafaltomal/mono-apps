// Main application module for Focus Timer
// Pomodoro-style timer with work/break sessions

import {
    loadSettings,
    saveSettings,
    updateWorkDuration,
    updateBreakDuration,
    incrementSession
} from './storage.js';

// App state
let settings = loadSettings();
let mode = 'work'; // 'work' or 'break'
let timeRemaining = settings.workDuration * 60; // in seconds
let totalTime = settings.workDuration * 60;
let timerInterval = null;
let isRunning = false;

// DOM Elements
const timerContainer = document.querySelector('.timer-container');
const timerDisplay = document.getElementById('timer-display');
const timerProgress = document.querySelector('.timer-progress');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const decreaseBtn = document.getElementById('decrease-time');
const increaseBtn = document.getElementById('increase-time');
const modeBtns = document.querySelectorAll('.mode-btn');
const sessionCount = document.getElementById('session-count');
const totalTimeEl = document.getElementById('total-time');

// Circle circumference for progress
const CIRCUMFERENCE = 2 * Math.PI * 90; // radius = 90

// Initialize the app
function init() {
    settings = loadSettings();
    updateDisplay();
    updateStats();
    setupEventListeners();
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update the timer display
function updateDisplay() {
    timerDisplay.textContent = formatTime(timeRemaining);

    // Update progress ring
    const progress = 1 - (timeRemaining / totalTime);
    const offset = CIRCUMFERENCE * (1 - progress);
    timerProgress.style.strokeDashoffset = offset;

    // Update page title
    document.title = `${formatTime(timeRemaining)} - Focus Timer`;
}

// Update session stats
function updateStats() {
    sessionCount.textContent = settings.sessionsCompleted;

    const hours = Math.floor(settings.totalFocusTime / 60);
    const mins = settings.totalFocusTime % 60;
    if (hours > 0) {
        totalTimeEl.textContent = `${hours}h ${mins}m`;
    } else {
        totalTimeEl.textContent = `${mins}m`;
    }
}

// Start or pause the timer
function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

// Start the timer
function startTimer() {
    isRunning = true;
    timerContainer.classList.add('running');
    startBtn.textContent = 'Pause';

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateDisplay();

        if (timeRemaining <= 0) {
            completeSession();
        }
    }, 1000);
}

// Pause the timer
function pauseTimer() {
    isRunning = false;
    timerContainer.classList.remove('running');
    startBtn.textContent = 'Start';

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Complete a session
function completeSession() {
    pauseTimer();

    if (mode === 'work') {
        // Increment completed sessions
        settings = incrementSession(settings.workDuration);
        updateStats();

        // Play notification sound (optional - using Web Audio API)
        playNotification();

        // Switch to break mode
        switchMode('break');
    } else {
        // Break is over, switch back to work
        playNotification();
        switchMode('work');
    }
}

// Play a simple notification sound
function playNotification() {
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
    } catch (e) {
        // Audio not supported, skip notification
    }
}

// Switch between work and break modes
function switchMode(newMode) {
    mode = newMode;

    // Update mode buttons
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update container class for styling
    timerContainer.classList.toggle('break-mode', mode === 'break');

    // Set time based on mode
    if (mode === 'work') {
        totalTime = settings.workDuration * 60;
    } else {
        totalTime = settings.breakDuration * 60;
    }
    timeRemaining = totalTime;

    updateDisplay();
}

// Reset the timer
function resetTimer() {
    pauseTimer();

    if (mode === 'work') {
        totalTime = settings.workDuration * 60;
    } else {
        totalTime = settings.breakDuration * 60;
    }
    timeRemaining = totalTime;

    updateDisplay();
}

// Adjust time (increase or decrease)
function adjustTime(delta) {
    if (isRunning) return;

    const currentMinutes = Math.round(totalTime / 60);
    const newMinutes = Math.max(1, Math.min(60, currentMinutes + delta));

    if (mode === 'work') {
        settings = updateWorkDuration(newMinutes);
    } else {
        settings = updateBreakDuration(newMinutes);
    }

    totalTime = newMinutes * 60;
    timeRemaining = totalTime;

    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
    startBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);

    decreaseBtn.addEventListener('click', () => adjustTime(-1));
    increaseBtn.addEventListener('click', () => adjustTime(1));

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isRunning) {
                switchMode(btn.dataset.mode);
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            toggleTimer();
        } else if (e.code === 'KeyR') {
            resetTimer();
        }
    });
}

// Start the app
init();

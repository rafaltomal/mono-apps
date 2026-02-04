// Main application module for Habit Tracker
// Handles state management and event coordination

import {
    loadHabits,
    saveHabits,
    createHabit,
    toggleCompletion,
    formatDateKey
} from './storage.js';

import {
    renderMonthNav,
    renderCalendar,
    renderHabitsList,
    renderAddHabitForm
} from './ui.js';

// App state
let habits = [];
let currentDate = new Date(); // Month being viewed
let selectedDate = new Date(); // Day selected for checking habits

// Initialize the app
function init() {
    // Load data from storage
    habits = loadHabits();

    // Initial render
    render();
}

// Main render function
function render() {
    // Render month navigation
    renderMonthNav(currentDate, {
        onPrevMonth: handlePrevMonth,
        onNextMonth: handleNextMonth
    });

    // Render calendar with dots
    renderCalendar(habits, currentDate, selectedDate, {
        onSelectDate: handleSelectDate
    });

    // Render habits list for selected day
    renderHabitsList(habits, selectedDate, {
        onToggle: handleToggleCompletion,
        onDelete: handleDeleteHabit
    });

    // Render add habit form
    renderAddHabitForm({
        onAdd: handleAddHabit
    });
}

// Navigate to previous month
function handlePrevMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    // Keep selected date if it's in the new month, otherwise select first day
    if (selectedDate.getMonth() !== currentDate.getMonth() ||
        selectedDate.getFullYear() !== currentDate.getFullYear()) {
        selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    }
    render();
}

// Navigate to next month
function handleNextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    // Keep selected date if it's in the new month, otherwise select first day
    if (selectedDate.getMonth() !== currentDate.getMonth() ||
        selectedDate.getFullYear() !== currentDate.getFullYear()) {
        selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    }
    render();
}

// Select a date from calendar
function handleSelectDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    selectedDate = new Date(year, month - 1, day);
    render();
}

// Add a new habit
function handleAddHabit(name) {
    if (!name.trim()) return;

    // Check for duplicate
    const exists = habits.some(h => h.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
        alert('A habit with this name already exists.');
        return;
    }

    const newHabit = createHabit(name);
    habits.push(newHabit);
    saveHabits(habits);
    render();
}

// Delete a habit
function handleDeleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    habits = habits.filter(h => h.id !== habitId);
    saveHabits(habits);
    render();
}

// Toggle habit completion for selected date
function handleToggleCompletion(habitId, dateKey) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    toggleCompletion(habit, dateKey);
    saveHabits(habits);
    render();
}

// Start the app
init();

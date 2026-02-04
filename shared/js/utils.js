/**
 * Mono Dashboard - Shared Utility Functions
 */

/**
 * DOM Helpers
 */
export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

/**
 * Create an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                el.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    });

    if (typeof children === 'string') {
        el.textContent = children;
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof HTMLElement) {
                el.appendChild(child);
            }
        });
    }

    return el;
}

/**
 * Date Helpers
 */
export const formatDate = (date, format = 'short') => {
    const d = new Date(date);

    switch (format) {
        case 'short':
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case 'long':
            return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        case 'iso':
            return d.toISOString().split('T')[0];
        case 'weekday':
            return d.toLocaleDateString('en-US', { weekday: 'short' });
        default:
            return d.toLocaleDateString();
    }
};

export const isToday = (date) => {
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
};

export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Array Helpers
 */
export const groupBy = (array, keyFn) => {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
    }, {});
};

/**
 * Debounce function
 */
export const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/**
 * Generate unique ID
 */
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Screen/View Management
 */
export const showScreen = (screenId) => {
    $$('.screen').forEach(screen => screen.classList.remove('active'));
    const target = $(`#${screenId}`);
    if (target) target.classList.add('active');
};

/**
 * Modal Management
 */
export const openModal = (modalId) => {
    const modal = $(`#${modalId}`);
    if (modal) modal.classList.add('active');
};

export const closeModal = (modalId) => {
    const modal = $(`#${modalId}`);
    if (modal) modal.classList.remove('active');
};

export const closeAllModals = () => {
    $$('.modal').forEach(modal => modal.classList.remove('active'));
};

export default {
    $,
    $$,
    createElement,
    formatDate,
    isToday,
    addDays,
    groupBy,
    debounce,
    generateId,
    showScreen,
    openModal,
    closeModal,
    closeAllModals
};

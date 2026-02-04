/**
 * Mono Dashboard - Shared Storage Utilities
 * Simple localStorage wrapper with namespacing per app
 */

export const Storage = {
    /**
     * Get data from storage
     * @param {string} appName - The app namespace (e.g., 'focus-flow', 'habits')
     * @param {string} key - The key to retrieve
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} The stored value or default
     */
    get(appName, key, defaultValue = null) {
        try {
            const fullKey = `mono-${appName}-${key}`;
            const value = localStorage.getItem(fullKey);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('Storage.get error:', e);
            return defaultValue;
        }
    },

    /**
     * Save data to storage
     * @param {string} appName - The app namespace
     * @param {string} key - The key to store
     * @param {*} value - The value to store (will be JSON stringified)
     */
    set(appName, key, value) {
        try {
            const fullKey = `mono-${appName}-${key}`;
            localStorage.setItem(fullKey, JSON.stringify(value));
        } catch (e) {
            console.error('Storage.set error:', e);
        }
    },

    /**
     * Remove a key from storage
     * @param {string} appName - The app namespace
     * @param {string} key - The key to remove
     */
    remove(appName, key) {
        try {
            const fullKey = `mono-${appName}-${key}`;
            localStorage.removeItem(fullKey);
        } catch (e) {
            console.error('Storage.remove error:', e);
        }
    },

    /**
     * Clear all data for a specific app
     * @param {string} appName - The app namespace to clear
     */
    clearApp(appName) {
        try {
            const prefix = `mono-${appName}-`;
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.error('Storage.clearApp error:', e);
        }
    },

    /**
     * Get all keys for a specific app
     * @param {string} appName - The app namespace
     * @returns {string[]} Array of keys (without the prefix)
     */
    getAppKeys(appName) {
        const prefix = `mono-${appName}-`;
        const keys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keys.push(key.replace(prefix, ''));
            }
        }

        return keys;
    }
};

export default Storage;

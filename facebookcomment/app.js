// facebookcomment/app.js

import { appState } from './utils/app-state.js';
import { setupEventListeners } from './utils/app-event-listeners.js';

// Initialize event listeners
export function initializeApp() {
    setupEventListeners();
    console.log("Main Facebook Comments Viewer app.js loaded.");
}

// Auto-initialize if not being imported
if (typeof window !== 'undefined') {
    initializeApp();
}
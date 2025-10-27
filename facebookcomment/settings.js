// facebookcomment/settings.js

import { appState } from './utils/app-state.js';
import { initializeSettingsPage } from './utils/settings-page-initializer.js';

document.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons();
    initializeSettingsPage(appState);
    console.log("Settings page initialized.");
});
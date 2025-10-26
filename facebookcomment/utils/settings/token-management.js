// facebookcomment/utils/settings/token-management.js

import { saveToken } from '../../../shared/api/tpos-api.js'; // Import saveToken directly

/**
 * Toggles the visibility of the Bearer Token input field.
 */
export function toggleTokenVisibilitySettings() {
    const input = document.getElementById("bearerTokenSettings");
    const icon = document.getElementById("eyeIconSettings");

    if (input.type === "password") {
        input.type = "text";
        icon.setAttribute("data-lucide", "eye-off");
    } else {
        input.type = "password";
        icon.setAttribute("data-lucide", "eye");
    }
    window.lucide.createIcons();
}

/**
 * Saves the Bearer Token from the settings page input.
 * @param {string} inputId - The ID of the input field containing the token.
 */
export function saveTokenSettings(inputId = 'bearerTokenSettings') {
    saveToken(null, inputId); // Use imported saveToken directly
}
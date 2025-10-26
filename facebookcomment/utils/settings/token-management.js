// facebookcomment/utils/settings/token-management.js

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
 */
export function saveTokenSettings() {
    window.TPOS_API.saveToken(null, 'bearerTokenSettings'); // Use the new input ID
}
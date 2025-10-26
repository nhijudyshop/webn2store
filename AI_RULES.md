# AI_RULES.md

This document outlines the technical stack and guidelines for library usage within this application.

## Tech Stack

*   **Frontend**: The application's user interface is built using standard web technologies: HTML, CSS, and Vanilla JavaScript.
*   **Backend**: The server-side logic and API endpoints are powered by Node.js with the Express.js framework.
*   **Styling**: Custom CSS is used for all styling, ensuring a responsive and consistent design across the application.
*   **Icons**: Lucide Icons are integrated via a CDN to provide a scalable and consistent icon set.
*   **API Communication**:
    *   **Client-side**: The native `fetch` API is used for making HTTP requests from the browser.
    *   **Server-side**: The `axios` library is used for making HTTP requests to external services from the Node.js backend.
*   **Real-time Features**: Server-Sent Events (SSE) are utilized for real-time data streaming, such as live comment updates.
*   **Data Persistence**:
    *   **Client-side**: `localStorage` is used for storing user-specific settings and cached data.
    *   **Server-side**: JSON files are used for managing application settings (e.g., printers, template configurations, last session).
*   **Development Tools**: `nodemon` is used to automatically restart the Node.js server during development, improving workflow efficiency.

## Library Usage Rules

To maintain consistency and efficiency, please adhere to the following rules when developing or modifying the application:

*   **Frontend Development**: All new frontend features and modifications should be implemented using Vanilla JavaScript. Avoid introducing new frontend frameworks or libraries unless explicitly approved.
*   **Styling**: Continue to use and extend the existing custom CSS (`styles.css`, `common.css`). New styles should align with the current design language and responsive patterns.
*   **Icons**: Always use Lucide Icons for any iconography. Ensure `lucide.createIcons()` is called after any dynamic DOM manipulation that adds new icons.
*   **Client-Side API Calls**: Use the native `fetch` API for all HTTP requests initiated from the browser.
*   **Server-Side API Calls**: Use the `axios` library for making HTTP requests from the Node.js backend to external APIs.
*   **Server-Side Utilities**: Leverage Node.js built-in modules such as `fs` for file system operations and `path` for path manipulation.
*   **Notifications**: Utilize the existing `showNotification` function for providing user feedback and alerts.
*   **Routing**: Navigation between pages should be managed through direct HTML links and JavaScript-based page loading, consistent with the current application structure.
/**
 * Helper function to get Authorization header from client request
 * @param {object} req - Express request object
 * @returns {string} Authorization header value
 * @throws {Error} If Authorization header with Bearer token is missing
 */
function getAuthHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Authorization header with Bearer token is required.");
    }
    return authHeader;
}

/**
 * Generate GUID (UUID v4)
 * @returns {string} A new GUID string
 */
function generateGuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        },
    );
}

module.exports = {
    getAuthHeader,
    generateGuid,
};
(function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isLoginPage = window.location.pathname.endsWith('/login.html') || window.location.pathname === '/';

    if (!isLoggedIn && !isLoginPage) {
        // If not logged in and not on the login page, redirect to login
        window.location.href = '/public/login.html';
    } else if (isLoggedIn && isLoginPage) {
        // If logged in and on the login page, redirect to the main app
        window.location.href = '/facebookcomment/index.html';
    }
})();
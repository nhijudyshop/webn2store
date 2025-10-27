(function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('/login.html') || currentPath === '/';

    const pagePermissions = {
        '/facebookcomment/index.html': ['admin', 'manager', 'mod', 'staff', 'member'],
        '/pages/product/inventory.html': ['admin', 'manager', 'mod', 'staff'],
        '/pages/orders/orders.html': ['admin', 'manager', 'mod', 'staff'],
        '/facebookcomment/settings.html': ['admin', 'manager'],
        '/pages/users/users.html': ['admin']
    };

    if (!isLoggedIn && !isLoginPage) {
        window.location.href = '/public/login.html';
        return;
    }

    if (isLoggedIn) {
        if (isLoginPage) {
            window.location.href = '/facebookcomment/index.html';
            return;
        }

        const allowedRoles = pagePermissions[currentPath];
        if (allowedRoles && !allowedRoles.includes(userRole)) {
            // User is logged in but doesn't have permission for this page
            alert('Bạn không có quyền truy cập trang này.');
            window.location.href = '/facebookcomment/index.html'; // Redirect to a default page
        }
    }
})();
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    // If already logged in, redirect to main app
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = '/facebookcomment/index.html';
        return;
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';
        submitButton.disabled = true;
        submitButton.textContent = 'Đang xử lý...';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/app-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
            }

            // Set login flag and user role
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', result.role);

            // Check for TPOS token, if not present, fetch it
            if (!localStorage.getItem('tpos_bearer_token')) {
                console.log('TPOS token not found. Fetching a new one...');
                const tokenResponse = await fetch('/api/tpos-login', { method: 'POST' });
                const tokenResult = await tokenResponse.json();

                if (!tokenResponse.ok || !tokenResult.success) {
                    throw new Error(tokenResult.error || 'Đăng nhập vào ứng dụng thành công, nhưng không thể lấy token TPOS.');
                }

                const accessToken = tokenResult.data.access_token;
                if (accessToken) {
                    localStorage.setItem('tpos_bearer_token', accessToken);
                    console.log('New TPOS token fetched and saved successfully.');
                } else {
                     throw new Error('Không nhận được access token từ TPOS.');
                }
            }

            // Redirect to the main application
            window.location.href = '/facebookcomment/index.html';

        } catch (error) {
            errorMessage.textContent = error.message;
            submitButton.disabled = false;
            submitButton.textContent = 'Đăng nhập';
        }
    });
});
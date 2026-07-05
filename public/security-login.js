document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error');

    errorEl.style.display = 'none';

    try {
        const response = await fetch('/security/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Invalid Credentials');
        }

        // Save token to localStorage
        localStorage.setItem('securityToken', data.token);

        // Redirect to dashboard
        window.location.href = 'security-dashboard.html';

    } catch (err) {
        errorEl.textContent = '❌ ' + err.message;
        errorEl.style.display = 'block';
    }
});

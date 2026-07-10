async function checkLogin() {

    try {

        const response = await fetch("/security/check-auth", {
            credentials: "include"
        });

        if (!response.ok) {

            window.location.href = "/security-login.html";
            return;

        }

    } catch (err) {

        window.location.href = "/security-login.html";

    }

}

checkLogin();


async function logoutSecurity() {
    await fetch('/security/logout', {
        method: 'POST',
        credentials: 'include'
    });

    window.location.href = 'security-login.html';
}

let allVisitors = [];

async function loadPendingVisitors() {
    try {
        document.getElementById('visitorList').innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading visitors...</p></div>';

        const response = await fetch("/security/pending", {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${securityToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logoutSecurity();
            }
            throw new Error('Failed to fetch pending visitors');
        }

        const data = await response.json();

        allVisitors = data.visitors || [];

        // Load stats
        loadStats();

        // Display visitors
        displayVisitors(allVisitors);

    } catch (error) {
        console.error('Error loading visitors:', error);
        showError('Failed to load pending visitors: ' + error.message);
    }
}

function loadStats() {
    try {
        const pendingCount = allVisitors.filter(v => v.status === 'pending_security').length;
        document.getElementById("waitingCount").innerText = pendingCount;

        const employeeCount = new Set(allVisitors.map(v => v.employee_id)).size;
        document.getElementById("employeeCount").innerText = employeeCount;

        document.getElementById("approvedCount").innerText = '0';
        document.getElementById("checkedCount").innerText = '0';

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function displayVisitors(visitors) {
    const container = document.getElementById("visitorList");

    if (visitors.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>✓ No pending visitors</p><p style="font-size: 14px;">All visitors have been verified!</p></div>';
        return;
    }

    container.innerHTML = "";

    visitors.forEach(visitor => {
        container.innerHTML += `
        <div>
            <h3>${escapeHtml(visitor.name)}</h3>

            <p>
                📄 <strong>Document:</strong> ${escapeHtml(visitor.document_type)}
            </p>

            <p>
                🎯 <strong>Purpose:</strong> ${escapeHtml(visitor.purpose)}
            </p>

            <p>
                👨 <strong>For Employee:</strong> ${visitor.employee_name ? escapeHtml(visitor.employee_name) : (visitor.employee_name_input ? escapeHtml(visitor.employee_name_input) + ' (' + escapeHtml(visitor.department_input || 'N/A') + ') (Unverified)' : 'N/A')}
            </p>

            <p>
                📞 <strong>Phone:</strong> ${escapeHtml(visitor.phone)}
            </p>

            <p>
                📧 <strong>Email:</strong> ${escapeHtml(visitor.email)}
            </p>

            <p>
                🕐 <strong>Registered:</strong> ${new Date(visitor.created_at).toLocaleString()}
            </p>

            <button onclick="verifyVisitor(${visitor.id})">
                🔍 Verify Visitor
            </button>
        </div>
        `;
    });
}

function verifyVisitor(visitorId) {
    window.location.href = `security-verify.html?id=${visitorId}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            if (searchTerm === '') {
                displayVisitors(allVisitors);
                return;
            }

            const filtered = allVisitors.filter(visitor => {
                return (
                    visitor.name.toLowerCase().includes(searchTerm) ||
                    visitor.phone.toLowerCase().includes(searchTerm) ||
                    visitor.email.toLowerCase().includes(searchTerm) ||
                    visitor.purpose.toLowerCase().includes(searchTerm) ||
                    (visitor.employee_name && visitor.employee_name.toLowerCase().includes(searchTerm))
                );
            });

            displayVisitors(filtered);
        });
    }
});

async function logoutSecurity() {

    await fetch("/security/logout", {

        method: "POST",

        credentials: "include"

    });

    window.location.href = "/security-login.html";

}

function onScanSuccess(decodedText) {
    if (scanner) {
        scanner.clear();
    }

    let visitorId = null;
    let token = null;

    try {
        const url = new URL(decodedText);
        visitorId = url.searchParams.get('id');
        token = url.searchParams.get('token');
    } catch (e) {
        // Fallback for older format: /visitor/scan/ID?token=TOKEN
        const matches = decodedText.match(/visitor\/scan\/(\d+)/);
        if (matches) {
            visitorId = matches[1];
            const tokenMatch = decodedText.match(/[?&]token=([^&]+)/);
            if (tokenMatch) {
                token = tokenMatch[1];
            }
        }
    }

    if (!visitorId || !token) {
        document.getElementById('result').innerHTML = `<div class="error" style="color: #ef4444; font-weight: bold;">❌ Invalid QR Code Format</div>`;
        setTimeout(() => {
            startScanner();
        }, 3000);
        return;
    }

    fetch('/visitor/check-in-out', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${securityToken}`
        },
        body: JSON.stringify({ id: visitorId, token: token })
    })
        .then(res => {
            if (!res.ok) {
                throw new Error('Verification failed or unauthorized scan');
            }
            return res.text();
        })
        .then(data => {
            document.getElementById('result').innerHTML = data;
            setTimeout(() => {
                startScanner();
            }, 3000);
        })
        .catch(error => {
            console.error('QR Scan Error:', error);
            document.getElementById('result').innerHTML = `<div class="error" style="color: #ef4444; font-weight: bold;">❌ Error: ${error.message}</div>`;
            setTimeout(() => {
                startScanner();
            }, 3000);
        });
}

let scanner;

function startScanner() {
    try {
        if (scanner) {
            scanner.clear();
        }

        scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: 250
            }
        );

        scanner.render(onScanSuccess, (error) => {
            // Error callback
        });

        document.getElementById('startScanner').textContent = '⏹ Stop Scanner';
        document.getElementById('startScanner').onclick = stopScanner;

    } catch (error) {
        console.error('Scanner Error:', error);
        showError('Failed to start QR scanner: ' + error.message);
    }
}

function stopScanner() {
    if (scanner) {
        scanner.clear();
        document.getElementById('startScanner').textContent = '▶ Start Scanner';
        document.getElementById('startScanner').onclick = startScanner;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startScannerBtn = document.getElementById('startScanner');

    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', startScanner);
    }
});

function showError(message) {
    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error';
        document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.card'));
    }

    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

loadPendingVisitors();
setInterval(loadPendingVisitors, 30000);
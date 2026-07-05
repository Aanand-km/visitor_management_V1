const securityToken = localStorage.getItem('securityToken');
if (!securityToken) {
    window.location.href = 'security-login.html';
}

function logoutSecurity() {
    localStorage.removeItem('securityToken');
    window.location.href = 'security-login.html';
}

let allVisitors = [];

async function loadPendingVisitors() {
    try {
        document.getElementById('visitorList').innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading visitors...</p></div>';

        const response = await fetch("/security/pending", {
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
                👨 <strong>For Employee:</strong> ${visitor.employee_name ? escapeHtml(visitor.employee_name) : 'N/A'}
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

function onScanSuccess(decodedText) {
    if (scanner) {
        scanner.clear();
    }

    const visitorId = decodedText.split('/').pop();

    fetch(`/visitor/scan/${visitorId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error('Visitor not found or invalid QR code');
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
            document.getElementById('result').innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
            setTimeout(() => {
                startScanner();
            }, 2000);
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
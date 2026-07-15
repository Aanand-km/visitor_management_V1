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

    window.location.href = '/security-login.html';
}

let allVisitors = [];

function playNotificationChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const notes = [1046.50, 1318.51, 1567.98];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
            
            gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + idx * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
            
            osc.start(ctx.currentTime + idx * 0.12);
            osc.stop(ctx.currentTime + idx * 0.12 + 0.38);
        });
    } catch (e) {
        console.warn("Audio Context blocked:", e);
    }
}

function showToast(title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div style="font-size: 20px; line-height: 1;">🔔</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);

    const autoRemove = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 6000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    });
}

function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }
}

function showSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification(title, {
                body: body,
                icon: '/favicon.png'
            });
        } catch (e) {
            console.warn("Notification construct error:", e);
        }
    }
}

function triggerNewVisitorNotification(visitor) {
    playNotificationChime();
    
    const hostName = visitor.employee_name || visitor.employee_name_input || 'Employee';
    const title = 'New Visitor Registered';
    const message = `${visitor.name} has registered to meet ${hostName} (Purpose: ${visitor.purpose})`;
    
    showToast(title, message);
    showSystemNotification(title, message);
}

async function loadPendingVisitors(initial = true) {
    try {
        if (initial) {
            document.getElementById('visitorList').innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading visitors...</p></div>';
        }

        const response = await fetch("/security/pending", {
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logoutSecurity();
            }
            throw new Error('Failed to fetch pending visitors');
        }

        const data = await response.json();
        const oldVisitors = allVisitors;
        allVisitors = data.visitors || [];

        // Check if there are new visitors (only on background reloads)
        if (!initial && oldVisitors.length > 0) {
            const oldIds = new Set(oldVisitors.map(v => v.id));
            allVisitors.forEach(v => {
                if (!oldIds.has(v.id)) {
                    triggerNewVisitorNotification(v);
                }
            });
        }

        // Load stats
        loadStats();

        // Display visitors
        displayVisitors(allVisitors);

    } catch (error) {
        console.error('Error loading visitors:', error);
        if (initial) {
            showError('Failed to load pending visitors: ' + error.message);
        }
    }
}

async function loadStats() {
    try {
        const response = await fetch("/security/stats", {
            credentials: "include"
        });
        if (!response.ok) throw new Error("Failed to fetch statistics");
        const stats = await response.json();
        
        document.getElementById("waitingCount").innerText = stats.pending_security;
        document.getElementById("employeeCount").innerText = stats.pending_employee;
        document.getElementById("approvedCount").innerText = stats.approved_today;
        document.getElementById("checkedCount").innerText = stats.checked_in;
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
    window.location.href = `/security-verify.html?id=${visitorId}`;
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

function playChime(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (type === 'success_in') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
            osc.start();
            
            osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'success_out') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
            osc.start();
            
            osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12); // C5
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'warning') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.type = 'triangle';
            osc2.type = 'triangle';
            
            osc1.frequency.setValueAtTime(220, ctx.currentTime); // A3
            osc2.frequency.setValueAtTime(233.08, ctx.currentTime); // A#3 (tritone dissonance)
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            osc1.start();
            osc2.start();
            
            osc1.stop(ctx.currentTime + 0.4);
            osc2.stop(ctx.currentTime + 0.4);
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        }
    } catch (err) {
        console.warn("Web Audio API not allowed or supported by browser context:", err);
    }
}

function renderScanResult(type, title, name, timeInfo, isWarning = false) {
    let cardClass = 'success-check-in';
    let iconSvg = '';
    
    if (type === 'check_in') {
        cardClass = 'success-check-in';
        iconSvg = `
          <svg fill="none" stroke="#10b981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        `;
    } else if (type === 'check_out') {
        cardClass = 'success-check-out';
        iconSvg = `
          <svg fill="none" stroke="#3b82f6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
        `;
    } else if (isWarning) {
        cardClass = 'warning-error';
        iconSvg = `
          <svg fill="none" stroke="#f59e0b" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        `;
    } else {
        cardClass = 'error-danger';
        iconSvg = `
          <svg fill="none" stroke="#ef4444" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        `;
    }

    const timestampHtml = timeInfo ? `<div class="scan-meta">🕒 Time: ${timeInfo}</div>` : '';
    
    return `
      <div class="scan-result-card ${cardClass}">
        <div class="scan-icon-container">
          ${iconSvg}
        </div>
        <div class="scan-title">${escapeHtml(title)}</div>
        <div class="scan-visitor-name">${escapeHtml(name)}</div>
        ${timestampHtml}
      </div>
    `;
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
        playChime('error');
        document.getElementById('result').innerHTML = renderScanResult('error', 'Invalid Scan', 'Invalid QR Code Format', null);
        setTimeout(() => {
            startScanner();
        }, 4000);
        return;
    }

    fetch('/visitor/check-in-out', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: visitorId, token: token })
    })
        .then(res => {
            return res.json().then(data => {
                if (!res.ok) {
                    throw new Error(data.message || 'Verification failed');
                }
                return data;
            });
        })
        .then(data => {
            if (data.success) {
                if (data.action === 'check_in') {
                    playChime('success_in');
                    const timeString = new Date(data.time).toLocaleTimeString();
                    document.getElementById('result').innerHTML = renderScanResult('check_in', 'Check-In Successful', data.name, timeString);
                } else if (data.action === 'check_out') {
                    playChime('success_out');
                    const timeString = new Date(data.time).toLocaleTimeString();
                    document.getElementById('result').innerHTML = renderScanResult('check_out', 'Check-Out Successful', data.name, timeString);
                }
            } else {
                if (data.action === 'already_completed') {
                    playChime('warning');
                    document.getElementById('result').innerHTML = renderScanResult('warning', 'Visit Already Completed', data.name, null, true);
                } else {
                    playChime('error');
                    document.getElementById('result').innerHTML = renderScanResult('error', 'Error', data.message || 'Failed to update', null);
                }
            }
            
            // Reload stats and pending list to update counts
            loadPendingVisitors();
            
            setTimeout(() => {
                startScanner();
            }, 4000);
        })
        .catch(error => {
            console.error('QR Scan Error:', error);
            playChime('error');
            document.getElementById('result').innerHTML = renderScanResult('error', 'Verification Failed', error.message, null);
            setTimeout(() => {
                startScanner();
            }, 4000);
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

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadPendingVisitors(true));
    }

    // Request desktop notification permission on page load
    requestNotificationPermission();
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

// Socket.io initialization
let socket;
try {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to real-time VMS server. Socket ID:', socket.id);
    });

    socket.on('newVisitor', (visitor) => {
        console.log('Real-time notice: New visitor registered:', visitor);
        loadPendingVisitors(false);
    });

    socket.on('visitorStatusChanged', (data) => {
        console.log('Real-time notice: Visitor status changed:', data);
        loadPendingVisitors(false);
    });

} catch (err) {
    console.warn('Real-time socket.io could not initialize:', err);
}

// Initial load
loadPendingVisitors(true);

// Background backup poll every 20 seconds (reduced from 30)
setInterval(() => loadPendingVisitors(false), 20000);
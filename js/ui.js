// js/ui.js
import { appState } from './state.js';
import { CONFIG } from './config.js';

export function log(text, type = 'info') {
    const el = document.getElementById('install-log');
    if(el) {
        const div = document.createElement('div');
        div.className = `log-entry log-${type}`;
        // Ensure we handle timestamping for better debugging
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        const content = `[${time}] ${text}`;
        
        const sanitized = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        div.innerHTML = sanitized.replace(/\n/g, '<br>');
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }
}

export function showToast(message) {
    const x = document.getElementById("snackbar");
    if(!x) return;
    x.innerText = message;
    x.className = "show";
    setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
}

export async function copyLogToClipboard() {
    const el = document.getElementById('install-log');
    if (!el || el.innerText.trim() === "") {
        showToast("הלוג ריק, אין מה להעתיק");
        return;
    }

    // Gather info
    const date = new Date().toLocaleString();
    const modelInfo = document.getElementById('adb-status')?.innerText || "Unknown";
    const sdk = appState.sdkVersion || "Unknown";
    
    // Format text
    let logContent = "";
    el.childNodes.forEach(node => {
        logContent += node.innerText + "\n";
    });

    const markdown = `### DeviceControl Installer Report
**Date:** ${date}
**Device Status:** ${modelInfo}
**SDK Version:** ${sdk}
**WebUSB Supported:** ${'usb' in navigator}

\`\`\`text
${logContent}
\`\`\`
`;

    try {
        await navigator.clipboard.writeText(markdown);
        showToast("הלוג הועתק ללוח!");
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast("שגיאה בהעתקה");
    }
}

export function navigateTo(pageId, stepIndex) {
    // Skip update logic
    if (!CONFIG.ENABLE_WEB_UPDATE && pageId === 'page-update') {
        pageId = 'page-install';
        stepIndex = 4;
    }

    // Safety checks
    if (stepIndex >= 2 && !appState.adbConnected) {
        showToast("יש לחבר מכשיר תחילה");
        return;
    }

    document.body.classList.toggle('welcome-mode', pageId === 'page-main');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
        dot.classList.remove('active', 'completed'); 
        if (index === stepIndex) dot.classList.add('active');
        if (index < stepIndex) dot.classList.add('completed');
    });

    // Auto-run actions
    if (pageId === 'page-accounts' && window.checkAccounts) window.checkAccounts();
    if (pageId === 'page-update' && window.startDownload) setTimeout(window.startDownload, 300);
    if (pageId === 'page-install' && window.runInstallation) setTimeout(window.runInstallation, 600);
}

export function updateStatusBadge(id, text, type) {
    const el = document.getElementById(id);
    if(el) { el.innerHTML = text; el.className = 'status-badge ' + type; }
}

export function updateProgress(val) {
    const bar = document.getElementById('install-progress-bar');
    if(bar) bar.style.width = (val * 100) + "%";
}

export function toggleVideo() {
    const vid = document.getElementById('guide-video');
    if (vid.paused) vid.play(); else vid.pause();
}

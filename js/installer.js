import { appState } from './state.js';
import { CONFIG } from './config.js';
import { executeAdbCommand, wait, readAll } from './adb-client.js';
import { log, showToast, updateProgress, navigateTo } from './ui.js';
import { restoreAccounts } from './accounts.js';

let apkBlob = null;

export async function startDownload() {
    const btn = document.getElementById('btn-download');
    const bar = document.getElementById('dl-progress-bar');
    const infoText = document.getElementById('update-info-text');
    const statusText = document.getElementById('dl-status-text');

    if (btn) btn.style.display = 'none';
    if (bar) bar.style.width = '0%';
    if (statusText) statusText.innerText = 'מתחבר לשרת...';
    if (infoText) infoText.innerText = 'מוריד את קובץ ה-APK העדכני...';

    document.getElementById('dl-progress-wrapper').style.display = 'block';

    try {
        const resp = await fetch(CONFIG.REMOTE_APK_URL);
        if (!resp.ok) throw new Error(`קוד שגיאה: ${resp.status} (${resp.statusText})`);

        const reader = resp.body.getReader();
        const len = +resp.headers.get('Content-Length');
        let received = 0;
        let chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            received += value.length;

            if (len && bar) {
                const pct = Math.round((received / len) * 100);
                bar.style.width = pct + "%";
                if (statusText) statusText.innerText = `${pct}% (${(received / (1024 * 1024)).toFixed(1)}MB / ${(len / (1024 * 1024)).toFixed(1)}MB)`;
            } else if (statusText) {
                statusText.innerText = `${(received / (1024 * 1024)).toFixed(1)}MB`;
            }
        }

        apkBlob = new Blob(chunks, { type: "application/vnd.android.package-archive" });
        appState.apkDownloaded = true;

        if (statusText) statusText.innerText = 'ההורדה הושלמה בהצלחה!';
        if (infoText) infoText.innerText = 'קובץ ה-APK הורד בהצלחה. עובר להתקנה...';

        setTimeout(() => navigateTo('page-install', 4), 1000);

    } catch (e) {
        showToast("שגיאה בהורדת ה-APK: " + e.message);
        if (statusText) statusText.innerText = "ההורדה נכשלה";
        if (infoText) infoText.innerText = "שגיאה בהורדת ה-APK משרת GitHub: " + e.message;
        if (btn) {
            btn.style.display = 'inline-flex';
            btn.disabled = false;
        }
        apkBlob = null;
    }
}

export async function runInstallation() {
    if (!appState.adbConnected) return showToast("ADB Disconnected");
    const btn = document.getElementById('btn-install-start');
    btn.disabled = true;
    updateProgress(0);

    // Hide Video & Show Success placeholder
    document.getElementById('guide-video').style.display = 'none';
    document.querySelector('.phone-controls').style.display = 'none';
    document.getElementById('phone-success-message').style.display = 'flex';

    try {
        // Pre-checks: check if another device owner is already configured
        try {
            const shell = await appState.adbInstance.shell("dumpsys device_policy");
            const policy = await readAll(shell);
            if (policy.includes("Device Owner:") || policy.includes("Device Owner (User 0):")) {
                const ownerSection = policy.split(/Device Owner.*?:/i)[1]?.split(/Profile Owner|User \d+:|\n\s*\n/)[0] || "";
                if (ownerSection.includes("admin=ComponentInfo") && !ownerSection.includes(CONFIG.TARGET_PACKAGE)) {
                    throw new Error("קיים ניהול אחר (Device Owner) על המכשיר. יש לבצע איפוס יצרן.");
                }
            }
        } catch (e) {
            if (e.message.includes("קיים ניהול אחר")) throw e;
            console.warn("Dumpsys device_policy check skipped or clean:", e);
        }
        
        // Ensure APK is loaded from remote URL
        if (!apkBlob) {
            log("מוריד APK מהשרת...", 'info');
            const resp = await fetch(CONFIG.REMOTE_APK_URL);
            if (!resp.ok) throw new Error("שגיאה בהורדת ה-APK משרת GitHub (" + resp.status + ")");
            apkBlob = await resp.blob();
        }

        // Push
        log("מעביר קובץ...", 'info');
        const sync = await appState.adbInstance.sync();
        const file = new File([apkBlob], "app.apk");
        await sync.push(file, "/data/local/tmp/app.apk", 0o644, (s, t) => updateProgress(0.1 + (s/t)*0.3));
        await sync.quit();
        
        await wait(1000);

        // Install
        updateProgress(0.5);
        await executeAdbCommand(`pm install -r -g "/data/local/tmp/app.apk"`, "Install APK");
        
        await wait(2000);

        // Set Owner
        updateProgress(0.8);
        await executeAdbCommand(`dpm set-device-owner ${CONFIG.TARGET_PACKAGE}/${CONFIG.DEVICE_ADMIN}`, "Set Owner");
        
        // Grant Needed Permissions
        await executeAdbCommand(`pm grant ${CONFIG.TARGET_PACKAGE} android.permission.WRITE_SECURE_SETTINGS`, "Grant Secure Settings");
        
        // Launch
        updateProgress(1.0);
        await executeAdbCommand(`am start -n ${CONFIG.TARGET_PACKAGE}/.MainActivity`, "Launch");

        showToast("הסתיים בהצלחה!");
    } catch (e) {
        log(`Error: ${e.message}`, 'error');
        showToast("התקנה נכשלה");
    } finally {
        if (appState.disabledPackages.length > 0) await restoreAccounts();
        btn.disabled = false;
    }
}
import { appState } from './state.js';
import { CONFIG } from './config.js';
import { executeAdbCommand, wait, readAll } from './adb-client.js';
import { log, showToast, updateProgress, navigateTo } from './ui.js';
import { restoreAccounts } from './accounts.js';

let apkBlob = null;
let foundRelease = null;
export async function checkForUpdates() {
    const infoText = document.getElementById('update-info-text');
    const btn = document.getElementById('btn-download');

    try {
        const resp = await fetch(CONFIG.REMOTE_APK_URL, { method: "HEAD" });

        if (!resp.ok) throw new Error("APK not found");

        foundRelease = {
            url: CONFIG.REMOTE_APK_URL,
            size: resp.headers.get("Content-Length")
        };

        infoText.innerHTML = `נמצא APK בשרת`;
        btn.disabled = false;

    } catch (e) {
        infoText.innerText = "משתמש ב־APK מקומי";
        foundRelease = null;
        btn.disabled = true;
    }
}

export async function startDownload() {
    if (!foundRelease) return;

    const btn = document.getElementById('btn-download');
    const bar = document.getElementById('dl-progress-bar');

    btn.disabled = true;
    document.getElementById('dl-progress-wrapper').style.display = 'block';

    try {
        const resp = await fetch(foundRelease.url);
        if (!resp.ok) throw new Error("Download failed");

        const reader = resp.body.getReader();
        const len = +resp.headers.get('Content-Length');
        let received = 0;
        let chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            received += value.length;

            if (len) {
                bar.style.width = Math.round((received / len) * 100) + "%";
            }
        }

        apkBlob = new Blob(chunks, { type: "application/vnd.android.package-archive" });
        appState.apkDownloaded = true;

        setTimeout(() => navigateTo('page-install', 4), 1000);

    } catch (e) {
        showToast("שגיאה בהורדה – משתמש ב־APK מקומי");
        btn.disabled = false;
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
        
        // Load APK
        if (!apkBlob) {
            log("טוען APK מקומי...", 'info');
            const resp = await fetch(CONFIG.APK_LOCAL_PATH);
            if (!resp.ok) throw new Error("APK מקומי חסר");
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
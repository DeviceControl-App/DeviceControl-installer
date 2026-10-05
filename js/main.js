// js/main.js
import { navigateTo, toggleVideo, log, showToast, copyLogToClipboard } from './ui.js';
import { connectAdb } from './adb-client.js';
import { checkAccounts, runAccountBypass } from './accounts.js';
import { startDownload, runInstallation } from './installer.js';
import { appState, restoreSessionState } from './state.js';

// 1. ATTACH TO WINDOW IMMEDIATELY
window.navigateTo = navigateTo;
window.toggleVideo = toggleVideo;
window.connectAdb = connectAdb;
window.checkAccounts = checkAccounts;
window.runAccountBypass = runAccountBypass;
window.startDownload = startDownload;
window.runInstallation = runInstallation;
window.copyLogToClipboard = copyLogToClipboard;

// Handle the "Install without removal" button click
window.toggleBypassWarning = () => {
    // Check for Android 14+ (SDK 34)
    if (appState.sdkVersion >= 34) {
        alert("שגיאה: אפשרות זו חסומה ב-Android 14 ומעלה.\n\nבגרסאות אנדרואיד חדשות (14+), גוגל חסמה את האפשרות להשבית חשבונות דרך ADB מטעמי אבטחה.\n\nעליך להסיר את החשבונות באופן ידני דרך הגדרות המכשיר.");
        return;
    }

    const el = document.getElementById('bypass-warning');
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
};

// 2. INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    // Per user request, wipe storage on every load to ensure a clean state.
    try {
        localStorage.clear();
    } catch (e) {
        console.error("Failed to clear local storage:", e);
    }

    // Check Browser
    if (!('usb' in navigator)) {
        document.getElementById('page-main-content').style.display = 'none';
        document.getElementById('compatibility-notice').style.display = 'block';
    }

    // Restore previous session if crashed
    const restoredCount = restoreSessionState();
    if (restoredCount > 0) {
        log(`נמצאה הפעלה קודמת שנקטעה: ${restoredCount} חבילות מושבתות.`, 'warn');
    }
});
import { appState, restoreSessionState } from './state.js';
import { log, showToast, updateStatusBadge } from './ui.js';
import { ADB_ERRORS } from './config.js';

// Helper to wait
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function connectAdb() {
    try {
        // Assumes Adb is loaded globally via script tag (or you can import if using bundler)
        appState.webUsbInstance = await Adb.open("WebUSB");
        appState.adbInstance = await appState.webUsbInstance.connectAdb("host::");

        if (appState.adbInstance) {
            await checkDeviceIntegrity();

            let shell = await appState.adbInstance.shell("getprop ro.product.model");
            let model = await readAll(shell);
            model = model.replace('ro.product.model:', '').trim() || "Generic Android";

            updateStatusBadge('adb-status', `<span class="material-symbols-rounded">link</span> מחובר: ${model}`, 'success');

            document.getElementById('btn-connect').style.display = 'none';
            const nextBtn = document.getElementById('btn-next-adb');
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = false;
            appState.adbConnected = true;

            showToast("המכשיר חובר בהצלחה");
            restoreSessionState();
        }
    } catch (e) {
        showToast("שגיאה בחיבור: " + e.message);
        console.error(e);
    }
}

async function checkDeviceIntegrity() {
    log("מבצע בדיקות מקדימות...", 'info');
    try {
        const sdkOut = await executeAdbCommand("getprop ro.build.version.sdk", "בדיקת גרסת אנדרואיד", true);
        appState.sdkVersion = parseInt(sdkOut); // Store version in state

        if (appState.sdkVersion >= 34) { 
            log("אזהרה: Android 14+ זוהה. השבתת חשבונות אוטומטית חסומה.", 'warn');
        }
        
        // Root check
        const cmd = "test -e /system/bin/su && echo ROOT_FOUND || test -e /system/xbin/su && echo ROOT_FOUND || test -e /sbin/su && echo ROOT_FOUND";
        const rootOut = await executeAdbCommand(cmd, "Root Check", true);
        if (rootOut.includes("ROOT_FOUND")) {
            log("אזהרה קריטית: זוהה מכשיר עם ROOT.", 'error');
            alert("אזהרה: המכשיר מזוהה כ-בעל Root.");
        }
    } catch (e) { console.log("Root check skipped or clean"); }
}

export async function executeAdbCommand(command, description, silent = false) {
    if (!appState.adbInstance) throw new Error("ADB Not Connected");
    if (!silent) log(`> ${description}...`, 'info');
    
    try {
        const shell = await appState.adbInstance.shell(command);
        const response = await readAll(shell);
        const lowerRes = response.toLowerCase();

        // Error Parsing
        for (const [key, hebrewMsg] of Object.entries(ADB_ERRORS)) {
            if (response.includes(key)) throw new Error(hebrewMsg + ` (${key})`);
        }
        if (lowerRes.includes("failure") || lowerRes.includes("error")) {
            throw new Error("נכשלה הפעולה: " + response);
        }

        if (!silent) log(` הצלחה: ${description}`, 'success');
        return response;
    } catch (e) {
        if (!silent) log(` שגיאה ב${description}: ${e.message}`, 'error');
        throw e;
    }
}

// Stream Reader
export async function readAll(stream) {
    const decoder = new TextDecoder();
    let res = "";
    try {
        while (true) {
            let msg = await stream.receive();
            if (msg.cmd === "WRTE") {
                res += decoder.decode(msg.data);
                await stream.send("OKAY");
            } else if (msg.cmd === "CLSE") {
                break;
            }
        }
    } catch (e) {
        console.warn("Stream reading interrupted", e);
    }
    return res.trim();
}
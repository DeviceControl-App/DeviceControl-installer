export const CONFIG = {
    ENABLE_WEB_UPDATE: true,
    REMOTE_APK_URL: "https://devicecontrol-app.github.io/files/DeviceControl.apk",
    TARGET_PACKAGE: "aiv.diy.control",
    DEVICE_ADMIN: ".DeviceOwnerReceiver"
};

// Packages that must NEVER be disabled
export const PROTECTED_PACKAGES = [
    'com.android.settings',      
    'com.android.systemui',      
    'android',                   
    'com.google.android.setupwizard',
    'com.android.phone',
    'com.android.providers.telephony',
    CONFIG.TARGET_PACKAGE               
];

// Apps to check for explicitly
export const KNOWN_OFFENDERS = [
    'com.facebook.katana',
    'com.facebook.orca',
    'com.instagram.android',
    'com.whatsapp',
    'com.microsoft.office.outlook',
    'com.google.android.gm',
    'com.samsung.android.email.provider'
];

// Static mapping for account types
export const ACCOUNT_PKG_MAP = {
    'com.google': 'com.google.android.gms', 
    'com.google.work': 'com.google.android.gms',
    'com.osp.app.signin': 'com.samsung.android.mobileservice', 
    'com.samsung.android.mobileservice': 'com.samsung.android.mobileservice',
    'com.whatsapp': 'com.whatsapp',
    'com.facebook.auth.login': 'com.facebook.katana',
    'com.facebook.messenger': 'com.facebook.orca'
};

export const ADB_ERRORS = {
    "INSTALL_FAILED_ALREADY_EXISTS": "האפליקציה כבר מותקנת. מנסה לעדכן...",
    "INSTALL_FAILED_INSUFFICIENT_STORAGE": "אין מספיק מקום פנוי במכשיר.",
    "INSTALL_FAILED_UPDATE_INCOMPATIBLE": "קיימת גרסה קודמת עם חתימה שונה. יש למחוק אותה ידנית.",
    "Permission denied": "אין הרשאה לביצוע הפעולה. וודא שאישרת 'ניפוי באגים' במכשיר.",
    "device unauthorized": "המכשיר לא מאושר. בדוק את מסך המכשיר ואשר את החיבור.",
    "not found": "המכשיר התנתק. בדוק את תקינות הכבל.",
    "there are already some accounts": "שגיאה: נמצאו חשבונות פעילים. חובה להסירם.",
    "already a device owner": "שגיאה: כבר קיים מנהל מכשיר (Device Owner). יש לבצע איפוס יצרן.",
    "java.lang.IllegalStateException": "שגיאה קריטית (IllegalStateException). חלה תקלה בעת הסרת חשבונות אנא וודאו שכול החשבונות הוסרו מהמכשיר.",
    "Trying to set the device owner": "שגיאה: הגדרת הבעלים נכשלה. המכשיר אינו 'נקי' מחשבונות."
};

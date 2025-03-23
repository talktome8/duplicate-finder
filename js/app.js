import { Scanner } from './scanner.js';
import { UIController } from './ui-controller.js';

import { UIController } from './ui-controller.js';
import { SystemCheck } from './system-check.js';
import { Scanner } from './scanner.js';
import { AppState } from './app-state.js';

let isPickerActive = false; // Add this at the top of the file, outside any function
let pickerTimeout = null;

// הוסף לתחילת הקובץ לצורך ניפוי באגים
window.debugFiles = async function(dirHandle, maxDepth = 2, currentDepth = 0) {
    console.log('Debug files in:', dirHandle.name);
    const results = [];
    let indent = '  '.repeat(currentDepth);
    
    try {
        for await (const entry of dirHandle.values()) {
            const name = entry.name;
            
            if (entry.kind === 'file') {
                try {
                    const file = await entry.getFile();
                    results.push({
                        name,
                        type: 'file',
                        size: file.size,
                        lastModified: new Date(file.lastModified).toISOString()
                    });
                    console.log(`${indent}📄 ${name} (${file.size} bytes)`);
                } catch (err) {
                    console.error(`${indent}❌ Error accessing file ${name}:`, err);
                }
            } else if (entry.kind === 'directory' && currentDepth < maxDepth) {
                console.log(`${indent}📁 ${name}/`);
                const subResults = await debugFiles(entry, maxDepth, currentDepth + 1);
                results.push({
                    name,
                    type: 'directory',
                    contents: subResults
                });
            } else if (entry.kind === 'directory') {
                console.log(`${indent}📁 ${name}/ (max depth reached)`);
                results.push({
                    name,
                    type: 'directory',
                    contents: 'max depth reached'
                });
            }
        }
    } catch (err) {
        console.error(`Error listing directory contents:`, err);
    }
    
    return results;
};

// פונקציה לבדיקת יכולות API
window.testFileSystemAPI = async function() {
    try {
        console.log('Testing File System Access API...');
        
        if (!window.showDirectoryPicker) {
            console.error('showDirectoryPicker API is not available');
            return false;
        }
        
        console.log('Requesting directory access...');
        const dirHandle = await window.showDirectoryPicker({
            mode: 'read'
        });
        
        console.log('Directory selected:', dirHandle.name);
        
        // בדיקת הרשאות
        const permission = await dirHandle.queryPermission({ mode: 'read' });
        console.log('Permission status:', permission);
        
        // בדיקת קריאת קבצים
        await debugFiles(dirHandle, 1);
        
        console.log('File System API test completed successfully');
        return true;
    } catch (error) {
        console.error('File System API test failed:', error);
        return false;
    }
};

// גלובלי AppState - וידוא שכל התכונות מוגדרות
window.AppState = {
    scanning: false,
    stopRequested: false,
    currentDirectoryHandle: null,
    currentScanner: null,
    stats: {
        startTime: null,
        filesScanned: 0,
        totalFilesEstimated: 0,
        bytesScanned: 0,
        totalBytesEstimated: 0,
        duplicatesFound: {
            filenames: 0,
            contents: 0,
            images: 0
        }
    },
    results: {
        duplicateFilenames: [],
        duplicateContents: [],
        duplicateImages: []
    }
};

// הוספה למעלה, אחרי הגדרת AppState
window.testDuplicateDetection = async function() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        console.log("Selected directory:", dirHandle.name);
        
        const files = [];
        
        // איסוף מידע על כל הקבצים בתיקייה
        async function collectFiles(handle, path = "") {
            console.log("Collecting files in:", path || handle.name);
            
            try {
                for await (const entry of handle.values()) {
                    if (entry.kind === "file") {
                        try {
                            const file = await entry.getFile();
                            files.push({
                                name: entry.name, 
                                path: path ? `${path}/${entry.name}` : entry.name,
                                size: file.size,
                                lastModified: new Date(file.lastModified).toISOString(),
                                type: file.type,
                                entry,
                                file
                            });
                        } catch (err) {
                            console.error("Error getting file:", err);
                        }
                    } else if (entry.kind === "directory") {
                        await collectFiles(entry, path ? `${path}/${entry.name}` : entry.name);
                    }
                }
            } catch (err) {
                console.error("Error collecting files:", err);
            }
        }
        
        await collectFiles(dirHandle);
        console.log(`Collected ${files.length} files`);
        
        // בדיקת כפילויות שם
        console.log("Checking filename duplicates...");
        const filenameMap = new Map();
        files.forEach(file => {
            const basename = file.name;
            
            if (!filenameMap.has(basename)) {
                filenameMap.set(basename, [file]);
            } else {
                filenameMap.get(basename).push(file);
            }
        });
        
        const filenameDuplicates = Array.from(filenameMap.entries())
            .filter(([name, files]) => files.length > 1);
        
        console.log(`Found ${filenameDuplicates.length} filename duplicates`);
        console.log(filenameDuplicates);
        
        // בדיקת כפילויות תוכן (לקבצים קטנים)
        console.log("Checking content duplicates...");
        const hashMap = new Map();
        const maxSizeForHash = 10 * 1024 * 1024; // רק קבצים עד 10MB
        
        for (const file of files) {
            if (file.size > maxSizeForHash) continue;
            
            try {
                const buffer = await file.file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
                const hash = Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, "0"))
                    .join("");
                
                if (!hashMap.has(hash)) {
                    hashMap.set(hash, [file]);
                } else {
                    hashMap.get(hash).push(file);
                }
            } catch (err) {
                console.error(`Error hashing file ${file.path}:`, err);
            }
        }
        
        const contentDuplicates = Array.from(hashMap.entries())
            .filter(([hash, files]) => files.length > 1);
        
        console.log(`Found ${contentDuplicates.length} content duplicates`);
        console.log(contentDuplicates);
        
        return {
            files,
            filenameDuplicates,
            contentDuplicates
        };
    } catch (error) {
        console.error("Test failed:", error);
    }
};

// פונקציה מפושטת יותר לבדיקת כפילויות עבור דיבאג
window.quickCheckDuplicates = async function() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        console.log("Testing directory:", dirHandle.name);
        
        // איסוף שמות קבצים
        const fileNames = new Map();
        const fileHashes = new Map();
        
        async function scanDir(handle, path) {
            const currentPath = path || "";
            
            for await (const entry of handle.values()) {
                if (entry.kind === "file") {
                    const file = await entry.getFile();
                    const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                    
                    // בדיקת שמות כפולים
                    if (!fileNames.has(entry.name)) {
                        fileNames.set(entry.name, [fullPath]);
                    } else {
                        fileNames.get(entry.name).push(fullPath);
                        console.log("Duplicate filename: " + entry.name);
                    }
                    
                    // בדיקת תוכן כפול (רק לקבצים קטנים)
                    if (file.size < 5 * 1024 * 1024) { // פחות מ-5MB
                        try {
                            const buffer = await file.arrayBuffer();
                            const hash = await crypto.subtle.digest("SHA-256", buffer);
                            const hashStr = Array.from(new Uint8Array(hash))
                                .map(function(b) { 
                                    return b.toString(16).padStart(2, "0"); 
                                })
                                .join("");
                            
                            if (!fileHashes.has(hashStr)) {
                                fileHashes.set(hashStr, [fullPath]);
                            } else {
                                fileHashes.get(hashStr).push(fullPath);
                                console.log("Duplicate content: " + entry.name + " matches with " + fileHashes.get(hashStr)[0]);
                            }
                        } catch (err) {
                            console.error("Hash error:", err);
                        }
                    }
                } else if (entry.kind === "directory") {
                    const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                    await scanDir(entry, newPath);
                }
            }
        }
        
        await scanDir(dirHandle, "");
        
        // מיון והצגת תוצאות
        const duplicateNames = Array.from(fileNames.entries())
            .filter(function(entry) {
                return entry[1].length > 1;
            });
            
        const duplicateContents = Array.from(fileHashes.entries())
            .filter(function(entry) {
                return entry[1].length > 1;
            });
        
        console.log("======== RESULTS ========");
        console.log("Found " + duplicateNames.length + " duplicate filenames");
        console.log("Found " + duplicateContents.length + " duplicate contents");
        
        return {
            byName: duplicateNames,
            byContent: duplicateContents
        };
    } catch (error) {
        console.error("Quick check failed:", error);
        return null;
    }
};

// פונקציית עזר פשוטה לבדיקת תקינות הקוד
window.testApp = function() {
    console.log("App test function runs successfully!");
    return "Success";
};

// Main initialization - ניקיון של מאזין אחד בלבד
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    ensureScanSettingsExist(); // הוספנו את זה לפני אתחול הכפתורים
    initializeButtons();
    checkBrowserSupport();
});

// פונקציה אחידה לאתחול הכפתורים
function initializeButtons() {
    const elements = {
        selectDirectoryBtn: document.getElementById("selectDirectoryBtn"),
        stopScanBtn: document.getElementById("stopScanBtn"),
        progressSection: document.getElementById("progressSection"),
        resultsSection: document.getElementById("resultsSection")
    };
    
    console.log("UI elements:", elements);
    
    // וודא שכל האלמנטים קיימים
    if (!elements.selectDirectoryBtn) {
        console.error("Select directory button not found");
        return;
    }
    
    elements.selectDirectoryBtn.addEventListener("click", handleDirectorySelection);
    
    if (elements.stopScanBtn) {
        elements.stopScanBtn.addEventListener("click", () => {
            AppState.stopRequested = true;
            UIController.showMessage('מבטל סריקה...', 'info');
        });
    }
}

// פונקציה ליצירת אלמנטי הגדרות הסריקה אם הם לא קיימים
function ensureScanSettingsExist() {
    // בדיקה אם האלמנטים כבר קיימים
    const checkFilenames = document.getElementById('checkFilenames');
    const checkContents = document.getElementById('checkContents');
    const checkImages = document.getElementById('checkImages');
    const imageSimilarity = document.getElementById('imageSimilarity');
    const workerCount = document.getElementById('workerCount');
    
    // אם האלמנטים קיימים, אין צורך ליצור אותם שוב
    if (checkFilenames && checkContents && checkImages && imageSimilarity && workerCount) {
        return;
    }
    
    // מצא את האזור שבו צריך להוסיף את ההגדרות
    const controlArea = document.getElementById('controlArea');
    if (!controlArea) return;
    
    // יצירת אזור הגדרות הסריקה
    const scanSettings = document.createElement('div');
    scanSettings.id = 'scanSettings';
    scanSettings.className = 'scan-settings';
    
    // הוספת תוכן HTML
    scanSettings.innerHTML = `
        <h3>הגדרות סריקה</h3>
        <div class="settings-group">
            <div class="setting-item">
                <input type="checkbox" id="checkFilenames" checked>
                <label for="checkFilenames">חפש שמות קבצים זהים</label>
            </div>
            <div class="setting-item">
                <input type="checkbox" id="checkContents" checked>
                <label for="checkContents">חפש תוכן קבצים זהה</label>
            </div>
            <div class="setting-item">
                <input type="checkbox" id="checkImages" checked>
                <label for="checkImages">חפש תמונות דומות</label>
            </div>
        </div>
        <div class="settings-group">
            <div class="setting-item">
                <label for="imageSimilarity">סף דמיון תמונות: <span id="similarityValue">90%</span></label>
                <input type="range" id="imageSimilarity" min="60" max="100" value="90">
            </div>
            <div class="setting-item">
                <label for="workerCount">מספר תהליכים במקביל:</label>
                <input type="number" id="workerCount" min="1" max="8" value="2">
            </div>
        </div>
    `;
    
    // הוספת האזור לדף
    controlArea.appendChild(scanSettings);
    
    // הוספת מאזין אירועים לשינוי ערך הדמיון
    document.getElementById('imageSimilarity').addEventListener('input', function() {
        const similarityValue = document.getElementById('similarityValue');
        if (similarityValue) {
            similarityValue.textContent = this.value + '%';
        }
    });
}

// הוסף את הפונקציה החסרה
async function handleDirectorySelection() {
    try {
        console.log("Opening directory picker");
        const dirHandle = await window.showDirectoryPicker();
        console.log("Directory selected:", dirHandle.name);
        
        AppState.currentDirectoryHandle = dirHandle;
        
        // הצג הערכת זמן לפני תחילת הסריקה
        await showScanEstimate(dirHandle);
    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Error selecting directory:", error);
            UIController.showMessage("שגיאה בבחירת תיקייה: " + error.message, "error");
        }
    }
}

// פונקציה להצגת הערכת זמן סריקה
async function showScanEstimate(dirHandle) {
    try {
        UIController.showMessage("בודק את התיקייה... אנא המתן", "info");
        
        let totalFiles = 0;
        let totalSize = 0;
        
        async function countFiles(handle, maxDepth = 2, currentDepth = 0) {
            if (currentDepth > maxDepth) return;
            
            for await (const entry of handle.values()) {
                if (entry.kind === "file") {
                    totalFiles++;
                    const file = await entry.getFile();
                    totalSize += file.size;
                } else if (entry.kind === "directory") {
                    await countFiles(entry, maxDepth, currentDepth + 1);
                }
            }
        }
        
        await countFiles(dirHandle);
        
        // חישוב הערכת זמן
        const estimatedTimeInSeconds = Math.max(10, totalFiles * 0.1);
        const formattedTime = formatTime(estimatedTimeInSeconds);
        const formattedSize = formatSize(totalSize);
        
        // הצג הערכת זמן
        UIController.showMessage(`
            <div class="estimate-container">
                <h3>הערכת זמן סריקה</h3>
                <p>נמצאו ${totalFiles} קבצים (${formattedSize})</p>
                <p>זמן משוער לסיום: ${formattedTime}</p>
                <div class="button-row">
                    <button id="startScanBtn" class="primary-btn">התחל סריקה</button>
                    <button id="cancelScanBtn" class="secondary-btn">ביטול</button>
                </div>
            </div>
        `, "info");
        
        // הוסף מאזיני אירועים לאחר הוספת האלמנטים ל-DOM
        setTimeout(() => {
            const startBtn = document.getElementById("startScanBtn");
            const cancelBtn = document.getElementById("cancelScanBtn");
            
            if (startBtn) {
                startBtn.addEventListener("click", () => {
                    UIController.hideMessage();
                    startScan(dirHandle);
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener("click", () => {
                    UIController.hideMessage();
                });
            }
        }, 100);
        
    } catch (error) {
        console.error("Error estimating scan:", error);
        startScan(dirHandle); // התחל סריקה ישירות אם יש שגיאה בהערכה
    }
}

// פונקציית עזר לפורמט זמן במבנה שעות:דקות:שניות
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        secs.toString().padStart(2, "0")
    ].join(":");
}

// פונקציית עזר לפורמט גודל קובץ
function formatSize(bytes) {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

// הוספת פונקציית startScan
async function startScan(dirHandle) {
    try {
        console.log('Starting scan for directory:', dirHandle.name);
        
        // עדכון ממשק המשתמש לפני תחילת הסריקה
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        const stopScanBtn = document.getElementById('stopScanBtn');
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        const scanInfo = document.getElementById('scanInfo');
        
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'none';
        if (stopScanBtn) stopScanBtn.style.display = 'inline-block';
        if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'none';
        
        // עדכון מידע על הספרייה הנסרקת
        if (scanInfo) {
            scanInfo.textContent = `סריקת תיקייה: ${dirHandle.name}`;
        }
        
        // אתחול מד התקדמות
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        
        // בדיקת הרשאות קריאה
        try {
            const permissionStatus = await dirHandle.queryPermission({ mode: 'read' });
            
            if (permissionStatus !== 'granted') {
                const newPermission = await dirHandle.requestPermission({ mode: 'read' });
                
                if (newPermission !== 'granted') {
                    throw new Error('לא ניתנה הרשאת קריאה לתיקייה');
                }
            }
        } catch (permError) {
            console.error('Permission error:', permError);
            UIController.showMessage(`בעיית הרשאות: ${permError.message}`, 'error');
            
            // החזרת ממשק המשתמש למצב הקודם
            if (stopScanBtn) stopScanBtn.style.display = 'none';
            if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
            if (progressSection) progressSection.style.display = 'none';
            return;
        }
        
        // קבלת הגדרות סריקה מממשק המשתמש
        const scanSettings = {
            checkFilenames: document.getElementById('checkFilenames')?.checked ?? true,
            checkContents: document.getElementById('checkContents')?.checked ?? true,
            checkImages: document.getElementById('checkImages')?.checked ?? true,
            imageSimilarityThreshold: parseInt(document.getElementById('imageSimilarity')?.value ?? '90'),
            workerCount: parseInt(document.getElementById('workerCount')?.value ?? '2')
        };
        
        console.log('Starting scan with settings:', scanSettings);
        
        // יצירת סורק והתחלת הסריקה
        const scanner = new Scanner(scanSettings);
        AppState.currentScanner = scanner;
        AppState.currentDirectoryHandle = dirHandle;
        
        // התחלת הסריקה עם קריאה חוזרת לעדכון התקדמות
        console.log('Starting scanner...');
        const result = await scanner.scan(dirHandle, updateProgress);
        
        console.log('Scan completed:', result);
        
        // שמירת התוצאות במצב האפליקציה
        AppState.results = result.results;
        
        // הצגת התוצאות
        UIController.displayResults(result.results, result.stats);
        
        // עדכון ממשק המשתמש לסיום
        if (progressSection) progressSection.style.display = 'none';
        if (stopScanBtn) stopScanBtn.style.display = 'none';
        if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
        if (resultsSection) resultsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error during scan:', error);
        UIController.showMessage(`שגיאה בסריקה: ${error.message}`, 'error');
        
        // החזרת ממשק המשתמש למצב הקודם
        const stopScanBtn = document.getElementById('stopScanBtn');
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        const progressSection = document.getElementById('progressSection');
        
        if (stopScanBtn) stopScanBtn.style.display = 'none';
        if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
        if (progressSection) progressSection.style.display = 'none';
    }
}

// פונקציית עצירת סריקה
function stopScan() {
    console.log('Stop scan requested');
    if (AppState.currentScanner) {
        AppState.currentScanner.stop();
        console.log('Scanner stopped');
    }
    
    // עדכון הממשק
    const stopScanBtn = document.getElementById('stopScanBtn');
    const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
    const progressSection = document.getElementById('progressSection');
    
    if (stopScanBtn) stopScanBtn.style.display = 'none';
    if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
    if (progressSection) progressSection.style.display = 'none';
    
    UIController.showMessage('הסריקה הופסקה על ידי המשתמש', 'info', 3000);
}

// פונקציית עדכון התקדמות
function updateProgress(progress) {
    if (!progress) return;
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const filesScanned = document.getElementById('filesScanned');
    const bytesScanned = document.getElementById('bytesScanned');
    const elapsedTime = document.getElementById('elapsedTime');
    const scanSpeed = document.getElementById('scanSpeed');
    const estimatedTime = document.getElementById('estimatedTime');
    const currentFile = document.getElementById('currentFile');
    const filenamesDupes = document.getElementById('filenamesDupes');
    const contentDupes = document.getElementById('contentDupes');
    const imageDupes = document.getElementById('imageDupes');
    
    // עדכון מד התקדמות
    if (progressBar && progressText && progress.filesScanned > 0) {
        // חישוב אחוז התקדמות יחסי (באומדן)
        const percent = Math.min(99, Math.round(
            (progress.filesScanned / (progress.filesScanned + 100)) * 100
        ));
        
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
    }
    
    // עדכון סטטיסטיקות
    if (filesScanned) {
        filesScanned.textContent = progress.filesScanned.toLocaleString();
    }
    
    if (bytesScanned) {
        bytesScanned.textContent = formatSize(progress.bytesScanned);
    }
    
    if (elapsedTime) {
        const elapsed = Math.floor((Date.now() - progress.startTime) / 1000);
        elapsedTime.textContent = formatTime(elapsed);
    }
    
    if (scanSpeed && progress.bytesScanned && progress.startTime) {
        const elapsed = (Date.now() - progress.startTime) / 1000;
        if (elapsed > 0) {
            const bytesPerSecond = progress.bytesScanned / elapsed;
            scanSpeed.textContent = formatSize(bytesPerSecond) + '/s';
        }
    }
    
    if (estimatedTime) {
        const elapsed = (Date.now() - progress.startTime) / 1000;
        const filesPerSecond = elapsed > 0 ? progress.filesScanned / elapsed : 0;
        
        if (filesPerSecond > 0 && progress.totalFiles > progress.filesScanned) {
            const remainingFiles = Math.max(100, progress.totalFiles - progress.filesScanned);
            const remainingSeconds = remainingFiles / filesPerSecond;
            estimatedTime.textContent = formatTime(remainingSeconds);
        } else {
            estimatedTime.textContent = 'מחשב...';
        }
    }
    
    if (currentFile) {
        currentFile.textContent = progress.currentFile || '-';
        currentFile.title = progress.currentFile || '';
    }
    
    // עדכון סטטיסטיקות כפילויות
    if (filenamesDupes && progress.duplicatesFound) {
        filenamesDupes.textContent = progress.duplicatesFound.filenames || 0;
    }
    
    if (contentDupes && progress.duplicatesFound) {
        contentDupes.textContent = progress.duplicatesFound.contents || 0;
    }
    
    if (imageDupes && progress.duplicatesFound) {
        imageDupes.textContent = progress.duplicatesFound.images || 0;
    }
}

// הגדרת מצב האפליקציה הגלובלי
const AppState = {
    currentDirectoryHandle: null,
    currentScanner: null,
    results: null,
    settings: {
        checkFilenames: true,
        checkContents: true,
        checkImages: true,
        imageSimilarityThreshold: 90,
        workerCount: 2
    }
};

// שאר הקוד ללא שינוי...

async function getSampleFiles(dirHandle, sampleSize = 10) {
    const files = [];
    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                files.push(entry);
                if (files.length >= sampleSize) break;
            }
        }
        return files;
    } catch (error) {
        console.error('Error sampling files:', error);
        return [];
    }
}

const initApp = async () => {
    try {
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        if (!selectDirectoryBtn) {
            throw new Error('לא נמצאו אלמנטים חיוניים בממשק');
        }

        selectDirectoryBtn.addEventListener('click', handleDirectorySelection);

    } catch (error) {
        console.error('Initialization error:', error);
        UIController.showMessage('שגיאה באתחול המערכת: ' + error.message, 'error');
    }
};

// Worker selection function
async function showWorkerSelection(dirHandle) {
    const controlArea = document.getElementById('controlArea');
    if (!controlArea) return;

    controlArea.innerHTML = `
        <div class="worker-options">
            <h3>בחר תצורת סריקה:</h3>
            <div class="worker-buttons">
                <button class="scan-option" data-workers="1">סריקה רגילה (עובד יחיד)</button>
                <button class="scan-option" data-workers="2">סריקה מהירה (2 עובדים)</button>
                <button class="scan-option" data-workers="4">סריקה מהירה מאוד (4 עובדים)</button>
            </div>
        </div>
    `;

    // Add click handlers for scan options
    controlArea.querySelectorAll('.scan-option').forEach(button => {
        button.addEventListener('click', async () => {
            const workerCount = parseInt(button.dataset.workers);
            await startScan(dirHandle, { workerCount });
        });
    });
}

// Performance estimation function
async function estimatePerformance(dirHandle) {
    const workerOptions = [1, 2, 4, 8];
    const results = [];
    
    // Get sample files for testing
    const sampleFiles = await getSampleFiles(dirHandle);
    const totalFiles = sampleFiles.length;

    for (const workerCount of workerOptions) {
        const startTime = performance.now();
        
        // Test processing with different worker counts
        const scanner = new Scanner({ workerCount });
        await scanner.initWorkers();
        
        for (const file of sampleFiles) {
            await scanner.processFile(file);
        }
        
        const endTime = performance.now();
        const timePerFile = (endTime - startTime) / totalFiles;
        
        results.push({
            workerCount,
            timePerFile,
            estimatedTotal: timePerFile * totalFiles
        });
        
        scanner.terminateWorkers();
    }
    
    return {
        options: results,
        systemInfo: {
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 4,
            totalFiles
        }
    };
}

async function estimateFilesAndSize(directoryHandle, maxDepth = 10) {
    let fileCount = 0;
    let totalSize = 0;
    
    async function processEntry(entry, currentDepth = 0) {
        if (currentDepth > maxDepth) return;
        
        if (entry.kind === 'file') {
            fileCount++;
            const file = await entry.getFile();
            totalSize += file.size;
        } else if (entry.kind === 'directory') {
            for await (const childEntry of entry.values()) {
                await processEntry(childEntry, currentDepth + 1);
            }
        }
    }
    
    for await (const entry of directoryHandle.values()) {
        await processEntry(entry);
    }
    
    return { fileCount, totalSize };
}

/**
 * סיום תהליך הסריקה
 */
function finishScan(hasError) {
    // עדכון מצב
    AppState.scanning = false;
    AppState.stopRequested = false;
    
    // אם הסריקה הופסקה ע"י המשתמש
    if (hasError) {
        UIController.showMessage('הסריקה הופסקה או נכשלה', 'error');
        UIController.toggleArea('progressSection', false);
        UIController.toggleArea('statusMessage', true);
        return;
    }
    
    // עדכון מד התקדמות ל-100%
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = '100%';
    }
    
    // מציג את התוצאות
    UIController.displayResults(AppState.results, AppState.stats);
}

/**
 * ייצוא תוצאות הסריקה
 */
function exportResults() {
    if (!AppState.results) {
        UIController.showMessage('אין תוצאות לייצוא', 'error');
        return;
    }
    
    try {
        // הכנת אובייקט לייצוא
        const exportData = {
            scanDate: new Date().toISOString(),
            directoryName: AppState.currentDirectoryHandle ? AppState.currentDirectoryHandle.name : 'unknown',
            statistics: AppState.stats,
            results: AppState.results
        };
        
        // המרה ל-JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // יצירת קישור להורדה
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicate-scan-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // ניקוי
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        UIController.showMessage('התוצאות יוצאו בהצלחה', 'success');
    } catch (error) {
        console.error('Error exporting results:', error);
        UIController.showMessage(`שגיאה בייצוא התוצאות: ${error.message}`, 'error');
    }
}

/**
 * הצגת/הסתרת ויזואליזציה סטטיסטית
 */
function toggleStatistics() {
    const statsVisualization = document.getElementById('statsVisualization');
    if (!statsVisualization) return;
    
    const isVisible = statsVisualization.style.display !== 'none';
    statsVisualization.style.display = isVisible ? 'none' : 'block';
    
    const showStatsButton = document.getElementById('showStatsButton');
    if (showStatsButton) {
        showStatsButton.textContent = isVisible ? 'הצג סטטיסטיקות' : 'הסתר סטטיסטיקות';
    }
}

// Remove or comment out any AppState declaration
// const AppState = {...}  // <- Remove this if it exists

// Instead, use the global AppState
// ...existing code...

function calculateEstimatedTime(sampleTimes, totalFiles) {
    // Calculate average processing time per file
    const avgProcessingTime = sampleTimes.reduce((a, b) => a + b, 0) / sampleTimes.length;
    
    // Get worker count from UI
    const workerCount = parseInt(document.getElementById('workerCount').value) || 4;
    
    // Calculate total time in milliseconds
    const totalTimeMs = (avgProcessingTime * totalFiles) / workerCount;
    
    // Convert to minutes
    return totalTimeMs / (1000 * 60);
}

async function estimateCompletionTime(directoryHandle) {
    let estimationMessage;
    
    try {
        // Verify directory permissions first
        await verifyPermissions(directoryHandle);
        
        // Show initial message
        estimationMessage = UIController.showMessage('סופר קבצים...', 'info', false);
        
        // Get initial counts
        const { fileCount, totalSize } = await estimateFilesAndSize(directoryHandle);
        
        if (fileCount === 0) {
            throw new Error('לא נמצאו קבצים בתיקייה');
        }
        
        // Update message for sampling phase
        estimationMessage.textContent = 'דוגם קבצים להערכת זמן...';
        
        // Sample configuration
        const SAMPLE_SIZE = Math.min(fileCount, 10); // Reduced sample size
        const sampleTimes = [];
        let sampledFiles = 0;
        let errorCount = 0;
        const MAX_ERRORS = 3;
        
        // Get a flat list of files first
        const files = [];
        async function collectFiles(handle, path = '') {
            for await (const entry of handle.values()) {
                if (AppState.stopRequested) return;
                
                if (entry.kind === 'file') {
                    files.push({ entry, path });
                } else if (entry.kind === 'directory') {
                    await collectFiles(entry, `${path}/${entry.name}`);
                }
            }
        }
        
        await collectFiles(directoryHandle);
        
        // Randomly sample files
        while (sampledFiles < SAMPLE_SIZE && files.length > 0) {
            const randomIndex = Math.floor(Math.random() * files.length);
            const { entry, path } = files.splice(randomIndex, 1)[0];
            
            try {
                // Verify file permissions
                const permissionStatus = await entry.queryPermission({ mode: 'read' });
                if (permissionStatus !== 'granted') {
                    const newPermission = await entry.requestPermission({ mode: 'read' });
                    if (newPermission !== 'granted') {
                        errorCount++;
                        continue;
                    }
                }
                
                const file = await entry.getFile();
                estimationMessage.textContent = `דוגם קובץ ${sampledFiles + 1} מתוך ${SAMPLE_SIZE}...`;
                
                const startTime = performance.now();
                const buffer = await file.arrayBuffer();
                await crypto.subtle.digest('SHA-256', buffer);
                
                sampleTimes.push(performance.now() - startTime);
                sampledFiles++;
                
            } catch (error) {
                console.warn(`Error sampling file ${path}:`, error);
                errorCount++;
                
                if (errorCount >= MAX_ERRORS && sampleTimes.length === 0) {
                    throw new Error('לא ניתן לקרוא את הקבצים. אנא בדוק הרשאות');
                }
            }
        }
        
        // Calculate estimates
        if (sampleTimes.length === 0) {
            throw new Error('לא הצלחנו לדגום קבצים. אנא בדוק הרשאות גישה');
        }
        
        const workerCount = parseInt(document.getElementById('workerCount').value) || 4;
        const avgProcessingTime = sampleTimes.reduce((a, b) => a + b, 0) / sampleTimes.length;
        const estimatedTotalMs = (avgProcessingTime * fileCount) / workerCount;
        
        return {
            estimatedMinutes: Math.ceil(estimatedTotalMs / (1000 * 60)),
            totalFiles: fileCount,
            totalSize: totalSize,
            sampledFiles: sampleTimes.length,
            avgFileTime: Math.round(avgProcessingTime),
            errorCount: errorCount
        };
        
    } catch (error) {
        console.warn('Estimation error:', error);
        throw error;
    } finally {
        // Always clean up the message
        if (estimationMessage?.parentNode) {
            estimationMessage.remove();
        }
    }
}

async function verifyPermissions(handle) {
    // Verify read permission
    const readPermission = await handle.queryPermission({ mode: 'read' });
    if (readPermission !== 'granted') {
        const newPermission = await handle.requestPermission({ mode: 'read' });
        if (newPermission !== 'granted') {
            throw new Error('נדרשת הרשאת קריאה לתיקייה');
        }
    }
    return true;
}

/**
 * בדיקת תמיכת הדפדפן בפיצ'רים הנדרשים
 */
function checkBrowserSupport() {
    // בדיקת תמיכה ב-File System Access API
    if (!window.showDirectoryPicker) {
        UIController.showMessage('הדפדפן שלך אינו תומך בבחירת תיקיות. אנא השתמש בדפדפן עדכני כמו Chrome או Edge.', 'error');
        const selectDirButton = document.getElementById('selectDirButton');
        if (selectDirButton) {
            selectDirButton.disabled = true;
        }
        return false;
    }
    
    // בדיקת תמיכה ב-Web Workers
    if (!window.Worker) {
        console.warn('Web Workers לא נתמכים, הביצועים עלולים להיות נמוכים יותר');
    }
    
    return true;
}

// פונקציות דיבאג למציאת כפילויות
function testDuplicates() {
  console.log("Running duplicate test");
  return "Test ran successfully";
}

async function checkDuplicates() {
  try {
    console.log("Opening directory picker");
    const dirHandle = await window.showDirectoryPicker();
    console.log("Directory selected:", dirHandle.name);
    
    const files = [];
    const nameMap = new Map();
    const hashMap = new Map();
    
    // סריקת קבצים
    async function processDirectory(handle, path = "") {
      for await (const entry of handle.values()) {
        if (entry.kind === "file") {
          const file = await entry.getFile();
          const filePath = path ? path + "/" + entry.name : entry.name;
          
          files.push({
            name: entry.name,
            path: filePath,
            size: file.size
          });
          
          // בדוק שמות כפולים
          if (!nameMap.has(entry.name)) {
            nameMap.set(entry.name, [filePath]);
          } else {
            nameMap.get(entry.name).push(filePath);
          }
          
          // בדוק תוכן כפול
          if (file.size < 10 * 1024 * 1024) { // קבצים עד 10MB
            try {
              const buffer = await file.arrayBuffer();
              const hashArray = await crypto.subtle.digest("SHA-256", buffer);
              const hashHex = Array.from(new Uint8Array(hashArray))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
              
              if (!hashMap.has(hashHex)) {
                hashMap.set(hashHex, [filePath]);
              } else {
                hashMap.get(hashHex).push(filePath);
              }
            } catch (e) {
              console.error("Hash error:", e);
            }
          }
        } else if (entry.kind === "directory") {
          const newPath = path ? path + "/" + entry.name : entry.name;
          await processDirectory(entry, newPath);
        }
      }
    }
    
    await processDirectory(dirHandle);
    
    // מצא כפילויות
    const duplicateNames = Array.from(nameMap.entries())
      .filter(entry => entry[1].length > 1);
      
    const duplicateContents = Array.from(hashMap.entries())
      .filter(entry => entry[1].length > 1);
    
    console.log("Found", duplicateNames.length, "duplicate filenames");
    console.log("Found", duplicateContents.length, "duplicate contents");
    
    return {
      byName: duplicateNames,
      byContent: duplicateContents,
      allFiles: files
    };
  } catch (error) {
    console.error("Check failed:", error);
    return null;
  }
}

// הוסף את הפונקציות לאובייקט חלון
window.testDuplicates = testDuplicates;
window.checkDuplicates = checkDuplicates;

// הסר את ה-imports למעלה ופשוט השתמש בגרסה שכבר קיימת בקוד
// import { Scanner } from './scanner.js';
// import { UIController } from './ui-controller.js';

// ודא שהמשתנים הגלובליים מוגדרים
let Scanner, UIController;

// אתחול האפליקציה כשהדף נטען
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    
    try {
        // טען את המודולים באופן דינמי אם צריך
        if (typeof Scanner === 'undefined' || typeof UIController === 'undefined') {
            const scannerModule = await import('./scanner.js');
            const uiModule = await import('./ui-controller.js');
            
            // השתמש במודולים שנטענו
            Scanner = scannerModule.Scanner;
            UIController = uiModule.UIController;
        }
        
        // אתחול כפתורים וממשק משתמש
        initializeButtons();
        initializeSettings();
        
        // הצג מידע מערכת
        showSystemInfo();
    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('messageContainer').innerHTML = 
            '<div class="message error">שגיאה בטעינת האפליקציה. אנא רענן את הדף.</div>';
    }
});

// הגדרת מצב האפליקציה הגלובלי
const AppState = {
    currentDirectoryHandle: null,
    currentScanner: null,
    results: null,
    settings: {
        checkFilenames: true,
        checkContents: true,
        checkImages: true,
        imageSimilarityThreshold: 90,
        workerCount: 2
    }
};

// פונקציות לטיפול בממשק המשתמש (חלקי מהמחלקה UIController)
function showMessage(message, type = 'info', duration = 0) {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) return;
    
    // נקה הודעות קודמות
    messageContainer.innerHTML = '';
    
    // צור את אלמנט ההודעה
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = message;
    
    // הוסף כפתור סגירה אם ההודעה לא אמורה להיעלם אוטומטית
    if (duration === 0) {
        const closeButton = document.createElement('button');
        closeButton.className = 'close-btn';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => messageElement.remove();
        messageElement.appendChild(closeButton);
    }
    
    // הוסף את ההודעה לדף
    messageContainer.appendChild(messageElement);
    
    // סגור אוטומטית אחרי זמן מסוים
    if (duration > 0) {
        setTimeout(() => {
            messageElement.remove();
        }, duration);
    }
}

function hideMessage() {
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.innerHTML = '';
    }
}

function displayResults(results = {}, stats = {}) {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) return;

    resultsSection.style.display = 'block';
    
    // פונקציות עזר
    function formatSize(bytes) {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // הצגת שמות קבצים כפולים
    const filenamesList = document.querySelector('#filenameResults .results-list');
    if (filenamesList) {
        if (results.duplicateFilenames && results.duplicateFilenames.length > 0) {
            let html = '';
            results.duplicateFilenames.forEach(group => {
                if (!group || !group.paths || group.paths.length <= 1) return;
                
                html += '<div class="duplicate-group">';
                html += '<div class="duplicate-header">';
                html += '<h4>שם קובץ: ' + escapeHtml(group.name || '') + '</h4>';
                html += '<span>' + group.paths.length + ' עותקים</span>';
                html += '</div>';
                
                html += '<div class="duplicate-files">';
                group.paths.forEach(path => {
                    html += '<div class="file-item">';
                    html += '<span class="file-path">' + escapeHtml(path) + '</span>';
                    html += '<span class="file-size">' + formatSize(group.size) + '</span>';
                    html += '<div class="file-actions">';
                    html += '<button class="action-btn" data-path="' + escapeHtml(path) + '">פתח</button>';
                    html += '</div>';
                    html += '</div>';
                });
                html += '</div>';
                html += '</div>';
            });
            
            filenamesList.innerHTML = html || '<div class="no-results">לא נמצאו שמות קבצים כפולים</div>';
        } else {
            filenamesList.innerHTML = '<div class="no-results">לא נמצאו שמות קבצים כפולים</div>';
        }
    }
    
    // הוספת המאזינים אחרי עדכון ה-DOM
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const path = this.getAttribute('data-path');
            if (path) {
                try {
                    window.open('file://' + path);
                } catch (e) {
                    console.error('Error opening file:', e);
                }
            }
        });
    });
}

// כעת הגדר מפורשות אובייקט שמכיל את כל הפונקציות שנדרשות
const UIController = {
    showMessage,
    hideMessage,
    displayResults
};

// הגדרת מצב האפליקציה הגלובלי
const AppState = {
    currentDirectoryHandle: null,
    currentScanner: null,
    results: null
};

// אתחול האפליקציה כשהדף נטען
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeButtons();
});

// פונקציית אתחול הכפתורים
function initializeButtons() {
    const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
    const stopScanBtn = document.getElementById('stopScanBtn');
    
    if (selectDirectoryBtn) {
        selectDirectoryBtn.addEventListener('click', handleDirectorySelection);
    } else {
        console.error('Select directory button not found');
    }
    
    if (stopScanBtn) {
        stopScanBtn.addEventListener('click', stopScan);
    }
}

// פונקציית בחירת תיקייה
async function handleDirectorySelection() {
    try {
        console.log('Opening directory picker');
        const dirHandle = await window.showDirectoryPicker();
        console.log('Directory selected:', dirHandle.name);
        
        // פשוט התחל סריקה מיד
        startScan(dirHandle);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting directory:', error);
            UIController.showMessage('שגיאה בבחירת תיקייה: ' + error.message, 'error');
        }
    }
}

// פונקציית התחלת סריקה
async function startScan(dirHandle) {
    try {
        console.log('Starting scan for directory:', dirHandle.name);
        
        // עדכון ממשק המשתמש
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        const stopScanBtn = document.getElementById('stopScanBtn');
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'none';
        if (stopScanBtn) stopScanBtn.style.display = 'inline-block';
        if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'none';
        
        // שימוש בפונקציות דיבאג פשוטות
        const result = await window.checkDuplicates();
        console.log('Scan results:', result);
        
        // הצגת התוצאות
        if (result && result.byName && result.byContent) {
            const formattedResults = {
                duplicateFilenames: result.byName.map(entry => ({
                    name: entry.name,
                    paths: entry[1] || entry.paths || [],
                    size: 0
                })),
                duplicateContents: result.byContent.map(entry => 
                    (entry[1] || entry.paths || []).map(path => ({
                        path,
                        name: path.split('/').pop(),
                        size: 0
                    }))
                )
            };
            
            UIController.displayResults(formattedResults);
        } else {
            UIController.showMessage('לא נמצאו תוצאות או שהסריקה נכשלה', 'warning');
        }
        
        // עדכון הממשק בסיום
        if (progressSection) progressSection.style.display = 'none';
        if (stopScanBtn) stopScanBtn.style.display = 'none';
        if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
        if (resultsSection) resultsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error during scan:', error);
        UIController.showMessage('שגיאה בסריקה: ' + error.message, 'error');
        
        // החזרת ממשק המשתמש למצב הקודם
        const stopScanBtn = document.getElementById('stopScanBtn');
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        const progressSection = document.getElementById('progressSection');
        
        if (stopScanBtn) stopScanBtn.style.display = 'none';
        if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
        if (progressSection) progressSection.style.display = 'none';
    }
}

// פונקציית עצירת סריקה
function stopScan() {
    console.log('Stop scan requested');
    // לעת עתה, פשוט החזר את המסך למצב התחלתי
    
    const stopScanBtn = document.getElementById('stopScanBtn');
    const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
    const progressSection = document.getElementById('progressSection');
    
    if (stopScanBtn) stopScanBtn.style.display = 'none';
    if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
    if (progressSection) progressSection.style.display = 'none';
    
    UIController.showMessage('הסריקה הופסקה', 'info', 3000);
}
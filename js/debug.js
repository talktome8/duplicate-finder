/**
 * פונקציות דיבאג למציאת כפילויות קבצים
 */
 
// פונקציה פשוטה לבדיקה
function testDuplicates() {
  console.log("Running duplicate test");
  return "Test ran successfully";
}

// עדכון פונקציית checkDuplicates לזיהוי תמונות ויצירת סיכום
async function checkDuplicates(providedDirHandle = null) {
  try {
    let dirHandle;
    
    // השתמש ב-dirHandle שהועבר או בקש מהמשתמש לבחור תיקייה
    if (providedDirHandle) {
      dirHandle = providedDirHandle;
      console.log("Using provided directory:", dirHandle.name);
    } else {
      console.log("Opening directory picker");
      dirHandle = await window.showDirectoryPicker();
      console.log("Directory selected:", dirHandle.name);
    }
    
    // וודא הרשאות קריאה לתיקייה
    const permissionStatus = await dirHandle.queryPermission({ mode: 'read' });
    if (permissionStatus !== 'granted') {
      const newPermission = await dirHandle.requestPermission({ mode: 'read' });
      if (newPermission !== 'granted') {
        throw new Error("לא ניתנה הרשאת קריאה לתיקייה");
      }
    }
    
    // איסוף שמות קבצים
    const fileNames = new Map();
    const fileHashes = new Map();
    const imageHashes = new Map();  // חדש: מפה נפרדת לתמונות
    
    // סטטיסטיקות כלליות
    const stats = {
      filesScanned: 0,
      bytesScanned: 0,
      startTime: Date.now(),
      dirsScanned: 0,
      filesTotal: 0,
      fileTypes: {
        images: 0,
        documents: 0,
        videos: 0,
        audio: 0,
        other: 0
      },
      duplicatesFound: {
        total: 0,
        byName: 0,
        byContent: 0,
        images: 0
      },
      totalDuplicatesSize: 0  // גודל כולל של קבצים כפולים
    };
    
    // זיהוי סוג קובץ לפי סיומת
    function getFileType(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico', 'heic'];
      const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'csv'];
      const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpeg', 'mpg', '3gp'];
      const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'];
      
      if (imageExts.includes(ext)) return 'image';
      if (docExts.includes(ext)) return 'document';
      if (videoExts.includes(ext)) return 'video';
      if (audioExts.includes(ext)) return 'audio';
      return 'other';
    }
    
    // פונקציה לעדכון הממשק
    function updateScanUI(isScanning) {
      const progressSection = document.getElementById('progressSection');
      if (progressSection) {
        progressSection.style.display = isScanning ? 'block' : 'none';
      }
    }
    
    // פונקציה לעדכון הקובץ הנוכחי
    function updateCurrentFile(filename) {
      const currentFile = document.getElementById('currentFile');
      if (currentFile) {
        currentFile.textContent = filename || '-';
        currentFile.title = filename || '';
      }
    }
    
    // מודול להערכת גודל התיקייה והתקדמות הסריקה
    const ScanEstimator = {
        // נתונים מלימוד סטטיסטיקות סריקה קודמות
        averageFilesPerMB: 2.5, // ממוצע קבצים ל-MB בתיקיות טיפוסיות
        
        // נתונים לאיסוף במהלך הסריקה
        totalScannedBytes: 0,
        bytesPerSecond: 0,
        estimatedTotalBytes: 0,
        estimatedTotalFiles: 0,
        lastUpdateTime: 0,
        startTime: 0,
        scannedInodes: new Set(), // לספירת קבצים ייחודיים (למניעת כפילויות)
        filesSizeDistribution: [], // לחישוב דפוסים בגודל קבצים
        
        // איתחול המודול
        initialize() {
            this.totalScannedBytes = 0;
            this.bytesPerSecond = 0;
            this.estimatedTotalBytes = 0;
            this.estimatedTotalFiles = 0;
            this.lastUpdateTime = 0;
            this.startTime = Date.now();
            this.scannedInodes.clear();
            this.filesSizeDistribution = [];
            this.depthReached = 0;
        },
        
        // עדכון סטטיסטיקות בעת סריקת קובץ
        trackFile(file, depth = 0) {
            const now = Date.now();
            
            if (!this.lastUpdateTime) {
                this.lastUpdateTime = now;
            }
            
            // עקוב אחרי עומק מקסימלי של תיקיות
            this.depthReached = Math.max(this.depthReached, depth);
            
            // הוסף את גודל הקובץ לסטטיסטיקה
            this.totalScannedBytes += file.size;
            this.filesSizeDistribution.push(file.size);
            
            // חשב קצב סריקה
            const elapsedSeconds = (now - this.startTime) / 1000;
            if (elapsedSeconds > 0) {
                // חישוב ממוצע נע של קצב הסריקה
                const newBytesPerSecond = this.totalScannedBytes / elapsedSeconds;
                this.bytesPerSecond = (this.bytesPerSecond * 0.7) + (newBytesPerSecond * 0.3);
            }
            
            // עדכן הערכת גודל כולל אחת ל-2 שניות
            if (now - this.lastUpdateTime > 2000) {
                this.updateEstimates();
                this.lastUpdateTime = now;
            }
        },
        
        // עדכון הערכות למספר קבצים וגודל כולל
        updateEstimates() {
            // חשב ממוצע גודל קובץ
            const avgFileSize = this.filesSizeDistribution.length > 0 
                ? this.filesSizeDistribution.reduce((sum, size) => sum + size, 0) / this.filesSizeDistribution.length
                : 0;
            
            if (avgFileSize > 0 && this.depthReached > 0) {
                // היוריסטיקה לחישוב גודל בהתבסס על עומק תיקיות וקצב סריקה
                const estimatedTotalFilesMultiplier = 1 + (0.3 * this.depthReached);
                const scannedFiles = stats.filesScanned;
                
                // עדכן את ההערכה לכמות הקבצים הכוללת
                this.estimatedTotalFiles = Math.max(
                    scannedFiles * estimatedTotalFilesMultiplier,
                    this.estimatedTotalFiles || 0
                );
                
                // עדכן את ההערכה לגודל הכולל
                this.estimatedTotalBytes = this.estimatedTotalFiles * avgFileSize;
            }
        },
        
        // חישוב אחוז ההתקדמות
        getProgressPercent() {
            // אם אין לנו מספיק מידע, החזר התקדמות מבוססת זמן
            if (this.estimatedTotalFiles <= stats.filesScanned || this.estimatedTotalBytes <= 0) {
                const elapsedTime = Date.now() - this.startTime;
                const estimatedTimeBasedProgress = Math.min(95, (elapsedTime / 60000) * 20); // הערכה גסה: 20% לדקה, מקסימום 95%
                
                // השתמש בלפחות מספר הקבצים שכבר נסרקו
                const fileBasedProgress = stats.filesScanned > 10 
                    ? Math.min(90, stats.filesScanned / (stats.filesScanned * 1.5) * 100)
                    : 0;
                    
                return Math.max(estimatedTimeBasedProgress, fileBasedProgress);
            }
            
            // אחרת, חשב התקדמות לפי כמות קבצים ו/או גודל
            const filesProgress = stats.filesScanned / this.estimatedTotalFiles * 100;
            const bytesProgress = this.totalScannedBytes / this.estimatedTotalBytes * 100;
            
            // שקלל את שני המדדים
            return Math.min(99, (filesProgress * 0.7) + (bytesProgress * 0.3));
        },
        
        // הערך זמן שנותר בשניות
        getEstimatedRemainingTime() {
            if (this.bytesPerSecond <= 0 || this.estimatedTotalBytes <= 0) return null;
            
            const remainingBytes = Math.max(0, this.estimatedTotalBytes - this.totalScannedBytes);
            return remainingBytes / this.bytesPerSecond;
        }
    };

    // עדכון פונקציית החישוב והתצוגה של התקדמות הסריקה
    function updateProgress() {
      // עדכון מד התקדמות
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      const elapsedTimeElem = document.getElementById('elapsedTime');
      const remainingTimeElem = document.getElementById('remainingTime');
      
      if (!ScanEstimator.startTime) {
        ScanEstimator.startTime = Date.now();
      }
      
      // חישוב זמן שחלף בשניות
      const elapsedSeconds = Math.floor((Date.now() - ScanEstimator.startTime) / 1000);
      
      if (progressBar && progressText) {
        // קבל אחוז התקדמות מהמודול המשופר
        const percent = ScanEstimator.getProgressPercent();
        
        // עדכון מד ההתקדמות
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.floor(percent)}%`;
        
        // שינוי צבע לפי התקדמות
        if (percent < 30) {
            progressBar.style.background = "linear-gradient(90deg, #ff9800, #ffc107)";
        } else if (percent < 70) {
            progressBar.style.background = "linear-gradient(90deg, #2196F3, #4CAF50)";
        } else {
            progressBar.style.background = "linear-gradient(90deg, #4CAF50, #8BC34A)";
        }
        
        // חישוב והצגת זמן נותר
        if (elapsedTimeElem) {
            elapsedTimeElem.textContent = formatTime(elapsedSeconds);
        }
        
        // חישוב זמן נותר עם המודול המשופר
        if (remainingTimeElem) {
            const remainingTime = ScanEstimator.getEstimatedRemainingTime();
            
            if (remainingTime !== null && percent < 95) {
                remainingTimeElem.textContent = formatTime(Math.floor(remainingTime));
            } else if (percent >= 95) {
                remainingTimeElem.textContent = "Less than a minute";
            } else {
                remainingTimeElem.textContent = "Calculating...";
            }
        }
      }
      
      // Update file counter
      const filesScannedElem = document.getElementById('filesScanned');
      if (filesScannedElem) {
        filesScannedElem.textContent = stats.filesScanned.toLocaleString();
      }
      
      // Update total size
      const bytesScannedElem = document.getElementById('bytesScanned');
      if (bytesScannedElem) {
        bytesScannedElem.textContent = formatSize(ScanEstimator.totalScannedBytes);
      }
      
      // Update scan speed
      const scanSpeedElem = document.getElementById('scanSpeed');
      if (scanSpeedElem) {
        scanSpeedElem.textContent = formatSize(ScanEstimator.bytesPerSecond) + '/s';
      }
    }
    
    // עדכן את הממשק משתמש בתחילת הסריקה
    updateScanUI(true);
    
    // מונה תיקיות פתוחות במקביל
    let openDirs = 0;
    const maxOpenDirs = 5; // הגבלה למניעת עומס
    
    // שיפור הספירה המקדימה
    async function countFiles(handle, path = "") {
      try {
        stats.dirsScanned++;
        const maxInitialCount = 1000; // הגבל את מספר הקבצים לספירה התחלתית
        let entriesInCurrentDir = 0;
        
        // עדכון משתמש עם פרטים על התיקייה המטופלת
        const currentFile = document.getElementById('currentFile');
        if (currentFile) {
          currentFile.textContent = `סופר קבצים בתיקייה: ${path || handle.name}`;
        }
        
        for await (const entry of handle.values()) {
          if (stats.filesTotal >= maxInitialCount) {
            // אם כבר מצאנו מספיק קבצים, נפסיק את הספירה המקדימה
            stats.filesTotal += 10; // נוסיף קצת למקדם הביטחון
            return;
          }
          
          if (entry.kind === "file") {
            stats.filesTotal++;
            entriesInCurrentDir++;
          } else if (entry.kind === "directory") {
            // דלג על תיקיות מערכת
            if (skipSystemDirectories(entry.name)) continue;
            
            // נגביל את עומק הספירה לשתי רמות
            if (path.split('/').length < 4) {
              await countFiles(entry, path ? `${path}/${entry.name}` : entry.name);
            } else {
              // אם התיקייה עמוקה מדי, נוסיף הערכה גסה
              stats.filesTotal += 5;
            }
          }
          
          // עדכן מדי פעם את הממשק
          if (stats.filesTotal % 50 === 0) {
            const progressText = document.getElementById('progressText');
            if (progressText) {
              progressText.textContent = `נספרו ${stats.filesTotal} קבצים...`;
            }
          }
        }
        
        // אם מצאנו הרבה קבצים בתיקייה זו, נוסיף אומדן לתיקיות משנה שלא נסרקו
        if (entriesInCurrentDir > 20) {
          stats.filesTotal += entriesInCurrentDir / 2;
        }
      } catch (err) {
        console.error("Error counting files:", err);
      }
    }
    
    // פונקציה לסינון תיקיות מערכת
    function skipSystemDirectories(dirname) {
      const skipDirs = [
        "$Recycle.Bin",
        "System Volume Information",
        "Windows",
        "$SysReset",
        "Config.Msi",
        "ProgramData",
        "Program Files",
        "Program Files (x86)",
        "Recovery"
      ];
      
      return skipDirs.includes(dirname) ||
             dirname.startsWith('.') ||  // תיקיות נסתרות
             dirname.startsWith('$');    // תיקיות מיוחדות של Windows
    }
    
    // ספירה ראשונית מוגבלת
    try {
      await countFiles(dirHandle);
      console.log(`Estimated ${stats.filesTotal} files to scan`);
    } catch (err) {
      console.warn("Initial count failed:", err);
    }
    
    // סריקת קבצים
    async function processDirectory(handle, path, depth = 0) {
      const currentPath = path || "";
      
      try {
        openDirs++;
        stats.dirsScanned++;
        
        for await (const entry of handle.values()) {
          if (entry.kind === "file") {
            stats.filesScanned++;
            
            try {
              const file = await entry.getFile();
              stats.bytesScanned += file.size;
              
              const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              
              // עדכן את שם הקובץ הנוכחי בממשק
              updateCurrentFile(entry.name);
              
              // זיהוי סוג הקובץ
              const fileType = getFileType(entry.name);
              stats.fileTypes[fileType + 's']++;
              
              // עדכון אומדן הסריקה
              ScanEstimator.trackFile(file, depth);
              
              // עדכון התקדמות
              if (stats.filesScanned % 5 === 0) {
                updateProgress();
              }
              
              // בדוק שמות כפולים
              if (!fileNames.has(entry.name)) {
                fileNames.set(entry.name, [{ path: fullPath, size: file.size }]);
              } else {
                fileNames.get(entry.name).push({ path: fullPath, size: file.size });
                // עדכן סטטיסטיקות
                if (fileNames.get(entry.name).length === 2) {
                  stats.duplicatesFound.byName++;
                  stats.duplicatesFound.total++;
                }
              }
              
              // בדוק תוכן כפול (רק לקבצים קטנים)
              if (file.size < 20 * 1024 * 1024) { // קבצים עד 20MB
                try {
                  const buffer = await file.arrayBuffer();
                  const hash = await crypto.subtle.digest("SHA-256", buffer);
                  const hashStr = Array.from(new Uint8Array(hash))
                    .map(function(b) { 
                      return b.toString(16).padStart(2, "0"); 
                    })
                    .join("");
                  
                  const fileInfo = { 
                    path: fullPath, 
                    name: entry.name, 
                    size: file.size,
                    type: fileType
                  };
                  
                  // הפרד בין תמונות לקבצים אחרים
                  if (fileType === 'image') {
                    if (!imageHashes.has(hashStr)) {
                      imageHashes.set(hashStr, [fileInfo]);
                    } else {
                      imageHashes.get(hashStr).push(fileInfo);
                      // עדכן סטטיסטיקות רק בפעם הראשונה שמצאנו כפילות
                      if (imageHashes.get(hashStr).length === 2) {
                        stats.duplicatesFound.images++;
                        stats.duplicatesFound.total++;
                        stats.totalDuplicatesSize += file.size;
                      }
                    }
                  } else {
                    if (!fileHashes.has(hashStr)) {
                      fileHashes.set(hashStr, [fileInfo]);
                    } else {
                      fileHashes.get(hashStr).push(fileInfo);
                      // עדכן סטטיסטיקות רק בפעם הראשונה שמצאנו כפילות
                      if (fileHashes.get(hashStr).length === 2) {
                        stats.duplicatesFound.byContent++;
                        stats.duplicatesFound.total++;
                        stats.totalDuplicatesSize += file.size;
                      }
                    }
                  }
                } catch (err) {
                  console.error("Hash error for", entry.name, ":", err);
                }
              }
            } catch (err) {
              console.error("Error processing file:", entry.name, err);
            }
          } else if (entry.kind === "directory") {
            // דלג על תיקיות מערכת מסוימות
            const skipDirs = [
              "$Recycle.Bin",
              "System Volume Information",
              "Windows",
              "$SysReset",
              "Config.Msi"
            ];
            
            if (skipDirs.includes(entry.name)) {
              console.log("Skipping system directory:", entry.name);
              continue;
            }
            
            const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            
            // הגבל את מספר התיקיות הפתוחות במקביל
            if (openDirs <= maxOpenDirs) {
              await processDirectory(entry, newPath, depth + 1);
            } else {
              console.log("Too many open directories, postponing:", newPath);
              // נוכל לטפל בזה בצורה טובה יותר עם תור משימות
            }
          }
        }
      } catch (err) {
        console.error("Error scanning directory", path, ":", err);
      } finally {
        openDirs--;
      }
    }
    
    // פונקציית עזר לפורמט גודל קובץ
    function formatSize(bytes) {
      if (!bytes || isNaN(bytes)) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
    }
    
    // Helper function for time formatting
    function formatTime(seconds) {
      if (seconds < 60) {
        return seconds + ' sec';
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes} min ${secs} sec`;
      } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hr ${minutes} min`;
      }
    }
    
    // התחל את הסריקה המלאה
    await processDirectory(dirHandle);
    
    // עדכון אחרון של התקדמות
    updateProgress();
    
    // סיים את הסריקה
    updateScanUI(false);
    
    // מיון והצגת תוצאות
    const duplicateNames = [];
    fileNames.forEach(function(paths, name) {
      if (paths.length > 1) {
        duplicateNames.push({ name, paths });
      }
    });
    
    const duplicateContents = [];
    fileHashes.forEach(function(paths, hash) {
      if (paths.length > 1) {
        duplicateContents.push({ hash, paths });
      }
    });
    
    const duplicateImages = [];
    imageHashes.forEach(function(files, hash) {
      if (files.length > 1) {
        duplicateImages.push({ hash, files });
      }
    });
    
    console.log("======== RESULTS ========");
    console.log("Found", duplicateNames.length, "duplicate filenames");
    console.log("Found", duplicateContents.length, "duplicate contents");
    console.log("Found", duplicateImages.length, "duplicate images");
    
    // הכן סיכום מפורט
    const summary = {
      totalFiles: stats.filesScanned,
      totalSize: stats.bytesScanned,
      scanTime: Math.floor((Date.now() - stats.startTime) / 1000),
      fileTypes: stats.fileTypes,
      duplicates: {
        totalCount: stats.duplicatesFound.total,
        byName: duplicateNames.length,
        byContent: duplicateContents.length,
        images: duplicateImages.length,
        totalSize: stats.totalDuplicatesSize
      }
    };
    
    return {
      byName: duplicateNames,
      byContent: duplicateContents,
      byImage: duplicateImages,
      stats: stats,
      summary: summary
    };
  } catch (error) {
    console.error("Check failed:", error);
    throw error;
  }
}

// הוסף את הפונקציות לאובייקט חלון
window.testDuplicates = testDuplicates;
window.checkDuplicates = checkDuplicates;
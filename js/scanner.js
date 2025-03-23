/**
 * Scanner.js - File scanning implementation
 */

export class Scanner {
    constructor(options = {}) {
        this.options = {
            checkFilenames: true,
            checkContents: true,
            checkImages: true,
            imageSimilarityThreshold: 90,
            workerCount: 2,
            ...options
        };
        
        this.stats = {
            filesScanned: 0,
            bytesScanned: 0,
            startTime: Date.now(),
            dirsScanned: 0
        };
        
        this.results = {
            duplicateFilenames: [],
            duplicateContents: [],
            duplicateImages: []
        };
        
        this.filenameMap = new Map();
        this.contentMap = new Map();
        this.imageSignatures = new Map();
        this.running = false;
        
        // הוסף משתנה לדיבאג
        this.debugInfo = {
            allFiles: [],
            skippedFiles: [],
            errors: []
        };
    }

    async scan(directoryHandle, progressCallback = null) {
        console.log('Starting scan with options:', this.options);
        this.running = true;
        this.stats.startTime = Date.now();
        
        try {
            // נקה את כל המפות והתוצאות מסריקות קודמות
            this.filenameMap.clear();
            this.contentMap.clear();
            this.imageSignatures.clear();
            this.results = {
                duplicateFilenames: [],
                duplicateContents: [],
                duplicateImages: []
            };
            
            // סרוק את כל הקבצים בתיקייה
            await this.scanDirectory(directoryHandle, '', progressCallback);
            
            console.log('Scan completed. Finding duplicates...');
            
            // לוג מפורט על המפות השונות
            console.log('Filename map:', this.filenameMap.size, 'unique filenames');
            console.log('Content map:', this.contentMap.size, 'unique hashes');
            console.log('Image signatures:', this.imageSignatures.size, 'images');
            
            // חיפוש כפילויות לפי ההגדרות
            if (this.options.checkFilenames) {
                this.findFilenameDuplicates();
            }
            
            if (this.options.checkContents) {
                this.findContentDuplicates();
            }
            
            if (this.options.checkImages) {
                this.findImageDuplicates();
            }
            
            // סיכום ממצאים
            console.log('Found duplicates summary:');
            console.log('- Filename duplicates:', this.results.duplicateFilenames.length, 'groups');
            console.log('- Content duplicates:', this.results.duplicateContents.length, 'groups');
            console.log('- Image duplicates:', this.results.duplicateImages.length, 'groups');
            
            return {
                results: this.results,
                stats: this.stats,
                debug: this.debugInfo
            };
        } catch (error) {
            console.error('Scan error:', error);
            this.debugInfo.errors.push({ phase: 'scan', error: error.toString() });
            throw error;
        } finally {
            this.running = false;
        }
    }

    async scanDirectory(dirHandle, parentPath = '', progressCallback = null) {
        if (!this.running) return;
        
        try {
            const entries = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry);
            }
            
            // לוג על תיקייה
            this.stats.dirsScanned++;
            console.log(`Scanning directory: ${parentPath || dirHandle.name} (${entries.length} entries)`);
            
            for (const entry of entries) {
                if (!this.running) break;
                
                const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
                
                if (entry.kind === 'file') {
                    await this.processFile(entry, path);
                    this.stats.filesScanned++;
                    
                    if (progressCallback) {
                        progressCallback({
                            filesScanned: this.stats.filesScanned,
                            bytesScanned: this.stats.bytesScanned,
                            currentFile: entry.name,
                            startTime: this.stats.startTime,
                            totalFiles: entries.length,
                            duplicatesFound: {
                                filenames: this.filenameMap.size,
                                contents: this.contentMap.size,
                                images: this.imageSignatures.size
                            }
                        });
                    }
                } else if (entry.kind === 'directory') {
                    await this.scanDirectory(entry, path, progressCallback);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory: ${parentPath}`, error);
            this.debugInfo.errors.push({ 
                phase: 'scanDirectory', 
                path: parentPath, 
                error: error.toString() 
            });
        }
    }
    
    async processFile(fileHandle, path) {
        try {
            const file = await fileHandle.getFile();
            
            this.debugInfo.allFiles.push({
                name: file.name,
                path,
                size: file.size,
                type: file.type
            });
            
            // בדוק אם צריך לדלג על הקובץ
            if (this.shouldSkipFile(file.name)) {
                this.debugInfo.skippedFiles.push({
                    name: file.name,
                    path,
                    reason: 'skipped by filter'
                });
                return;
            }
            
            // עדכון סטטיסטיקה
            this.stats.bytesScanned += file.size;
            
            // טיפול בקבצים לפי אפשרויות
            if (this.options.checkFilenames) {
                this.addToFilenameMap(file.name, { path, size: file.size });
            }
            
            if (this.options.checkContents) {
                await this.processFileContent(file, path);
            }
            
            if (this.options.checkImages && this.isImageFile(file.name)) {
                await this.processImageFile(file, path);
            }
        } catch (error) {
            console.error(`Error processing file: ${path}`, error);
            this.debugInfo.errors.push({ 
                phase: 'processFile', 
                path, 
                error: error.toString() 
            });
        }
    }
    
    addToFilenameMap(filename, fileInfo) {
        // Extract just the filename without path
        const baseName = filename.split('/').pop();
        
        if (!this.filenameMap.has(baseName)) {
            this.filenameMap.set(baseName, [fileInfo]);
        } else {
            this.filenameMap.get(baseName).push(fileInfo);
        }
        
        // לוג על הוספת קובץ חדש
        if (this.filenameMap.get(baseName).length > 1) {
            console.log(`Found potential filename duplicate: ${baseName} (${this.filenameMap.get(baseName).length} copies)`);
        }
    }
    
    async processFileContent(file, path) {
        try {
            // חישוב גיבוב קובץ
            const hash = await this.calculateFileHash(file);
            
            // הוספה למפת התוכן
            if (!this.contentMap.has(hash)) {
                this.contentMap.set(hash, []);
            }
            
            this.contentMap.get(hash).push({
                path,
                name: file.name,
                size: file.size
            });
            
            // לוג על הוספת קובץ חדש
            if (this.contentMap.get(hash).length > 1) {
                console.log(`Found content duplicate: ${file.name} (${this.contentMap.get(hash).length} copies) - Hash: ${hash.substring(0, 8)}...`);
            }
        } catch (error) {
            console.error(`Error processing file content: ${path}`, error);
            this.debugInfo.errors.push({ 
                phase: 'processFileContent', 
                path, 
                error: error.toString() 
            });
        }
    }
    
    async calculateFileHash(file) {
        try {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error(`Error calculating hash for file: ${file.name}`, error);
            this.debugInfo.errors.push({
                phase: 'calculateFileHash',
                file: file.name,
                error: error.toString()
            });
            
            // במקרה של שגיאה, נחזיר גיבוב ייחודי המבוסס על השם והגודל
            return 'error-hash-' + file.name + '-' + file.size;
        }
    }
    
    findFilenameDuplicates() {
        console.log('Finding filename duplicates...');
        this.results.duplicateFilenames = [];
        
        for (const [filename, files] of this.filenameMap.entries()) {
            if (files.length > 1) {
                console.log(`Confirming duplicate filename: ${filename} (${files.length} copies)`);
                
                this.results.duplicateFilenames.push({
                    name: filename,
                    paths: files.map(f => f.path),
                    size: files[0]?.size || 0
                });
            }
        }
        
        console.log(`Found ${this.results.duplicateFilenames.length} filename duplicate groups`);
    }
    
    findContentDuplicates() {
        console.log('Finding content duplicates...');
        this.results.duplicateContents = [];
        
        for (const [hash, files] of this.contentMap.entries()) {
            if (files.length > 1) {
                console.log(`Confirming content hash: ${hash.substring(0, 8)}... (${files.length} copies)`);
                
                this.results.duplicateContents.push(files);
            }
        }
        
        console.log(`Found ${this.results.duplicateContents.length} content duplicate groups`);
    }
    
    shouldSkipFile(filename) {
        // דלג על קבצי מערכת, קבצים נסתרים וכו'
        const skipPatterns = [
            /^\./,              // קבצים נסתרים
            /^thumbs\.db$/i,    // מטמון תמונות ממוזערות של Windows
            /^desktop\.ini$/i,  // הגדרות תיקייה של Windows
            /^\.ds_store$/i,    // מטה-דאטה של תיקיות macOS
            /^\.localized$/i    // קובץ לוקליזציה של macOS
        ];
        
        const shouldSkip = skipPatterns.some(pattern => pattern.test(filename));
        if (shouldSkip) {
            console.log(`Skipping system file: ${filename}`);
        }
        
        return shouldSkip;
    }
    
    isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    }
    
    async processImageFile(file, path) {
        try {
            if (file.size > 20 * 1024 * 1024) {
                // דלג על קבצי תמונה גדולים מ-20MB
                console.log(`Skipping large image: ${path} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
                return;
            }
            
            // חשב חתימת תמונה רק עבור סוגי קבצים נתמכים
            if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'].includes(file.type)) {
                const signature = await this.calculateImageSignature(file);
                
                if (!signature) return;
                
                // הוסף לאוסף החתימות
                this.imageSignatures.set(path, {
                    signature,
                    path,
                    name: file.name,
                    size: file.size
                });
            }
        } catch (error) {
            console.error(`Error processing image file: ${path}`, error);
            this.debugInfo.errors.push({ 
                phase: 'processImageFile', 
                path, 
                error: error.toString() 
            });
        }
    }
    
    async calculateImageSignature(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // שימוש בגודל קטן יותר לחתימה - 16x16 לדיוק טוב יותר
                    const canvas = document.createElement('canvas');
                    canvas.width = 16;
                    canvas.height = 16;
                    
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        throw new Error('Failed to get canvas context');
                    }
                    
                    // שיפור איכות הקטנת התמונה
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, 16, 16);
                    
                    const imageData = ctx.getImageData(0, 0, 16, 16).data;
                    const signature = new Float32Array(256); // 16x16 = 256 ערכים
                    
                    // המרה משופרת לגווני אפור
                    let i = 0;
                    for (let y = 0; y < 16; y++) {
                        for (let x = 0; x < 16; x++) {
                            const idx = (y * 16 + x) * 4;
                            const r = imageData[idx];
                            const g = imageData[idx + 1];
                            const b = imageData[idx + 2];
                            // נוסחה משופרת להמרה לגווני אפור
                            signature[i++] = 0.299 * r + 0.587 * g + 0.114 * b;
                        }
                    }
                    
                    URL.revokeObjectURL(img.src);
                    resolve(signature);
                } catch (error) {
                    URL.revokeObjectURL(img.src);
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                URL.revokeObjectURL(img.src);
                console.error('Image loading error:', error);
                resolve(null); // במקום לדחות, נחזיר null
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    calculateImageSimilarity(sig1, sig2) {
        if (!sig1 || !sig2 || sig1.length !== sig2.length) {
            return 0;
        }
        
        let differences = 0;
        const length = sig1.length;
        
        // השוואה משופרת עם רגישות מותאמת
        for (let i = 0; i < length; i++) {
            const diff = Math.abs(sig1[i] - sig2[i]);
            differences += diff < 25 ? 0 : diff / 255; // נרמול ההבדלים
        }
        
        // חישוב אחוז הדמיון
        return 100 * (1 - differences / length);
    }
    
    findImageDuplicates() {
        console.log('Finding similar images...');
        this.results.duplicateImages = [];
        
        // אם אין מספיק תמונות, אין טעם להמשיך
        if (this.imageSignatures.size <= 1) {
            console.log('Not enough images to compare');
            return;
        }
        
        const threshold = this.options.imageSimilarityThreshold;
        const entries = Array.from(this.imageSignatures.values());
        const groups = [];
        const processed = new Set();
        
        console.log(`Comparing ${entries.length} images with threshold ${threshold}%`);
        
        for (let i = 0; i < entries.length; i++) {
            if (processed.has(entries[i].path)) continue;
            
            const group = {
                paths: [entries[i].path],
                similarity: 100
            };
            
            for (let j = i + 1; j < entries.length; j++) {
                if (processed.has(entries[j].path)) continue;
                
                const similarity = this.calculateImageSimilarity(
                    entries[i].signature,
                    entries[j].signature
                );
                
                if (similarity >= threshold) {
                    group.paths.push(entries[j].path);
                    group.similarity = Math.min(group.similarity, similarity);
                    processed.add(entries[j].path);
                }
            }
            
            if (group.paths.length > 1) {
                groups.push(group);
                console.log(`Found image group with ${group.paths.length} similar images, ${group.similarity.toFixed(1)}% similarity`);
            }
            
            processed.add(entries[i].path);
        }
        
        this.results.duplicateImages = groups;
        console.log(`Found ${groups.length} groups of similar images`);
    }
    
    stop() {
        console.log('Stopping scanner...');
        this.running = false;
    }
}
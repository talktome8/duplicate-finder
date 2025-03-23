/**
 * file-utils.js - פונקציות עזר לטיפול בקבצים
 */

// Replace export with global class declaration
class FileUtils {
    /**
     * בדיקה האם הקובץ הוא תמונה לפי הסיומת
     * @param {string} fileName - שם הקובץ
     * @returns {boolean} האם הקובץ הוא תמונה
     */
    static isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    }
    
    /**
     * בדיקה האם הקובץ הוא קובץ וידאו
     * @param {string} fileName - שם הקובץ
     * @returns {boolean} האם הקובץ הוא וידאו
     */
    static isVideoFile(fileName) {
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'];
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return videoExtensions.includes(ext);
    }
    
    /**
     * בדיקה האם הקובץ הוא קובץ אודיו
     * @param {string} fileName - שם הקובץ
     * @returns {boolean} האם הקובץ הוא אודיו
     */
    static isAudioFile(fileName) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return audioExtensions.includes(ext);
    }
    
    /**
     * בדיקה האם הקובץ הוא קובץ מסמך
     * @param {string} fileName - שם הקובץ
     * @returns {boolean} האם הקובץ הוא מסמך
     */
    static isDocumentFile(fileName) {
        const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return docExtensions.includes(ext);
    }
    
    /**
     * קבלת סוג MIME לפי סיומת הקובץ
     * @param {string} fileName - שם הקובץ
     * @returns {string} סוג MIME
     */
    static getMimeType(fileName) {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
        const mimeTypes = {
            // תמונות
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            
            // וידאו
            'mp4': 'video/mp4',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'mkv': 'video/x-matroska',
            'webm': 'video/webm',
            
            // אודיו
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'm4a': 'audio/mp4',
            
            // מסמכים
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'rtf': 'application/rtf',
            
            // שונות
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',
            'exe': 'application/x-msdownload',
            'dll': 'application/x-msdownload',
            'js': 'application/javascript',
            'css': 'text/css',
            'html': 'text/html',
            'htm': 'text/html',
            'json': 'application/json',
            'xml': 'application/xml'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }
    
    /**
     * פיצול שם קובץ לשם ולסיומת
     * @param {string} fileName - שם הקובץ
     * @returns {Object} אובייקט עם שם הקובץ והסיומת
     */
    static splitFileName(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return {
                name: fileName,
                extension: ''
            };
        }
        
        return {
            name: fileName.substring(0, lastDotIndex),
            extension: fileName.substring(lastDotIndex + 1)
        };
    }
    
    /**
     * פורמט גודל קובץ ליחידות קריאות
     * @param {number} bytes - גודל בבתים
     * @returns {string} גודל מפורמט
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * יצירת תקציר תוכן של קובץ (למשל, לצורך זיהוי קבצים דומים)
     * @param {ArrayBuffer} fileBuffer - תוכן הקובץ
     * @param {Object} options - אפשרויות ליצירת התקציר
     * @returns {ArrayBuffer} תקציר התוכן
     */
    static createFileContentDigest(fileBuffer, options = {}) {
        const defaultOptions = {
            // האם לדגום את כל הקובץ או רק חלקים ממנו
            fullScan: false,
            
            // גודל כולל של התקציר (בבתים)
            digestSize: 1024,
            
            // גודל מרבי של קובץ לסריקה מלאה (בבתים)
            maxFullScanSize: 1024 * 1024 // 1MB
        };
        
        const opts = Object.assign({}, defaultOptions, options);
        const fileSize = fileBuffer.byteLength;
        
        // אם הקובץ קטן יחסית או שהוגדרה סריקה מלאה, נחזיר את כל התוכן
        if (opts.fullScan || fileSize <= opts.digestSize || fileSize <= opts.maxFullScanSize) {
            // אם הקובץ קטן מגודל התקציר, נחזיר אותו כמות שהוא
            if (fileSize <= opts.digestSize) {
                return fileBuffer;
            }
            
            // אחרת, נדגום חלקים שווים מרוחקים לאורך הקובץ
            const result = new Uint8Array(opts.digestSize);
            const step = Math.floor(fileSize / opts.digestSize);
            
            for (let i = 0; i < opts.digestSize; i++) {
                const index = Math.min(i * step, fileSize - 1);
                result[i] = new Uint8Array(fileBuffer)[index];
            }
            
            return result.buffer;
        }
        
        // עבור קבצים גדולים, נדגום מתחילת הקובץ, מהאמצע ומהסוף
        const headerSize = Math.floor(opts.digestSize * 0.4);
        const middleSize = Math.floor(opts.digestSize * 0.2);
        const footerSize = opts.digestSize - headerSize - middleSize;
        
        const result = new Uint8Array(opts.digestSize);
        const fileData = new Uint8Array(fileBuffer);
        
        // העתקת תחילת הקובץ
        result.set(fileData.slice(0, headerSize), 0);
        
        // העתקת אמצע הקובץ
        const middleOffset = Math.floor(fileSize / 2) - Math.floor(middleSize / 2);
        result.set(fileData.slice(middleOffset, middleOffset + middleSize), headerSize);
        
        // העתקת סוף הקובץ
        result.set(fileData.slice(fileSize - footerSize), headerSize + middleSize);
        
        return result.buffer;
    }
    
    /**
     * בדיקה האם קובץ הוא קובץ מערכת או קובץ זמני
     * @param {string} fileName - שם הקובץ
     * @returns {boolean} האם הקובץ הוא קובץ מערכת או קובץ זמני
     */
    static isSystemOrTempFile(fileName) {
        const systemPatterns = [
            /^\./, // Hidden files starting with "."
            /^~/, // Temporary files starting with "~"
            /\$\w+\$/, // Files with $ around name
            /^thumbs\.db$/i, // Windows thumbnail cache
            /^desktop\.ini$/i, // Windows folder settings
            /^\.ds_store$/i, // macOS metadata
            /^ntuser\.dat/i, // Windows user settings
            /^pagefile\.sys$/i, // Windows virtual memory
            /\.tmp$/i, // Temporary files
            /\.temp$/i, // Temporary files
            /\.bak$/i, // Backup files
            /\.old$/i, // Old files
            /\#$/ // Backup files from some applications
        ];
        
        return systemPatterns.some(pattern => pattern.test(fileName));
    }
}

// Make it globally available
window.FileUtils = FileUtils;
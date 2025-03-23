/**
 * statistics.js - מודול ניתוח וויזואליזציה של כפילויות
 * מספק פונקציות לניתוח סטטיסטי של תוצאות הסריקה
 * ויצירת גרפים מתקדמים להצגת הנתונים
 */

const Statistics = (() => {
    /**
     * ניתוח פיזור כפילויות לפי סוגי קבצים
     * @param {Object} results - תוצאות הסריקה
     * @returns {Object} ניתוח פיזור לפי סוגי קבצים
     */
    function analyzeByFileType(results) {
        // מיפוי סיומות ל"משפחות" של סוגי קבצים
        const fileTypeMap = {
            // תמונות
            'jpg': 'images', 'jpeg': 'images', 'png': 'images', 'gif': 'images', 
            'bmp': 'images', 'webp': 'images', 'svg': 'images', 'tiff': 'images',
            
            // מסמכים
            'pdf': 'documents', 'doc': 'documents', 'docx': 'documents', 
            'xls': 'documents', 'xlsx': 'documents', 'ppt': 'documents', 
            'pptx': 'documents', 'txt': 'documents', 'rtf': 'documents',
            
            // וידאו
            'mp4': 'videos', 'avi': 'videos', 'mov': 'videos', 'wmv': 'videos', 
            'flv': 'videos', 'mkv': 'videos', 'webm': 'videos',
            
            // אודיו
            'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'flac': 'audio', 
            'aac': 'audio', 'm4a': 'audio',
            
            // קוד
            'js': 'code', 'php': 'code', 'html': 'code', 'css': 'code', 
            'py': 'code', 'c': 'code', 'cpp': 'code', 'java': 'code',
            
            // ארכיונים
            'zip': 'archives', 'rar': 'archives', '7z': 'archives', 
            'tar': 'archives', 'gz': 'archives',
            
            // הרצה
            'exe': 'executables', 'dll': 'executables', 'so': 'executables', 
            'app': 'executables',
            
            // אחר (ברירת מחדל)
        };
        
        // יצירת אובייקט תוצאות
        const typeCounts = {
            images: 0,
            documents: 0,
            videos: 0,
            audio: 0,
            code: 0,
            archives: 0,
            executables: 0,
            other: 0
        };
        
        // אתחול מונה גודל קבצים לפי סוג
        const typeSizes = {
            images: 0,
            documents: 0,
            videos: 0,
            audio: 0,
            code: 0,
            archives: 0,
            executables: 0,
            other: 0
        };
        
        // ספירת כפילויות לפי סוג קובץ (תוכן זהה)
        results.duplicateContents.forEach(group => {
            // נקח את הקובץ הראשון בקבוצה כדוגמה
            const fileName = group.paths[0].split('/').pop();
            const extension = fileName.split('.').pop().toLowerCase();
            const fileType = fileTypeMap[extension] || 'other';
            
            // עדכון המונים
            typeCounts[fileType] += group.paths.length - 1; // מספר הכפילויות בקבוצה
            typeSizes[fileType] += group.size * (group.paths.length - 1); // גודל הכפילויות
        });
        
        return {
            counts: typeCounts,
            sizes: typeSizes
        };
    }
    
    /**
     * ניתוח פיזור כפילויות לפי תיקיות
     * @param {Object} results - תוצאות הסריקה
     * @returns {Object} ניתוח פיזור לפי תיקיות
     */
    function analyzeByDirectory(results) {
        // מבנה לפי עץ תיקיות
        const directoryTree = {};
        
        // פונקציה פנימית להוספת נתיב לעץ התיקיות
        function addPathToTree(path, size = 0) {
            // פיצול הנתיב לחלקים
            const parts = path.split('/').filter(p => p);
            
            // בניית העץ
            let currentLevel = directoryTree;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        _count: 0,
                        _size: 0
                    };
                }
                currentLevel = currentLevel[part];
            }
            
            // עדכון הספירה והגודל
            currentLevel._count++;
            currentLevel._size += size;
        }
        
        // עיבוד כל הכפילויות של תוכן
        results.duplicateContents.forEach(group => {
            // נעבור על כל הנתיבים בקבוצה (מלבד הראשון)
            for (let i = 1; i < group.paths.length; i++) {
                addPathToTree(group.paths[i], group.size);
            }
        });
        
        return directoryTree;
    }
    
    /**
     * ניתוח חיסכון פוטנציאלי בשטח דיסק
     * @param {Object} results - תוצאות הסריקה
     * @returns {Object} ניתוח חיסכון פוטנציאלי
     */
    function analyzePotentialSavings(results) {
        let totalFiles = 0;
        let totalDuplicateFiles = 0;
        let totalSize = 0;
        let potentialSavingSize = 0;
        
        // סיכום כפילויות תוכן
        results.duplicateContents.forEach(group => {
            const duplicateCount = group.paths.length - 1;
            totalDuplicateFiles += duplicateCount;
            potentialSavingSize += group.size * duplicateCount;
            totalSize += group.size * group.paths.length;
            totalFiles += group.paths.length;
        });
        
        return {
            totalFiles,
            totalDuplicateFiles,
            totalSize,
            potentialSavingSize,
            savingPercentage: totalSize ? (potentialSavingSize / totalSize) * 100 : 0
        };
    }
    
    /**
     * יצירת גרף תרשים עוגה של כפילויות לפי סוג קובץ
     * @param {Object} typeAnalysis - ניתוח לפי סוג קובץ
     * @param {HTMLElement} container - אלמנט המכיל את הגרף
     */
    function createPieChart(typeAnalysis, container) {
        // המרת הנתונים לפורמט תרשים עוגה
        const data = [];
        for (const [type, count] of Object.entries(typeAnalysis.counts)) {
            if (count > 0) {
                data.push({
                    label: getTypeLabel(type),
                    value: count,
                    color: getTypeColor(type)
                });
            }
        }
        
        // יצירת HTML בסיסי לתרשים עוגה פשוט
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let html = '<div class="pie-chart">';
        
        // יצירת התרשים
        html += '<div class="pie" style="background: conic-gradient(';
        
        // חישוב זוויות ליצירת גרדיאנט קוני
        let currentAngle = 0;
        for (const item of data) {
            const angle = (item.value / total) * 360;
            html += `${item.color} ${currentAngle}deg ${currentAngle + angle}deg, `;
            currentAngle += angle;
        }
        
        // הסרת הפסיק והרווח האחרונים והוספת סוגריים
        html = html.slice(0, -2) + ')"></div>';
        
        // יצירת מקרא
        html += '<div class="legend">';
        for (const item of data) {
            const percentage = ((item.value / total) * 100).toFixed(1);
            html += `
                <div class="legend-item">
                    <span class="color-box" style="background-color: ${item.color}"></span>
                    <span class="label">${item.label}: ${item.value} (${percentage}%)</span>
                </div>
            `;
        }
        html += '</div></div>';
        
        // הוספת הגרף למכל
        container.innerHTML = html;
        
        // הוספת CSS לגרף
        addChartStyles();
    }
    
    /**
     * יצירת גרף עמודות להשוואת גודל כפילויות
     * @param {Object} typeAnalysis - ניתוח לפי סוג קובץ
     * @param {HTMLElement} container - אלמנט המכיל את הגרף
     */
    function createBarChart(typeAnalysis, container) {
        // המרת הנתונים לפורמט גרף עמודות
        const data = [];
        for (const [type, size] of Object.entries(typeAnalysis.sizes)) {
            if (size > 0) {
                // המרה לשווה ערך MB
                const sizeMB = size / (1024 * 1024);
                data.push({
                    label: getTypeLabel(type),
                    value: sizeMB,
                    color: getTypeColor(type)
                });
            }
        }
        
        // מיון לפי גודל (מהגדול לקטן)
        data.sort((a, b) => b.value - a.value);
        
        // יצירת HTML לגרף עמודות
        let html = '<div class="bar-chart">';
        
        // מציאת הערך המקסימלי לצורך תיקנון
        const maxValue = Math.max(...data.map(item => item.value));
        
        // יצירת העמודות
        for (const item of data) {
            const heightPercentage = (item.value / maxValue) * 100;
            html += `
                <div class="bar-container">
                    <div class="bar-label">${item.label}</div>
                    <div class="bar" style="height: ${heightPercentage}%; background-color: ${item.color};">
                        <span class="bar-value">${item.value.toFixed(1)} MB</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        
        // הוספת הגרף למכל
        container.innerHTML = html;
        
        // הוספת CSS לגרף
        addChartStyles();
    }
    
    /**
     * יצירת סיכום חיסכון פוטנציאלי
     * @param {Object} savings - ניתוח חיסכון פוטנציאלי
     * @param {HTMLElement} container - אלמנט המכיל את הגרף
     */
    function createSavingsSummary(savings, container) {
        const potentialSavingMB = (savings.potentialSavingSize / (1024 * 1024)).toFixed(2);
        const totalSizeMB = (savings.totalSize / (1024 * 1024)).toFixed(2);
        
        const html = `
            <div class="savings-summary">
                <div class="metric">
                    <h3>סך כל הקבצים הכפולים</h3>
                    <div class="value">${savings.totalDuplicateFiles}</div>
                </div>
                <div class="metric">
                    <h3>חיסכון פוטנציאלי</h3>
                    <div class="value">${potentialSavingMB} MB</div>
                </div>
                <div class="metric">
                    <h3>אחוז חיסכון</h3>
                    <div class="value">${savings.savingPercentage.toFixed(1)}%</div>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${savings.savingPercentage}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // הוספת CSS לגרף
        addChartStyles();
    }
    
    /**
     * הוספת סגנונות CSS לגרפים
     */
    function addChartStyles() {
        // בדיקה אם כבר הוספנו את הסגנונות
        if (document.getElementById('chart-styles')) {
            return;
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'chart-styles';
        styleElement.textContent = `
            /* סגנונות לתרשים עוגה */
            .pie-chart {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
            }
            
            .pie {
                width: 200px;
                height: 200px;
                border-radius: 50%;
                margin-bottom: 20px;
            }
            
            .legend {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                max-width: 500px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                margin: 5px 10px;
            }
            
            .color-box {
                width: 15px;
                height: 15px;
                margin-left: 5px;
                border-radius: 3px;
            }
            
            /* סגנונות לגרף עמודות */
            .bar-chart {
                display: flex;
                height: 300px;
                align-items: flex-end;
                padding: 20px;
                justify-content: space-around;
            }
            
            .bar-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 60px;
                height: 100%;
            }
            
            .bar {
                width: 40px;
                min-height: 1%;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding-top: 5px;
                color: white;
                font-size: 12px;
                font-weight: bold;
                transition: height 0.5s;
                position: relative;
            }
            
            .bar-value {
                position: absolute;
                top: -20px;
                color: black;
                font-size: 10px;
            }
            
            .bar-label {
                margin-top: 10px;
                text-align: center;
                font-size: 12px;
                writing-mode: vertical-lr;
                transform: rotate(180deg);
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* סגנונות לסיכום חיסכון */
            .savings-summary {
                display: flex;
                justify-content: space-around;
                flex-wrap: wrap;
                padding: 20px;
            }
            
            .metric {
                text-align: center;
                min-width: 200px;
                margin: 10px;
                padding: 15px;
                background-color: #f5f5f5;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .metric h3 {
                margin-top: 0;
                font-size: 16px;
                color: #555;
            }
            
            .metric .value {
                font-size: 24px;
                font-weight: bold;
                margin: 10px 0;
                color: #2c3e50;
            }
            
            .progress-bar {
                height: 10px;
                background-color: #ddd;
                border-radius: 5px;
                overflow: hidden;
                margin-top: 10px;
            }
            
            .progress {
                height: 100%;
                background-color: #4CAF50;
                border-radius: 5px;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    /**
     * קבלת תווית תצוגה לסוג קובץ
     * @param {string} type - סוג הקובץ
     * @returns {string} תווית תצוגה
     */
    function getTypeLabel(type) {
        const labels = {
            'images': 'תמונות',
            'documents': 'מסמכים',
            'videos': 'וידאו',
            'audio': 'אודיו',
            'code': 'קוד',
            'archives': 'ארכיונים',
            'executables': 'קבצי הרצה',
            'other': 'אחר'
        };
        
        return labels[type] || type;
    }
    
    /**
     * קבלת צבע לסוג קובץ
     * @param {string} type - סוג הקובץ
     * @returns {string} קוד צבע
     */
    function getTypeColor(type) {
        const colors = {
            'images': '#4CAF50', // ירוק
            'documents': '#2196F3', // כחול
            'videos': '#F44336', // אדום
            'audio': '#9C27B0', // סגול
            'code': '#FF9800', // כתום
            'archives': '#795548', // חום
            'executables': '#607D8B', // אפור-כחול
            'other': '#9E9E9E' // אפור
        };
        
        return colors[type] || '#9E9E9E';
    }
    
    // ממשק ציבורי
    return {
        analyzeByFileType,
        analyzeByDirectory,
        analyzePotentialSavings,
        createPieChart,
        createBarChart,
        createSavingsSummary
    };
})();
/**
 * קובץ אפליקציה ראשי חדש - מתקן בעיות טעינה
 */

// Add this at the top of the file, before any other code
const translations = {
    "calculating": "Calculating...",
    "scan_stopped": "Scan stopped",
    "permission_denied": "Permission denied to access directory",
    "scan_error": "Error during scan",
    "directory_selection_error": "Error selecting directory",
    "export_success": "Results exported successfully",
    "copy_success": "Path copied successfully",
    "less_than_minute": "Less than a minute",
    "no_duplicates_found": "No duplicates found"
};

// Helper function for translations
function translate(key) {
    return translations[key] || key;
}

// First, declare utility functions
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    if (!seconds || seconds < 0) return 'calculating...';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let timeString = '';
    
    if (hours > 0) {
        timeString += hours + ' hours ';
    }
    
    if (minutes > 0 || hours > 0) {
        timeString += minutes + ' minutes ';
    }
    
    if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
        timeString += remainingSeconds + ' seconds';
    }
    
    if (seconds < 10) {
        return 'few seconds';
    }
    
    if (timeString.trim() === '') {
        return 'less than a second';
    }
    
    return timeString.trim();
}

// Then, declare TimeFormatter
const TimeFormatter = {
    formatDuration(seconds) {
        if (seconds < 30) {
            return 'less than 30 seconds';
        }
        return formatTime(seconds);
    },
    
    formatEstimatedTime(seconds) {
        if (seconds < 30) {
            return 'less than 30 seconds';
        }
        return `~ ${formatTime(seconds)}`;
    },
    
    formatElapsedTime(startTime) {
        const elapsed = (Date.now() - startTime) / 1000;
        return formatTime(elapsed);
    }
};

// Then, declare the UI object
const UI = {
    formatSize,
    formatTime,
    showMessage(message, type = 'info', duration = 0) {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;
        
        // If the message is a translation key, translate it
        const translatedMessage = typeof message === 'string' && translations[message] 
            ? translations[message] 
            : message;
        
        // נקה הודעות קודמות
        messageContainer.innerHTML = '';
        
        // צור את אלמנט ההודעה
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = translatedMessage;
        
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
    },
    
    // הסתרת הודעות
    hideMessage() {
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    },
    
    // פורמט גודל קובץ
    formatSize(bytes) {
        if (!bytes || isNaN(bytes)) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
    },
    
    // בריחת תווים מיוחדים ב-HTML
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    
    // הצגת תוצאות
    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        if (!resultsSection) {
            console.error('Results section not found');
            return;
        }
        
        resultsSection.style.display = 'block';
        
        // הוסף את הלשוניות אם לא קיימות
        this.ensureTabsExist();
        
        // הצגת קבצים כפולים לפי שם
        this.displayFilenameResults(results.duplicateFilenames || results.byName || []);
        
        // הצגת קבצים כפולים לפי תוכן
        this.displayContentResults(results.duplicateContents || results.byContent || []);
        
        // הצגת תמונות כפולות
        this.displayImageResults(results.duplicateImages || results.byImage || []);
        
        // הצגת סיכום התוצאות
        this.displaySummary(results.summary || this.generateSummary(results));
        
        // הוסף מאזיני אירועים ללשוניות
        this.setupTabs();
    },
    
    // פישוט מערכת הכפתורים והוספת הסברים ברורים
    displayFilenameResults(duplicates) {
        const container = document.querySelector('#filenameResults .results-list');
        if (!container) return;
        
        if (!duplicates || duplicates.length === 0) {
            container.innerHTML = '<div class="no-results">לא נמצאו שמות קבצים כפולים</div>';
            return;
        }

        // Add sorting controls
        let html = `
            <div class="sort-controls">
                <label>מיין לפי: </label>
                <select id="sortDuplicates">
                    <option value="name">שם קובץ</option>
                    <option value="size">גודל קובץ</option>
                    <option value="count">מספר עותקים</option>
                </select>
            </div>
        `;

        // Process and sort duplicates
        let processedDuplicates = duplicates.map(group => {
            const paths = group.paths || group[1] || [];
            const fileName = group.name || (paths[0] ? paths[0].split(/[\/\\]/).pop() : 'Unknown');
            
            // Calculate total size for the group
            let totalSize = 0;
            paths.forEach(path => {
                if (path && path.size) {
                    totalSize += path.size;
                }
            });

            return {
                fileName,
                paths,
                totalSize,
                count: paths.length
            };
        });

        // Add sort event listener
        setTimeout(() => {
            const sortSelect = document.getElementById('sortDuplicates');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    const sortBy = e.target.value;
                    processedDuplicates.sort((a, b) => {
                        switch(sortBy) {
                            case 'size':
                                return b.totalSize - a.totalSize;
                            case 'count':
                                return b.count - a.count;
                            default:
                                return a.fileName.localeCompare(b.fileName);
                        }
                    });
                    this.redrawDuplicatesList(processedDuplicates, container);
                });
            }
        }, 0);

        // Initial sort by size
        processedDuplicates.sort((a, b) => b.totalSize - a.totalSize);
        
        // Display results
        this.redrawDuplicatesList(processedDuplicates, container);
    },

    // Add new method for redrawing the list
    redrawDuplicatesList(processedDuplicates, container) {
        let html = container.querySelector('.sort-controls')?.outerHTML || '';
        
        processedDuplicates.forEach(group => {
            html += `
            <div class="duplicate-group">
                <div class="duplicate-header">
                    <div class="duplicate-info">
                        <h4>שם קובץ: ${this.escapeHtml(group.fileName)}</h4>
                        <span class="duplicate-stats">
                            <span class="duplicate-count">${group.count} עותקים</span>
                            <span class="duplicate-size">סה"כ: ${this.formatSize(group.totalSize)}</span>
                        </span>
                    </div>
                </div>
                <div class="duplicate-files">`;

            group.paths.forEach(path => {
                const pathStr = typeof path === 'string' ? path : path.path;
                const fileSize = path.size ? this.formatSize(path.size) : 'Unknown size';
                const displayPath = pathStr.replace(/\\/g, '/');
                const fileNameFromPath = displayPath.split('/').pop();
                const folderPath = displayPath.substring(0, displayPath.length - fileNameFromPath.length);
                
                html += `
                    <div class="file-item">
                        <div class="file-info">
                            <div class="file-name">${this.escapeHtml(fileNameFromPath)}</div>
                            <div class="file-folder" title="${this.escapeHtml(folderPath)}">${this.escapeHtml(folderPath)}</div>
                            <div class="file-size">${fileSize}</div>
                        </div>
                        <div class="file-actions">
                            <button class="action-btn copy-path" data-path="${this.escapeHtml(pathStr)}">העתק נתיב</button>
                        </div>
                    </div>`;
            });

            html += '</div></div>';
        });
        
        container.innerHTML = html || '<div class="no-results">לא נמצאו שמות קבצים כפולים</div>';
        this.setupFileCopyButtons(container);
    },
    
    // פישוט מערכת הכפתורים והוספת הסברים ברורים
    displayContentResults(duplicates) {
        const container = document.querySelector('#contentResults .results-list');
        if (!container) return;
        
        if (!duplicates || duplicates.length === 0) {
            container.innerHTML = '<div class="no-results">לא נמצאו קבצים עם תוכן זהה</div>';
            return;
        }
        
        // הוסף הסבר בראש התוצאות עם אייקונים ושורות נפרדות לכל שלב
        let html = `
        <div class="results-help">
            <p><strong>כיצד לפתוח את הקבצים?</strong></p>
            <div class="help-steps">
                <div class="help-step">
                    <div class="step-num">1</div>
                    <div class="step-text">לחץ על כפתור "העתק נתיב" ליד הקובץ הרצוי</div>
                </div>
                <div class="help-step">
                    <div class="step-num">2</div>
                    <div class="step-text">
                        <span>פתח את סייר הקבצים בלחיצה על כפתור Windows</span>
                        <span class="icon-demo win-key-icon">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTMsMTJWNi43NUwxMyw1LjQzVjExLjkxSDNNMjEsMy43NkwxNSw1LjQzVjExLjkxSDIxTTMsMTMuMDlWMTkuMjVMMTMsMjAuNTdWMTMuMDlIM00yMSwxMy4wOVYxOC4yNEwxNSwyMC41N1YxMy4wOUgyMU0yMSwyLjE4TDguOSwzLjk5QTMuMDUsMy4wNSAwIDAgMCw5LDRWNC44MUwyMSwzLjE3TTIxLDIxLjgyTDE1LDIwLjU3TDE1LDIxQTMsMy4wNSAwIDAgMSAxMi4xLDIzLjhMMjEsMjIuMVYyMSIgZmlsbD0iIzAwNzhkNyIvPjwvc3ZnPg==" alt="Windows key icon">
                        +
                        <span class="key-demo">E</span>
                    </span>
                </div>
                <div class="help-step">
                    <div class="step-num">3</div>
                    <div class="step-text">
                        <div>הדבק את הנתיב בשורת הכתובת למעלה</div>
                        <div class="address-bar-demo">
                            <span class="icon-demo">
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTUsMjFWNS44M0w5LjgzLDEwLjY3TDExLjI0LDkuMjZMMTEuMjQsMTQuNzRMMTQuNzQsMTQuNzRMMTQuNzQsOS4yNkwxNi4xNywxMC42N0wyMSw1LjgzVjIxSDVaIiBmaWxsPSIjMDA3OGQ3Ii8+PC9zdmc+" alt="Address bar icon">
                            </span>
                            ולחץ Enter
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        
        duplicates.forEach(group => {
            // בדיקה אם קיבלנו מערך של קבצים או אובייקט עם מערך paths
            const paths = group.paths || group[1] || [];
            
            if (paths.length <= 1) return;
            
            const hash = group.hash || group[0] || '';
            
            html += '<div class="duplicate-group">';
            html += '<div class="duplicate-header">';
            html += '<h4>קבצים זהים (hash: ' + hash.substring(0, 8) + '...)</h4>';
            html += '<span>' + paths.length + ' עותקים</span>';
            html += '</div>';
            
            html += '<div class="duplicate-files">';
            paths.forEach(path => {
                // תיקון: וודא שהנתיב הוא מחרוזת
                const pathStr = String(path);
                // הצגת נתיב בצורה יותר נקייה
                const displayPath = pathStr.replace(/\\/g, '/');
                const fileName = displayPath.split('/').pop();
                const folderPath = displayPath.substring(0, displayPath.length - fileName.length);
                
                html += '<div class="file-item">';
                html += '<div class="file-info">';
                html += '<div class="file-name">' + this.escapeHtml(fileName) + '</div>';
                html += '<div class="file-folder" title="' + this.escapeHtml(folderPath) + '">' + this.escapeHtml(folderPath) + '</div>';
                html += '</div>';
                html += '<div class="file-actions">';
                html += '<button class="action-btn copy-path" data-path="' + this.escapeHtml(pathStr) + '">העתק נתיב</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });
        
        container.innerHTML = html || '<div class="no-results">לא נמצאו קבצים עם תוכן זהה</div>';
        
        // הוסף מאזיני אירועים לכפתורי העתקה
        this.setupFileCopyButtons(container);
    },
    
    // פונקציה חדשה להצגת תמונות כפולות
    displayImageResults(duplicates) {
        const container = document.querySelector('#imageResults .results-list');
        if (!container) return;
        
        if (!duplicates || duplicates.length === 0) {
            container.innerHTML = '<div class="no-results">לא נמצאו תמונות כפולות</div>';
            return;
        }
        
        // הוסף הסבר בראש התוצאות עם אייקונים ושורות נפרדות לכל שלב
        let html = `
        <div class="results-help">
            <p><strong>כיצד לפתוח את התמונות?</strong></p>
            <div class="help-steps">
                <div class="help-step">
                    <div class="step-num">1</div>
                    <div class="step-text">לחץ על כפתור "העתק נתיב" ליד הקובץ הרצוי</div>
                </div>
                <div class="help-step">
                    <div class="step-num">2</div>
                    <div class="step-text">
                        <span>פתח את סייר הקבצים בלחיצה על כפתור Windows</span>
                        <span class="icon-demo win-key-icon">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTMsMTJWNi43NUwxMyw1LjQzVjExLjkxSDNNMjEsMy43NkwxNSw1LjQzVjExLjkxSDIxTTMsMTMuMDlWMTkuMjVMMTMsMjAuNTdWMTMuMDlIM00yMSwxMy4wOVYxOC4yNEwxNSwyMC41N1YxMy4wOUgyMU0yMSwyLjE4TDguOSwzLjk5QTMuMDUsMy4wNSAwIDAgMCw5LDRWNC44MUwyMSwzLjE3TTIxLDIxLjgyTDE1LDIwLjU3TDE1LDIxQTMsMy4wNSAwIDAgMSAxMi4xLDIzLjhMMjEsMjIuMVYyMSIgZmlsbD0iIzAwNzhkNyIvPjwvc3ZnPg==" alt="Windows key icon">
                        +
                        <span class="key-demo">E</span>
                    </span>
                </div>
                <div class="help-step">
                    <div class="step-num">3</div>
                    <div class="step-text">
                        <div>הדבק את הנתיב בשורת הכתובת למעלה</div>
                        <div class="address-bar-demo">
                            <span class="icon-demo">
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTUsMjFWNS44M0w5LjgzLDEwLjY3TDExLjI0LDkuMjZMMTEuMjQsMTQuNzRMMTQuNzQsMTQuNzRMMTQuNzQsOS4yNkwxNi4xNywxMC42N0wyMSw1LjgzVjIxSDVaIiBmaWxsPSIjMDA3OGQ3Ii8+PC9zdmc+" alt="Address bar icon">
                            </span>
                            ולחץ Enter
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        
        duplicates.forEach(group => {
            // קבל את הקבצים מהקבוצה
            const files = group.files || [];
            
            if (files.length <= 1) return;
            
            const hash = group.hash || '';
            const fileName = files[0].name || files[0].path.split('/').pop();
            const fileSize = this.formatSize(files[0].size || 0);
            
            html += '<div class="duplicate-group">';
            html += '<div class="duplicate-header">';
            html += '<h4>תמונות זהות: ' + this.escapeHtml(fileName) + ' (' + fileSize + ')</h4>';
            html += '<span>' + files.length + ' עותקים</span>';
            html += '</div>';
            
            html += '<div class="duplicate-files image-duplicate-files">';
            files.forEach(file => {
                const path = file.path;
                const displayPath = path.replace(/\\/g, '/');
                const fileName = file.name || displayPath.split('/').pop();
                const folderPath = displayPath.substring(0, displayPath.length - fileName.length);
                
                html += '<div class="file-item image-file-item">';
                html += '<div class="file-info">';
                html += '<div class="file-name">' + this.escapeHtml(fileName) + '</div>';
                html += '<div class="file-folder" title="' + this.escapeHtml(folderPath) + '">' + this.escapeHtml(folderPath) + '</div>';
                html += '</div>';
                html += '<div class="file-actions">';
                html += '<button class="action-btn copy-path" data-path="' + this.escapeHtml(path) + '">העתק נתיב</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });
        
        container.innerHTML = html || '<div class="no-results">לא נמצאו תמונות כפולות</div>';
        
        // הוסף מאזיני אירועים לכפתורי העתקה
        this.setupFileCopyButtons(container);
    },
    
    // פונקציה פשוטה לטיפול בכפתורי העתקה
    setupFileCopyButtons(container) {
        container.querySelectorAll('.copy-path').forEach(btn => {
            btn.addEventListener('click', function() {
                const path = this.getAttribute('data-path');
                if (!path) return;
                
                // העתק את הנתיב
                navigator.clipboard.writeText(path)
                    .then(() => {
                        // שנה את טקסט הכפתור זמנית
                        this.classList.add('copied');
                        const originalText = this.textContent;
                        this.textContent = translate("copy_success");
                        
                        // הצג חלון הסבר מפורט עם אייקונים
                        UI.showMessage(`
                            <div class="copy-success">
                                <p><strong>הנתיב הועתק בהצלחה! ✓</strong></p>
                                <p>כדי לפתוח את הקובץ:</p>
                                <div class="visual-guide">
                                    <div class="guide-step">
                                        <div class="step-icon">
                                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTMsMTJWNi43NUwxMyw1LjQzVjExLjkxSDNNMjEsMy43NkwxNSw1LjQzVjExLjkxSDIxTTMsMTMuMDlWMTkuMjVMMTMsMjAuNTdWMTMuMDlIM00yMSwxMy4wOVYxOC4yNEwxNSwyMC41N1YxMy4wOUgyMU0yMSwyLjE4TDguOSwzLjk5QTMuMDUsMy4wNSAwIDAgMCw5LDRWNC44MUwyMSwzLjE3TTIxLDIxLjgyTDE1LDIwLjU3TDE1LDIxQTMsMy4wNSAwIDAgMSAxMi4xLDIzLjhMMjEsMjIuMVYyMSIgZmlsbD0iIzAwNzhkNyIvPjwvc3ZnPg==" alt="Windows key">
                                        </div>
                                        <div class="step-desc">
                                            <strong>1. לחץ</strong> על מקש Windows + מקש E<br>
                                            <small>(יפתח את סייר הקבצים)</small>
                                        </div>
                                    </div>
                                    <div class="guide-step">
                                        <div class="step-icon">
                                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIwLDloLTdWNGgtMUMxMC40LDQsNSw0LjQsNSw5LjNWMTVoM3YtNWg3djVoNVY5TTUsMThWOWgzVjRINFY4SDN2MTBIN3YtNEg1TTIxLDE4SDEydi00aDl2NE0xNCw4VjRoM0wxNCw4WiIgZmlsbD0iIzAwNzhkNyIvPjwvc3ZnPg==" alt="Address bar">
                                        </div>
                                        <div class="step-desc">
                                            <strong>2. לחץ</strong> בשורת הכתובת בחלק העליון<br>
                                            <small>(היכן שמופיע הנתיב)</small>
                                        </div>
                                    </div>
                                    <div class="guide-step">
                                        <div class="step-icon">
                                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTE5LDIwSDVWNEgxOU0xOSwyQzIwLjExLDIgMjEsMi45IDIxLDRWMjBDMjEsMjEuMSAyMC4xLDIyIDE5LDIySDVDMy44OSwyMiAzLDIxLjEgMywxOVY0QzMsMi45IDMuODksMiA1LDJNMTEsNkg2VjRIMTFWMk0xOCwxNEgxM3Y0SDE4VjE0TTE4LDZIMTN2NEgxOFY2TTExLDE0SDZ2NEgxMVYxNFoiIGZpbGw9IiMxZjYxYTQiLz48L3N2Zz4=" alt="File list">
                                        </div>
                                        <div class="step-desc">
                                            <strong>3. הדבק</strong> את הנתיב (Ctrl+V) ולחץ Enter<br>
                                            <small>(תועבר ישירות אל הקובץ)</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="path-display">
                                    <code dir="ltr">${path}</code>
                                </div>
                            </div>
                        `, 'success', 8000);
                        
                        // החזר את הטקסט המקורי אחרי 2 שניות
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.classList.remove('copied');
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy:', err);
                        UI.showMessage('שגיאה בהעתקת הנתיב. נסה שוב.', 'error', 3000);
                    });
            });
        });
    },
    
    // הגדרת לשוניות
    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // הסרת מצב פעיל מכל הלשוניות
                tabs.forEach(t => t.classList.remove('active'));
                
                // הסתרת כל תכני הלשוניות
                contents.forEach(content => content.style.display = 'none');
                
                // הוספת מצב פעיל ללשונית הנוכחית
                this.classList.add('active');
                
                // הצגת התוכן המתאים
                const tabId = this.getAttribute('data-tab');
                const content = document.getElementById(tabId + 'Results');
                if (content) {
                    content.style.display = 'block';
                    
                    // גלול למעלה כדי לראות את הכותרת
                    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // אירוע מותאם לעדכון תצוגת התוכן
                    window.dispatchEvent(new CustomEvent('tab-changed', { detail: tabId }));
                }
            });
        });
        
        // הפעלת הלשונית הראשונה כברירת מחדל
        if (tabs.length > 0 && !document.querySelector('.tab-btn.active')) {
            tabs[0].click();
        }
    },
    
    // עדכון ממשק תוך כדי סריקה
    updateScanningUI(isScanning) {
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        const stopScanBtn = document.getElementById('stopScanBtn');
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        
        if (isScanning) {
            if (progressSection) progressSection.style.display = 'block';
            if (resultsSection) resultsSection.style.display = 'none';
            if (stopScanBtn) stopScanBtn.style.display = 'inline-block';
            if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'none';
        } else {
            if (progressSection) progressSection.style.display = 'none';
            if (stopScanBtn) stopScanBtn.style.display = 'none';
            if (selectDirectoryBtn) selectDirectoryBtn.style.display = 'inline-block';
        }
    },
    
    // פונקציה חדשה לוודא שכל הלשוניות קיימות
    ensureTabsExist() {
        const tabContainer = document.querySelector('.tab-container');
        if (!tabContainer) return;
        
        // בדוק אם יש לשונית תמונות, אם לא - הוסף אותה
        if (!document.getElementById('imageTab')) {
            const imageTab = document.createElement('button');
            imageTab.id = 'imageTab';
            imageTab.className = 'tab-btn';
            imageTab.setAttribute('data-tab', 'image');
            imageTab.textContent = 'תמונות כפולות';
            tabContainer.appendChild(imageTab);
            
            // הוסף את מכיל התוכן ללשונית החדשה
            const tabContent = document.querySelector('.tab-content-container');
            if (tabContent) {
                const imageContent = document.createElement('div');
                imageContent.id = 'imageResults';
                imageContent.className = 'tab-content';
                imageContent.innerHTML = `
                    <div class="results-list"></div>
                `;
                tabContent.appendChild(imageContent);
            }
        }
        
        // בדוק אם יש לשונית סיכום, אם לא - הוסף אותה
        if (!document.getElementById('summaryTab')) {
            const summaryTab = document.createElement('button');
            summaryTab.id = 'summaryTab';
            summaryTab.className = 'tab-btn';
            summaryTab.setAttribute('data-tab', 'summary');
            summaryTab.textContent = 'סיכום';
            tabContainer.appendChild(summaryTab);
            
            // הוסף את מכיל התוכן ללשונית החדשה
            const tabContent = document.querySelector('.tab-content-container');
            if (tabContent) {
                const summaryContent = document.createElement('div');
                summaryContent.id = 'summaryResults';
                summaryContent.className = 'tab-content';
                summaryContent.innerHTML = `
                    <div class="summary-container"></div>
                `;
                tabContent.appendChild(summaryContent);
            }
        }
    },
    
    // פונקציה חדשה להצגת סיכום התוצאות
    displaySummary(summary) {
        const container = document.querySelector('#summaryResults .summary-container');
        if (!container) return;
        
        if (!summary) {
            container.innerHTML = '<div class="no-results">אין מידע סיכום זמין</div>';
            return;
        }
        
        let html = `
        <div class="summary-card main-summary">
            <h3>סיכום סריקה</h3>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-icon files-icon"></div>
                    <div class="stat-value">${summary.totalFiles.toLocaleString()}</div>
                    <div class="stat-label">קבצים נסרקו</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon size-icon"></div>
                    <div class="stat-value">${this.formatSize(summary.totalSize)}</div>
                    <div class="stat-label">נפח סך הקבצים</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon time-icon"></div>
                    <div class="stat-value">${formatTime(summary.scanTime)}</div>
                    <div class="stat-label">זמן סריקה</div>
                </div>
                <div class="stat-item highlight">
                    <div class="stat-icon duplicates-icon"></div>
                    <div class="stat-value">${(summary.duplicates?.totalCount || 0).toLocaleString()}</div>
                    <div class="stat-label">קבצים כפולים</div>
                </div>
                <div class="stat-item highlight">
                    <div class="stat-icon savings-icon"></div>
                    <div class="stat-value">${this.formatSize(summary.duplicates?.totalSize || 0)}</div>
                    <div class="stat-label">נפח לחיסכון</div>
                </div>
            </div>
        </div>
        
        <div class="summary-cards">
            <div class="summary-card">
                <h4>התפלגות קבצים כפולים</h4>
                <div class="chart-container">
                    <div class="pie-chart">
                        <div class="pie-slice" style="--percentage: ${Math.min(100, ((summary.duplicates?.byName || 0) / Math.max(1, summary.totalFiles)) * 100)}%; --color: #FFC107;"></div>
                        <div class="pie-slice" style="--percentage: ${Math.min(100, ((summary.duplicates?.byContent || 0) / Math.max(1, summary.totalFiles)) * 100)}%; --color: #4CAF50;"></div>
                        <div class="pie-slice" style="--percentage: ${Math.min(100, ((summary.duplicates?.images || 0) / Math.max(1, summary.totalFiles)) * 100)}%; --color: #2196F3;"></div>
                    </div>
                    <div class="chart-legend">
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #FFC107;"></span>
                            <span class="legend-label">שמות זהים: ${summary.duplicates?.byName || 0}</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #4CAF50;"></span>
                            <span class="legend-label">תוכן זהה: ${summary.duplicates?.byContent || 0}</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #2196F3;"></span>
                            <span class="legend-label">תמונות זהות: ${summary.duplicates?.images || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>התפלגות סוגי קבצים</h4>
                <div class="file-types-chart">
                    ${this.generateFileTypesChart(summary.fileTypes)}
                </div>
            </div>
        </div>
        
        <div class="summary-actions">
            <button id="exportResultsBtn" class="primary-btn">ייצוא תוצאות</button>
        </div>
        `;
        
        container.innerHTML = html;
        
        // הוסף מאזין אירועים לכפתור ייצוא
        const exportBtn = document.getElementById('exportResultsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults(summary));
        }
    },
    
    // פונקציה עזר ליצירת תרשים סוגי קבצים
    generateFileTypesChart(fileTypes) {
        if (!fileTypes) return '<div class="no-data">אין מידע זמין</div>';
        
        const types = {
            images: { label: 'תמונות', color: '#2196F3', count: fileTypes.images || 0 },
            documents: { label: 'מסמכים', color: '#FF5722', count: fileTypes.documents || 0 },
            videos: { label: 'וידאו', color: '#9C27B0', count: fileTypes.videos || 0 },
            audio: { label: 'שמע', color: '#4CAF50', count: fileTypes.audio || 0 },
            other: { label: 'אחר', color: '#607D8B', count: fileTypes.other || 0 }
        };
        
        // חשב סה"כ
        const total = Object.values(types).reduce((sum, type) => sum + type.count, 0);
        if (total === 0) return '<div class="no-data">לא נמצאו קבצים</div>';
        
        let html = '<div class="bar-chart">';
        
        Object.entries(types).forEach(([key, type]) => {
            const percentage = (type.count / total * 100).toFixed(1);
            html += `
            <div class="chart-row">
                <div class="chart-label">${type.label}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${percentage}%; background-color: ${type.color};"></div>
                    <div class="chart-value">${type.count} (${percentage}%)</div>
                </div>
            </div>
            `;
        });
        
        html += '</div>';
        return html;
    },
    
    // פונקציה ליצירת סיכום אם לא התקבל מהסורק
    generateSummary(results) {
        // אם אין תוצאות או סטטיסטיקות, נחזיר אובייקט בסיסי
        if (!results) return null;
        
        const byName = (results.byName || []).length;
        const byContent = (results.byContent || []).length;
        const byImage = (results.byImage || []).length;
        
        // נסה לחלץ מידע מהסטטיסטיקות
        const stats = results.stats || {};
        
        return {
            totalFiles: stats.filesScanned || 0,
            totalSize: stats.bytesScanned || 0,
            scanTime: stats.timeElapsed || 0,
            fileTypes: stats.fileTypes || { 
                images: 0, 
                documents: 0, 
                videos: 0,
                audio: 0, 
                other: 0 
            },
            duplicates: {
                totalCount: byName + byContent + byImage,
                byName: byName,
                byContent: byContent,
                images: byImage,
                totalSize: stats.totalDuplicatesSize || 0
            }
        };
    },
    
    // פונקציה לייצוא התוצאות לקובץ
    exportResults(summary) {
        // בניית מידע לייצוא
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const data = {
            scanDate: new Date().toLocaleDateString(),
            scanTime: new Date().toLocaleTimeString(),
            summary: summary,
            results: {
                byName: AppState.results?.byName || [],
                byContent: AppState.results?.byContent || [],
                byImage: AppState.results?.byImage || []
            }
        };
        
        // המרה למחרוזת JSON
        const jsonStr = JSON.stringify(data, null, 2);
        
        // יצירת קובץ להורדה
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // יצירת אלמנט להורדה
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicate-finder-results-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        
        // שחרור משאבים
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        // הודעה למשתמש
        this.showMessage("export_success", 'success', 3000);
    },
    
    // הוספת אלמנט זמן נותר לממשק
    setupScanUI() {
        // בדוק אם התבצע כבר setup
        if (this._scanUIInitialized) return;
        this._scanUIInitialized = true;

        // מצא את המקום המתאים להוספת אלמנט הזמן הנותר
        const elapsedTimeContainer = document.getElementById('elapsedTime');
        if (elapsedTimeContainer && !document.getElementById('remainingTime')) {
            // יצירת אלמנט הורה של זמן שחלף
            const elapsedParent = elapsedTimeContainer.parentElement;
            const elapsedLabel = elapsedParent.querySelector('.stat-label');

            // יצירת מיכל לזמן הנותר
            const remainingContainer = document.createElement('div');
            remainingContainer.className = 'stat-item';
            
            // יצירת תווית לזמן הנותר
            const remainingLabel = document.createElement('span');
            remainingLabel.className = 'stat-label';
            remainingLabel.textContent = 'זמן נותר:';
            
            // יצירת אלמנט לתצוגת הזמן הנותר
            const remainingTime = document.createElement('span');
            remainingTime.id = 'remainingTime';
            remainingTime.textContent = translate("calculating");
            
            // הוספה למבנה המסמך
            remainingContainer.appendChild(remainingLabel);
            remainingContainer.appendChild(remainingTime);
            
            // Replace אם with if
            if (elapsedParent.parentElement) {
                elapsedParent.parentElement.insertBefore(remainingContainer, elapsedParent.nextSibling);
            }
        }
    },
    
    // קריאה לפונקציה בתחילת הסריקה
    displayProgress(show) {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = show ? 'block' : 'none';
            
            if (show) {
                // אתחל סטטיסטיקות זמן
                this.setupScanUI();
                
                // איפוס מד ההתקדמות
                const progressBar = document.getElementById('progressBar');
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                
                const progressText = document.getElementById('progressText');
                if (progressText) {
                    progressText.textContent = '0%';
                }
                
                // איפוס זמן נותר
                const remainingTime = document.getElementById('remainingTime');
                if (remainingTime) {
                    remainingTime.textContent = translate("calculating");
                }
            }
        }
    },
    
    // תוספת חדשה - פונקציה לאיתחול לשוניות בעמוד הראשי עם הכרזה ברורה על הלשונית האקטיבית
    initializeTabs() {
        const tabContainer = document.querySelector('.tab-container');
        if (!tabContainer) return;
        
        const tabs = ['filename', 'content', 'image', 'summary'];
        const tabLabels = {
            'filename': 'שמות קבצים כפולים',
            'content': 'תוכן זהה',
            'image': 'תמונות כפולות',
            'summary': 'סיכום'
        };
        
        // ניקוי לשוניות קיימות
        tabContainer.innerHTML = '';
        
        // יצירת לשוניות חדשות עם סגנון אחיד
        tabs.forEach(tabId => {
            const tabBtn = document.createElement('button');
            tabBtn.id = tabId + 'Tab';
            tabBtn.className = 'tab-btn';
            tabBtn.setAttribute('data-tab', tabId);
            tabBtn.textContent = tabLabels[tabId];
            tabContainer.appendChild(tabBtn);
        });
        
        // הגדר את הלשונית הראשונה כפעילה כברירת מחדל
        const firstTab = tabContainer.querySelector('.tab-btn');
        if (firstTab) {
            firstTab.classList.add('active');
        }
        
        // הוסף מאזיני אירועים
        this.setupTabs();
    }
};

// Finally, initialize AppState
window.AppState = {
    isScanning: false,
    isScanEstimating: false,
    currentDirectoryHandle: null,
    stats: {
        filesScanned: 0,
        dirsScanned: 0,
        bytesScanned: 0,
        startTime: null,
        fileTypes: {
            documents: 0,
            images: 0,
            videos: 0,
            audio: 0,
            archives: 0,
            others: 0
        }
    }
};

// מודול להערכת גודל התיקייה והתקדמות הסריקה
const ScanEstimator = {
    // Constants for performance metrics
    BASELINE_SCAN_SPEED: {
        filesPerSecond: 1000,
        mbPerSecond: 100
    },

    // State properties
    totalScannedBytes: 0,
    bytesPerSecond: 0,
    estimatedTotalBytes: 0,
    estimatedTotalFiles: 0,
    lastUpdateTime: 0,
    startTime: 0,
    scannedInodes: new Set(),
    filesSizeDistribution: [],
    depthReached: 0,

    // Methods
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

    trackFile(file, depth = 0) {
        const now = Date.now();
        
        if (!this.lastUpdateTime) {
            this.lastUpdateTime = now;
        }
        
        this.depthReached = Math.max(this.depthReached, depth);
        this.totalScannedBytes += file.size;
        this.filesSizeDistribution.push(file.size);
        
        const elapsedSeconds = (now - this.startTime) / 1000;
        if (elapsedSeconds > 0) {
            const newBytesPerSecond = this.totalScannedBytes / elapsedSeconds;
            this.bytesPerSecond = (this.bytesPerSecond * 0.7) + (newBytesPerSecond * 0.3);
        }
        
        if (now - this.lastUpdateTime > 2000) {
            this.updateEstimates();
            this.lastUpdateTime = now;
        }
    },

    updateEstimates() {
        if (this.filesSizeDistribution.length === 0) return;
        const avgFileSize = this.filesSizeDistribution.reduce((sum, size) => sum + size, 0) / this.filesSizeDistribution.length;
        const depthMultiplier = 1 + (0.3 * this.depthReached);
        this.estimatedTotalFiles = Math.max(
            this.scannedInodes.size * depthMultiplier,
            this.scannedInodes.size * 1.5
        );
        this.estimatedTotalBytes = this.estimatedTotalFiles * avgFileSize;
    },

    getProgressPercent() {
        if (this.estimatedTotalFiles <= 0 || this.estimatedTotalBytes <= 0) return 0;
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        const estimatedTimeBasedProgress = Math.min(95, (elapsedTime / 60) * 20);
        const fileBasedProgress = this.scannedInodes.size > 10 
            ? Math.min(90, (this.scannedInodes.size / (this.scannedInodes.size * 1.5)) * 100)
            : estimatedTimeBasedProgress;
        const progressPercent = Math.max(estimatedTimeBasedProgress, fileBasedProgress);
        const filesProgress = (this.scannedInodes.size / this.estimatedTotalFiles) * 100;
        const bytesProgress = (this.totalScannedBytes / this.estimatedTotalBytes) * 100;
        return Math.min(99, (filesProgress * 0.7) + (bytesProgress * 0.3));
    },

    getEstimatedRemainingTime() {
        if (this.estimatedTotalFiles <= 0 || this.estimatedTotalBytes <= 0) return null;
        const progressPercent = this.getProgressPercent();
        const correctionFactor = progressPercent < 50 ? 0.5 : 0.8;
        const estimatedSeconds = (this.estimatedTotalBytes / this.bytesPerSecond);
        return Math.max(1, estimatedSeconds * correctionFactor);
    }
};

// פונקציות לטיפול בסריקת קבצים
async function handleDirectorySelection() {
    try {
        console.log("Opening directory picker");
        const dirHandle = await window.showDirectoryPicker();
        console.log("Directory selected:", dirHandle.name);
        
        AppState.currentDirectoryHandle = dirHandle;
        startScan(dirHandle);
    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Error selecting directory:", error);
            UI.showMessage("directory_selection_error: " + error.message, "error");
        }
    }
}

// Fix the typo in the variable name from sizeBasedBasedTime to sizeBasedTime
async function estimateDirectorySize(dirHandle, options = {}) {
    const maxFilesToSample = options.maxFiles || 200;
    const maxTimeSeconds = options.maxTime || 3;
    const maxDepth = options.maxDepth || 3;
    
    // מדדי ביצועים ממוצעים (מבוסס על בדיקות אמפיריות)
    const FILES_PER_SECOND = 1000; // קצב סריקת קבצים ממוצע
    const MB_PER_SECOND = 100; // קצב סריקת נפח ממוצע ב-MB
    
    let stats = {
        totalFiles: 0,
        totalBytes: 0,
        sampledFiles: 0,
        sampledBytes: 0,
        averageFileSize: 0,
        estimatedTotalFiles: 0,
        estimatedTotalBytes: 0,
        estimatedScanTime: 0,
        directoryDepth: 0,
        subdirectoryCount: 0,
        startTime: Date.now()
    };

    try {
        // פונקציה רקורסיבית לסריקה מהירה
        async function quickScan(handle, currentDepth = 0) {
            const endTime = Date.now() + maxTimeSeconds * 1000;
            // Using English operators
            if (currentDepth > maxDepth || 
                stats.sampledFiles >= maxFilesToSample || 
                Date.now() > endTime) {
                return;
            }
            
            stats.directoryDepth = Math.max(stats.directoryDepth, currentDepth);
            
            try {
                for await (const entry of handle.values()) {
                    // בדוק אם להפסיק את הדגימה
                    if (stats.sampledFiles >= maxFilesToSample || Date.now() > endTime) {
                        break;
                    }
                    
                    if (entry.kind === "file") {
                        try {
                            const file = await entry.getFile();
                            stats.totalFiles++;
                            stats.totalBytes += file.size;
                            
                            // Sampling file for average calculation
                            if (stats.sampledFiles < maxFilesToSample) {
                                stats.sampledFiles++;
                                stats.sampledBytes += file.size;
                            }
                        } catch (fileErr) {
                            console.warn("Error sampling file:", fileErr);
                        }
                    } else if (entry.kind === "directory") {
                        stats.subdirectoryCount++;
                        // המשך לעומק נוסף
                        await quickScan(entry, currentDepth + 1);
                    }
                }
            } catch (err) {
                console.warn("Error scanning directory:", err);
            }
        }
        
        // התחל את הסריקה המהירה
        await quickScan(dirHandle);
        
        // חשב מדדים מבוססי דגימה
        if (stats.sampledFiles > 0) {
            stats.averageFileSize = stats.sampledBytes / stats.sampledFiles;
            
            // הערכת מספר קבצים כולל
            const fileMultiplier = Math.max(1, 1 + (stats.subdirectoryCount / 5) + (stats.directoryDepth / 2));
            stats.estimatedTotalFiles = Math.max(stats.totalFiles, stats.totalFiles * fileMultiplier);
            
            // הערכת גודל כולל
            stats.estimatedTotalBytes = stats.estimatedTotalFiles * stats.averageFileSize;
            
            // הערכת זמן סריקה (בשניות)
            // בהנחה של כ-500 קבצים לדקה לסריקה בסיסית
            const baseFilesPerSecond = 8.33; // 500 / 60
            
            // הערכת זמן מבוססת גודל וכמות
            const sizeBasedTime = stats.estimatedTotalBytes / 1024 / 1024 / 2; // 2MB לשנייה
            const fileCountBasedTime = stats.estimatedTotalFiles / baseFilesPerSecond;
            
            // שקלול שני הגורמים
            stats.estimatedScanTime = Math.max(5, (sizeBasedTime * 0.4) + (fileCountBasedTime * 0.6));
            
            // הוסף גורם בטחון
            stats.estimatedScanTime *= 1.2;
        }
        
        // חישוב זמן משוער מדויק יותר
        if (stats.sampledFiles > 0) {
            const samplingDuration = (Date.now() - stats.startTime) / 1000;
            const samplingRate = stats.sampledFiles / samplingDuration;
            
            // חישוב הערכת זמן מבוססת על מספר גורמים
            const fileCountBasedTime = stats.estimatedTotalFiles / FILES_PER_SECOND;
            const sizeBasedTime = (stats.estimatedTotalBytes / 1024 / 1024) / MB_PER_SECOND;
            
            // התאמת הערכת הזמן לפי מורכבות התיקייה
            const complexityFactor = Math.min(1.5, 1 + (stats.directoryDepth * 0.1) + (stats.subdirectoryCount * 0.01));
            
            // שקלול כל הגורמים
            stats.estimatedScanTime = Math.max(
                1, // מינימום שנייה אחת
                Math.min(
                    ((fileCountBasedTime * 0.4) + (sizeBasedTime * 0.6)) * complexityFactor,
                    3600 // מקסימום שעה
                )
            );
        }
    } catch (error) {
        console.error("Error estimating directory size:", error);
    }
    
    return stats;
}

// עדכון פונקציית startScan לטיפול טוב יותר בביטול
async function startScan(dirHandle) {
    try {
        console.log("Starting scan for directory:", dirHandle.name);
        
        // בדוק הרשאות
        const permissionStatus = await dirHandle.queryPermission({ mode: 'read' });
        if (permissionStatus !== 'granted') {
            const newPermission = await dirHandle.requestPermission({ mode: 'read' });
            if (newPermission !== 'granted') {
                throw new Error("permission_denied");
            }
        }
        
        // שמור את ידית התיקייה
        AppState.currentDirectoryHandle = dirHandle;
        
        // בצע סריקה מקדימה להערכת גודל התיקייה
        UI.showMessage(`<div class="estimating-message">
            <p><strong>בודק את התיקייה...</strong></p>
            <p>מעריך גודל וזמן סריקה...</p>
            <div class="loading-spinner"></div>
        </div>`, 'info');
        
        AppState.isScanEstimating = true;
        
        // בצע הערכה ראשונית
        const estimate = await estimateDirectorySize(dirHandle, {
            maxFiles: 200,
            maxTime: 3,
            maxDepth: 3
        });
        
        AppState.isScanEstimating = false;
        
        // הצג הערכות למשתמש ובקש אישור להמשיך
        const estimatedSizeFormatted = UI.formatSize(estimate.estimatedTotalBytes);
        const estimatedTimeFormatted = formatTime(Math.ceil(estimate.estimatedScanTime));
        
        const userConfirmed = await new Promise(resolve => {
            UI.showMessage(`
                <div class="directory-estimate">
                    <h3>נתוני התיקייה הנבחרת</h3>
                    <div class="estimate-details">
                        <div class="estimate-item">
                            <div class="estimate-icon folder-icon"></div>
                            <div class="estimate-value">${dirHandle.name}</div>
                            <div class="estimate-label">שם התיקייה</div>
                        </div>
                        <div class="estimate-item">
                            <div class="estimate-icon files-icon"></div>
                            <div class="estimate-value">${estimate.estimatedTotalFiles.toLocaleString()}</div>
                            <div class="estimate-label">קבצים (הערכה)</div>
                        </div>
                        <div class="estimate-item">
                            <div class="estimate-icon size-icon"></div>
                            <div class="estimate-value">${estimatedSizeFormatted}</div>
                            <div class="estimate-label">גודל משוער</div>
                        </div>
                        <div class="estimate-item">
                            <div class="estimate-icon time-icon"></div>
                            <div class="estimate-value">${estimatedTimeFormatted}</div>
                            <div class="estimate-label">זמן סריקה משוער</div>
                        </div>
                    </div>
                    <div class="estimate-actions">
                        <button id="startFullScan" class="primary-btn">התחל סריקה</button>
                        <button id="cancelScan" class="secondary-btn">בטל</button>
                    </div>
                </div>
            `, 'info');
            
            // הוסף מאזיני אירועים לכפתורים
            document.getElementById('startFullScan').addEventListener('click', () => resolve(true));
            document.getElementById('cancelScan').addEventListener('click', () => resolve(false));
        });
        
        // אם המשתמש ביטל, צא מהפונקציה
        if (!userConfirmed) {
            UI.hideMessage();
            return;
        }
        
        // אחרת המשך לסריקה המלאה
        UI.updateScanningUI(true);
        UI.displayProgress(true);
        
        // אתחל את המודול להערכת סריקה
        ScanEstimator.initialize();
        
        // הגדר הערכות ראשוניות על בסיס הסריקה המקדימה
        ScanEstimator.estimatedTotalFiles = estimate.estimatedTotalFiles;
        ScanEstimator.estimatedTotalBytes = estimate.estimatedTotalBytes;
        
        AppState.isScanning = true;
        AppState.stats.startTime = Date.now();
        
        // Reset stats
        Object.keys(AppState.stats.fileTypes).forEach(key => {
            AppState.stats.fileTypes[key] = 0;
        });
        AppState.stats.filesScanned = 0;
        AppState.stats.dirsScanned = 0;
        AppState.stats.bytesScanned = 0;
        
        // בצע את הסריקה המלאה
        const result = await checkDuplicates(dirHandle);
        
        // עדכן ממשק עם תוצאות
        UI.displayResults(result);
        UI.hideMessage();
        
        if (document.getElementById('resultsSection')) {
            document.getElementById('resultsSection').style.display = 'block';
        }
    } catch (error) {
        console.error("Error during scan:", error);
        
        if (error.message === "permission_denied") {
            UI.showMessage("permission_denied", "error");
        } else {
            UI.showMessage("scan_error: " + error.message, "error");
        }
    } finally {
        AppState.isScanEstimating = false;
        AppState.isScanning = false;
        UI.updateScanningUI(false);
    }
}

function stopScan() {
    console.log("Stop scan requested");
    AppState.isScanning = false;
    UI.updateScanningUI(false);
    UI.showMessage("scan_stopped", "info", 3000);
}

// אתחול האפליקציה
function initApp() {
    console.log("Initializing application");
    
    // הוסף מאזיני אירועים לכפתורים
    const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
    if (selectDirectoryBtn) {
        selectDirectoryBtn.addEventListener('click', handleDirectorySelection);
    } else {
        console.error("Select directory button not found");
    }
    
    const stopScanBtn = document.getElementById('stopScanBtn');
    if (stopScanBtn) {
        stopScanBtn.addEventListener('click', stopScan);
    }
    
    // אתחול לשוניות
    UI.setupTabs();
    
    console.log("Application initialized");
}

// הרץ אתחול כאשר הדף נטען
document.addEventListener('DOMContentLoaded', initApp);

// Export to window for debugging
window.DuplicateFinder = {
    startScan,
    stopScan,
    UI,
    AppState
};

console.log("App script loaded");
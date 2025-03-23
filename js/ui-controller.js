/**
 * ui-controller.js - UI Controller
 * Responsible for user interface, real-time updates and data display
 */

export class UIController {
    static showMessage(message, type = 'info', duration = 0) {
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
    
    static hideMessage() {
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    }

    static async showEstimation(estimate) {
        const estimationArea = document.getElementById('estimationArea');
        estimationArea.style.display = 'block';
        
        const timeDescription = estimate.estimatedMinutes < 60 ? 
            `${estimate.estimatedMinutes} דקות` : 
            `${Math.floor(estimate.estimatedMinutes/60)} שעות ו-${estimate.estimatedMinutes%60} דקות`;

        estimationArea.innerHTML = `
            <div class="estimation-info">
                <h3>הערכת זמן סריקה:</h3>
                <p>מספר קבצים: ${estimate.totalFiles.toLocaleString()}</p>
                <p>נפח כולל: ${FileUtils.formatFileSize(estimate.totalSize)}</p>
                <p>זמן משוער: ${timeDescription}</p>
                <div class="estimation-buttons">
                    <button id="startScanBtn" class="primary-btn">התחל סריקה</button>
                    <button id="cancelBtn" class="secondary-btn">בטל</button>
                </div>
            </div>
        `;
        
        // Set up event listeners
        document.getElementById('startScanBtn').addEventListener('click', () => {
            this.clearEstimation();
            if (typeof startScan === 'function') {
                startScan(AppState.currentDirectoryHandle);
            }
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.clearEstimation();
        });
    }

    static async showScanEstimate(estimate) {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;

        messageContainer.innerHTML = `
            <div class="scan-estimate">
                <h3>הערכת זמן סריקה:</h3>
                <p>מספר קבצים משוער: ${estimate.totalFiles}</p>
                <p>גודל כולל משוער: ${this.formatBytes(estimate.totalSize)}</p>
                <p>זמן משוער: ${this.formatTime(estimate.estimatedTime)}</p>
            </div>
        `;
    }

    static clearEstimation() {
        const estimationArea = document.getElementById('estimationArea');
        estimationArea.style.display = 'none';
        estimationArea.innerHTML = '';
    }

    static updateProgress(progress) {
        const progressText = document.getElementById('progressText');
        const scanStats = document.getElementById('scanStats');

        if (progressText) {
            const filesScanned = progress.filesScanned || 0;
            progressText.textContent = `נסרקו ${filesScanned} קבצים (${this.formatBytes(progress.bytesScanned || 0)})`;
        }

        if (scanStats) {
            const duration = progress.startTime ? (Date.now() - progress.startTime) : 0;
            scanStats.innerHTML = `
                <div>זמן: ${this.formatTime(duration)}</div>
                <div>קובץ נוכחי: ${progress.currentFile || '-'}</div>
            `;
        }
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static formatTime(ms) {
        if (!ms || isNaN(ms)) return '0 שניות';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes} דקות ו-${seconds % 60} שניות`;
        }
        return `${seconds} שניות`;
    }

    static showProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'flex';
            progressSection.innerHTML = `
                <div class="progress-container">
                    <div id="progressBar" class="progress-bar"></div>
                </div>
                <div id="progressText" class="progress-text"></div>
                <div id="scanStats" class="scan-stats">
                    <div class="stat-item">קבצים נסרקו: <span id="filesScanned">0</span></div>
                    <div class="stat-item">גודל שנסרק: <span id="bytesScanned">0 B</span></div>
                    <div class="stat-item">זמן שחלף: <span id="timeElapsed">0s</span></div>
                    <div class="stat-item">קובץ נוכחי: <span id="currentFile">-</span></div>
                </div>
            `;
        }
    }

    static hideProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    static formatSpeed(bytesPerSecond) {
        if (!bytesPerSecond || isNaN(bytesPerSecond)) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytesPerSecond;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    static formatMemory(bytes) {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    }

    static showResults(results) {
        const resultsArea = document.getElementById('resultsArea');
        const duplicatesList = document.getElementById('duplicatesList');
        const exportBtn = document.getElementById('exportBtn');
        const showStatsBtn = document.getElementById('showStatsBtn');

        duplicatesList.innerHTML = '';
        
        if (results.duplicateContents.length === 0) {
            duplicatesList.innerHTML = '<p>לא נמצאו קבצים כפולים</p>';
            return;
        }

        results.duplicateContents.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'duplicate-group';
            
            const groupHeader = document.createElement('h3');
            groupHeader.textContent = `קבצים כפולים (${FileUtils.formatFileSize(group[0].size)})`;
            groupDiv.appendChild(groupHeader);

            const filesList = document.createElement('ul');
            group.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file.path;
                filesList.appendChild(li);
            });
            
            groupDiv.appendChild(filesList);
            duplicatesList.appendChild(groupDiv);
        });

        exportBtn.style.display = 'block';
        showStatsBtn.style.display = 'block';
    }

    static showDuplicates(duplicates) {
        const duplicatesList = document.getElementById('duplicatesList');
        duplicatesList.innerHTML = '';

        if (duplicates.length === 0) {
            duplicatesList.innerHTML = '<div class="no-duplicates">לא נמצאו קבצים כפולים</div>';
            return;
        }

        duplicates.forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'duplicate-group';
            
            // Create group header
            const header = document.createElement('div');
            header.className = 'group-header';
            const totalSize = group[0].size;
            header.innerHTML = `
                <div class="group-title">
                    <span>קבוצה ${index + 1}</span>
                    <span>${this.formatBytes(totalSize)}</span>
                </div>
                <div class="group-actions">
                    <button class="select-all">בחר הכל</button>
                    <button class="delete-selected">מחק נבחרים</button>
                </div>
            `;
            
            // Create files list
            const filesList = document.createElement('div');
            filesList.className = 'files-list';
            
            group.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-item';
                
                // Add preview if it's an image
                const isImage = file.type.startsWith('image/');
                const preview = isImage ? `
                    <div class="file-preview">
                        <img src="${file.path}" alt="תצוגה מקדימה" />
                    </div>
                ` : '';
                
                fileDiv.innerHTML = `
                    ${preview}
                    <div class="file-info">
                        <div class="file-name" title="${file.path}">${file.name}</div>
                        <div class="file-details">
                            <span>${this.formatBytes(file.size)}</span>
                            <span>${new Date(file.lastModified).toLocaleDateString()}</span>
                        </div>
                        <div class="file-path">${file.path}</div>
                    </div>
                    <div class="file-actions">
                        <input type="checkbox" class="file-select" />
                        <button class="open-file">פתח</button>
                        <button class="open-location">פתח מיקום</button>
                    </div>
                `;
                
                filesList.appendChild(fileDiv);
            });
            
            groupDiv.appendChild(header);
            groupDiv.appendChild(filesList);
            duplicatesList.appendChild(groupDiv);
        });
    }

    static toggleArea(areaId, show) {
        const area = document.getElementById(areaId);
        if (area) {
            area.style.display = show ? 'block' : 'none';
        }
    }

    static validateScanSettings(settings) {
        if (!settings) {
            throw new Error('הגדרות סריקה לא תקינות');
        }
        
        if (typeof settings.workerCount !== 'number' || settings.workerCount < 1) {
            settings.workerCount = navigator.hardwareConcurrency || 2;
        }
        
        if (typeof settings.imageSimilarityThreshold !== 'number' || 
            settings.imageSimilarityThreshold < 0 || 
            settings.imageSimilarityThreshold > 100) {
            settings.imageSimilarityThreshold = 90;
        }
        
        return settings;
    }

    static getScanSettings() {
        const settings = {
            checkFilenames: document.getElementById('checkFilenames')?.checked ?? true,
            checkContents: document.getElementById('checkContents')?.checked ?? true,
            checkImages: document.getElementById('checkImages')?.checked ?? true,
            imageSimilarityThreshold: parseInt(document.getElementById('imageSimilarity')?.value ?? '90'),
            workerCount: parseInt(document.getElementById('workerCount')?.value ?? '2')
        };
        
        return this.validateScanSettings(settings);
    }

    static showSystemInfo(systemInfo) {
        const systemInfoDiv = document.getElementById('systemInfo');
        if (!systemInfoDiv) {
            console.warn('System info container not found');
            return;
        }

        const infoHtml = `
            <div class="system-specs">
                <div class="spec-item">
                    <span class="spec-label">מעבד:</span>
                    <span class="spec-value">${systemInfo.cpu?.cores || 'לא ידוע'} ליבות</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">זיכרון:</span>
                    <span class="spec-value">${systemInfo.memory?.total || 'לא ידוע'} GB</span>
                </div>
            </div>
        `;

        systemInfoDiv.innerHTML = infoHtml;
    }

    static updateWorkerOptions(recommendedWorkers) {
        const workerCountInput = document.getElementById('workerCount');
        if (workerCountInput) {
            workerCountInput.value = recommendedWorkers;
        }
    }

    static updateDashboard(data) {
        // Update quick stats
        this.updateQuickStats({
            totalFiles: data.totalFiles,
            totalSize: data.totalSize,
            duplicatesCount: data.duplicates.length,
            potentialSavings: this.calculatePotentialSavings(data.duplicates)
        });

        // Update performance metrics
        this.updatePerformanceMetrics({
            scanSpeed: data.metrics.currentSpeed,
            progress: data.metrics.progressPercent,
            remainingTime: data.metrics.estimatedRemainingTime,
            activeWorkers: data.metrics.activeWorkers
        });

        // Update visualizations
        this.updateCharts(data);
    }

    static updateQuickStats(stats) {
        document.querySelector('#totalFiles .stat-value').textContent = 
            stats.totalFiles.toLocaleString();
        document.querySelector('#totalSize .stat-value').textContent = 
            this.formatBytes(stats.totalSize);
        document.querySelector('#duplicatesFound .stat-value').textContent = 
            stats.duplicatesCount.toLocaleString();
        document.querySelector('#potentialSavings .stat-value').textContent = 
            this.formatBytes(stats.potentialSavings);
    }

    static updatePerformanceMetrics(metrics) {
        const scanSpeed = document.getElementById('scanSpeed');
        scanSpeed.innerHTML = `
            <div class="metric-card">
                <div class="metric-title">מהירות סריקה</div>
                <div class="metric-value">${this.formatSpeed(metrics.scanSpeed)}/שנייה</div>
                <div class="metric-chart">
                    ${this.createSpeedChart(metrics.scanSpeed)}
                </div>
            </div>
        `;

        const progressInfo = document.getElementById('progressInfo');
        progressInfo.innerHTML = `
            <div class="metric-card">
                <div class="metric-title">התקדמות</div>
                <div class="metric-value">${metrics.progress.toFixed(1)}%</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${metrics.progress}%"></div>
                </div>
                <div class="metric-details">
                    <div>זמן נותר: ${this.formatTime(metrics.remainingTime)}</div>
                    <div>עובדים פעילים: ${metrics.activeWorkers}</div>
                </div>
            </div>
        `;
    }

    static showUSBInfo(usbInfo) {
        const systemStatus = document.querySelector('.system-status');
        if (!systemStatus) return;

        const infoElement = document.createElement('div');
        infoElement.className = 'usb-info';
        infoElement.innerHTML = `
            <div class="connection-type" style="color: ${usbInfo.color}">
                <span class="icon">⚡</span>
                ${usbInfo.type}
            </div>
            <div class="speed-info">
                <div>מהירות קריאה: ${usbInfo.speed.toFixed(1)} MB/s</div>
            </div>
            ${usbInfo.isOptimal ? 
                `<div class="connection-message">${usbInfo.details}</div>` :
                `<div class="warning">${usbInfo.warning}</div>`
            }
        `;

        // Remove existing USB info if any
        const existingInfo = systemStatus.querySelector('.usb-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        systemStatus.appendChild(infoElement);
    }

    static async showConfirmDialog(title, message) {
        return confirm(`${title}\n\n${message}`);
    }

    static showWorkerOptions(estimationResults) {
        const controlArea = document.createElement('div');
        controlArea.className = 'worker-selection';
        
        const optionsHtml = estimationResults.options.map(option => `
            <div class="worker-option">
                <h3>${option.workerCount} תהליכים</h3>
                <div class="option-details">
                    <p>זמן משוער: ${this.formatTime(option.estimatedTime)}</p>
                    <p>ניצול מעבד משוער: ${option.cpuUsage}%</p>
                    <p>שימוש זיכרון משוער: ${this.formatMemory(option.memoryUsage)}</p>
                </div>
                <button class="start-scan-btn primary-btn" data-workers="${option.workerCount}">
                    התחל סריקה
                </button>
            </div>
        `).join('');

        controlArea.innerHTML = `
            <h2>בחר תצורת סריקה:</h2>
            <div class="worker-options-grid">
                ${optionsHtml}
            </div>
        `;

        const mainContent = document.querySelector('.dashboard-content');
        const existingSelection = document.querySelector('.worker-selection');
        if (existingSelection) {
            existingSelection.remove();
        }
        mainContent.insertBefore(controlArea, mainContent.firstChild);
    }

    static getOptimalClass(option, systemInfo) {
        if (option.workerCount > systemInfo.cores) {
            return 'not-recommended';
        }
        if (option.workerCount === this.getRecommendedWorkers(systemInfo)) {
            return 'recommended';
        }
        return '';
    }

    static getRecommendedWorkers(systemInfo) {
        // Calculate based on CPU cores and memory
        const maxByCore = Math.max(1, systemInfo.cores - 1);
        const maxByMemory = Math.floor(systemInfo.memory / 2);
        return Math.min(maxByCore, maxByMemory, 8);
    }

    static getPerformanceImpact(option, systemInfo) {
        if (option.workerCount > systemInfo.cores) {
            return `<span class="warning">⚠️ עלול להאט את המערכת</span>`;
        }
        if (option.workerCount === this.getRecommendedWorkers(systemInfo)) {
            return `<span class="optimal">✓ אופטימלי למערכת שלך</span>`;
        }
        return `<span class="neutral">השפעה מינימלית על המערכת</span>`;
    }

    static displayResults(results = {}, stats = {}) {
        const resultsSection = document.getElementById('resultsSection');
        if (!resultsSection) {
            console.error('Results section not found in DOM');
            return;
        }

        // הצג את אזור התוצאות
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

        // טאבים שונים לסוגי התוצאות
        const tabs = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // וידוא שיש טאבים
        if (tabs.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // הסר פעיל מכל הטאבים
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    
                    // הפעל את הטאב הנוכחי
                    tab.classList.add('active');
                    const tabId = tab.getAttribute('data-tab');
                    document.getElementById(`${tabId}Results`)?.classList.add('active');
                });
            });
        }
        
        // הצג תוצאות לפי סוג
        this.displayFilenameResults(results.duplicateFilenames || []);
        this.displayContentResults(results.duplicateContents || []);
        this.displayImageResults(results.duplicateImages || []);
    }

    // פונקציות להצגת התוצאות השונות
    static displayFilenameResults(duplicateFilenames) {
        const container = document.querySelector('#filenameResults .results-list');
        if (!container) return;
        
        if (!duplicateFilenames || duplicateFilenames.length === 0) {
            container.innerHTML = '<div class="no-results">לא נמצאו שמות קבצים כפולים</div>';
            return;
        }
        
        let html = '';
        duplicateFilenames.forEach(group => {
            if (!group || !Array.isArray(group.paths) || group.paths.length <= 1) return;
            
            html += `<div class="duplicate-group">
                <div class="duplicate-header">
                    <h4>שם קובץ: ${escapeHtml(group.name || '')}</h4>
                    <span>${group.paths.length} עותקים</span>
                </div>
                <div class="duplicate-files">`;
                
            group.paths.forEach(path => {
                html += `<div class="file-item">
                    <span class="file-path">${escapeHtml(path)}</span>
                    <span class="file-size">${formatSize(group.size)}</span>
                    <div class="file-actions">
                        <button class="action-btn open-file" data-path="${escapeHtml(path)}">פתח</button>
                    </div>
                </div>`;
            });
            
            html += `</div></div>`;
        });
        
        container.innerHTML = html || '<div class="no-results">לא נמצאו שמות קבצים כפולים</div>';
        
        // הוספת מאזיני אירועים
        container.querySelectorAll('.open-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const path = this.getAttribute('data-path');
                if (path) {
                    try {
                        window.open('file://' + path);
                    } catch (err) {
                        console.error('Failed to open file:', err);
                    }
                }
            });
        });
    }
}

// UI Elements
const uiElements = {
    // Buttons
    selectDirButton: document.getElementById('selectDirButton'),
    stopScanButton: document.getElementById('stopScanButton'),
    exportResultsButton: document.getElementById('exportResultsButton'),
    showStatsButton: document.getElementById('showStatsButton'),
    
    // Areas
    progressSection: document.getElementById('progressSection'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    resultsSection: document.getElementById('resultsSection'),
    statusMessage: document.getElementById('statusMessage'),
    
    // Progress data
    filesScanned: document.getElementById('filesScanned'),
    totalFiles: document.getElementById('totalFiles'),
    sizeScanned: document.getElementById('sizeScanned'),
    elapsedTime: document.getElementById('elapsedTime'),
    estimatedTime: document.getElementById('estimatedTime'),
    scanSpeed: document.getElementById('scanSpeed'),
    liveStatusMessage: document.getElementById('liveStatusMessage'),
    
    // Results
    resultsSummary: document.getElementById('resultsSummary'),
    statsVisualization: document.getElementById('statsVisualization'),
    statsChart: document.getElementById('statsChart'),
    
    // Results tabs
    filenameResults: document.getElementById('filenameResults'),
    contentResults: document.getElementById('contentResults'),
    imageResults: document.getElementById('imageResults'),
    
    // Settings
    checkFilenames: document.getElementById('checkFilenames'),
    checkContents: document.getElementById('checkContents'),
    checkImages: document.getElementById('checkImages'),
    imageSimilarity: document.getElementById('imageSimilarity'),
    similarityValue: document.getElementById('similarityValue'),
    workerCount: document.getElementById('workerCount')
};

/**
 * Initialize UI Controller
 */
function init() {
    // Setup tab event listeners
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });
    
    // Add event listener for similarity threshold changes
    if (uiElements.imageSimilarity && uiElements.similarityValue) {
        uiElements.imageSimilarity.addEventListener('input', () => {
            uiElements.similarityValue.textContent = uiElements.imageSimilarity.value + '%';
        });
    }
    
    // Initialize tabs
    if (tabButtons.length > 0) {
        tabButtons[0].classList.add('active');
        const targetId = tabButtons[0].dataset.target;
        const targetTab = document.getElementById(targetId);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }
}

/**
 * Handle tab switching
 * @param {Event} event - Click event
 */
function handleTabClick(event) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(tab => tab.classList.remove('active'));
    
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    
    const targetId = event.target.dataset.target;
    const targetContent = document.getElementById(targetId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

/**
 * Show/Hide area
 * @param {string} areaId - Area ID
 * @param {boolean} show - Whether to show or hide
 */
function toggleArea(areaId, show) {
    const area = document.getElementById(areaId);
    if (area) {
        area.style.display = show ? 'block' : 'none';
    }
}

/**
 * Show message to user
 * @param {string} message - Message
 * @param {string} type - Message type (info, error, success)
 */
function showMessage(message, type = 'info') {
    if (!uiElements.statusMessage) return;
    
    uiElements.statusMessage.textContent = message;
    uiElements.statusMessage.style.display = 'block';
    
    // Remove existing classes
    uiElements.statusMessage.classList.remove('info', 'error', 'success');
    
    // Add class based on message type
    uiElements.statusMessage.classList.add(type);
}

/**
 * Update scan progress
 * @param {Object} progress - Progress data
 */
function updateProgress(progress) {
    if (!uiElements.progressSection) return;
    
    // Update progress bar
    let percentComplete = 0;
    if (progress.totalFiles && progress.totalFiles > 0) {
        percentComplete = Math.min(
            Math.round((progress.filesScanned / progress.totalFiles) * 100),
            99
        );
    }
    
    // Update UI
    uiElements.progressBar.style.width = `${percentComplete}%`;
    uiElements.progressText.textContent = `${percentComplete}%`;
    
    // Update numbers
    uiElements.filesScanned.textContent = progress.filesScanned.toString();
    if (progress.totalFiles) {
        uiElements.totalFiles.textContent = progress.totalFiles.toString();
    }
    uiElements.sizeScanned.textContent = formatSize(progress.bytesScanned || 0);
    
    // Update times
    if (progress.startTime) {
        const elapsedTime = (new Date() - progress.startTime) / 1000;
        uiElements.elapsedTime.textContent = formatTime(elapsedTime);
        
        // Calculate speed
        if (progress.bytesScanned && elapsedTime > 0) {
            const speed = progress.bytesScanned / elapsedTime;
            uiElements.scanSpeed.textContent = `${formatSize(speed)}/s`;
        }
        
        // Estimate time to finish
        if (progress.filesScanned > 0 && percentComplete > 0) {
            const timePerFile = elapsedTime / progress.filesScanned;
            const remainingFiles = (progress.totalFiles || 0) - progress.filesScanned;
            const remainingTime = timePerFile * remainingFiles;
            
            uiElements.estimatedTime.textContent = remainingTime > 0 
                ? formatTime(remainingTime) 
                : "מסיים...";
        }
    }
    
    // Update status message
    if (uiElements.liveStatusMessage) {
        const duplicates = progress.duplicatesFound || { filenames: 0, contents: 0, images: 0 };
        uiElements.liveStatusMessage.textContent = `נסרקים ${progress.filesScanned} קבצים. ` +
            `נמצאו: ${duplicates.filenames || 0} שמות קבצים כפולים, ` +
            `${duplicates.contents || 0} קבצים עם תוכן זהה, ` +
            `${duplicates.images || 0} תמונות דומות.`;
    }
}

/**
 * Display scan results
 * @param {Object} results - Scan results
 * @param {Object} stats - Scan statistics
 */
function displayResults(results, stats) {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) return;

    resultsSection.style.display = 'block';

    // הצגת שמות קבצים כפולים
    const filenamesList = document.querySelector('#filenameResults .results-list');
    if (filenamesList && results.duplicateFilenames) {
        filenamesList.innerHTML = results.duplicateFilenames
            .filter(group => group && group.paths && group.paths.length > 1)
            .map(group => {
                const fileSize = group.size ? formatSize(group.size) : 'לא ידוע';
                return `
                    <div class="duplicate-group">
                        <div class="duplicate-header">
                            <h4>שם קובץ: ${escapeHtml(group.name || '')}</h4>
                            <span>${group.paths.length} עותקים</span>
                        </div>
                        <div class="duplicate-files">
                            ${group.paths.map(path => `
                                <div class="file-item">
                                    <span class="file-path">${escapeHtml(path)}</span>
                                    <span class="file-size">${fileSize}</span>
                                    <div class="file-actions">
                                        <button onclick="window.viewFile('${escapeHtml(path)}')" class="action-btn">פתח</button>
                                        <button onclick="window.showInFolder('${escapeHtml(path)}')" class="action-btn">הצג מיקום</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
    }

    // הצגת קבצים עם תוכן זהה
    const contentsList = document.querySelector('#contentResults .results-list');
    if (contentsList && results.duplicateContents) {
        contentsList.innerHTML = results.duplicateContents
            .filter(group => group && group.length > 1)
            .map(group => {
                const firstFile = group[0] || {};
                const fileSize = firstFile.size ? formatSize(firstFile.size) : 'לא ידוע';
                return `
                    <div class="duplicate-group">
                        <div class="duplicate-header">
                            <h4>קבצים זהים (${fileSize})</h4>
                            <span>${group.length} עותקים</span>
                        </div>
                        <div class="duplicate-files">
                            ${group.map(file => file ? `
                                <div class="file-item">
                                    <span class="file-path">${escapeHtml(file.path || '')}</span>
                                    <span class="file-name">${escapeHtml(file.name || '')}</span>
                                    <div class="file-actions">
                                        <button onclick="window.viewFile('${escapeHtml(file.path || '')}')" class="action-btn">פתח</button>
                                        <button onclick="window.showInFolder('${escapeHtml(file.path || '')}')" class="action-btn">הצג מיקום</button>
                                    </div>
                                </div>
                            ` : '').join('')}
                        </div>
                    </div>
                `;
            }).join('');
    }

    // פונקציית עזר לפורמט גודל קובץ
    function formatSize(bytes) {
        if (typeof bytes !== 'number') return 'לא ידוע';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // פונקציית עזר לסינון תווים מיוחדים
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/<//g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"//g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

/**
 * Display results in tabs
 * @param {Object} results - Scan results
 */
function displayTabResults(results) {
    // Display files with identical names
    displayFilenameResults(results.duplicateFilenames || []);
    
    // Display files with identical content
    displayContentResults(results.duplicateContents || []);
    
    // Display similar images
    displayImageResults(results.duplicateImages || []);
}

/**
 * Display files with identical names
 * @param {Array} duplicates - List of files with identical names
 */
function displayFilenameResults(duplicates) {
    const container = uiElements.filenameResults;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (duplicates.length === 0) {
        container.innerHTML = '<p>לא נמצאו קבצים עם שמות זהים.</p>';
        return;
    }
    
    // Sort by filename
    duplicates.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create elements for each duplicate group
    duplicates.forEach((dupeGroup, index) => {
        const group = document.createElement('div');
        group.className = 'duplicate-group';
        
        const header = document.createElement('h3');
        header.textContent = `קבוצה ${index + 1}: ${dupeGroup.name}`;
        group.appendChild(header);
        
        // Show each path in group
        dupeGroup.paths.forEach(path => {
            const pathElem = document.createElement('div');
            pathElem.className = 'file-path';
            pathElem.textContent = path;
            group.appendChild(pathElem);
        });
        
        // Action buttons
        if (dupeGroup.paths.length > 1) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'duplicate-actions';
            
            const keepFirstBtn = document.createElement('button');
            keepFirstBtn.textContent = 'השאר ראשון, מחק שאר העותקים';
            keepFirstBtn.className = 'action-btn';
            keepFirstBtn.addEventListener('click', () => {
                alert('פונקציונליות זו תהיה זמינה בגרסה הבאה.');
            });
            
            actionsDiv.appendChild(keepFirstBtn);
            group.appendChild(actionsDiv);
        }
        
        container.appendChild(group);
    });
}

/**
 * Display files with identical content
 * @param {Array} duplicates - List of files with identical content
 */
function displayContentResults(duplicates) {
    const container = uiElements.contentResults;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (duplicates.length === 0) {
        container.innerHTML = '<p>לא נמצאו קבצים עם תוכן זהה.</p>';
        return;
    }
    
    // Sort by file size (largest to smallest)
    duplicates.sort((a, b) => b.size - a.size);
    
    // Create elements for each duplicate group
    duplicates.forEach((dupeGroup, index) => {
        const group = document.createElement('div');
        group.className = 'duplicate-group';
        
        const header = document.createElement('h3');
        const sizeFormatted = formatSize(dupeGroup.size);
        header.textContent = `קבוצה ${index + 1}: ${sizeFormatted}`;
        group.appendChild(header);
        
        // Show each path in group
        dupeGroup.paths.forEach(path => {
            const pathElem = document.createElement('div');
            pathElem.className = 'file-path';
            pathElem.textContent = path;
            group.appendChild(pathElem);
        });
        
        // Action buttons
        if (dupeGroup.paths.length > 1) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'duplicate-actions';
            
            const keepFirstBtn = document.createElement('button');
            keepFirstBtn.textContent = 'השאר ראשון, מחק שאר העותקים';
            keepFirstBtn.className = 'action-btn';
            keepFirstBtn.addEventListener('click', () => {
                alert('פונקציונליות זו תהיה זמינה בגרסה הבאה.');
            });
            
            actionsDiv.appendChild(keepFirstBtn);
            group.appendChild(actionsDiv);
        }
        
        container.appendChild(group);
    });
}

/**
 * Display similar images
 * @param {Array} duplicates - List of similar images
 */
function displayImageResults(duplicates) {
    const container = uiElements.imageResults;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (duplicates.length === 0) {
        container.innerHTML = '<p>לא נמצאו תמונות דומות.</p>';
        return;
    }
    
    // Sort by similarity (highest to lowest)
    duplicates.sort((a, b) => {
        const similarityA = parseFloat(a.similarity.replace('%', ''));
        const similarityB = parseFloat(b.similarity.replace('%', ''));
        return similarityB - similarityA;
    });
    
    // Create elements for each duplicate group
    duplicates.forEach((dupeGroup, index) => {
        const group = document.createElement('div');
        group.className = 'duplicate-group';
        
        const header = document.createElement('h3');
        header.textContent = `קבוצה ${index + 1}: דמיון ${dupeGroup.similarity}`;
        group.appendChild(header);
        
        // Show each path in group
        dupeGroup.paths.forEach(path => {
            const pathElem = document.createElement('div');
            pathElem.className = 'file-path';
            pathElem.textContent = path;
            group.appendChild(pathElem);
        });
        
        // Action buttons
        if (dupeGroup.paths.length > 1) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'duplicate-actions';
            
            const keepFirstBtn = document.createElement('button');
            keepFirstBtn.textContent = 'השאר ראשון, מחק שאר העותקים';
            keepFirstBtn.className = 'action-btn';
            keepFirstBtn.addEventListener('click', () => {
                alert('פונקציונליות זו תהיה זמינה בגרסה הבאה.');
            });
            
            actionsDiv.appendChild(keepFirstBtn);
            group.appendChild(actionsDiv);
        }
        
        container.appendChild(group);
    });
}

/**
 * Generate statistical visualization
 * @param {Object} results - Scan results
 * @param {Object} stats - Scan statistics
 */
function generateStatistics(results, stats) {
    if (!uiElements.statsVisualization || !uiElements.statsChart) return;
    
    // Collect and analyze statistics
    const typeAnalysis = Statistics.analyzeByFileType(results);
    const potentialSavings = Statistics.analyzePotentialSavings(results);
    
    // Try to create a simple chart
    const chartHtml = `
        <div style="text-align: center;">
            <p>סך הכל נמצאו ${potentialSavings.totalDuplicateFiles} קבצים כפולים</p>
            <p>פוטנציאל חיסכון: ${formatSize(potentialSavings.potentialSavingSize)}</p>
            <div style="display: flex; margin-top: 20px; height: 40px;">
                <div style="flex: ${typeAnalysis.counts.images || 1}; background-color: #4CAF50; color: white; padding: 10px; text-align: center;">
                    תמונות<br>${typeAnalysis.counts.images || 0}
                </div>
                <div style="flex: ${typeAnalysis.counts.documents || 1}; background-color: #2196F3; color: white; padding: 10px; text-align: center;">
                    מסמכים<br>${typeAnalysis.counts.documents || 0}
                </div>
                <div style="flex: ${typeAnalysis.counts.videos + typeAnalysis.counts.audio || 1}; background-color: #FF9800; color: white; padding: 10px; text-align: center;">
                    מדיה<br>${(typeAnalysis.counts.videos || 0) + (typeAnalysis.counts.audio || 0)}
                </div>
                <div style="flex: ${typeAnalysis.counts.other || 1}; background-color: #9E9E9E; color: white; padding: 10px; text-align: center;">
                    אחר<br>${typeAnalysis.counts.other || 0}
                </div>
            </div>
        </div>
    `;
    
    uiElements.statsChart.innerHTML = chartHtml;
    uiElements.statsVisualization.style.display = 'block';
}

/**
 * Get scan settings from UI
 * @returns {Object} Scan settings
 */
function getScanSettings() {
    return {
        checkFilenames: uiElements.checkFilenames ? uiElements.checkFilenames.checked : true,
        checkContents: uiElements.checkContents ? uiElements.checkContents.checked : true,
        checkImages: uiElements.checkImages ? uiElements.checkImages.checked : true,
        imageSimilarityThreshold: uiElements.imageSimilarity ? parseInt(uiElements.imageSimilarity.value) : 90,
        workerCount: uiElements.workerCount ? parseInt(uiElements.workerCount.value) : 2
    };
}

/**
 * Format file size to readable units
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * Format time in seconds to hours:minutes:seconds format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return String(hours).padStart(2, '0') + ':' + 
           String(minutes).padStart(2, '0') + ':' + 
           String(seconds).padStart(2, '0');
}

// Initialize UI controller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Make it globally available
window.UIController = UIController;

// הוספת פונקציות גלובליות לטיפול בקבצים
window.viewFile = async (path) => {
    try {
        // נסיון לפתוח את הקובץ בתוכנה המתאימה
        await window.open('file://' + path);
    } catch (error) {
        console.error('Error opening file:', error);
        UIController.showMessage('שגיאה בפתיחת הקובץ', 'error');
    }
};

window.showInFolder = async (path) => {
    try {
        // נסיון להציג את הקובץ בתיקייה
        await window.showDirectoryPicker({
            startIn: path.substring(0, path.lastIndexOf('/')),
        });
    } catch (error) {
        console.error('Error showing file location:', error);
        UIController.showMessage('שגיאה בהצגת מיקום הקובץ', 'error');
    }
};
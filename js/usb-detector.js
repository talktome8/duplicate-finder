class USBDetector {
    async detectConnection(directoryHandle) {
        try {
            const testResults = await this.performSpeedTest(directoryHandle);
            return this.analyzeSpeed(testResults);
        } catch (error) {
            console.error('USB detection error:', error);
            return {
                type: 'Unknown',
                speed: 0,
                isOptimal: false,
                warning: 'לא ניתן לבדוק את מהירות החיבור'
            };
        }
    }

    async performSpeedTest(directoryHandle) {
        // Create test file (50MB)
        const testSize = 50 * 1024 * 1024;
        const testData = new Uint8Array(testSize);
        const blob = new Blob([testData]);

        // Write test
        const writeStart = performance.now();
        const fileHandle = await directoryHandle.getFileHandle('speedtest.tmp', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        const writeTime = performance.now() - writeStart;

        // Read test
        const readStart = performance.now();
        const file = await fileHandle.getFile();
        await file.arrayBuffer();
        const readTime = performance.now() - readStart;

        // Cleanup
        await directoryHandle.removeEntry('speedtest.tmp');

        // Calculate speeds in MB/s
        return {
            writeSpeed: (testSize / writeTime) * 1000 / (1024 * 1024),
            readSpeed: (testSize / readTime) * 1000 / (1024 * 1024)
        };
    }

    analyzeSpeed(speeds) {
        const avgSpeed = (speeds.writeSpeed + speeds.readSpeed) / 2;

        if (avgSpeed > 400) { // USB 3.2 Gen 2
            return {
                type: 'USB 3.2',
                speed: avgSpeed,
                isOptimal: true,
                details: 'מהירות מעולה',
                color: '#34a853'
            };
        } else if (avgSpeed > 200) { // USB 3.1
            return {
                type: 'USB 3.1',
                speed: avgSpeed,
                isOptimal: true,
                details: 'מהירות טובה מאוד',
                color: '#4285f4'
            };
        } else if (avgSpeed > 60) { // USB 3.0
            return {
                type: 'USB 3.0',
                speed: avgSpeed,
                isOptimal: true,
                details: 'מהירות טובה',
                color: '#4285f4'
            };
        } else { // USB 2.0 or slower
            return {
                type: 'USB 2.0 או נמוך יותר',
                speed: avgSpeed,
                isOptimal: false,
                warning: 'חיבור USB איטי זוהה. מומלץ להשתמש בחיבור USB 3.0 או מהיר יותר',
                color: '#ea4335'
            };
        }
    }
}
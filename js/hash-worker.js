/**
 * hash-worker.js - Hash calculation worker
 * Runs in a separate thread for performance optimization
 */

self.onmessage = async function(e) {
    const task = e.data;
    
    if (task.type === 'hash') {
        try {
            // Hash calculation
            const hashBuffer = await crypto.subtle.digest('SHA-256', task.data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Send result back
            self.postMessage({
                id: task.id,
                hash: hashHex,
                error: null
            });
        } catch (error) {
            self.postMessage({
                id: task.id,
                hash: null,
                error: error.message
            });
        }
    } else if (task.type === 'perceptual-hash') {
        // Not implemented in worker - images are processed in the main thread
        self.postMessage({
            id: task.id,
            hash: null,
            error: 'Perceptual hash not implemented in worker'
        });
    } else if (task.type === 'partial-hash') {
        try {
            // Partial hash calculation (for sampling large files):
            // Take some bytes from the beginning, middle, and end of the file
            
            const data = task.data;
            const sampleSize = 4096; // 4KB from each part
            const totalBytes = data.byteLength;
            
            // Create array to collect samples
            let combinedSample;
            
            if (totalBytes <= sampleSize * 3) {
                // If the file is small, use all data
                combinedSample = data;
            } else {
                // Take samples from the beginning, middle, and end
                const startSample = new Uint8Array(data, 0, sampleSize);
                const middleOffset = Math.floor(totalBytes / 2) - Math.floor(sampleSize / 2);
                const middleSample = new Uint8Array(data, middleOffset, sampleSize);
                const endSample = new Uint8Array(data, totalBytes - sampleSize, sampleSize);
                
                // Create combined array
                combinedSample = new Uint8Array(sampleSize * 3);
                combinedSample.set(startSample, 0);
                combinedSample.set(middleSample, sampleSize);
                combinedSample.set(endSample, sampleSize * 2);
            }
            
            // Hash calculation on combined sample
            const hashBuffer = await crypto.subtle.digest('SHA-256', combinedSample);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Send result back
            self.postMessage({
                id: task.id,
                hash: hashHex,
                error: null,
                isPartial: true
            });
        } catch (error) {
            self.postMessage({
                id: task.id,
                hash: null,
                error: error.message,
                isPartial: true
            });
        }
    }
};
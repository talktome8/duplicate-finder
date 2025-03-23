self.onmessage = async function(e) {
    const { file, settings } = e.data;
    
    try {
        if (!file) {
            throw new Error('No file provided');
        }

        let arrayBuffer;
        try {
            arrayBuffer = await file.arrayBuffer();
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }

        let hash;
        try {
            hash = await crypto.subtle.digest('SHA-256', arrayBuffer);
        } catch (error) {
            throw new Error(`Failed to calculate hash: ${error.message}`);
        }

        self.postMessage({
            type: 'result',
            hash: Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(''),
            fileInfo: {
                name: file.name,
                size: file.size
            }
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};
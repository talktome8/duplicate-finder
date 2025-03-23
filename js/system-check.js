export class SystemCheck {
    static async getSystemInfo() {
        const info = {
            cpuCores: navigator.hardwareConcurrency,
            usbPorts: await this.getUSBPorts(),
            performance: await this.estimatePerformance()
        };
        return info;
    }

    static async getUSBPorts() {
        try {
            const ports = await navigator.usb.getDevices();
            return ports.map(device => ({
                productName: device.productName,
                manufacturerName: device.manufacturerName,
                speed: this.getUSBSpeed(device.speed),
                portNumber: device.portNumber
            }));
        } catch (error) {
            console.error('USB Check Error:', error);
            return [];
        }
    }

    static getUSBSpeed(speed) {
        const speeds = {
            'low-speed': '1.5 Mbps (USB 1.0)',
            'full-speed': '12 Mbps (USB 1.1)',
            'high-speed': '480 Mbps (USB 2.0)',
            'super-speed': '5 Gbps (USB 3.0)',
            'super-speed-plus': '10 Gbps (USB 3.1)'
        };
        return speeds[speed] || 'Unknown';
    }

    static async estimatePerformance() {
        const start = performance.now();
        const testSize = 1024 * 1024; // 1MB
        const buffer = new ArrayBuffer(testSize);
        
        // Test read/write speed
        await crypto.subtle.digest('SHA-256', buffer);
        
        return performance.now() - start;
    }
}

// הוספת אינטרפייס גלובלי
window.SystemCheck = SystemCheck;
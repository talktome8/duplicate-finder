/**
 * image-utils.js - פונקציות עזר לטיפול בתמונות
 * מספק פונקציות לזיהוי תמונות דומות והשוואתן
 */

class ImageUtils {
    /**
     * Calculate perceptual image signature (pHash)
     * Based on simplified DCT (Discrete Cosine Transform) algorithm:
     * 1. Resize image to 32x32 pixels
     * 2. Convert to grayscale
     * 3. Calculate average brightness
     * 4. Create bitmap: 1 for pixels brighter than average, 0 for darker
     * 
     * @param {File|Blob} imageFile - קובץ התמונה
     * @returns {Promise<string>} חתימה בינארית של התמונה
     */
    static async calculateImageSignature(imageFile) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                const objectURL = URL.createObjectURL(imageFile);
                
                img.onload = () => {
                    try {
                        // יצירת canvas לעיבוד התמונה
                        const canvas = document.createElement('canvas');
                        const size = 32; // גודל הקטנה
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d');
                        
                        // הקטנת התמונה וציור על הקנבס
                        ctx.drawImage(img, 0, 0, size, size);
                        
                        // קבלת נתוני פיקסלים
                        const pixelData = ctx.getImageData(0, 0, size, size).data;
                        
                        // חישוב ערכי גווני אפור והבהירות הממוצעת
                        const grayValues = [];
                        let avgBrightness = 0;
                        
                        for (let i = 0; i < pixelData.length; i += 4) {
                            const r = pixelData[i];
                            const g = pixelData[i + 1];
                            const b = pixelData[i + 2];
                            // המרה לגווני אפור לפי נוסחת הבהירות המקובלת
                            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                            grayValues.push(gray);
                            avgBrightness += gray;
                        }
                        
                        // חישוב ממוצע
                        avgBrightness /= grayValues.length;
                        
                        // יצירת חתימה בינארית - 1 לערכים מעל הממוצע, 0 לערכים מתחת לממוצע
                        let signature = '';
                        for (let i = 0; i < grayValues.length; i++) {
                            signature += grayValues[i] >= avgBrightness ? '1' : '0';
                        }
                        
                        URL.revokeObjectURL(objectURL);
                        resolve(signature);
                    } catch (error) {
                        URL.revokeObjectURL(objectURL);
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(objectURL);
                    reject(new Error('Failed to load image'));
                };
                
                img.src = objectURL;
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * חישוב חתימת צבע של תמונה (Color Histogram)
     * 
     * יוצר היסטוגרמת צבעים פשוטה המחולקת ל-4x4x4 תאים (64 צבעים)
     * 
     * @param {File|Blob} imageFile - קובץ התמונה
     * @returns {Promise<number[]>} היסטוגרמת צבעים
     */
    static async calculateColorHistogram(imageFile) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                const objectURL = URL.createObjectURL(imageFile);
                
                img.onload = () => {
                    try {
                        // יצירת canvas לעיבוד התמונה
                        const canvas = document.createElement('canvas');
                        const size = 64; // גודל הקטנה
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d');
                        
                        // הקטנת התמונה וציור על הקנבס
                        ctx.drawImage(img, 0, 0, size, size);
                        
                        // קבלת נתוני פיקסלים
                        const pixelData = ctx.getImageData(0, 0, size, size).data;
                        
                        // יצירת היסטוגרמה
                        // נחלק את מרחב הצבע ל-4 חלקים בכל ערוץ צבע (4x4x4 = 64 תאים)
                        const histogramBins = 4;
                        const histogram = new Array(histogramBins * histogramBins * histogramBins).fill(0);
                        
                        for (let i = 0; i < pixelData.length; i += 4) {
                            const r = Math.floor(pixelData[i] / (256 / histogramBins));
                            const g = Math.floor(pixelData[i + 1] / (256 / histogramBins));
                            const b = Math.floor(pixelData[i + 2] / (256 / histogramBins));
                            
                            // חישוב אינדקס בהיסטוגרמה
                            const index = r * histogramBins * histogramBins + g * histogramBins + b;
                            histogram[index]++;
                        }
                        
                        // נרמול ההיסטוגרמה
                        const totalPixels = (size * size);
                        for (let i = 0; i < histogram.length; i++) {
                            histogram[i] = histogram[i] / totalPixels;
                        }
                        
                        URL.revokeObjectURL(objectURL);
                        resolve(histogram);
                    } catch (error) {
                        URL.revokeObjectURL(objectURL);
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(objectURL);
                    reject(new Error('Failed to load image'));
                };
                
                img.src = objectURL;
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * חישוב מרחק האמינג (Hamming distance) בין שתי מחרוזות בינאריות
     * @param {string} str1 - מחרוזת בינארית ראשונה
     * @param {string} str2 - מחרוזת בינארית שנייה
     * @returns {number} מספר הביטים השונים
     */
    static calculateHammingDistance(str1, str2) {
        if (str1.length !== str2.length) {
            throw new Error('Strings must be of the same length');
        }
        
        let distance = 0;
        for (let i = 0; i < str1.length; i++) {
            if (str1[i] !== str2[i]) {
                distance++;
            }
        }
        return distance;
    }
    
    /**
     * חישוב אחוז דמיון בין שתי מחרוזות בינאריות
     * @param {string} str1 - מחרוזת בינארית ראשונה
     * @param {string} str2 - מחרוזת בינארית שנייה
     * @returns {number} אחוז הדמיון (0-100)
     */
    static calculateSimilarityPercentage(str1, str2) {
        const distance = ImageUtils.calculateHammingDistance(str1, str2);
        const totalBits = str1.length;
        return 100 - (distance / totalBits * 100);
    }
    
    /**
     * חישוב מרחק אוקלידי בין שני וקטורים
     * משמש להשוואת היסטוגרמות צבעים
     * @param {number[]} vector1 - וקטור ראשון
     * @param {number[]} vector2 - וקטור שני
     * @returns {number} המרחק האוקלידי
     */
    static calculateEuclideanDistance(vector1, vector2) {
        if (vector1.length !== vector2.length) {
            throw new Error('Vectors must be of the same length');
        }
        
        let sum = 0;
        for (let i = 0; i < vector1.length; i++) {
            const diff = vector1[i] - vector2[i];
            sum += diff * diff;
        }
        
        return Math.sqrt(sum);
    }
    
    /**
     * השוואת שתי תמונות וחישוב אחוז הדמיון
     * @param {File|Blob} image1 - תמונה ראשונה
     * @param {File|Blob} image2 - תמונה שנייה
     * @returns {Promise<Object>} תוצאות ההשוואה
     */
    static async compareImages(image1, image2) {
        try {
            // חישוב חתימות
            const [signature1, signature2, histogram1, histogram2] = await Promise.all([
                ImageUtils.calculateImageSignature(image1),
                ImageUtils.calculateImageSignature(image2),
                ImageUtils.calculateColorHistogram(image1),
                ImageUtils.calculateColorHistogram(image2)
            ]);
            
            // חישוב מדדי דמיון
            const signatureSimilarity = ImageUtils.calculateSimilarityPercentage(signature1, signature2);
            const histogramDistance = ImageUtils.calculateEuclideanDistance(histogram1, histogram2);
            const histogramSimilarity = 100 * (1 - Math.min(histogramDistance, 1));
            
            // שקלול התוצאות - 70% משקל לחתימה הפרספטואלית ו-30% להיסטוגרמת הצבעים
            const weightedSimilarity = 0.7 * signatureSimilarity + 0.3 * histogramSimilarity;
            
            return {
                signatureSimilarity,
                histogramSimilarity,
                weightedSimilarity
            };
        } catch (error) {
            throw error;
        }
    }
}

window.ImageUtils = ImageUtils;
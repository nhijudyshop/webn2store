// pages/product/utils/image-utils.js

/**
 * Converts an image element's source to a Base64 string.
 * Handles both data URLs and external image URLs.
 * @param {HTMLImageElement} imgElement - The image DOM element.
 * @returns {Promise<string|null>} Base64 string (without prefix) or null if no image/error.
 */
export async function getImageAsBase64(imgElement) {
    if (!imgElement || !imgElement.src) {
        return null;
    }
    if (imgElement.src.startsWith('data:image')) {
        return imgElement.src.split(',')[1];
    }
    try {
        const response = await fetch(imgElement.src);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to base64:", error);
        window.showNotification("Không thể chuyển đổi hình ảnh. Vui lòng thử lại.", "error");
        return null;
    }
}
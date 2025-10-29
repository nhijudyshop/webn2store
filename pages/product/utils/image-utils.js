/**
 * Convert an <img> element to base64 string (without data:image prefix).
 * Returns null if no image available.
 */
export async function getImageAsBase64(imgElement) {
  if (!imgElement || !imgElement.src) {
    return null;
  }
  if (imgElement.src.startsWith('data:image')) {
    return imgElement.src.split(',')[1];
  }
  const response = await fetch(imgElement.src);
  if (!response.ok) throw new Error('Network response was not ok.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
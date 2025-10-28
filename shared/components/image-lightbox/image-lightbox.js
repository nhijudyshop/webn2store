// shared/components/image-lightbox/image-lightbox.js

let lightboxOverlay = null;
let lightboxImage = null;
let hideTimeout = null;
let mouseMoveListener = null; // To store the mousemove handler
let initialMouseX = 0;
let initialMouseY = 0;
const distanceThreshold = 20; // Pixels - Ngưỡng di chuyển chuột để ẩn lightbox (Đã thay đổi từ 10px lên 20px)

/**
 * Initializes the image lightbox functionality.
 * Attaches mouseenter/mouseleave listeners to all relevant image elements.
 */
export function initImageLightbox() {
    // Create lightbox elements once
    if (!lightboxOverlay) {
        lightboxOverlay = document.createElement('div');
        lightboxOverlay.className = 'lightbox-overlay';
        lightboxOverlay.addEventListener('click', hideLightbox); // Hide on click anywhere on overlay
        
        // Add mouseenter/mouseleave to the overlay itself to handle delayed hide
        lightboxOverlay.addEventListener('mouseenter', cancelHide); // Cancel hide if mouse enters overlay
        lightboxOverlay.addEventListener('mouseleave', delayedHideLightbox); // Delayed hide if mouse leaves overlay

        lightboxImage = document.createElement('img');
        lightboxImage.className = 'lightbox-image';
        lightboxOverlay.appendChild(lightboxImage);

        document.body.appendChild(lightboxOverlay);
    }

    // Select all image elements that should trigger the lightbox
    const images = document.querySelectorAll(
        '.image-dropzone img, ' + // Images in modals (create order, create product)
        '.invoice-image, ' +      // Invoice images in orders table
        '.price-image, ' +        // Price images in orders table
        '.product-info-image, ' + // Product info image in inventory
        '.product-image'          // Product variant images in inventory
    );

    images.forEach(img => {
        // Ensure listeners are not added multiple times
        if (!img.dataset.lightboxListenerAdded) {
            img.addEventListener('mouseenter', showLightbox);
            // REMOVED: img.addEventListener('mouseleave', delayedHideLightbox); // Loại bỏ sự kiện này khỏi ảnh gốc
            img.dataset.lightboxListenerAdded = 'true';
        }
    });

    // Also handle image placeholders that might become images
    const placeholders = document.querySelectorAll(
        '.image-dropzone.image-placeholder, ' +
        '.image-placeholder.invoice-image, ' +
        '.image-placeholder.price-image, ' +
        '.product-info-image.image-placeholder, ' +
        '.product-image.image-placeholder'
    );

    placeholders.forEach(placeholder => {
        if (!placeholder.dataset.lightboxListenerAdded) {
            // For placeholders, we only show if they actually contain an img child
            placeholder.addEventListener('mouseenter', (event) => {
                const actualImg = event.currentTarget.querySelector('img');
                if (actualImg && actualImg.src) {
                    showLightbox(event);
                }
            });
            // REMOVED: placeholder.addEventListener('mouseleave', delayedHideLightbox); // Loại bỏ sự kiện này khỏi placeholder
            placeholder.dataset.lightboxListenerAdded = 'true';
        }
    });
}

/**
 * Shows the lightbox with the hovered image.
 * @param {Event} event - The mouseenter event.
 */
function showLightbox(event) {
    cancelHide(); // Clear any pending hide timeouts

    const target = event.currentTarget;
    let imgSrc = '';

    if (target.tagName === 'IMG') {
        imgSrc = target.src;
    } else if (target.classList.contains('image-placeholder')) {
        const imgChild = target.querySelector('img');
        if (imgChild && imgChild.src) {
            imgSrc = imgChild.src;
        } else {
            return;
        }
    } else {
        return;
    }

    if (imgSrc) {
        lightboxImage.src = imgSrc;
        lightboxOverlay.classList.add('show');

        // Record initial mouse position when lightbox is shown
        initialMouseX = event.clientX;
        initialMouseY = event.clientY;

        // Add mousemove listener to the document to track any movement
        if (!mouseMoveListener) { // Prevent adding multiple listeners
            mouseMoveListener = handleMouseMove;
            document.addEventListener('mousemove', mouseMoveListener);
        }
    }
}

/**
 * Handles mouse movement to determine if lightbox should be hidden.
 * @param {MouseEvent} event - The mousemove event.
 */
function handleMouseMove(event) {
    // Only track movement if the lightbox is actually visible
    if (!lightboxOverlay.classList.contains('show')) {
        hideLightbox(); // Should not happen, but as a safeguard
        return;
    }

    const currentX = event.clientX;
    const currentY = event.clientY;

    const distance = Math.sqrt(
        Math.pow(currentX - initialMouseX, 2) + Math.pow(currentY - initialMouseY, 2)
    );

    if (distance > distanceThreshold) {
        hideLightbox();
    }
}

/**
 * Hides the lightbox.
 */
function hideLightbox() {
    lightboxOverlay.classList.remove('show');
    lightboxImage.src = ''; // Clear image source
    cancelHide(); // Clear any pending delayed hide

    // Remove the mousemove listener from the document
    if (mouseMoveListener) {
        document.removeEventListener('mousemove', mouseMoveListener);
        mouseMoveListener = null;
    }
}

/**
 * Delays hiding the lightbox.
 */
function delayedHideLightbox() {
    cancelHide(); // Clear any existing hide timeout
    hideTimeout = setTimeout(hideLightbox, 200); // Hide after 200ms
}

/**
 * Cancels any pending hide lightbox timeout.
 */
function cancelHide() {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
}

// Auto-initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initImageLightbox);

// Re-initialize after dynamic content changes (e.g., adding new rows to tables)
window.addEventListener('load', initImageLightbox);
window.addEventListener('resize', initImageLightbox);
// shared/components/image-lightbox/image-lightbox.js

let lightboxOverlay = null;
let lightboxImage = null;

/**
 * Initializes the image lightbox functionality.
 * Attaches mouseover/mouseout listeners to all relevant image elements.
 */
export function initImageLightbox() {
    // Create lightbox elements once
    if (!lightboxOverlay) {
        lightboxOverlay = document.createElement('div');
        lightboxOverlay.className = 'lightbox-overlay';
        lightboxOverlay.addEventListener('click', hideLightbox); // Hide on click anywhere on overlay

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
            img.addEventListener('mouseover', showLightbox);
            img.addEventListener('mouseout', hideLightbox);
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
            placeholder.addEventListener('mouseover', (event) => {
                const actualImg = event.currentTarget.querySelector('img');
                if (actualImg && actualImg.src) {
                    showLightbox(event);
                }
            });
            placeholder.addEventListener('mouseout', hideLightbox);
            placeholder.dataset.lightboxListenerAdded = 'true';
        }
    });
}

/**
 * Shows the lightbox with the hovered image.
 * @param {Event} event - The mouseover event.
 */
function showLightbox(event) {
    const target = event.currentTarget;
    let imgSrc = '';

    if (target.tagName === 'IMG') {
        imgSrc = target.src;
    } else if (target.classList.contains('image-placeholder')) {
        // If it's a placeholder div, check for an actual image inside
        const imgChild = target.querySelector('img');
        if (imgChild && imgChild.src) {
            imgSrc = imgChild.src;
        } else {
            // If no image inside, don't show lightbox
            return;
        }
    } else {
        return; // Not an image or a recognized placeholder
    }

    if (imgSrc) {
        lightboxImage.src = imgSrc;
        lightboxOverlay.classList.add('show');
    }
}

/**
 * Hides the lightbox.
 */
function hideLightbox() {
    lightboxOverlay.classList.remove('show');
    lightboxImage.src = ''; // Clear image source
}

// Auto-initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initImageLightbox);

// Re-initialize after dynamic content changes (e.g., adding new rows to tables)
// This is a simple approach; a more robust solution might involve MutationObserver
window.addEventListener('load', initImageLightbox); // For initial load
window.addEventListener('resize', initImageLightbox); // In case elements are re-rendered on resize
// You might need to call initImageLightbox() explicitly after adding new dynamic content
// e.g., after addProductRow(), displayOrders(), displayVariants()
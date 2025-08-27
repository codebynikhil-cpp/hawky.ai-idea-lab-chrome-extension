let isSelecting = false;
let startX, startY, endX, endY;
let selectionBox, overlay, imageElement, bgImageUrl;

function createSelectionBox() {
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = `
    position: fixed; border: 2px dashed red; background-color: rgba(255, 0, 0, 0.1);
    pointer-events: none; display: none; z-index: 1002;
  `;
  document.body.appendChild(selectionBox);
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); z-index: 1000; cursor: crosshair;
  `;
  document.body.appendChild(overlay);
}

function updateSelectionBox() {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  selectionBox.style.cssText += `
    left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; display: block;
  `;
}

function startSelection(imageUrl) {
  bgImageUrl = imageUrl;
  imageElement = document.createElement('img');
  imageElement.src = imageUrl;
  imageElement.style.cssText = `
  
    position: absolute; top: 0; left: 0; z-index: 999;
    max-width: 100%; max-height: 100%; object-fit: contain;
  `;
  document.body.appendChild(imageElement);

  imageElement.onload = function () {
    const scaleX = window.innerWidth / imageElement.naturalWidth;
    const scaleY = window.innerHeight / imageElement.naturalHeight;
    const scale = Math.min(scaleX, scaleY);

    imageElement.style.width = `${imageElement.naturalWidth * scale}px`;
    imageElement.style.height = `${imageElement.naturalHeight * scale}px`;
    imageElement.style.left = `${(window.innerWidth - imageElement.width) / 2}px`;
    imageElement.style.top = `${(window.innerHeight - imageElement.height) / 2}px`;

    createOverlay();
    createSelectionBox();

    overlay.addEventListener('mousedown', onMouseDown);

    // Hide the entire webpage content except the image and overlay
    document.body.style.overflow = 'hidden';
  };
}

function onMouseDown(e) {
  if (isSelecting) return;
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
  if (isSelecting) {
    endX = e.clientX;
    endY = e.clientY;
    updateSelectionBox();
  }
}

function onMouseUp(e) {
  if (!isSelecting) return;
  isSelecting = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'default';

  if (selectionBox) selectionBox.style.display = 'none';
  if (overlay) overlay.style.display = 'none';

  const imageRect = imageElement.getBoundingClientRect();

  const captureArea = {
    x: Math.min(startX, endX) - imageRect.left,
    y: Math.min(startY, endY) - imageRect.top,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  };

  const scaleX = imageElement.naturalWidth / imageElement.width;
  const scaleY = imageElement.naturalHeight / imageElement.height;

  captureArea.x *= scaleX;
  captureArea.y *= scaleY;
  captureArea.width *= scaleX;
  captureArea.height *= scaleY;

  chrome.runtime.sendMessage({ action: "captureArea", area: captureArea, image: bgImageUrl });

  [selectionBox, imageElement, overlay].forEach(el => el && document.body.removeChild(el));
  document.body.style.overflow = '';
}

const sendToFeedScreenshot = (caption, imageDataUrl) => {
  const domain = new URL(window.location.href).hostname;

  chrome.runtime.sendMessage({
    action: 'addToFeed',
    caption,
    imageDataUrl,
    time: new Date().toISOString(),
    domainName: domain
  }, response => {
    if (response.status === "success") {
      console.log("Item added to feed successfully");
    }
  });
};


function resetSelection() {
  if (selectionBox) selectionBox.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  document.body.style.cursor = 'default';
  isSelecting = false;

  [selectionBox, imageElement, overlay].forEach(el => el && document.body.removeChild(el));
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isSelecting) {
    isSelecting = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'crosshair';
    if (selectionBox) selectionBox.style.display = 'none';
  } else if (e.key === 'Escape' && !isSelecting) {
    resetSelection();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startAreaSelection") {
    startSelection(request.image);
    sendResponse({ status: "Area selection started" });
  } else if (request.action === "processCaptureArea") {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = request.area.width;
      canvas.height = request.area.height;
      ctx.drawImage(img, request.area.x, request.area.y, request.area.width, request.area.height, 0, 0, request.area.width, request.area.height);

      canvas.toBlob((blob) => {
        if (blob) {
          try {
            const url = URL.createObjectURL(blob);
            sendToFeedScreenshot('',url);
          } catch (error) {
            console.error("Error creating object URL:", error);
            const dataUrl = canvas.toDataURL('image/png');
            sendToFeedScreenshot('',dataUrl);
          }
        } else {
          console.error("Failed to create blob from canvas");
          const dataUrl = canvas.toDataURL('image/png');
          sendToFeedScreenshot('',dataUrl);
        }
      }, 'image/png');
    };
    img.onerror = (error) => {
      console.error("Error loading image:", error);
      sendResponse({ status: "error", message: "Failed to load image" });
    };
    img.src = request.image;
  }
  return true;
});
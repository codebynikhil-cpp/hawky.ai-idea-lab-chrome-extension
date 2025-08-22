/**
 * Google Ads content script for Hawky.ai Chrome Extension
 * Detects and captures ad creatives in Google Ads interface
 */

(function() {
  console.log('Hawky.ai Google Ads content script loaded');
  
  // Set up mutation observer to detect dynamically loaded content
  const setupMutationObserver = () => {
    const observer = new MutationObserver(debounce(() => {
      detectGoogleAds();
    }, 500));
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  // Detect Google Ads creatives
  const detectGoogleAds = () => {
    // Google Ads selectors for different types of ad creatives
    const adSelectors = [
      // Image ads
      'div[data-type="AdAsset"], div[data-type="ImageAsset"]',
      // Responsive display ads
      'div.responsive-ad-asset-container',
      // Video ads
      'div.video-player-container',
      // Ad preview containers
      'div.preview-container, div.ad-preview-container',
      // Ad groups
      'div.ad-group-preview'
    ];
    
    adSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(adElement => {
          if (!adElement.hasAttribute('hawky-processed')) {
            processAdElement(adElement);
          }
        });
      } catch (error) {
        console.error('Error processing Google Ads selector:', selector, error);
      }
    });
  };
  
  // Process each ad element
  const processAdElement = (adElement) => {
    if (!adElement || adElement.hasAttribute('hawky-processed')) return;
    
    // Mark as processed to avoid duplicate processing
    adElement.setAttribute('hawky-processed', 'true');
    
    // Add relative positioning for button placement
    if (window.getComputedStyle(adElement).position === 'static') {
      adElement.style.position = 'relative';
    }
    
    // Create and add Hawky button
    const hawkyButton = createHawkyButton();
    adElement.appendChild(hawkyButton);
    
    // Position the button
    hawkyButton.style.position = 'absolute';
    hawkyButton.style.top = '8px';
    hawkyButton.style.right = '8px';
    hawkyButton.style.zIndex = '9999';
    
    // Add click event to capture the ad
    hawkyButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      captureGoogleAd(adElement);
    });
  };
  
  // Create Hawky button
  const createHawkyButton = () => {
    const button = document.createElement('button');
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/icon48.png');
    img.style.width = '20px';
    img.style.height = '20px';
    img.className = 'hawky-icon';
    button.appendChild(img);
    button.style.cssText = `
      background-color: transparent;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;
    button.classList.add('hawky-button');
    return button;
  };
  
  // Capture Google Ad content
  const captureGoogleAd = (adElement) => {
    try {
      // Extract ad data
      const adData = extractAdData(adElement);
      
      // Send data to background script with proper error handling
      chrome.runtime.sendMessage({
        action: 'saveCreative',
        platform: 'googleads',
        creativeData: adData
      }, response => {
        // Check for runtime errors first
        if (chrome.runtime.lastError) {
          console.error('Google Ads messaging error:', chrome.runtime.lastError.message);
          showCaptureConfirmation(adElement, false);
          return;
        }
        
        if (response && response.status === 'success') {
          console.log('Google Ads creative captured successfully');
          showCaptureConfirmation(adElement, true);
        } else {
          console.error('Failed to capture Google Ads creative:', response);
          showCaptureConfirmation(adElement, false);
        }
      });
    } catch (error) {
      console.error('Error capturing Google ad:', error);
    }
  };
  
  // Extract ad data from the ad element
  const extractAdData = (adElement) => {
    // Campaign/Ad group name
    const campaignElement = findNearestText(adElement, 'campaign', 'ad group');
    const campaign = campaignElement || 'Unknown Campaign';
    
    // Ad copy/text
    const copyElements = adElement.querySelectorAll('div.headline, div.description, p, h3, h4');
    let adCopy = '';
    copyElements.forEach(element => {
      if (element.textContent.trim()) {
        adCopy += element.textContent.trim() + '\n';
      }
    });
    
    // Image URLs
    const images = [];
    adElement.querySelectorAll('img').forEach(img => {
      if (img.src && img.width > 50 && !img.src.includes('icon')) {
        images.push(img.src);
      }
    });
    
    // Video URL if present
    let videoUrl = null;
    const videoElement = adElement.querySelector('video');
    if (videoElement && videoElement.src) {
      videoUrl = videoElement.src;
    }
    
    return {
      campaign,
      adCopy: adCopy.trim(),
      images,
      videoUrl,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'Google Ads'
    };
  };
  
  // Helper function to find nearest text containing specific keywords
  const findNearestText = (element, ...keywords) => {
    // Look up to 5 parent levels
    let current = element;
    for (let i = 0; i < 5; i++) {
      if (!current) break;
      
      // Check siblings
      const siblings = [...current.parentElement?.children || []];
      for (const sibling of siblings) {
        if (sibling === current) continue;
        
        const text = sibling.textContent.toLowerCase();
        if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
          return sibling.textContent.trim();
        }
      }
      
      current = current.parentElement;
    }
    
    return null;
  };
  
  // Show a brief confirmation message
const showCaptureConfirmation = (adElement, success = true) => {
  const confirmationEl = document.createElement('div');
  confirmationEl.className = 'hawky-capture-confirmation';
  confirmationEl.textContent = success ? 'Ad captured by Hawky.ai!' : 'Capture failed';
  confirmationEl.style.cssText = `
    position: absolute;
    top: 40px;
    right: 10px;
    background-color: ${success ? '#4CAF50' : '#F44336'};
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    animation: fadeOut 2s forwards 1s;
  `;
  
  // Add animation style
  if (!document.getElementById('hawky-animations')) {
    const style = document.createElement('style');
    style.id = 'hawky-animations';
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; visibility: hidden; }
      }
    `;
    document.head.appendChild(style);
  }
  
  adElement.style.position = 'relative';
  adElement.appendChild(confirmationEl);
  
  // Remove after animation completes
  setTimeout(() => {
    confirmationEl.remove();
  }, 3000);
};
  
  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      detectGoogleAds();
      setupMutationObserver();
    });
  } else {
    detectGoogleAds();
    setupMutationObserver();
  }
})();
/**
 * Meta Ads Library content script for Hawky.ai Chrome Extension
 * Detects and captures ad creatives from Facebook Ads Library
 */

(function() {
  console.log('Hawky.ai Meta Ads Library content script loaded');
  
  // Set up mutation observer to detect dynamically loaded content
  const setupMutationObserver = () => {
    const observer = new MutationObserver(debounce(() => {
      detectMetaAds();
    }, 500));
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  // Detect Meta Ads Library creatives
  const detectMetaAds = () => {
    // Meta Ads Library selectors
    const adSelectors = [
      // Ad containers in Ads Library
      'div[data-testid="ad_card"]',
      'div[data-testid="ad_card_container"]',
      'div.x1n2onr6', // Common class for ad containers
      'div.x1lliihq' // Another common class for ad containers
    ];
    
    adSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(adElement => {
          if (!adElement.hasAttribute('hawky-processed')) {
            processAdElement(adElement);
          }
        });
      } catch (error) {
        console.error('Error processing Meta Ads Library selector:', selector, error);
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
      captureMetaAd(adElement);
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
  
  // Capture Meta Ad content
  const captureMetaAd = (adElement) => {
    try {
      // Extract ad data
      const adData = extractAdData(adElement);
      
      // Send data to background script with proper error handling
      chrome.runtime.sendMessage({
        action: 'saveCreative',
        platform: 'metalibrary',
        creativeData: adData
      }, response => {
        // Check for runtime errors first
        if (chrome.runtime.lastError) {
          console.error('Meta Ads Library messaging error:', chrome.runtime.lastError.message);
          showCaptureConfirmation(adElement, false);
          return;
        }
        
        if (response && response.status === 'success') {
          console.log('Meta Ads Library creative captured successfully');
          showCaptureConfirmation(adElement, true);
        } else {
          console.error('Failed to capture Meta Ads Library creative:', response);
          showCaptureConfirmation(adElement, false);
        }
      });
    } catch (error) {
      console.error('Error capturing Meta ad:', error);
    }
  };
  
  // Extract ad data from the ad element
  const extractAdData = (adElement) => {
    // Advertiser name
    const advertiserElement = adElement.querySelector('a[data-testid="ad_library_advertiser_link"], span.x193iq5w');
    const advertiser = advertiserElement ? advertiserElement.textContent.trim() : 'Unknown Advertiser';
    
    // Ad copy/text
    const copyElements = adElement.querySelectorAll('div[data-testid="ad_primary_text"], div[data-testid="ad_secondary_text"], div[data-testid="ad_title"]');
    let adCopy = '';
    copyElements.forEach(element => {
      if (element.textContent.trim()) {
        adCopy += element.textContent.trim() + '\n';
      }
    });
    
    // Image URLs
    const images = [];
    adElement.querySelectorAll('img').forEach(img => {
      if (img.src && img.width > 100 && !img.src.includes('profile') && !img.src.includes('icon')) {
        images.push(img.src);
      }
    });
    
    // Video URL if present
    let videoUrl = null;
    const videoElement = adElement.querySelector('video');
    if (videoElement && videoElement.src) {
      videoUrl = videoElement.src;
    }
    
    // Ad ID
    const adIdElement = adElement.querySelector('div[data-testid="ad_library_ad_id"]');
    const adId = adIdElement ? adIdElement.textContent.replace('ID:', '').trim() : '';
    
    // Running status
    const statusElement = adElement.querySelector('span[data-testid="ad_library_ad_status"]');
    const status = statusElement ? statusElement.textContent.trim() : '';
    
    return {
      advertiser,
      adCopy: adCopy.trim(),
      images,
      videoUrl,
      adId,
      status,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'Meta Ads Library'
    };
  };
  
  // Show a brief confirmation message
  const showCaptureConfirmation = (adElement, success = true) => {
  const confirmation = document.createElement('div');
  confirmation.textContent = success ? 'Ad captured by Hawky.ai!' : 'Capture failed';
  confirmation.style.cssText = `
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
  adElement.appendChild(confirmation);
  
  // Remove after animation completes
  setTimeout(() => {
    confirmation.remove();
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
      detectMetaAds();
      setupMutationObserver();
    });
  } else {
    detectMetaAds();
    setupMutationObserver();
  }
})();
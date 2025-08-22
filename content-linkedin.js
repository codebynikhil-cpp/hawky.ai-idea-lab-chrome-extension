/**
 * LinkedIn Ads content script for Hawky.ai Chrome Extension
 * Detects and captures ad creatives on LinkedIn
 */

// Main initialization function
(function() {
  console.log('Hawky.ai LinkedIn content script loaded');
  
  // Observer to detect new ads as they load
  const setupMutationObserver = () => {
    const observer = new MutationObserver(debounce(() => {
      detectLinkedInAds();
    }, 500));
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  // Detect LinkedIn ads on the page
  const detectLinkedInAds = () => {
    // LinkedIn sponsored content selectors
    const adSelectors = [
      // Feed sponsored posts
      'div[data-urn*="sponsoredContentV2"]',
      // Sponsored InMail
      'div.msg-conversation-card__sponsored-label',
      // Right rail ads
      'div.feed-shared-actor__description span:contains("Promoted")',
      'div.feed-shared-actor__sub-description span:contains("Promoted")',
      // Job ads
      'li.job-card-container--sponsored'
    ];
    
    // Find all ad elements
    adSelectors.forEach(selector => {
      try {
        // For contains selector, we need a different approach
        if (selector.includes(':contains')) {
          const baseSelector = selector.split(':contains')[0];
          const searchText = selector.match(/"([^"]+)"/)[1];
          
          document.querySelectorAll(baseSelector).forEach(element => {
            if (element.textContent.includes(searchText) && !element.hasAttribute('hawky-processed')) {
              processAdElement(element.closest('div.feed-shared-update-v2'));
            }
          });
        } else {
          document.querySelectorAll(selector).forEach(adElement => {
            if (!adElement.hasAttribute('hawky-processed')) {
              processAdElement(adElement);
            }
          });
        }
      } catch (error) {
        console.error('Error processing LinkedIn ad selector:', selector, error);
      }
    });
  };
  
  // Process each ad element
  const processAdElement = (adElement) => {
    if (!adElement || adElement.hasAttribute('hawky-processed')) return;
    
    // Mark as processed to avoid duplicate processing
    adElement.setAttribute('hawky-processed', 'true');
    
    // Add relative positioning to the ad container for proper button placement
    if (window.getComputedStyle(adElement).position === 'static') {
      adElement.style.position = 'relative';
    }
    
    // Create and add the Hawky button
    const hawkyButton = createHawkyButton();
    adElement.appendChild(hawkyButton);
    
    // Position the button in the top-right corner of the ad
    hawkyButton.style.position = 'absolute';
    hawkyButton.style.top = '8px';
    hawkyButton.style.right = '8px';
    hawkyButton.style.zIndex = '9999';
    
    // Add click event to capture the ad
    hawkyButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      captureLinkedInAd(adElement);
    });
  };
  
  // Create the Hawky button
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
  
  // Capture LinkedIn ad content
  const captureLinkedInAd = (adElement) => {
    try {
      // Extract ad data
      const adData = extractAdData(adElement);
      
      // Send data to background script with proper error handling
      chrome.runtime.sendMessage({
        action: 'saveCreative',
        platform: 'linkedin',
        creativeData: adData
      }, response => {
        // Check for runtime errors first
        if (chrome.runtime.lastError) {
          console.error('LinkedIn messaging error:', chrome.runtime.lastError.message);
          // Still show confirmation to user even if background script didn't respond
          showCaptureConfirmation(adElement, false);
          return;
        }
        
        if (response && response.status === 'success') {
          console.log('LinkedIn ad captured successfully');
          showCaptureConfirmation(adElement, true);
        } else {
          console.error('Failed to capture LinkedIn ad:', response);
          showCaptureConfirmation(adElement, false);
        }
      });
    } catch (error) {
      console.error('Error capturing LinkedIn ad:', error);
    }
  };
  
  // Extract ad data from the ad element
  const extractAdData = (adElement) => {
    // Company/advertiser name
    const advertiserElement = adElement.querySelector('.feed-shared-actor__name, .feed-shared-actor__title');
    const advertiser = advertiserElement ? advertiserElement.textContent.trim() : 'Unknown Advertiser';
    
    // Ad copy/text
    const copyElements = adElement.querySelectorAll('.feed-shared-text, .feed-shared-update-v2__description');
    let adCopy = '';
    copyElements.forEach(element => {
      adCopy += element.textContent.trim() + '\n';
    });
    
    // Image URLs
    const images = [];
    adElement.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.includes('profile') && !img.src.includes('icon') && img.width > 100) {
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
      advertiser,
      adCopy: adCopy.trim(),
      images,
      videoUrl,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'LinkedIn'
    };
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
      detectLinkedInAds();
      setupMutationObserver();
    });
  } else {
    detectLinkedInAds();
    setupMutationObserver();
  }
})();
/**
 * Google Ads content script for Hawky.ai Chrome Extension
 * Detects and captures ad creatives in Google Ads interface
 */

(function() {
  console.log('Hawky.ai Google Ads content script loaded');
  
  let isInitialized = false;
  let hoverTimer;
  
  // Listen for user hover over potential ad content
  document.addEventListener('mouseover', (event) => {
    if (isInitialized) return;
    
    const target = event.target;
    if (isPotentialAdElement(target)) {
      // Start hover timer
      hoverTimer = setTimeout(() => {
        console.log('User interacted with sponsored content - initializing Hawky');
        initializeHawky();
        isInitialized = true;
      }, 500); // Wait 500ms before initializing
    }
  });

  document.addEventListener('mouseout', () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
  });

  function isPotentialAdElement(element) {
    const adIndicators = [
      '[aria-label*="Sponsored"]',
      '[aria-label*="Advertisement"]',
      'div.ads-ad',
      '.ytp-ad-overlay-container',
      'iframe[id^="google_ads_iframe"]'
    ];
    
    return adIndicators.some(selector => 
      element.matches(selector) || element.closest(selector)
    );
  }

  // Set up mutation observer to detect dynamically loaded content
  const setupMutationObserver = () => {
    const targetNodes = {
      search: document.querySelector('#search'), // Google search results container
      youtube: document.querySelector('#player'), // YouTube player container
      display: document.body // Fallback for display ads
    };

    const observer = new MutationObserver(debounce((mutations) => {
      const hostname = window.location.hostname;
      
      if (hostname.includes('google') && hostname.includes('search')) {
        detectGoogleAds('search');
      } else if (hostname.includes('youtube.com')) {
        detectGoogleAds('youtube');
      } else {
        detectGoogleAds('display');
      }
    }, 500));

    // Observe appropriate container based on page type
    const hostname = window.location.hostname;
    const targetNode = hostname.includes('google') && hostname.includes('search') 
      ? targetNodes.search 
      : hostname.includes('youtube.com')
        ? targetNodes.youtube
        : targetNodes.display;

    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
    }
  };
  
  // Detect Google Ads creatives
  const detectGoogleAds = () => {
    // Google Ads selectors for different types of ad creatives
    const adSelectors = {
      search: [
        // Google Search Ads
        'div.ads-ad', 
        'div[data-text-ad]',
        'div.commercial-unit-desktop-top',
        'div[data-vars-google-ads-id]',
        // Additional search ad selectors
        'div.pla-unit', // Shopping ads
        'div[aria-label*="Sponsored"]',
        '.ads-creative',
        '.ad_cclk' // Ad click container
      ],
      display: [
        // Google Display Ads
        'iframe[id^="google_ads_iframe"]',
        'div[data-type="AdAsset"]',
        'div[data-type="ImageAsset"]',
        'div.responsive-ad-asset-container',
        'div.ad-preview-container',
        // Additional display ad selectors
        'ins.adsbygoogle',
        'div[data-ad-client]',
        'div[data-admrloc]'
      ],
      youtube: [
        // YouTube Ads
        '.ytp-ad-player-overlay',
        '.ytp-ad-overlay-container',
        'div[id^="player_ads"]',
        '.video-ads.ytp-ad-module',
        // Additional YouTube ad selectors
        '.ytp-ad-text',
        '.ytp-ad-preview-container',
        '.ytp-ad-message-container'
      ]
    };

    // Detect platform
    const hostname = window.location.hostname;
    if (hostname.includes('google') && hostname.includes('search')) {
      // Handle Search Ads
      adSelectors.search.forEach(processSelector);
    } else if (hostname.includes('youtube.com')) {
      // Handle YouTube Ads
      adSelectors.youtube.forEach(processSelector);
    } else {
      // Handle Display Ads (on any website)
      adSelectors.display.forEach(processSelector);
    }
  };

  const processSelector = (selector) => {
    try {
      document.querySelectorAll(selector).forEach(adElement => {
        if (!adElement.hasAttribute('hawky-processed')) {
          processAdElement(adElement);
        }
      });
    } catch (error) {
      console.error('Error processing selector:', selector, error);
    }
  };
  
  // Process each ad element
  const processAdElement = (adElement) => {
    if (!adElement || adElement.hasAttribute('hawky-processed')) return;
    
    adElement.setAttribute('hawky-processed', 'true');
    
    // Create button but don't add it yet
    const hawkyButton = createHawkyButton();
    
    // Show button only on hover
    adElement.addEventListener('mouseenter', () => {
      if (!adElement.contains(hawkyButton)) {
        // Position button based on ad type and image location
        positionHawkyButton(hawkyButton, adElement);
        adElement.appendChild(hawkyButton);
        
        // Fade in animation
        hawkyButton.style.opacity = '0';
        requestAnimationFrame(() => {
          hawkyButton.style.opacity = '1';
          hawkyButton.style.transition = 'opacity 0.2s ease-in-out';
        });
      }
    });

    adElement.addEventListener('mouseleave', (event) => {
      // Only remove if not hovering over the button itself
      if (!event.relatedTarget?.closest('.hawky-button')) {
        hawkyButton.remove();
      }
    });
    
    hawkyButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      captureGoogleAd(adElement);
    });
  };

  function positionHawkyButton(button, adElement) {
    const hostname = window.location.hostname;
    const imageElement = findMainImage(adElement);
    
    button.style.position = 'absolute';
    button.style.zIndex = '9999';

    if (imageElement) {
      // Position relative to the image
      const rect = imageElement.getBoundingClientRect();
      button.style.top = '8px';
      button.style.right = '8px';
    } else {
      // Default positioning based on ad type
      if (hostname.includes('google') && hostname.includes('search')) {
        button.style.top = '8px';
        button.style.right = '8px';
      } else {
        button.style.bottom = '8px';
        button.style.right = '8px';
      }
    }
  }
  
  // Create Hawky button
  const createHawkyButton = () => {
    const button = document.createElement('button');
    const img = document.createElement('img');
    
    // Use the correct path to your extension icon
    img.src = chrome.runtime.getURL('icons/hawky-icon-48.png'); // Update icon path
    
    // Add error handling for icon loading
    img.onerror = () => {
      console.error('Failed to load Hawky icon');
      // Fallback to a text button if icon fails to load
      button.textContent = 'H';
      button.style.fontWeight = 'bold';
      button.style.fontSize = '14px';
    };
    
    img.style.width = '20px';
    img.style.height = '20px';
    img.className = 'hawky-icon';
    button.appendChild(img);
    
    button.style.cssText = `
      background-color: rgba(255, 255, 255, 0.9);
      border: 1px solid #ccc;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;
    
    // Add hover effect
    button.onmouseenter = () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    };
    
    button.onmouseleave = () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    };
    
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
  const extractAdData = async (adElement) => {
    const hostname = window.location.hostname;
    let adType = 'display';
    
    if (hostname.includes('google') && hostname.includes('search')) {
      adType = 'search';
    } else if (hostname.includes('youtube.com')) {
      adType = 'youtube';
    }

    // Common data structure
    const data = {
      adType,
      timestamp: new Date().toISOString(),
      platform: 'Google Ads',
      url: window.location.href,
      headline: '',
      description: '',
      imageUrls: [],
      videoUrl: null,
      clickUrl: '',
      isSkippable: false,
      advertiser: '',
      adFormat: '',
      metadata: {}
    };

    async function getHighestResImage(imgElement) {
      if (!imgElement) return null;
      
      // Check for srcset
      if (imgElement.srcset) {
        const sources = imgElement.srcset.split(',')
          .map(src => {
            const [url, width] = src.trim().split(' ');
            return { url, width: parseInt(width) || 0 };
          })
          .sort((a, b) => b.width - a.width);
        
        if (sources.length) return sources[0].url;
      }
      
      // Check background image
      if (imgElement.tagName === 'DIV') {
        const bgImage = window.getComputedStyle(imgElement)
          .backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
        if (bgImage !== 'none') return bgImage;
      }
      
      // Fallback to src
      return imgElement.src;
    }

    // Extract data based on type...
    try {
      const mainImage = findMainImage(adElement);
      data.imageUrls = mainImage ? [await getHighestResImage(mainImage)] : [];
      
      switch (adType) {
        case 'search':
          const headlineEl = adElement.querySelector('h3, [role="heading"]');
          const descEl = adElement.querySelector('.ads-creative, .ads-description');
          const urlEl = adElement.querySelector('cite');
          const adLabelEl = findNearestText(adElement, 'Sponsored', 'Ad');
          
          data.headline = headlineEl?.textContent?.trim() || '';
          data.description = descEl?.textContent?.trim() || '';
          data.clickUrl = urlEl?.textContent?.trim() || '';
          data.adFormat = 'text';
          data.metadata.adLabel = adLabelEl || 'Sponsored';
          break;

        case 'youtube':
          data.headline = adElement.querySelector('.ytp-ad-text-overlay')?.textContent?.trim() || '';
          data.isSkippable = !!adElement.querySelector('.ytp-ad-skip-button');
          data.videoUrl = document.querySelector('video')?.src || '';
          data.imageUrls = [document.querySelector('.ytp-ad-image')?.src].filter(Boolean);
          data.adFormat = data.videoUrl ? 'video' : 'overlay';
          data.metadata.duration = document.querySelector('video')?.duration;
          data.metadata.skipOffset = adElement.querySelector('.ytp-ad-skip-button-slot')?.getAttribute('data-skip-offset');
          break;

        case 'display':
          if (adElement.tagName === 'IFRAME') {
            try {
              const iframeDoc = adElement.contentDocument || adElement.contentWindow.document;
              data.imageUrls = Array.from(iframeDoc.querySelectorAll('img'))
                .map(img => img.src)
                .filter(src => src && !src.includes('icon'));
              data.clickUrl = iframeDoc.querySelector('a')?.href || '';
              data.adFormat = 'banner';
              data.metadata.size = `${adElement.width}x${adElement.height}`;
            } catch (e) {
              // Fallback for cross-origin iframes
              data.clickUrl = adElement.src || '';
              data.metadata.isCrossOrigin = true;
            }
          } else {
            data.imageUrls = Array.from(adElement.querySelectorAll('img'))
              .map(img => img.src)
              .filter(src => src && !src.includes('icon'));
            data.clickUrl = adElement.querySelector('a')?.href || '';
            data.adFormat = 'banner';
          }
          break;
      }
    } catch (error) {
      console.error('Error extracting ad data:', error);
      // Include error info in metadata
      data.metadata.extractionError = error.message;
    }

    return data;
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

  function findMainImage(adElement) {
    // Possible image selectors in order of priority
    const imageSelectors = [
      'img.product-image', // Shopping ads
      '.ytp-ad-image', // YouTube ad thumbnails
      'img[width][height]', // Display ads with dimensions
      'img:not([width="1"])', // Exclude tracking pixels
      'div[style*="background-image"]', // Background images
      'iframe[id^="google_ads_iframe"]' // Iframe ads
    ];

    for (const selector of imageSelectors) {
      const element = adElement.querySelector(selector);
      if (element) {
        if (element.tagName === 'IFRAME') {
          try {
            const iframeDoc = element.contentDocument || element.contentWindow.document;
            const iframeImage = iframeDoc.querySelector('img');
            if (iframeImage) return iframeImage;
          } catch (e) {
            console.log('Cross-origin iframe, cannot access content');
          }
        } else {
          return element;
        }
      }
    }
    
    return null;
  }
})();
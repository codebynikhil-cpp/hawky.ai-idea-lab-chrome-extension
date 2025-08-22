// Import the route functions
import { getIdeas, checkNetworkStatus } from './route.js';

let isLoggedIn = false;
let userDetails = null;
let lastDownloadTime = 0;
const DOWNLOAD_COOLDOWN = 1000;
let feedItems = [];

function getCookies(domain, names) {
  return Promise.all(names.map(name =>
    new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain, name }, (cookies) => {
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(cookies);
      });
    })
  ));
}

// Network status monitoring - using Chrome APIs instead of window events
let isOnline = true;

// Check network status using navigator.onLine initially
chrome.runtime.onStartup.addListener(() => {
  isOnline = navigator.onLine;
});

// Use periodic checks instead of event listeners
function checkConnectionStatus() {
  // Use navigator.onLine instead of the imported function to avoid naming conflicts
  const networkStatus = navigator.onLine;
  if (networkStatus !== isOnline) {
    isOnline = networkStatus;
    chrome.runtime.sendMessage({ 
      action: "networkStatusChanged", 
      isOnline 
    });
    console.log(isOnline ? "Network connection detected" : "Network connection lost");
  }
}

// Check network status periodically
setInterval(checkConnectionStatus, 30000);

// Function to get all ideas with proper error handling
async function getAllIdeas() {
  try {
    // Use navigator.onLine directly
    if (!navigator.onLine) {
      console.warn("Cannot fetch ideas: Device is offline");
      return [];
    }
    
    const ideas = await getIdeas();
    return ideas || [];
  } catch (error) {
    console.error("Error fetching ideas:", error);
    return [];
  }
}

function checkLoginStatus() {
  console.log("Checking login status...");
  // Check network status before making requests
  if (!navigator.onLine) {
    console.warn("Cannot check login: Device is offline");
    return;
  }
  
  getAllIdeas().then(ideas => {
    if (ideas && ideas.length > 0) {
      console.log(`Successfully fetched ${ideas.length} ideas`);
      feedItems = ideas;
    }
  });
  
  getCookies("www.hawky.xyz", ["__Secure-next-auth.session-token", "session"])
    .then(results => {
      const cookies = [].concat(...results);
      const newLoginStatus = cookies.length > 0;
      if (newLoginStatus !== isLoggedIn) {
        isLoggedIn = newLoginStatus;
        userDetails = isLoggedIn ? {} : null;
        chrome.runtime.sendMessage({ action: "loginStatusChanged", isLoggedIn, userDetails });
      }
    })
    .catch(error => console.error("Error getting cookies:", error));
}

setInterval(checkLoginStatus, 180000);
checkLoginStatus();

chrome.runtime.onInstalled.addListener(checkLoginStatus);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request);
  
  // Always wrap async operations in try-catch
  try {
    switch (request.action) {
      case "captureFullPage":
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
          if (chrome.runtime.lastError) {
            console.error("Error capturing tab:", chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            return;
          }
          
          try {
            addFeedItem({ imageDataUrl: dataUrl, domainName: request.domainName, time: request.time });
            sendResponse({ status: "success", image: dataUrl });
          } catch (error) {
            console.error("Error adding feed item:", error);
            sendResponse({ status: "error", message: error.message });
          }
        });
        return true; // Will respond asynchronously
        
      case "captureBackground":
        const currentTime = Date.now();
        if (currentTime - lastDownloadTime < DOWNLOAD_COOLDOWN) {
          sendResponse({status: "error", message: "Please wait before capturing again"});
          return true;
        }    
        
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error("Error capturing tab:", chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            return;
          }
          
          lastDownloadTime = currentTime;
          sendResponse({status: "success", image: dataUrl});
        });
        return true;  // Will respond asynchronously
      }
    case "captureArea":
      try {
        // Create a new Image to load the screenshot
        const img = new Image();
        
        // Set up error handling for image loading
        img.onerror = function() {
          console.error('Failed to load image for cropping');
          sendResponse({ 
            status: "error", 
            message: "Failed to load image for cropping" 
          });
        };
        
        img.onload = function() {
          try {
            // Create a canvas to crop the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match the area we want to capture
            canvas.width = request.area.width;
            canvas.height = request.area.height;
            
            // Draw only the selected portion of the image
            ctx.drawImage(
              img, 
              request.area.x, request.area.y, 
              request.area.width, request.area.height, 
              0, 0, 
              request.area.width, request.area.height
            );
            
            // Convert the canvas to a data URL
            const croppedImageDataUrl = canvas.toDataURL('image/png');
            
            // Add the cropped image to the feed
            addFeedItem({ 
              imageDataUrl: croppedImageDataUrl,
              domainName: request.domainName,
              time: request.time
            });
            
            // Send response back
            sendResponse({ 
              status: "success", 
              message: "Area captured successfully",
              image: croppedImageDataUrl
            });
          } catch (drawError) {
            console.error("Error drawing image to canvas:", drawError);
            sendResponse({ 
              status: "error", 
              message: "Failed to process image: " + drawError.message 
            });
          }
        };
        
        // Set the source of the image to the full screenshot
        img.src = request.image;
      } catch (error) {
        console.error('Error processing capture area:', error);
        sendResponse({ 
          status: "error", 
          message: "Error processing capture area: " + error.message 
        });
      }
      return true;
    case "saveCreative":
      try {
        console.log(`Received creative from ${request.platform}:`, request.creativeData);
        
        // Validate required data
        if (!request.platform || !request.creativeData) {
          sendResponse({ status: "error", message: "Missing required data" });
          return true;
        }
        
        // Process based on platform with timeout protection
        const processingTimeout = setTimeout(() => {
          console.warn(`Processing timeout for ${request.platform} creative`);
          sendResponse({ status: "error", message: "Processing timeout" });
        }, 25000); // 25 second timeout
        
        const handleProcessing = (processFn) => {
          try {
            processFn(request.creativeData, sender, (response) => {
              clearTimeout(processingTimeout);
              sendResponse(response);
            });
          } catch (processingError) {
            clearTimeout(processingTimeout);
            console.error(`Error in ${request.platform} processing:`, processingError);
            sendResponse({ status: "error", message: processingError.message });
          }
        };
        
        switch(request.platform) {
          case 'linkedin':
            handleProcessing(processLinkedInCreative);
            break;
          case 'googleads':
            handleProcessing(processGoogleAdsCreative);
            break;
          case 'metalibrary':
            handleProcessing(processMetaLibraryCreative);
            break;
          default:
            // Generic processing for unknown platforms
            handleProcessing(processGenericCreative);
        }
        
        return true; // Keep the message channel open for async response
      } catch (error) {
        console.error(`Error processing ${request.platform} creative:`, error);
        sendResponse({ status: "error", message: error.message });
        return true;
      }
      return true;
    case "downloadScreenshot":
      handleDownload(request, sendResponse);
      return true;
    case "getLoginStatus":
      sendResponse({ isLoggedIn, userDetails });
      return true;
    case "addToFeed":
      addFeedItem(request);
      sendResponse({ status: "success" });
      return true;
    case "getFeedItems":
      sendResponse(feedItems);
      return true;
    case "getIdeas":
      getIdeas().then(ideas => sendResponse(ideas));
      return true;
  }
});

function handleDownload(request, sendResponse) {
  const currentTime = Date.now();
  if (currentTime - lastDownloadTime < DOWNLOAD_COOLDOWN) {
    sendResponse({ status: "cooldown" });
    return;
  }
  lastDownloadTime = currentTime;
  if (request.imageBlob) {
    chrome.downloads.download({
      url: request.imageBlob,
      filename: 'screenshot.png',
      saveAs: true
    }, downloadId => {
      chrome.runtime.lastError
        ? sendResponse({ status: "error", message: chrome.runtime.lastError.message })
        : sendResponse({ status: "success", downloadId });
    });
  } else {
    sendResponse({ status: "error", message: "No image data received" });
  }
}

function addFeedItem(item) {
  const keys = ['author', 'date', 'caption', 'imageDataUrl', 'domainName', 'directLink','time','shares','comments','likes'];
  const newItems = Object.fromEntries(
    keys.filter(key => item[key]).map(key => [key, item[key]])
  );
  
  feedItems.unshift(newItems);
  if (feedItems.length > 50) feedItems = feedItems.slice(0, 50);
}

// Process LinkedIn creative
function processLinkedInCreative(creativeData, sender, sendResponse) {
  console.log("Processing LinkedIn creative:", creativeData);
  
  try {
    // Validate required data
    if (!creativeData) {
      sendResponse({ status: "error", message: "Missing creative data" });
      return;
    }
    
    let processedItems = 0;
    
    // Add to feed - handle images first
    if (creativeData.images && creativeData.images.length > 0) {
      creativeData.images.forEach(imageUrl => {
        try {
          addFeedItem({
            imageDataUrl: imageUrl,
            domainName: "linkedin.com",
            caption: `${creativeData.advertiser || 'Unknown advertiser'}: ${creativeData.adCopy || 'No ad copy'}`,
            time: creativeData.timestamp || new Date().toISOString(),
            platform: "LinkedIn"
          });
          processedItems++;
        } catch (imageError) {
          console.error("Error adding LinkedIn image to feed:", imageError);
          // Continue processing other items
        }
      });
    }
    
    // Handle video if present
    if (creativeData.videoUrl) {
      try {
        addFeedItem({
          videoUrl: creativeData.videoUrl,
          domainName: "linkedin.com",
          caption: `${creativeData.advertiser || 'Unknown advertiser'}: ${creativeData.adCopy || 'No ad copy'}`,
          time: creativeData.timestamp || new Date().toISOString(),
          platform: "LinkedIn"
        });
        processedItems++;
      } catch (videoError) {
        console.error("Error adding LinkedIn video to feed:", videoError);
      }
    }
    
    if (processedItems > 0) {
      sendResponse({ 
        status: "success", 
        message: `LinkedIn creative processed successfully (${processedItems} items)` 
      });
    } else {
      sendResponse({ 
        status: "warning", 
        message: "No content items were processed from LinkedIn creative" 
      });
    }
  } catch (error) {
    console.error("Error processing LinkedIn creative:", error);
    sendResponse({ status: "error", message: error.message });
  }
}

// Process Google Ads creative
function processGoogleAdsCreative(creativeData, sender, sendResponse) {
  console.log("Processing Google Ads creative:", creativeData);
  
  try {
    // Validate required data
    if (!creativeData) {
      sendResponse({ status: "error", message: "Missing creative data" });
      return;
    }
    
    let processedItems = 0;
    
    // Add to feed - handle images first
    if (creativeData.images && creativeData.images.length > 0) {
      creativeData.images.forEach(imageUrl => {
        try {
          addFeedItem({
            imageDataUrl: imageUrl,
            caption: `${creativeData.campaign || 'Unknown campaign'}: ${creativeData.adCopy || 'No ad copy'}`,
            time: creativeData.timestamp || new Date().toISOString(),
            domainName: 'ads.google.com',
            platform: 'Google Ads'
          });
          processedItems++;
        } catch (imageError) {
          console.error("Error adding Google Ads image to feed:", imageError);
          // Continue processing other items
        }
      });
    }
    
    // Handle video if present
    if (creativeData.videoUrl) {
      try {
        addFeedItem({
          videoUrl: creativeData.videoUrl,
          caption: `${creativeData.campaign || 'Unknown campaign'}: ${creativeData.adCopy || 'No ad copy'}`,
          time: creativeData.timestamp || new Date().toISOString(),
          domainName: 'ads.google.com',
          platform: 'Google Ads'
        });
        processedItems++;
      } catch (videoError) {
        console.error("Error adding Google Ads video to feed:", videoError);
      }
    }
    
    if (processedItems > 0) {
      sendResponse({ 
        status: "success", 
        message: `Google Ads creative processed successfully (${processedItems} items)` 
      });
    } else {
      sendResponse({ 
        status: "warning", 
        message: "No content items were processed from Google Ads creative" 
      });
    }
  } catch (error) {
    console.error("Error processing Google Ads creative:", error);
    sendResponse({ status: "error", message: error.message });
  }
}

// Process Meta Ads Library creative
function processMetaLibraryCreative(creativeData, sender, sendResponse) {
  console.log("Processing Meta Ads Library creative:", creativeData);
  
  try {
    // Validate required data
    if (!creativeData) {
      sendResponse({ status: "error", message: "Missing creative data" });
      return;
    }
    
    let processedItems = 0;
    
    // Add to feed - handle images first
    if (creativeData.images && creativeData.images.length > 0) {
      creativeData.images.forEach(imageUrl => {
        try {
          addFeedItem({
            imageDataUrl: imageUrl,
            caption: `${creativeData.advertiser || 'Unknown advertiser'}: ${creativeData.adCopy || 'No ad copy'}`,
            time: creativeData.timestamp || new Date().toISOString(),
            domainName: 'facebook.com',
            platform: 'Meta Ads Library',
            adId: creativeData.adId
          });
          processedItems++;
        } catch (imageError) {
          console.error("Error adding Meta Ads Library image to feed:", imageError);
          // Continue processing other items
        }
      });
    }
    
    // Handle video if present
    if (creativeData.videoUrl) {
      try {
        addFeedItem({
          videoUrl: creativeData.videoUrl,
          caption: `${creativeData.advertiser || 'Unknown advertiser'}: ${creativeData.adCopy || 'No ad copy'}`,
          time: creativeData.timestamp || new Date().toISOString(),
          domainName: 'facebook.com',
          platform: 'Meta Ads Library',
          adId: creativeData.adId
        });
        processedItems++;
      } catch (videoError) {
        console.error("Error adding Meta Ads Library video to feed:", videoError);
      }
    }
    
    if (processedItems > 0) {
      sendResponse({ 
        status: "success", 
        message: `Meta Ads Library creative processed successfully (${processedItems} items)` 
      });
    } else {
      sendResponse({ 
        status: "warning", 
        message: "No content items were processed from Meta Ads Library creative" 
      });
    }
  } catch (error) {
    console.error("Error processing Meta Ads Library creative:", error);
    sendResponse({ status: "error", message: error.message });
  }
}

// Generic processing for any platform
function processGenericCreative(creativeData, sender, sendResponse) {
  console.log("Processing generic creative:", creativeData);
  
  // Extract domain from sender
  const domain = sender.tab ? new URL(sender.tab.url).hostname : 'unknown';
  
  // Add to feed - handle images first
  if (creativeData.images && creativeData.images.length > 0) {
    creativeData.images.forEach(imageUrl => {
      addFeedItem({
        type: 'image',
        content: imageUrl,
        caption: creativeData.adCopy || '',
        time: creativeData.timestamp || new Date().toISOString(),
        domainName: domain,
        platform: creativeData.platform || 'Unknown'
      });
    });
  }
  
  // Handle video if present
  if (creativeData.videoUrl) {
    addFeedItem({
      type: 'video',
      content: creativeData.videoUrl,
      caption: creativeData.adCopy || '',
      time: creativeData.timestamp || new Date().toISOString(),
      domainName: domain,
      platform: creativeData.platform || 'Unknown'
    });
  }
  
  sendResponse({ status: "success" });
}

// Initialize the extension
console.log("Hawky.ai extension background script loaded");

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false;
};

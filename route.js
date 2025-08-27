// route.js

// CORS handling utility
const handleCORS = (url) => {
    // For development environments, we might need a CORS proxy
    const isDev = true; // Set to false in production
    const corsProxies = {
        corsAnywhere: 'https://cors-anywhere.herokuapp.com/',
        localProxy: 'http://localhost:8080/proxy/'
    };
    
    // Only use CORS proxy for non-localhost URLs in development
    if (isDev && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        // Choose which proxy to use
        return `${corsProxies.corsAnywhere}${url}`;
    }
    
    return url;
};

// Network status checker
export const checkNetworkStatus = () => {
    return navigator.onLine;
};

// Function to get ideas from the API
export const getIdeas = async () => {
    // Configuration for API endpoints - can be moved to a config file later
    const API_ENDPOINTS = {
        primary: 'http://localhost:9090/api/assets/get/all/assets',
        fallback: 'https://api.hawky.ai/api/assets/get/all/assets', // Fallback production endpoint
        mockData: false // Set to true to use mock data when both endpoints fail
    };
    
    // Mock data to use when API is unavailable
    const MOCK_DATA = [
        { id: 1, title: 'Sample Creative 1', platform: 'Facebook', type: 'Image Ad', tags: ['UGC', 'Product'] },
        { id: 2, title: 'Sample Creative 2', platform: 'Instagram', type: 'Video Ad', tags: ['Storytelling'] }
    ];
    
    // Helper function to attempt fetch with timeout
    const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };
    
    // Check network connectivity first
    if (!checkNetworkStatus()) {
        console.warn('No internet connection detected. Using mock data.');
        return API_ENDPOINTS.mockData ? MOCK_DATA : [];
    }
    
    // Try primary endpoint with CORS handling
    try {
        console.log('Attempting to fetch from primary endpoint...');
        const corsHandledUrl = handleCORS(API_ENDPOINTS.primary);
        console.log(`Using URL: ${corsHandledUrl}`);
        
        const response = await fetchWithTimeout(corsHandledUrl, {
            // Add credentials if needed for your API
            credentials: 'omit', // 'include' if you need cookies, 'same-origin' for same domain only
            mode: 'cors' // Explicitly set CORS mode
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const ideas = await response.json();
        console.log('Successfully fetched data from primary endpoint');
        return ideas;
    } catch (primaryError) {
        console.warn('Primary endpoint failed:', primaryError.message);
        
        // Try fallback endpoint with CORS handling
        if (API_ENDPOINTS.fallback) {
            try {
                console.log('Attempting to fetch from fallback endpoint...');
                const corsHandledFallbackUrl = handleCORS(API_ENDPOINTS.fallback);
                console.log(`Using fallback URL: ${corsHandledFallbackUrl}`);
                
                const fallbackResponse = await fetchWithTimeout(corsHandledFallbackUrl, {
                    credentials: 'omit',
                    mode: 'cors'
                });
                
                if (!fallbackResponse.ok) {
                    throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
                }
                const fallbackIdeas = await fallbackResponse.json();
                console.log('Successfully fetched data from fallback endpoint');
                return fallbackIdeas;
            } catch (fallbackError) {
                console.error('Fallback endpoint failed:', fallbackError.message);
            }
        }
        
        // Return mock data if enabled, otherwise return empty array
        if (API_ENDPOINTS.mockData) {
            console.log('Using mock data as fallback');
            return MOCK_DATA;
        } else {
            console.error('All endpoints failed. No data available.');
            return [];
        }
    }
};

// API Client with JWT token management
class ApiClient {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.isRefreshing = false;
    this.queuedRequests = [];
  }

  /**
   * Get a valid token, refreshing if necessary
   */
  async getToken() {
    // If we have a valid token, return it
    if (this.token && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    // If we're already refreshing the token, wait for it
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.queuedRequests.push(resolve);
      });
    }

    // Otherwise, fetch a new token
    this.isRefreshing = true;
    try {
      const response = await fetch('/api/get-token');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get token');
      }

      this.token = data.token;
      // Set token expiry 30 seconds before actual expiry to be safe
      this.tokenExpiry = Date.now() + (4.5 * 60 * 1000); // 4.5 minutes
      
      // Process any queued requests
      this.processQueue(null, this.token);
      
      return this.token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.processQueue(error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Process queued requests after token refresh
   */
  processQueue(error, token = null) {
    this.queuedRequests.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
    this.queuedRequests = [];
  }

  /**
   * Make an authenticated API request
   */
  async request(url, options = {}) {
    // Ensure we have a valid token
    const token = await this.getToken();
    
    // Set up headers
    const headers = {
      // Don't set Content-Type for FormData, let the browser set it with boundary
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    // Stringify body if it's an object and not FormData
    const body = options.body && !(options.body instanceof FormData) 
      ? JSON.stringify(options.body) 
      : options.body;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body
      });

      // Handle unauthorized (401) or forbidden (403) responses
      if (response.status === 401 || response.status === 403) {
        // Clear token to force refresh on next request
        this.token = null;
        const error = new Error('Session expired');
        error.status = response.status;
        throw error;
      }

      // For non-2xx responses, try to parse error message
      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      
      // Show error to user if we have a toast system
      if (window.showToast) {
        const message = error.status === 401 || error.status === 403 
          ? 'Your session has expired. Please refresh the page.' 
          : error.message || 'An error occurred';
        
        window.showToast(message, 'error');
      }
      
      throw error;
    }
  }

  // Convenience methods for common HTTP methods
  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data
    });
  }

  put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data
    });
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
  
  /**
   * Upload a file to the server
   * @param {string} url - The upload URL
   * @param {File} file - The file to upload
   * @param {Object} data - Additional form data
   * @param {Object} options - Additional options
   */
  async uploadFile(url, file, data = {}, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Append additional data to form
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    return this.request(url, {
      ...options,
      method: 'POST',
      body: formData
    });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

// Make it globally available
window.ApiClient = ApiClient;
window.apiClient = apiClient;

// Initialize the API client when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Pre-fetch a token when the page loads
  apiClient.getToken().catch(error => {
    console.warn('Initial token fetch failed:', error);
  });
});

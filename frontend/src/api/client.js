/**
 * SentinelShield REST API Client
 * Connects to versioned Flask API under /api/v1/
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorInfo = data?.error || {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Unknown network error',
          details: [],
        };
        const error = new Error(errorInfo.message || 'API request failed');
        error.status = response.status;
        error.code = errorInfo.code;
        error.details = errorInfo.details || [];
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const networkError = new Error('Cannot connect to SentinelShield backend server. Please verify it is running on ' + this.baseUrl);
        networkError.code = 'CONNECTION_FAILED';
        networkError.details = [];
        throw networkError;
      }
      throw err;
    }
  }

  // Health & Database Diagnostics
  async getHealth() {
    return this.request('/health');
  }

  // Brand Profile Management
  async listBrands({ search = '', page = 1, perPage = 20 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', page);
    if (perPage) params.append('per_page', perPage);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/brands${queryString}`);
  }

  async getBrand(id) {
    return this.request(`/brands/${encodeURIComponent(id)}`);
  }

  async createBrand(payload) {
    return this.request('/brands', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBrand(id, payload) {
    return this.request(`/brands/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteBrand(id) {
    return this.request(`/brands/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;

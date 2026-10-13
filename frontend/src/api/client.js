/**
 * SURAKSHA REST API Client
 * Connects to versioned Flask API under /api/v1/
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? 'http://127.0.0.1:5000/api/v1' : '/api/v1'
);

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
        const networkError = new Error('Cannot connect to SURAKSHA backend server. Please verify it is running on ' + this.baseUrl);
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

  // Threat Intelligence & Findings
  async listFindings({ brandId = '', assetType = '', severity = '', reviewStatus = '', search = '', page = 1, perPage = 50 } = {}) {
    const params = new URLSearchParams();
    if (brandId) params.append('brand_id', brandId);
    if (assetType) params.append('asset_type', assetType);
    if (severity) params.append('severity', severity);
    if (reviewStatus) params.append('review_status', reviewStatus);
    if (search) params.append('search', search);
    if (page) params.append('page', page);
    if (perPage) params.append('per_page', perPage);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/findings${queryString}`);
  }

  async getFinding(id) {
    return this.request(`/findings/${encodeURIComponent(id)}`);
  }

  async updateFindingStatus(id, reviewStatus) {
    return this.request(`/findings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status: reviewStatus }),
    });
  }

  // Brand Asset Scanning & Detection
  async scanCandidate(brandId, payload) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // External Data Providers & Monitoring (Phase 4)
  async getIntegrationsStatus() {
    return this.request('/integrations/status');
  }

  async testIntegration(providerId) {
    return this.request(`/integrations/${encodeURIComponent(providerId)}/test`, {
      method: 'POST',
    });
  }

  async scanBrandProvider(brandId, providerId = 'itunes_app_store', limit = 25) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/scan-provider`, {
      method: 'POST',
      body: JSON.stringify({ provider_id: providerId, limit }),
    });
  }

  async listMonitoringJobs(brandId = '') {
    const params = brandId ? `?brand_id=${encodeURIComponent(brandId)}` : '';
    return this.request(`/monitoring/jobs${params}`);
  }

  async createMonitoringJob(brandId, providerId = 'itunes_app_store', intervalMinutes = 60) {
    return this.request('/monitoring/jobs', {
      method: 'POST',
      body: JSON.stringify({
        brand_id: brandId,
        provider_id: providerId,
        interval_minutes: intervalMinutes,
      }),
    });
  }

  async runMonitoringJob(jobId) {
    return this.request(`/monitoring/jobs/${encodeURIComponent(jobId)}/run`, {
      method: 'POST',
    });
  }

  async cancelMonitoringJob(jobId) {
    return this.request(`/monitoring/jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
    });
  }

  async getMLStatus() {
    return this.request('/ml/status');
  }

  async predictMLRisk(candidateData) {
    return this.request('/ml/predict', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
  }

  async predictURLRisk(url) {
    return this.request('/ml/predict-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;

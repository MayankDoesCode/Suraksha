/**
 * SURAKSHA REST API Client
 * Connects to versioned Flask API under /api/v1/
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) || '/api/v1';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.tokenProvider = null;
  }

  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    let token = null;
    if (this.tokenProvider) {
      try {
        token = await this.tokenProvider();
      } catch (err) {
        console.warn('Failed to retrieve authentication token for API request:', err);
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    try {
      let response;
      try {
        response = await fetch(url, config);
      } catch (fetchErr) {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !url.includes(':5000')) {
          const directUrl = `http://127.0.0.1:5000/api/v1${endpoint}`;
          response = await fetch(directUrl, config);
        } else {
          throw fetchErr;
        }
      }
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

  // Public Runtime Authentication Configuration
  async getAuthConfig() {
    return this.request('/auth/config');
  }

  // Brand Profile Management
  async listBrands({ search = '', page = 1, perPage = 20, isSample = false } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', page);
    if (perPage) params.append('per_page', perPage);
    if (isSample) params.append('is_sample', 'true');

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

  async monitorSocial(payload) {
    // Live public-platform search + detector run. Public endpoint; failures surface as an Error.
    const res = await fetch(`${this.baseUrl}/social/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) throw new Error(body?.error?.message || `Live scan failed (${res.status})`);
    return body.data;
  }

  async monitorApps(payload) {
    const res = await fetch(`${this.baseUrl}/apps/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) throw new Error(body?.error?.message || `Live scan failed (${res.status})`);
    return body.data;
  }

  async uploadBrandLogo(id, dataUrl) {
    // Multipart upload of the official logo (PNG/JPEG/WEBP/GIF, max 2 MB); used for visual impersonation checks.
    const blob = await (await fetch(dataUrl)).blob();
    const form = new FormData();
    form.append('file', blob, 'logo');
    let token = null;
    if (this.tokenProvider) {
      try { token = await this.tokenProvider(); } catch (err) { console.warn('Token unavailable for logo upload:', err); }
    }
    const res = await fetch(`${this.baseUrl}/brands/${encodeURIComponent(id)}/logo`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error?.message || `Logo upload failed (${res.status})`);
    return data;
  }

  async deleteBrand(id) {
    return this.request(`/brands/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // Threat Intelligence & Findings
  async listFindings({ brandId = '', assetType = '', severity = '', reviewStatus = '', search = '', page = 1, perPage = 50, isSample = false } = {}) {
    const params = new URLSearchParams();
    if (brandId) params.append('brand_id', brandId);
    if (assetType) params.append('asset_type', assetType);
    if (severity) params.append('severity', severity);
    if (reviewStatus) params.append('review_status', reviewStatus);
    if (search) params.append('search', search);
    if (page) params.append('page', page);
    if (perPage) params.append('per_page', perPage);
    if (isSample) params.append('is_sample', 'true');

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

  async getMetrics({ isSample = false } = {}) {
    const params = isSample ? '?is_sample=true' : '';
    return this.request(`/metrics${params}`);
  }

  // Takedown & Abuse Notice Drafting
  async draftFindingTakedown(findingId, { notice = 'registrar', format = 'json', abuseEmail, analyst } = {}) {
    return this.request(`/findings/${encodeURIComponent(findingId)}/takedown`, {
      method: 'POST',
      body: JSON.stringify({
        notice,
        format,
        abuse_email: abuseEmail,
        analyst,
      }),
    });
  }

  // Passive Domain Intel Enrichment (DNS, RDAP, TLS)
  async enrichFinding(findingId) {
    return this.request(`/findings/${encodeURIComponent(findingId)}/enrich`, {
      method: 'POST',
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

  async testWebhook(webhookUrl, brandName) {
    return this.request('/integrations/webhook/test', {
      method: 'POST',
      body: JSON.stringify({ webhook_url: webhookUrl, brand_name: brandName }),
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

  async predictSocialRisk(profileData) {
    return this.request('/ml/predict-social', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async predictAppRisk(appData) {
    return this.request('/ml/predict-app', {
      method: 'POST',
      body: JSON.stringify(appData),
    });
  }

  // Feature 1: Brand Impersonation Watchtower
  async evaluateWatchtower(brandId, payload) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/watchtower/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getWatchtowerSummary(brandId) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/watchtower/summary`);
  }

  // Feature 2: Explainable AI Investigation Assistant
  async getFindingExplanation(findingId, { ai = false } = {}) {
    const query = ai ? '?ai=true' : '';
    return this.request(`/findings/${encodeURIComponent(findingId)}/explain${query}`);
  }

  async aiInvestigateFinding(findingId) {
    return this.request(`/findings/${encodeURIComponent(findingId)}/ai-investigate`, {
      method: 'POST',
    });
  }

  async explainCandidate(payload) {
    return this.request('/findings/explain', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async aiInvestigateCandidate(payload) {
    return this.request('/findings/ai-investigate-candidate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Feature 3: AI Cyber Defense Copilot & Google Safe Browsing
  async verifyUrlWithCopilot(url, targetBrand = '') {
    return this.request('/copilot/verify-url', {
      method: 'POST',
      body: JSON.stringify({ url, target_brand: targetBrand }),
    });
  }

  async chatWithCopilot({ message, url = '', targetBrand = '', history = [] }) {
    return this.request('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        url,
        target_brand: targetBrand,
        history,
      }),
    });
  }

  // Feature 4: Internet Threat Feeds & Adversarial Permutation Engine
  async getRecentThreatFeed(limit = 25) {
    return this.request(`/copilot/threat-feed/recent?limit=${encodeURIComponent(limit)}`);
  }

  async searchThreatFeed(query, limit = 20) {
    return this.request('/copilot/threat-feed/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  async generatePermutations(domain, limit = 25) {
    return this.request('/copilot/generate-permutations', {
      method: 'POST',
      body: JSON.stringify({ domain, limit }),
    });
  }

  // Feature 5: Asynchronous Background Discovery & DNS Recon
  async startBrandDiscovery(brandId, { limit = 100, techniques = null, enrich = false, async = true } = {}) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/discover`, {
      method: 'POST',
      body: JSON.stringify({ limit, techniques, enrich, async }),
    });
  }

  async getDiscoveryJobStatus(brandId, jobId) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/discover/jobs/${encodeURIComponent(jobId)}`);
  }

  async getBrandRelationshipGraph(brandId) {
    return this.request(`/brands/${encodeURIComponent(brandId)}/graph`);
  }
}

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api;
export default api;

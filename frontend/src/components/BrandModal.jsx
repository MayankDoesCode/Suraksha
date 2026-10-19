import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Globe,
  Share2,
  Smartphone,
  Building2,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function BrandModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isEditing = false
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    domains: [{ domain: '', is_primary: true }],
    social_handles: [{ platform: 'twitter', handle: '', url: '' }],
    app_identifiers: [{ platform: 'android_play_store', identifier: '', app_name: '' }],
    publishers: [{ publisher_name: '', platform: 'all' }],
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        logo_url: initialData.logo_url || '',
        domains: initialData.domains && initialData.domains.length > 0
          ? initialData.domains.map(d => ({ domain: d.domain, is_primary: d.is_primary }))
          : [{ domain: '', is_primary: true }],
        social_handles: initialData.social_handles && initialData.social_handles.length > 0
          ? initialData.social_handles.map(s => ({ platform: s.platform, handle: s.handle, url: s.url || '' }))
          : [{ platform: 'twitter', handle: '', url: '' }],
        app_identifiers: initialData.app_identifiers && initialData.app_identifiers.length > 0
          ? initialData.app_identifiers.map(a => ({ platform: a.platform, identifier: a.identifier, app_name: a.app_name || '' }))
          : [{ platform: 'android_play_store', identifier: '', app_name: '' }],
        publishers: initialData.publishers && initialData.publishers.length > 0
          ? initialData.publishers.map(p => ({ publisher_name: p.publisher_name, platform: p.platform || 'all' }))
          : [{ publisher_name: '', platform: 'all' }],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        logo_url: '',
        domains: [{ domain: '', is_primary: true }],
        social_handles: [{ platform: 'twitter', handle: '', url: '' }],
        app_identifiers: [{ platform: 'android_play_store', identifier: '', app_name: '' }],
        publishers: [{ publisher_name: '', platform: 'all' }],
      });
    }
    setValidationErrors({});
    setGeneralError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Domain handlers
  const handleAddDomain = () => {
    setFormData(prev => ({
      ...prev,
      domains: [...prev.domains, { domain: '', is_primary: prev.domains.length === 0 }]
    }));
  };

  const handleRemoveDomain = (index) => {
    setFormData(prev => {
      const next = prev.domains.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some(d => d.is_primary)) {
        next[0].is_primary = true;
      }
      return { ...prev, domains: next };
    });
  };

  const handleDomainChange = (index, value) => {
    setFormData(prev => {
      const next = [...prev.domains];
      next[index].domain = value;
      return { ...prev, domains: next };
    });
  };

  const handleSetPrimaryDomain = (index) => {
    setFormData(prev => ({
      ...prev,
      domains: prev.domains.map((d, i) => ({
        ...d,
        is_primary: i === index
      }))
    }));
  };

  // Social handles handlers
  const handleAddSocial = () => {
    setFormData(prev => ({
      ...prev,
      social_handles: [...prev.social_handles, { platform: 'twitter', handle: '', url: '' }]
    }));
  };

  const handleRemoveSocial = (index) => {
    setFormData(prev => ({
      ...prev,
      social_handles: prev.social_handles.filter((_, i) => i !== index)
    }));
  };

  const handleSocialChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.social_handles];
      next[index][field] = value;
      return { ...prev, social_handles: next };
    });
  };

  // App handlers
  const handleAddApp = () => {
    setFormData(prev => ({
      ...prev,
      app_identifiers: [...prev.app_identifiers, { platform: 'android_play_store', identifier: '', app_name: '' }]
    }));
  };

  const handleRemoveApp = (index) => {
    setFormData(prev => ({
      ...prev,
      app_identifiers: prev.app_identifiers.filter((_, i) => i !== index)
    }));
  };

  const handleAppChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.app_identifiers];
      next[index][field] = value;
      return { ...prev, app_identifiers: next };
    });
  };

  // Publisher handlers
  const handleAddPublisher = () => {
    setFormData(prev => ({
      ...prev,
      publishers: [...prev.publishers, { publisher_name: '', platform: 'all' }]
    }));
  };

  const handleRemovePublisher = (index) => {
    setFormData(prev => ({
      ...prev,
      publishers: prev.publishers.filter((_, i) => i !== index)
    }));
  };

  const handlePublisherChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.publishers];
      next[index][field] = value;
      return { ...prev, publishers: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setValidationErrors({});
    setGeneralError('');

    // Filter out blank entries
    const cleanedPayload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      logo_url: formData.logo_url.trim() || null,
      domains: formData.domains
        .filter(d => d.domain.trim() !== '')
        .map(d => ({ domain: d.domain.trim().toLowerCase(), is_primary: d.is_primary })),
      social_handles: formData.social_handles
        .filter(s => s.handle.trim() !== '')
        .map(s => ({
          platform: s.platform,
          handle: s.handle.trim().replace(/^@/, ''),
          url: s.url ? s.url.trim() : null
        })),
      app_identifiers: formData.app_identifiers
        .filter(a => a.identifier.trim() !== '')
        .map(a => ({
          platform: a.platform,
          identifier: a.identifier.trim(),
          app_name: a.app_name ? a.app_name.trim() : null
        })),
      publishers: formData.publishers
        .filter(p => p.publisher_name.trim() !== '')
        .map(p => ({
          publisher_name: p.publisher_name.trim(),
          platform: p.platform || null
        }))
    };

    try {
      await onSave(cleanedPayload);
      onClose();
    } catch (err) {
      if (err.details && Array.isArray(err.details)) {
        const errorMap = {};
        err.details.forEach(d => {
          errorMap[d.field] = d.message;
        });
        setValidationErrors(errorMap);
      }
      setGeneralError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-cyber-dark border border-cyber-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-cyber-border flex items-center justify-between bg-cyber-surface/50">
          <div>
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              {isEditing ? 'Edit Brand Profile' : 'Register Brand Profile'}
            </h2>
            <p className="text-xs text-cyber-textMuted mt-0.5">
              Define the corporate ground truth to enable accurate impersonation scoring.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cyber-surface text-cyber-textMuted hover:text-fg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {generalError && (
            <div className="p-4 rounded-lg bg-cyber-rose/10 border border-cyber-rose/40 text-cyber-rose text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Core Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> 1. Organization Baseline
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg mb-1.5">
                  Brand Name <span className="text-cyber-rose">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Acme Global Financial"
                  className={`w-full bg-cyber-darkest border rounded-lg px-3.5 py-2 text-xs text-fg placeholder-cyber-textMuted focus:outline-none focus:ring-1 ${
                    validationErrors.name
                      ? 'border-cyber-rose focus:ring-cyber-rose'
                      : 'border-cyber-border focus:border-cyber-accent focus:ring-cyber-accent'
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-[11px] text-cyber-rose mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-fg mb-1.5">
                  Logo / Asset URL
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className={`w-full bg-cyber-darkest border rounded-lg px-3.5 py-2 text-xs text-fg placeholder-cyber-textMuted focus:outline-none focus:ring-1 ${
                    validationErrors.logo_url
                      ? 'border-cyber-rose focus:ring-cyber-rose'
                      : 'border-cyber-border focus:border-cyber-accent focus:ring-cyber-accent'
                  }`}
                />
                {validationErrors.logo_url && (
                  <p className="text-[11px] text-cyber-rose mt-1">{validationErrors.logo_url}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1.5">
                Corporate Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enterprise summary, business sector, and primary brands..."
                className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3.5 py-2 text-xs text-fg placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent focus:ring-1 focus:ring-cyber-accent"
              />
            </div>
          </div>

          {/* Verified Domains Section */}
          <div className="space-y-3 pt-4 border-t border-cyber-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> 2. Verified Domains
              </h3>
              <button
                type="button"
                onClick={handleAddDomain}
                className="text-xs font-mono text-cyber-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Domain
              </button>
            </div>
            <p className="text-[11px] text-cyber-textMuted">
              Legitimate domains used to identify lookalike registrations and phishing lures. Mark one as primary.
            </p>

            <div className="space-y-2">
              {formData.domains.map((dom, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={dom.domain}
                    onChange={(e) => handleDomainChange(idx, e.target.value)}
                    placeholder="e.g. acme.com or secure.acmepay.io"
                    className="flex-1 bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-fg font-mono placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-cyber-textMuted cursor-pointer select-none">
                    <input
                      type="radio"
                      name="primary_domain"
                      checked={dom.is_primary}
                      onChange={() => handleSetPrimaryDomain(idx)}
                      className="text-cyber-accent focus:ring-cyber-accent"
                    />
                    Primary
                  </label>
                  {formData.domains.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(idx)}
                      className="p-1.5 text-cyber-textMuted hover:text-cyber-rose transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Verified Social Handles */}
          <div className="space-y-3 pt-4 border-t border-cyber-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
                <Share2 className="w-4 h-4" /> 3. Official Social Handles
              </h3>
              <button
                type="button"
                onClick={handleAddSocial}
                className="text-xs font-mono text-cyber-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Handle
              </button>
            </div>
            <p className="text-[11px] text-cyber-textMuted">
              Official accounts on social platforms used to detect rogue imposter accounts and impersonator bios.
            </p>

            <div className="space-y-2">
              {formData.social_handles.map((soc, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <select
                      value={soc.platform}
                      onChange={(e) => handleSocialChange(idx, 'platform', e.target.value)}
                      className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:border-cyber-accent"
                    >
                      <option value="twitter">X / Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="github">GitHub</option>
                      <option value="tiktok">TikTok</option>
                      <option value="telegram">Telegram</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={soc.handle}
                      onChange={(e) => handleSocialChange(idx, 'handle', e.target.value)}
                      placeholder="Handle (without @)"
                      className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-fg font-mono placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="url"
                      value={soc.url}
                      onChange={(e) => handleSocialChange(idx, 'url', e.target.value)}
                      placeholder="Profile URL (optional)"
                      className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-fg placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {formData.social_handles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(idx)}
                        className="p-1.5 text-cyber-textMuted hover:text-cyber-rose transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile App Identifiers */}
          <div className="space-y-3 pt-4 border-t border-cyber-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" /> 4. Mobile App Signatures
              </h3>
              <button
                type="button"
                onClick={handleAddApp}
                className="text-xs font-mono text-cyber-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add App
              </button>
            </div>
            <p className="text-[11px] text-cyber-textMuted">
              Official package IDs (e.g. com.brand.app or iOS bundle IDs) to identify fraudulent app clones.
            </p>

            <div className="space-y-2">
              {formData.app_identifiers.map((app, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <select
                      value={app.platform}
                      onChange={(e) => handleAppChange(idx, 'platform', e.target.value)}
                      className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:border-cyber-accent"
                    >
                      <option value="android_play_store">Google Play</option>
                      <option value="ios_app_store">Apple App Store</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={app.identifier}
                      onChange={(e) => handleAppChange(idx, 'identifier', e.target.value)}
                      placeholder="com.company.app or ID"
                      className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-fg font-mono placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={app.app_name}
                      onChange={(e) => handleAppChange(idx, 'app_name', e.target.value)}
                      placeholder="Title (optional)"
                      className="w-full bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-fg placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {formData.app_identifiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveApp(idx)}
                        className="p-1.5 text-cyber-textMuted hover:text-cyber-rose transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Known Publishers */}
          <div className="space-y-3 pt-4 border-t border-cyber-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-accent font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> 5. Known Developers & Publishers
              </h3>
              <button
                type="button"
                onClick={handleAddPublisher}
                className="text-xs font-mono text-cyber-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Publisher
              </button>
            </div>

            <div className="space-y-2">
              {formData.publishers.map((pub, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={pub.publisher_name}
                    onChange={(e) => handlePublisherChange(idx, 'publisher_name', e.target.value)}
                    placeholder="e.g. Acme Technologies Inc."
                    className="flex-1 bg-cyber-darkest border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-fg placeholder-cyber-textMuted focus:outline-none focus:border-cyber-accent"
                  />
                  {formData.publishers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePublisher(idx)}
                      className="p-1.5 text-cyber-textMuted hover:text-cyber-rose transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-border bg-cyber-surface/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-cyber-textMuted hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-cyber-accent text-onAccent text-xs font-semibold hover:bg-cyber-accentHover transition-all shadow-glow disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

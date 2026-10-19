import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Globe,
  Share2,
  Smartphone,
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Upload,
  ExternalLink,
  ShieldAlert,
  Info,
  Check,
  X,
  FileCheck2,
  BadgeAlert,
  Sparkles,
} from 'lucide-react';
import type {
  OfficialSocial,
  OfficialApp,
  AuthorizedPartner,
  AssetVerificationTier,
} from '../types';
import api from '../api/client';

export const BrandProfileView: React.FC = () => {
  const {
    brandProfile,
    updateBrandProfile,
    resetBrandProfileToDefault,
    backendOnline,
    backendBrands,
    selectedBackendBrandId,
    selectBrandById,
    refreshBackendData,
    isDemoMode,
  } = useApp();

  // Mode: View/Audit vs Edit
  const [isEditing, setIsEditing] = useState(true);

  // Core Identity State
  const [brandName, setBrandName] = useState(brandProfile.brandName);
  const [officialWebsite, setOfficialWebsite] = useState(brandProfile.officialWebsite || '');
  const [brandDescription, setBrandDescription] = useState(brandProfile.brandDescription);
  const [logoPreview, setLogoPreview] = useState<string>(brandProfile.logoUrl || '');
  const [protectedKeywords, setProtectedKeywords] = useState<string[]>(brandProfile.protectedKeywords || []);
  const [newKeyword, setNewKeyword] = useState('');

  // Official Domains State
  const [domains, setDomains] = useState<string[]>(brandProfile.officialDomains);
  const [newDomain, setNewDomain] = useState('');
  const [domainError, setDomainError] = useState('');

  // Official Socials State
  const [socials, setSocials] = useState<OfficialSocial[]>(brandProfile.officialSocialUrls);
  const [newSocialPlatform, setNewSocialPlatform] = useState('Twitter / X');
  const [newSocialHandle, setNewSocialHandle] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newSocialTier, setNewSocialTier] = useState<AssetVerificationTier>('user_declared');
  const [newSocialNotes, setNewSocialNotes] = useState('');
  const [socialUrlError, setSocialUrlError] = useState('');

  // Official Apps State
  const [apps, setApps] = useState<OfficialApp[]>(brandProfile.officialApps);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDeveloper, setNewAppDeveloper] = useState('');
  const [newAppStore, setNewAppStore] = useState('Google Play Store');
  const [newAppStoreUrl, setNewAppStoreUrl] = useState('');
  const [newAppId, setNewAppId] = useState('');
  const [newAppTier, setNewAppTier] = useState<AssetVerificationTier>('user_declared');
  const [appUrlError, setAppUrlError] = useState('');

  // Authorized Partners State
  const [partners, setPartners] = useState<AuthorizedPartner[]>(brandProfile.authorizedPartners || []);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerUrl, setNewPartnerUrl] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<AuthorizedPartner['relationshipType']>('Merchant Partner');
  const [newPartnerMarks, setNewPartnerMarks] = useState('');
  const [newPartnerAgreement, setNewPartnerAgreement] = useState('');
  const [newPartnerTier, setNewPartnerTier] = useState<AssetVerificationTier>('user_declared');
  const [partnerUrlError, setPartnerUrlError] = useState('');

  // Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [section, setSection] = useState<'identity' | 'domains' | 'social' | 'apps' | 'partners'>('identity');
  const [saveStatus, setSaveStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'local' | 'error'; message?: string }>({ kind: 'idle' });
  const [websiteError, setWebsiteError] = useState('');

  // Sync state if brandProfile changes externally
  useEffect(() => {
    setBrandName(brandProfile.brandName);
    setOfficialWebsite(brandProfile.officialWebsite || '');
    setBrandDescription(brandProfile.brandDescription);
    setDomains(brandProfile.officialDomains);
    setSocials(brandProfile.officialSocialUrls);
    setApps(brandProfile.officialApps);
    setPartners(brandProfile.authorizedPartners || []);
    setLogoPreview(brandProfile.logoUrl || '');
    setProtectedKeywords(brandProfile.protectedKeywords || []);
  }, [brandProfile]);

  // URL format validator
  const isValidUrl = (urlStr: string): boolean => {
    if (!urlStr) return false;
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Domain format validator
  const isValidDomain = (domStr: string): boolean => {
    if (!domStr) return false;
    const clean = domStr.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(clean);
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Domain operations
  const handleAddDomain = () => {
    setDomainError('');
    const clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean) {
      setDomainError('Domain cannot be empty.');
      return;
    }
    if (!isValidDomain(clean)) {
      setDomainError('Please enter a valid domain format (e.g., domain.com, sub.domain.io).');
      return;
    }
    if (domains.includes(clean)) {
      setDomainError('Domain is already registered in this profile.');
      return;
    }
    setDomains([...domains, clean]);
    setNewDomain('');
  };

  const handleRemoveDomain = (idx: number) => {
    setDomains(domains.filter((_, i) => i !== idx));
  };

  // Social account operations
  const handleAddSocial = () => {
    setSocialUrlError('');
    if (!newSocialHandle.trim()) {
      setSocialUrlError('Handle / Username is required.');
      return;
    }
    if (!newSocialUrl.trim() || !isValidUrl(newSocialUrl.trim())) {
      setSocialUrlError('A valid URL starting with http:// or https:// is required.');
      return;
    }

    setSocials([
      ...socials,
      {
        id: `soc-${Date.now()}`,
        platform: newSocialPlatform,
        handle: newSocialHandle.trim().startsWith('@') ? newSocialHandle.trim() : `@${newSocialHandle.trim()}`,
        url: newSocialUrl.trim(),
        verificationStatus: newSocialTier,
        notes: newSocialNotes.trim() || undefined,
      },
    ]);
    setNewSocialHandle('');
    setNewSocialUrl('');
    setNewSocialNotes('');
  };

  const handleRemoveSocial = (idx: number) => {
    setSocials(socials.filter((_, i) => i !== idx));
  };

  // Mobile App operations
  const handleAddApp = () => {
    setAppUrlError('');
    if (!newAppName.trim()) {
      setAppUrlError('App Name is required.');
      return;
    }
    if (!newAppDeveloper.trim()) {
      setAppUrlError('Developer / Publisher name is required.');
      return;
    }
    if (newAppStoreUrl.trim() && !isValidUrl(newAppStoreUrl.trim())) {
      setAppUrlError('Store URL must start with http:// or https://');
      return;
    }

    setApps([
      ...apps,
      {
        id: `app-${Date.now()}`,
        name: newAppName.trim(),
        developer: newAppDeveloper.trim(),
        store: newAppStore,
        storeUrl: newAppStoreUrl.trim() || undefined,
        appId: newAppId.trim() || undefined,
        verificationStatus: newAppTier,
      },
    ]);
    setNewAppName('');
    setNewAppDeveloper('');
    setNewAppStoreUrl('');
    setNewAppId('');
  };

  const handleRemoveApp = (idx: number) => {
    setApps(apps.filter((_, i) => i !== idx));
  };

  // Authorized Partner operations
  const handleAddPartner = () => {
    setPartnerUrlError('');
    if (!newPartnerName.trim()) {
      setPartnerUrlError('Partner name is required.');
      return;
    }
    if (newPartnerUrl.trim() && !isValidUrl(newPartnerUrl.trim())) {
      setPartnerUrlError('Partner Website URL must start with http:// or https://');
      return;
    }

    setPartners([
      ...partners,
      {
        id: `part-${Date.now()}`,
        name: newPartnerName.trim(),
        websiteUrl: newPartnerUrl.trim(),
        relationshipType: newPartnerType,
        authorizedMarks: newPartnerMarks.trim() || 'Standard Co-Marketing License',
        verificationStatus: newPartnerTier,
        agreementReference: newPartnerAgreement.trim() || undefined,
      },
    ]);
    setNewPartnerName('');
    setNewPartnerUrl('');
    setNewPartnerMarks('');
    setNewPartnerAgreement('');
  };

  const handleRemovePartner = (idx: number) => {
    setPartners(partners.filter((_, i) => i !== idx));
  };

  // Protected Keyword operations
  const handleAddKeyword = () => {
    if (newKeyword.trim() && !protectedKeywords.includes(newKeyword.trim().toLowerCase())) {
      setProtectedKeywords([...protectedKeywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (idx: number) => {
    setProtectedKeywords(protectedKeywords.filter((_, i) => i !== idx));
  };

  // Save changes to current session
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebsiteError('');

    if (officialWebsite.trim() && !isValidUrl(officialWebsite.trim())) {
      setWebsiteError('Official website must be a valid URL starting with http:// or https://');
      return;
    }

    updateBrandProfile({
      brandName: brandName.trim(),
      officialWebsite: officialWebsite.trim(),
      brandDescription: brandDescription.trim(),
      officialDomains: domains,
      officialSocialUrls: socials,
      officialApps: apps,
      authorizedPartners: partners,
      logoUrl: logoPreview,
      protectedKeywords: protectedKeywords,
      isCustomBrand: brandName.toLowerCase() !== 'apexpay',
    });

    // Demo data never leaves the browser. Live brands are saved to the backend and the real result is shown.
    if (isDemoMode) {
      setSaveStatus({ kind: 'local', message: 'Saved in this demo session only.' });
      return;
    }
    if (!backendOnline) {
      setSaveStatus({ kind: 'local', message: 'Backend unreachable: saved in this browser session only. It will not persist or apply to scans.' });
      return;
    }

    const payload = {
      name: brandName.trim(),
      description: brandDescription.trim(),
      domains: domains.map((d, i) => ({ domain: d, is_primary: i === 0 })),
      social_handles: socials.map(s => ({ platform: s.platform, handle: s.handle, url: s.url })),
      app_identifiers: apps.map(a => ({ platform: a.store || 'android_play_store', identifier: a.appId || a.name, app_name: a.name })),
      publishers: apps.map(a => ({ publisher_name: a.developer, platform: a.store })),
    };
    setSaveStatus({ kind: 'saving' });
    try {
      if (selectedBackendBrandId) {
        await api.updateBrand(selectedBackendBrandId, payload);
      } else {
        const res = await api.createBrand(payload);
        if (res?.success === false) throw new Error(res?.error?.message || 'The server rejected the brand.');
        await refreshBackendData();
      }
      setSaveStatus({ kind: 'ok', message: 'Saved to the backend. These assets are now excluded from findings.' });
    } catch (err: any) {
      setSaveStatus({ kind: 'error', message: `Not saved to the backend: ${err?.message || 'request failed'}. Your edits are still on this page.` });
    }
  };

  // Reset to ApexPay confirmation
  const handleConfirmReset = () => {
    resetBrandProfileToDefault();
    setShowResetModal(false);
  };

  // Empty state creator: clears all fields for entering a brand from scratch
  const handleStartBlankBrand = () => {
    setBrandName('');
    setOfficialWebsite('');
    setBrandDescription('');
    setDomains([]);
    setSocials([]);
    setApps([]);
    setPartners([]);
    setLogoPreview('');
    setProtectedKeywords([]);
    setIsEditing(true);
  };

  const renderVerificationBadge = (tier: AssetVerificationTier) => {
    switch (tier) {
      case 'verified_dns':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-ok/10 text-ok border border-ok/30">
            <FileCheck2 className="w-3 h-3 text-ok" />
            DNS Verified
          </span>
        );
      case 'verified_platform':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-accent/10 text-accent border border-accent/30">
            <ShieldCheck className="w-3 h-3 text-accent" />
            Platform Verified
          </span>
        );
      case 'verified_store':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-ai/15 text-ai border border-ai/30">
            <ShieldCheck className="w-3 h-3 text-ai" />
            Store Publisher Keystore
          </span>
        );
      case 'contract_verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-accent/15 text-accent border border-accent/40">
            <CheckCircle2 className="w-3 h-3 text-accent" />
            Contract License Verified
          </span>
        );
      case 'user_declared':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-surface2 text-fgMuted border border-line">
            <Info className="w-3 h-3 text-fgMuted" />
            User-Declared (Unchecked)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-warn/10 text-warn border border-warn/30">
            <BadgeAlert className="w-3 h-3 text-warn" />
            Unverified
          </span>
        );
    }
  };

  const isApexPayDemo = isDemoMode && brandName.toLowerCase() === 'apexpay';

  return (
    <div className="mx-auto max-w-5xl space-y-5 font-sans text-fg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-fg">{brandName || 'New brand'}</h2>
          <p className="text-sm text-fgMuted">
            Assets registered here are treated as official and excluded from findings.
            {isApexPayDemo && ' This is the synthetic demo brand.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {backendBrands.length > 0 && (
            <select
              value={selectedBackendBrandId || (isDemoMode ? 'demo-apexpay' : backendBrands[0]?.id || '')}
              onChange={(e) => selectBrandById(e.target.value)}
              aria-label="Active brand"
              className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg hover:bg-surface3 focus:border-accent"
            >
              {isDemoMode && <option value="demo-apexpay">Demo brand (synthetic)</option>}
              {backendBrands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            aria-pressed={isEditing}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
 isEditing ? 'border-accent bg-accent/10 text-accent' : 'border-line text-fgMuted hover:bg-surface3 hover:text-fg'
 }`}
          >
            <Edit2 className="h-3.5 w-3.5" /> {isEditing ? 'Editing' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={handleStartBlankBrand}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-fgMuted hover:bg-surface3 hover:text-fg"
            title="Clear all fields to enter a new brand from scratch"
          >
            <Plus className="h-3.5 w-3.5" /> New brand
          </button>
          {isDemoMode && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-fgMuted hover:bg-surface3 hover:text-fg"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset demo
            </button>
          )}
        </div>
      </div>

      {!brandProfile.brandName && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Start with your brand</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fgMuted">
            <li>Name the brand and add its primary domain.</li>
            <li>Register the social profiles and apps you really own, so they are never flagged.</li>
            <li>Add authorised partners allowed to use your marks.</li>
          </ol>
        </div>
      )}

      <div role="tablist" aria-label="Brand sections" className="flex gap-1 overflow-x-auto border-b border-line">
        {([
          ['identity', 'Identity', protectedKeywords.length],
          ['domains', 'Domains', domains.length],
          ['social', 'Social profiles', socials.length],
          ['apps', 'Mobile apps', apps.length],
          ['partners', 'Partners', partners.length],
        ] as const).map(([id, label, n]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={section === id}
            onClick={() => setSection(id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
 section === id ? 'border-accent font-medium text-fg' : 'border-transparent text-fgMuted hover:text-fg'
 }`}
          >
            {label}
            {id !== 'identity' && <span className="ml-1.5 rounded-full bg-surface3 px-1.5 text-xs tabular-nums text-fgMuted">{n}</span>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div role="tabpanel" className={section === 'identity' ? "block" : "hidden"}>
        {/* SECTION 1: Core Brand Identity */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-line space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-bold text-fg flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              Brand Identity &amp; Primary Web Presence
            </h3>
            {brandName ? (
              <span className="text-xs text-ok font-semibold flex items-center gap-1 font-mono">
                <Check className="w-3.5 h-3.5" /> Active Protected Entity
              </span>
            ) : (
              <span className="text-xs text-warn font-mono">Empty Profile State</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Upload & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-fgSubtle block">
                Brand Logo / Official Seal
              </label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-line flex items-center justify-center bg-surface2 overflow-hidden shrink-0 relative group">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Brand Logo" className="w-full h-full object-contain p-1.5" />
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setLogoPreview('')}
                          className="absolute inset-0 bg-canvas/80 text-fg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="w-7 h-7 text-fgMuted mx-auto" />
                      <span className="text-xs text-fgMuted font-mono block mt-1">No Logo</span>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 hover:bg-canvas text-fg text-xs font-medium cursor-pointer border border-line transition-colors">
                      <Upload className="w-3.5 h-3.5 text-accent" />
                      <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-xs text-fgMuted font-mono">PNG, JPG, SVG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Brand Name, Primary Website & Description */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="e.g. ApexPay"
                    className="w-full px-3.5 py-2 text-sm border border-line rounded-xl focus:outline-hidden focus:border-accent bg-surface2 disabled:opacity-70 font-semibold text-fg transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">
                    Official Website URL *
                  </label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={officialWebsite}
                    onChange={e => {
                      setOfficialWebsite(e.target.value);
                      if (websiteError) setWebsiteError('');
                    }}
                    placeholder="https://apexpay.com"
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-hidden focus:border-accent bg-surface2 disabled:opacity-70 font-mono text-fg transition-all ${
 websiteError ? 'border-danger bg-danger/10' : 'border-line'
 }`}
                  />
                  {websiteError && <p className="text-xs text-danger mt-1">{websiteError}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-fgSubtle block mb-1">
                  Brand Commercial Description &amp; Scope
                </label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={brandDescription}
                  onChange={e => setBrandDescription(e.target.value)}
                  placeholder="Describe the company's offerings, products, target audience, and authorized business activities..."
                  className="w-full px-3.5 py-2 text-xs border border-line rounded-xl focus:outline-hidden focus:border-accent bg-surface2 disabled:opacity-70 text-fg leading-relaxed transition-all"
                />
              </div>

              {/* Protected Keyword Chips */}
              <div>
                <label className="text-xs font-semibold text-fgSubtle block mb-1">
                  Protected Trademark Keywords &amp; Variants
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {protectedKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface2 text-accent text-xs font-mono font-medium border border-line"
                    >
                      <span>{kw}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx)}
                          className="hover:text-danger ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {protectedKeywords.length === 0 && (
                    <span className="text-xs text-fgMuted italic">No protected keywords added.</span>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      placeholder="Add keyword variant (e.g. apex wallet)"
                      className="px-3 py-1.5 text-xs border border-line rounded-lg focus:outline-hidden focus:border-accent bg-surface2 text-fg font-mono w-64"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-onAccent text-xs font-medium cursor-pointer transition-all"
                    >
                      Add Keyword
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        <div role="tabpanel" className={section === 'domains' ? "block" : "hidden"}>
        {/* SECTION 2: Official Domains Registry */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                <Globe className="w-4 h-4 text-ok" />
                Official Corporate Domains ({domains.length})
              </h3>
              <p className="text-xs text-fgMuted">
                Authorized hostnames and root domains. Screened against deceptive typosquats and look-alike TLDs.
              </p>
            </div>
            <span className="text-xs text-ok font-mono bg-ok/10 px-2 py-0.5 rounded border border-ok/30">
              Protected Allowlist
            </span>
          </div>

          {/* Domains Grid / Empty State */}
          {domains.length === 0 ? (
            <div className="p-8 text-center bg-surface2/50 rounded-xl border border-dashed border-line text-fgMuted text-xs">
              <Globe className="w-6 h-6 mx-auto mb-1 text-fgMuted" />
              <p>No official domains registered yet. Add your brand's root and API domains below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
              {domains.map((dom, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-surface2 border border-line flex items-center justify-between text-xs hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-ok shrink-0" />
                    <span className="font-mono font-semibold text-fg truncate">{dom}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderVerificationBadge('verified_dns')}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(idx)}
                        className="text-fgMuted hover:text-danger transition-colors p-1 cursor-pointer"
                        title="Remove domain"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Domain Input Form */}
          {isEditing && (
            <div className="pt-2 border-t border-line/60">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => {
                    setNewDomain(e.target.value);
                    if (domainError) setDomainError('');
                  }}
                  placeholder="Enter hostname or domain (e.g. auth.apexpay.com)"
                  className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-hidden focus:border-accent bg-surface2 text-fg font-mono ${
 domainError ? 'border-danger bg-danger/10' : 'border-line'
 }`}
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-onAccent text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Domain</span>
                </button>
              </div>
              {domainError && <p className="text-xs text-danger mt-1">{domainError}</p>}
            </div>
          )}
        </div>
        </div>

        <div role="tabpanel" className={section === 'social' ? "block" : "hidden"}>
        {/* SECTION 3: Official Social Media Accounts */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                <Share2 className="w-4 h-4 text-accent" />
                Official Social Media Channels ({socials.length})
              </h3>
              <p className="text-xs text-fgMuted">
                Official handles and verified platform URLs exempted from impersonation alerts.
              </p>
            </div>
            <span className="text-xs text-accent font-mono bg-accent/10 px-2 py-0.5 rounded border border-accent/30">
              Verified Socials
            </span>
          </div>

          {/* Social Accounts Grid / Empty State */}
          {socials.length === 0 ? (
            <div className="p-8 text-center bg-surface2/50 rounded-xl border border-dashed border-line text-fgMuted text-xs">
              <Share2 className="w-6 h-6 mx-auto mb-1 text-fgMuted" />
              <p>No official social accounts registered yet. Add official Twitter/X, Instagram, or LinkedIn profiles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {socials.map((soc, idx) => (
                <div
                  key={soc.id || idx}
                  className="p-3.5 rounded-xl bg-surface2 border border-line flex flex-col justify-between text-xs space-y-2 hover:border-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-fgSubtle block">
                        {soc.platform}
                      </span>
                      <span className="font-bold text-fg text-sm font-mono mt-0.5 block">{soc.handle}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(idx)}
                        className="text-fgMuted hover:text-danger p-1 cursor-pointer transition-colors"
                        title="Remove Social Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <a
                    href={soc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-fgMuted hover:text-accent flex items-center gap-1 font-mono truncate transition-colors"
                  >
                    <span className="truncate">{soc.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>

                  <div className="flex items-center justify-between pt-1 border-t border-line/60 text-xs">
                    <div>{renderVerificationBadge(soc.verificationStatus)}</div>
                    {soc.notes && <span className="text-fgMuted italic truncate ml-1">{soc.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Social Account Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-surface2 border border-line space-y-3">
              <span className="text-xs font-bold text-fg block font-mono">Add Official Social Account:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Platform</label>
                  <select
                    value={newSocialPlatform}
                    onChange={e => setNewSocialPlatform(e.target.value)}
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden"
                  >
                    <option value="Twitter / X">Twitter / X</option>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Discord">Discord</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Handle / Name *</label>
                  <input
                    type="text"
                    value={newSocialHandle}
                    onChange={e => setNewSocialHandle(e.target.value)}
                    placeholder="@apexpay_official"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg font-mono focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Profile URL *</label>
                  <input
                    type="url"
                    value={newSocialUrl}
                    onChange={e => {
                      setNewSocialUrl(e.target.value);
                      if (socialUrlError) setSocialUrlError('');
                    }}
                    placeholder="https://x.com/apexpay_official"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg font-mono focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Verification Tier</label>
                  <select
                    value={newSocialTier}
                    onChange={e => setNewSocialTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="verified_platform">Platform Verified Badge</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {socialUrlError && <p className="text-xs text-danger">{socialUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddSocial}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-onAccent text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Social Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>

        <div role="tabpanel" className={section === 'apps' ? "block" : "hidden"}>
        {/* SECTION 4: Official Mobile Applications */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-ai" />
                Official Mobile Applications ({apps.length})
              </h3>
              <p className="text-xs text-fgMuted">
                Official apps and authorized publisher signatures used to detect developer mismatches and rogue APKs.
              </p>
            </div>
            <span className="text-xs text-ai font-mono bg-ai/15 px-2 py-0.5 rounded border border-ai/30">
              Authorized Publishers
            </span>
          </div>

          {/* Apps Grid / Empty State */}
          {apps.length === 0 ? (
            <div className="p-8 text-center bg-surface2/50 rounded-xl border border-dashed border-line text-fgMuted text-xs">
              <Smartphone className="w-6 h-6 mx-auto mb-1 text-fgMuted" />
              <p>No official mobile applications cataloged. Add your brand's Google Play or App Store applications below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apps.map((app, idx) => (
                <div
                  key={app.id || idx}
                  className="p-4 rounded-xl bg-surface2 border border-line flex flex-col justify-between text-xs space-y-2 hover:border-ai/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-fg text-sm block">{app.name}</span>
                      <div className="mt-1 space-y-0.5 text-fgMuted text-xs">
                        <p>
                          <strong className="text-fg">Authorized Publisher:</strong>{' '}
                          <span className="text-accent font-semibold">{app.developer}</span>
                        </p>
                        <p>
                          <strong className="text-fg">Store / Marketplace:</strong> <span>{app.store}</span>
                        </p>
                        {app.appId && (
                          <p>
                            <strong className="text-fg">Bundle ID:</strong>{' '}
                            <span className="font-mono text-fgMuted">{app.appId}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveApp(idx)}
                        className="text-fgMuted hover:text-danger p-1 cursor-pointer transition-colors"
                        title="Remove Mobile App"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {app.storeUrl && (
                    <a
                      href={app.storeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-fgMuted hover:text-accent flex items-center gap-1 font-mono truncate transition-colors"
                    >
                      <span className="truncate">{app.storeUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-line/60 text-xs">
                    <div>{renderVerificationBadge(app.verificationStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Mobile App Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-surface2 border border-line space-y-3">
              <span className="text-xs font-bold text-fg block font-mono">Catalog Official Mobile App:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">App Name *</label>
                  <input
                    type="text"
                    value={newAppName}
                    onChange={e => setNewAppName(e.target.value)}
                    placeholder="e.g. ApexPay: Mobile Wallet"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">
                    Authorized Developer / Publisher *
                  </label>
                  <input
                    type="text"
                    value={newAppDeveloper}
                    onChange={e => setNewAppDeveloper(e.target.value)}
                    placeholder="e.g. ApexPay Technologies Inc."
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Store Platform</label>
                  <select
                    value={newAppStore}
                    onChange={e => setNewAppStore(e.target.value)}
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden"
                  >
                    <option value="Google Play Store">Google Play Store</option>
                    <option value="Apple App Store">Apple App Store</option>
                    <option value="Google Play & Apple App Store">Google Play &amp; Apple App Store</option>
                    <option value="Samsung Galaxy Store">Samsung Galaxy Store</option>
                    <option value="Amazon Appstore">Amazon Appstore</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Store Listing URL</label>
                  <input
                    type="url"
                    value={newAppStoreUrl}
                    onChange={e => {
                      setNewAppStoreUrl(e.target.value);
                      if (appUrlError) setAppUrlError('');
                    }}
                    placeholder="https://play.google.com/store/apps/details?id=com.apexpay.wallet"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg font-mono focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Verification Tier</label>
                  <select
                    value={newAppTier}
                    onChange={e => setNewAppTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="verified_store">Verified Store Publisher</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {appUrlError && <p className="text-xs text-danger">{appUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddApp}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-onAccent text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Mobile App</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>

        <div role="tabpanel" className={section === 'partners' ? "block" : "hidden"}>
        {/* SECTION 5: Authorized Third-Party Partners */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                <Users className="w-4 h-4 text-warn" />
                Authorized Third-Party Partners ({partners.length})
              </h3>
              <p className="text-xs text-fgMuted">
                Registered affiliates, merchants, and hardware partners allowed to display brand marks without being
                flagged as rogue impersonators.
              </p>
            </div>
            <span className="text-xs text-warn font-mono bg-warn/10 px-2 py-0.5 rounded border border-warn/30">
              Co-Marketing Directory
            </span>
          </div>

          {/* Partners Grid / Empty State */}
          {partners.length === 0 ? (
            <div className="p-8 text-center bg-surface2/50 rounded-xl border border-dashed border-line text-fgMuted text-xs">
              <Users className="w-6 h-6 mx-auto mb-1 text-fgMuted" />
              <p>No authorized partners registered. Add verified affiliate partners, merchants, or distributors below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {partners.map((partner, idx) => (
                <div
                  key={partner.id || idx}
                  className="p-4 rounded-xl bg-surface2 border border-line flex flex-col justify-between text-xs space-y-2 hover:border-warn/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-fg text-sm block">{partner.name}</span>
                      <span className="text-xs font-medium text-fgSubtle mt-0.5 block">
                        {partner.relationshipType}
                      </span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemovePartner(idx)}
                        className="text-fgMuted hover:text-danger p-1 cursor-pointer transition-colors"
                        title="Remove Partner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-fgMuted space-y-0.5">
                    <p>
                      <strong className="text-fg">Authorized Marks:</strong> {partner.authorizedMarks}
                    </p>
                    {partner.agreementReference && (
                      <p>
                        <strong className="text-fg">Contract Reference:</strong>{' '}
                        <span className="font-mono text-accent">{partner.agreementReference}</span>
                      </p>
                    )}
                  </div>

                  {partner.websiteUrl && (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-fgMuted hover:text-accent flex items-center gap-1 font-mono truncate transition-colors"
                    >
                      <span className="truncate">{partner.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-line/60 text-xs">
                    <div>{renderVerificationBadge(partner.verificationStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Partner Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-surface2 border border-line space-y-3">
              <span className="text-xs font-bold text-fg block font-mono">Register Authorized Commercial Partner:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Partner Organization *</label>
                  <input
                    type="text"
                    value={newPartnerName}
                    onChange={e => setNewPartnerName(e.target.value)}
                    placeholder="e.g. FinTech Daily Media Hub"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Relationship Type</label>
                  <select
                    value={newPartnerType}
                    onChange={e => setNewPartnerType(e.target.value as AuthorizedPartner['relationshipType'])}
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden"
                  >
                    <option value="Merchant Partner">Merchant Partner</option>
                    <option value="Affiliate Network">Affiliate Network</option>
                    <option value="Distribution Partner">Distribution Partner</option>
                    <option value="Hardware / POS Partner">Hardware / POS Partner</option>
                    <option value="Technology Integration">Technology Integration</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Partner Website URL</label>
                  <input
                    type="url"
                    value={newPartnerUrl}
                    onChange={e => {
                      setNewPartnerUrl(e.target.value);
                      if (partnerUrlError) setPartnerUrlError('');
                    }}
                    placeholder="https://partner.example"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg font-mono focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Trademark License / Scope</label>
                  <input
                    type="text"
                    value={newPartnerMarks}
                    onChange={e => setNewPartnerMarks(e.target.value)}
                    placeholder="e.g. Co-Branded Showcase Badge"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Agreement / Ticket Ref</label>
                  <input
                    type="text"
                    value={newPartnerAgreement}
                    onChange={e => setNewPartnerAgreement(e.target.value)}
                    placeholder="e.g. PMA-2025-08"
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg font-mono focus:outline-hidden focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-fgSubtle block mb-1">Verification Tier</label>
                  <select
                    value={newPartnerTier}
                    onChange={e => setNewPartnerTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-fg focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="contract_verified">Contract License Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {partnerUrlError && <p className="text-xs text-danger">{partnerUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddPartner}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-onAccent text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Partner</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/95 px-1 py-3 backdrop-blur-sm">
          <p
            role="status"
            className={`flex items-center gap-1.5 text-sm ${
 saveStatus.kind === 'ok' ? 'text-ok' : saveStatus.kind === 'error' ? 'text-danger' : saveStatus.kind === 'local' ? 'text-warn' : 'text-fgMuted'
 }`}
          >
            {saveStatus.kind === 'ok' && <CheckCircle2 className="h-4 w-4" />}
            {(saveStatus.kind === 'error' || saveStatus.kind === 'local') && <AlertCircle className="h-4 w-4" />}
            {saveStatus.kind === 'saving' ? 'Saving…' : saveStatus.message || 'Changes are not saved until you press Save.'}
          </p>
          <button
            type="submit"
            disabled={saveStatus.kind === 'saving'}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-onAccent hover:bg-accentHover disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save brand
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Resetting Demo */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full border border-line space-y-4 animate-in fade-in zoom-in-95 duration-150 text-fg">
            <div className="flex items-center gap-3 text-warn">
              <div className="p-2 rounded-xl bg-warn/10 border border-warn/30">
                <AlertCircle className="w-6 h-6 text-warn" />
              </div>
              <div>
                <h3 className="font-bold text-fg text-sm">Reset to Demo Brand Profile?</h3>
                <span className="text-xs text-fgMuted">Restore fictional ApexPay assets</span>
              </div>
            </div>

            <p className="text-xs text-fgMuted leading-relaxed">
              Are you sure you want to restore the default fictional <strong className="text-fg">ApexPay</strong> demo profile?
              Any custom brand assets, domains, or partners added in this browser session will be replaced.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-line text-fgMuted hover:text-fg hover:bg-surface2 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-onAccent text-xs font-semibold shadow-accent/30 cursor-pointer transition-all"
              >
                Yes, Restore ApexPay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandProfileView;

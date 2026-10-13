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
  HelpCircle,
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

  // Modal State for Editing Existing Assets
  const [editingAsset, setEditingAsset] = useState<{
    type: 'social' | 'app' | 'partner' | 'domain';
    index: number;
    data: any;
  } | null>(null);

  // Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
  const handleSaveProfile = (e: React.FormEvent) => {
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

    if (backendOnline) {
      const payload = {
        name: brandName.trim(),
        description: brandDescription.trim(),
        domains: domains.map((d, i) => ({ domain: d, is_primary: i === 0 })),
        social_handles: socials.map(s => ({ platform: s.platform, handle: s.handle, url: s.url })),
        app_identifiers: apps.map(a => ({ platform: a.store || 'android_play_store', identifier: a.appId || a.name, app_name: a.name })),
        publishers: apps.map(a => ({ publisher_name: a.developer, platform: a.store })),
      };

      if (selectedBackendBrandId) {
        api.updateBrand(selectedBackendBrandId, payload).catch(err => console.warn('Could not update backend brand:', err));
      } else {
        api.createBrand(payload).then(res => {
          if (res?.success) refreshBackendData();
        }).catch(err => console.warn('Could not register backend brand:', err));
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
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

  // Helper Badge for Verification Tiers
  const renderVerificationBadge = (tier: AssetVerificationTier) => {
    switch (tier) {
      case 'verified_dns':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck2 className="w-3 h-3 text-emerald-600" />
            DNS Verified
          </span>
        );
      case 'verified_platform':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            Platform Verified Badge
          </span>
        );
      case 'verified_store':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            Store Publisher Keystore
          </span>
        );
      case 'contract_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
            Contract License Verified
          </span>
        );
      case 'user_declared':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Info className="w-3 h-3 text-slate-500" />
            User-Declared (Unchecked)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <BadgeAlert className="w-3 h-3 text-amber-600" />
            Unverified
          </span>
        );
    }
  };

  const isApexPayDemo = brandName.toLowerCase() === 'apexpay';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Informative Header & Environment Notice */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Official Brand Profile • Stage 2 Registry
            </span>
            {isApexPayDemo && (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200">
                Sample Prototype Brand
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Protected Brand Profile &amp; Asset Allowlist
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Registered official assets are protected from false-positive flagging across all Suraksha monitoring modules.
            Data is persisted locally in your browser's session storage.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {backendBrands.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Active:</span>
              <select
                value={selectedBackendBrandId || 'demo-apexpay'}
                onChange={(e) => selectBrandById(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="demo-apexpay">ApexPay (Demo Sandbox)</option>
                {backendBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (DB Record)
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              isEditing
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Editing Mode: ON' : 'Switch to Edit Mode'}</span>
          </button>

          <button
            type="button"
            onClick={handleStartBlankBrand}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors flex items-center gap-1.5"
            title="Clear all fields to enter a new brand from scratch"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Blank Brand</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5"
            title="Reset to ApexPay demo profile"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Persistence Notice Alert */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-slate-800">Browser-Local Storage Notice:</strong>
          <p>
            Profile changes are saved in your browser's session storage. Registered official domains, handles, and apps
            are referenced by the Social Media Monitor, App Store Monitor, and Threat Graph to prevent false-positive alerts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* SECTION 1: Core Brand Identity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              1. Brand Identity &amp; Primary Web Presence
            </h3>
            {brandName ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Active Protected Entity
              </span>
            ) : (
              <span className="text-xs text-amber-600 font-medium">Empty Profile State</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Upload & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Brand Logo / Official Seal</label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0 relative group">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Brand Logo" className="w-full h-full object-contain p-1.5" />
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setLogoPreview('')}
                          className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="w-7 h-7 text-slate-400 mx-auto" />
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">No Logo</span>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer border border-slate-300 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400">PNG, JPG, SVG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Brand Name, Primary Website & Description */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="e.g. ApexPay"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 disabled:bg-slate-50 font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
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
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-hidden focus:border-blue-600 disabled:bg-slate-50 font-mono ${
                      websiteError ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {websiteError && <p className="text-[11px] text-rose-600 mt-1">{websiteError}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Brand Commercial Description &amp; Scope
                </label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={brandDescription}
                  onChange={e => setBrandDescription(e.target.value)}
                  placeholder="Describe the company's offerings, products, target audience, and authorized business activities..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 disabled:bg-slate-50 leading-relaxed"
                />
              </div>

              {/* Protected Keyword Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Protected Trademark Keywords &amp; Variants
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {protectedKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-mono font-medium border border-slate-200"
                    >
                      <span>{kw}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx)}
                          className="hover:text-rose-600 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {protectedKeywords.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No protected keywords added.</span>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      placeholder="Add keyword variant (e.g. apex wallet)"
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 font-mono w-64"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
                    >
                      Add Keyword
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Official Domains Registry */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                2. Official Corporate Domains ({domains.length})
              </h3>
              <p className="text-xs text-slate-500">
                Authorized hostnames and root domains. Screened against deceptive typosquats and look-alike TLDs.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Protected Allowlist</span>
          </div>

          {/* Domains Grid / Empty State */}
          {domains.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
              <Globe className="w-6 h-6 mx-auto mb-1 text-slate-300" />
              <p>No official domains registered yet. Add your brand's root and API domains below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {domains.map((dom, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-mono font-semibold text-slate-900 truncate">{dom}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderVerificationBadge('verified_dns')}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
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
            <div className="pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => {
                    setNewDomain(e.target.value);
                    if (domainError) setDomainError('');
                  }}
                  placeholder="Enter hostname or domain (e.g. auth.apexpay.com)"
                  className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-hidden focus:border-blue-600 font-mono ${
                    domainError ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Domain</span>
                </button>
              </div>
              {domainError && <p className="text-[11px] text-rose-600 mt-1">{domainError}</p>}
            </div>
          )}
        </div>

        {/* SECTION 3: Official Social Media Accounts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600" />
                3. Official Social Media Channels ({socials.length})
              </h3>
              <p className="text-xs text-slate-500">
                Official handles and verified platform URLs exempted from impersonation alerts.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Verified Socials</span>
          </div>

          {/* Social Accounts Grid / Empty State */}
          {socials.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
              <Share2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
              <p>No official social accounts registered yet. Add official Twitter/X, Instagram, or LinkedIn profiles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {socials.map((soc, idx) => (
                <div
                  key={soc.id || idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-xs space-y-2 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">
                        {soc.platform}
                      </span>
                      <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">{soc.handle}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
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
                    className="text-[11px] text-slate-600 hover:text-blue-600 flex items-center gap-1 font-mono truncate"
                  >
                    <span className="truncate">{soc.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                    <div>{renderVerificationBadge(soc.verificationStatus)}</div>
                    {soc.notes && <span className="text-slate-400 italic truncate ml-1">{soc.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Social Account Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Add Official Social Account:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Platform</label>
                  <select
                    value={newSocialPlatform}
                    onChange={e => setNewSocialPlatform(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
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
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Handle / Name *</label>
                  <input
                    type="text"
                    value={newSocialHandle}
                    onChange={e => setNewSocialHandle(e.target.value)}
                    placeholder="@apexpay_official"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Profile URL *</label>
                  <input
                    type="url"
                    value={newSocialUrl}
                    onChange={e => {
                      setNewSocialUrl(e.target.value);
                      if (socialUrlError) setSocialUrlError('');
                    }}
                    placeholder="https://x.com/apexpay_official"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Verification Tier</label>
                  <select
                    value={newSocialTier}
                    onChange={e => setNewSocialTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="verified_platform">Platform Verified Badge</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {socialUrlError && <p className="text-[11px] text-rose-600">{socialUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddSocial}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Social Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Official Mobile Applications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-600" />
                4. Official Mobile Applications ({apps.length})
              </h3>
              <p className="text-xs text-slate-500">
                Official apps and authorized publisher signatures used to detect developer mismatches and rogue APKs.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Authorized Publishers</span>
          </div>

          {/* Apps Grid / Empty State */}
          {apps.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
              <Smartphone className="w-6 h-6 mx-auto mb-1 text-slate-300" />
              <p>No official mobile applications cataloged. Add your brand's Google Play or App Store applications below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apps.map((app, idx) => (
                <div
                  key={app.id || idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-xs space-y-2 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{app.name}</span>
                      <div className="mt-1 space-y-0.5 text-slate-600 text-[11px]">
                        <p>
                          <strong className="text-slate-700">Authorized Publisher:</strong>{' '}
                          <span className="text-purple-700 font-bold">{app.developer}</span>
                        </p>
                        <p>
                          <strong className="text-slate-700">Store / Marketplace:</strong> <span>{app.store}</span>
                        </p>
                        {app.appId && (
                          <p>
                            <strong className="text-slate-700">Bundle ID:</strong>{' '}
                            <span className="font-mono text-slate-600">{app.appId}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveApp(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
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
                      className="text-[11px] text-slate-600 hover:text-purple-700 flex items-center gap-1 font-mono truncate"
                    >
                      <span className="truncate">{app.storeUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                    <div>{renderVerificationBadge(app.verificationStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Mobile App Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Catalog Official Mobile App:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">App Name *</label>
                  <input
                    type="text"
                    value={newAppName}
                    onChange={e => setNewAppName(e.target.value)}
                    placeholder="e.g. ApexPay: Mobile Wallet"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    Authorized Developer / Publisher *
                  </label>
                  <input
                    type="text"
                    value={newAppDeveloper}
                    onChange={e => setNewAppDeveloper(e.target.value)}
                    placeholder="e.g. ApexPay Technologies Inc."
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Store Platform</label>
                  <select
                    value={newAppStore}
                    onChange={e => setNewAppStore(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="Google Play Store">Google Play Store</option>
                    <option value="Apple App Store">Apple App Store</option>
                    <option value="Google Play & Apple App Store">Google Play &amp; Apple App Store</option>
                    <option value="Samsung Galaxy Store">Samsung Galaxy Store</option>
                    <option value="Amazon Appstore">Amazon Appstore</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Store Listing URL</label>
                  <input
                    type="url"
                    value={newAppStoreUrl}
                    onChange={e => {
                      setNewAppStoreUrl(e.target.value);
                      if (appUrlError) setAppUrlError('');
                    }}
                    placeholder="https://play.google.com/store/apps/details?id=com.apexpay.wallet"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Verification Tier</label>
                  <select
                    value={newAppTier}
                    onChange={e => setNewAppTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="verified_store">Verified Store Publisher</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {appUrlError && <p className="text-[11px] text-rose-600">{appUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddApp}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Mobile App</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Authorized Third-Party Partners */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                5. Authorized Third-Party Partners ({partners.length})
              </h3>
              <p className="text-xs text-slate-500">
                Registered affiliates, merchants, and hardware partners allowed to display brand marks without being
                flagged as rogue impersonators.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Co-Marketing Directory</span>
          </div>

          {/* Partners Grid / Empty State */}
          {partners.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
              <Users className="w-6 h-6 mx-auto mb-1 text-slate-300" />
              <p>No authorized partners registered. Add verified affiliate partners, merchants, or distributors below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {partners.map((partner, idx) => (
                <div
                  key={partner.id || idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-xs space-y-2 hover:border-amber-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{partner.name}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-700 mt-0.5 block tracking-wider">
                        {partner.relationshipType}
                      </span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemovePartner(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove Partner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      <strong className="text-slate-700">Authorized Marks:</strong> {partner.authorizedMarks}
                    </p>
                    {partner.agreementReference && (
                      <p>
                        <strong className="text-slate-700">Contract Reference:</strong>{' '}
                        <span className="font-mono text-slate-700">{partner.agreementReference}</span>
                      </p>
                    )}
                  </div>

                  {partner.websiteUrl && (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-slate-600 hover:text-amber-700 flex items-center gap-1 font-mono truncate"
                    >
                      <span className="truncate">{partner.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                    <div>{renderVerificationBadge(partner.verificationStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Partner Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Register Authorized Commercial Partner:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Partner Organization *</label>
                  <input
                    type="text"
                    value={newPartnerName}
                    onChange={e => setNewPartnerName(e.target.value)}
                    placeholder="e.g. FinTech Daily Media Hub"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Relationship Type</label>
                  <select
                    value={newPartnerType}
                    onChange={e => setNewPartnerType(e.target.value as AuthorizedPartner['relationshipType'])}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="Merchant Partner">Merchant Partner</option>
                    <option value="Affiliate Network">Affiliate Network</option>
                    <option value="Distribution Partner">Distribution Partner</option>
                    <option value="Hardware / POS Partner">Hardware / POS Partner</option>
                    <option value="Technology Integration">Technology Integration</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Partner Website URL</label>
                  <input
                    type="url"
                    value={newPartnerUrl}
                    onChange={e => {
                      setNewPartnerUrl(e.target.value);
                      if (partnerUrlError) setPartnerUrlError('');
                    }}
                    placeholder="https://partner.example"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Trademark License / Scope</label>
                  <input
                    type="text"
                    value={newPartnerMarks}
                    onChange={e => setNewPartnerMarks(e.target.value)}
                    placeholder="e.g. Co-Branded Showcase Badge"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Agreement / Ticket Ref</label>
                  <input
                    type="text"
                    value={newPartnerAgreement}
                    onChange={e => setNewPartnerAgreement(e.target.value)}
                    placeholder="e.g. PMA-2025-08"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Verification Tier</label>
                  <select
                    value={newPartnerTier}
                    onChange={e => setNewPartnerTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="contract_verified">Contract License Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {partnerUrlError && <p className="text-[11px] text-rose-600">{partnerUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddPartner}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Partner</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-white shadow-md">
          <div className="flex items-center gap-2 text-xs">
            {saveSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Brand Profile saved! Active across all Suraksha monitoring modules.
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                Saved assets are exempted from automatic malicious classification.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile to Session</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Resetting Demo */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reset to Demo Brand Profile?</h3>
                <span className="text-xs text-slate-500">Restore fictional ApexPay assets</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to restore the default fictional <strong>ApexPay</strong> demo profile?
              Any custom brand assets, domains, or partners added in this browser session will be replaced.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-sm"
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

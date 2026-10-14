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

  const renderVerificationBadge = (tier: AssetVerificationTier) => {
    switch (tier) {
      case 'verified_dns':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/30 shadow-xs">
            <FileCheck2 className="w-3 h-3 text-[#00E5A0]" />
            DNS Verified
          </span>
        );
      case 'verified_platform':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-[#00D9FF]" />
            Platform Verified
          </span>
        );
      case 'verified_store':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-[#8B5CF6]" />
            Store Publisher Keystore
          </span>
        );
      case 'contract_verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-[#1265F8]/15 text-[#00D9FF] border border-[#1265F8]/40 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-[#00D9FF]" />
            Contract License Verified
          </span>
        );
      case 'user_declared':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-[#0A1C3D] text-[#91ACD1] border border-[#123E78]">
            <Info className="w-3 h-3 text-[#91ACD1]" />
            User-Declared (Unchecked)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/30">
            <BadgeAlert className="w-3 h-3 text-[#FFB020]" />
            Unverified
          </span>
        );
    }
  };

  const isApexPayDemo = isDemoMode && brandName.toLowerCase() === 'apexpay';

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-[#F1F5FF]">
      {/* 1. Header & Stage Notice */}
      <div className="bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[320px] h-[180px] bg-[#1265F8]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-[#1265F8]/20 text-[#00D9FF] border border-[#00D9FF]/30">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00D9FF] font-mono">
              Official Brand Profile • Stage 2 Registry
            </span>
            {isApexPayDemo && (
              <span className="bg-[#0A1C3D] text-[#91ACD1] text-[10px] font-mono px-2 py-0.5 rounded-md border border-[#123E78]">
                Sample Prototype Brand
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Protected Brand Profile &amp; Asset Allowlist
          </h2>
          <p className="text-xs text-[#91ACD1] max-w-2xl leading-relaxed">
            Registered official assets are protected from false-positive flagging across all Suraksha monitoring modules.
            Data is persisted in your workspace session and synchronized with backend registry.
          </p>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {backendBrands.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#06142D] px-2.5 py-1.5 rounded-xl border border-[#123E78]">
              <span className="text-[11px] font-semibold text-[#91ACD1]">Active:</span>
              <select
                value={selectedBackendBrandId || (isDemoMode ? 'demo-apexpay' : backendBrands[0]?.id || '')}
                onChange={(e) => selectBrandById(e.target.value)}
                className="bg-[#0A1C3D] border border-[#123E78] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#F1F5FF] focus:outline-hidden cursor-pointer"
              >
                {isDemoMode && <option value="demo-apexpay">ApexPay (Demo Sandbox)</option>}
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
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isEditing
                ? 'bg-[#1265F8] text-white border-[#00D9FF]/50 shadow-md shadow-[#1265F8]/30'
                : 'bg-[#0A1C3D] text-[#91ACD1] border-[#123E78] hover:text-white hover:bg-[#06142D]'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Editing Mode: ON' : 'Switch to Edit Mode'}</span>
          </button>

          <button
            type="button"
            onClick={handleStartBlankBrand}
            className="px-3.5 py-2 rounded-xl bg-[#0A1C3D] hover:bg-[#06142D] text-[#F1F5FF] text-xs font-medium border border-[#123E78] hover:border-[#00D9FF]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Clear all fields to enter a new brand from scratch"
          >
            <Plus className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>New Blank Brand</span>
          </button>

          {isDemoMode && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0A1C3D] hover:bg-[#06142D] text-[#F1F5FF] text-xs font-semibold border border-[#123E78] hover:border-[#FF315B]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Reset to ApexPay demo profile"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FFB020]" />
              <span>Reset Demo</span>
            </button>
          )}
        </div>
      </div>

      {/* Persistence Notice Alert */}
      <div className="p-3.5 rounded-xl bg-[#06142D] border border-[#123E78] text-xs text-[#91ACD1] flex items-start gap-2.5 shadow-md">
        <Info className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-[#F1F5FF]">Allowlist Protection Guarantee:</strong>
          <p>
            Profile changes are saved in your workspace session. Registered official domains, handles, and apps
            are referenced by the Social Media Monitor, App Store Monitor, and Threat Graph to prevent false-positive alerts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* SECTION 1: Core Brand Identity */}
        <div className="bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1265F8]" />
              1. Brand Identity &amp; Primary Web Presence
            </h3>
            {brandName ? (
              <span className="text-xs text-[#00E5A0] font-semibold flex items-center gap-1 font-mono">
                <Check className="w-3.5 h-3.5" /> Active Protected Entity
              </span>
            ) : (
              <span className="text-xs text-[#FFB020] font-mono">Empty Profile State</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Upload & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#91ACD1] block font-mono uppercase tracking-wider">
                Brand Logo / Official Seal
              </label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#123E78] flex items-center justify-center bg-[#0A1C3D] overflow-hidden shrink-0 relative group">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Brand Logo" className="w-full h-full object-contain p-1.5" />
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setLogoPreview('')}
                          className="absolute inset-0 bg-[#030D22]/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-4 h-4 text-[#FF315B]" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="w-7 h-7 text-[#91ACD1] mx-auto" />
                      <span className="text-[9px] text-[#91ACD1] font-mono block mt-1">No Logo</span>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1C3D] hover:bg-[#030D22] text-[#F1F5FF] text-xs font-medium cursor-pointer border border-[#123E78] transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[#00D9FF]" />
                      <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-[#91ACD1] font-mono">PNG, JPG, SVG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Brand Name, Primary Website & Description */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="e.g. ApexPay"
                    className="w-full px-3.5 py-2 text-sm border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] disabled:opacity-70 font-semibold text-[#F1F5FF] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider">
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
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] disabled:opacity-70 font-mono text-[#F1F5FF] transition-all ${
                      websiteError ? 'border-[#FF315B] bg-[#FF315B]/10' : 'border-[#123E78]'
                    }`}
                  />
                  {websiteError && <p className="text-[11px] text-[#FF315B] mt-1">{websiteError}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider">
                  Brand Commercial Description &amp; Scope
                </label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={brandDescription}
                  onChange={e => setBrandDescription(e.target.value)}
                  placeholder="Describe the company's offerings, products, target audience, and authorized business activities..."
                  className="w-full px-3.5 py-2 text-xs border border-[#123E78] rounded-xl focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] disabled:opacity-70 text-[#F1F5FF] leading-relaxed transition-all"
                />
              </div>

              {/* Protected Keyword Chips */}
              <div>
                <label className="text-xs font-semibold text-[#91ACD1] block mb-1 font-mono uppercase tracking-wider">
                  Protected Trademark Keywords &amp; Variants
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {protectedKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0A1C3D] text-[#00D9FF] text-xs font-mono font-medium border border-[#123E78]"
                    >
                      <span>{kw}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx)}
                          className="hover:text-[#FF315B] ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {protectedKeywords.length === 0 && (
                    <span className="text-xs text-[#91ACD1] italic">No protected keywords added.</span>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      placeholder="Add keyword variant (e.g. apex wallet)"
                      className="px-3 py-1.5 text-xs border border-[#123E78] rounded-lg focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] font-mono w-64"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-3 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-medium cursor-pointer transition-all shadow-xs"
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
        <div className="bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00E5A0]" />
                2. Official Corporate Domains ({domains.length})
              </h3>
              <p className="text-xs text-[#91ACD1]">
                Authorized hostnames and root domains. Screened against deceptive typosquats and look-alike TLDs.
              </p>
            </div>
            <span className="text-[11px] text-[#00E5A0] font-mono bg-[#00E5A0]/10 px-2 py-0.5 rounded border border-[#00E5A0]/30">
              Protected Allowlist
            </span>
          </div>

          {/* Domains Grid / Empty State */}
          {domains.length === 0 ? (
            <div className="p-8 text-center bg-[#0A1C3D]/50 rounded-xl border border-dashed border-[#123E78] text-[#91ACD1] text-xs">
              <Globe className="w-6 h-6 mx-auto mb-1 text-[#91ACD1]" />
              <p>No official domains registered yet. Add your brand's root and API domains below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {domains.map((dom, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#0A1C3D] border border-[#123E78] flex items-center justify-between text-xs hover:border-[#00D9FF]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#00E5A0] shrink-0 shadow-[0_0_8px_#00E5A0]" />
                    <span className="font-mono font-semibold text-[#F1F5FF] truncate">{dom}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderVerificationBadge('verified_dns')}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(idx)}
                        className="text-[#91ACD1] hover:text-[#FF315B] transition-colors p-1 cursor-pointer"
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
            <div className="pt-2 border-t border-[#123E78]/60">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => {
                    setNewDomain(e.target.value);
                    if (domainError) setDomainError('');
                  }}
                  placeholder="Enter hostname or domain (e.g. auth.apexpay.com)"
                  className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-hidden focus:border-[#00D9FF] bg-[#0A1C3D] text-[#F1F5FF] font-mono ${
                    domainError ? 'border-[#FF315B] bg-[#FF315B]/10' : 'border-[#123E78]'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="px-4 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Domain</span>
                </button>
              </div>
              {domainError && <p className="text-[11px] text-[#FF315B] mt-1">{domainError}</p>}
            </div>
          )}
        </div>

        {/* SECTION 3: Official Social Media Accounts */}
        <div className="bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#1265F8]" />
                3. Official Social Media Channels ({socials.length})
              </h3>
              <p className="text-xs text-[#91ACD1]">
                Official handles and verified platform URLs exempted from impersonation alerts.
              </p>
            </div>
            <span className="text-[11px] text-[#00D9FF] font-mono bg-[#00D9FF]/10 px-2 py-0.5 rounded border border-[#00D9FF]/30">
              Verified Socials
            </span>
          </div>

          {/* Social Accounts Grid / Empty State */}
          {socials.length === 0 ? (
            <div className="p-8 text-center bg-[#0A1C3D]/50 rounded-xl border border-dashed border-[#123E78] text-[#91ACD1] text-xs">
              <Share2 className="w-6 h-6 mx-auto mb-1 text-[#91ACD1]" />
              <p>No official social accounts registered yet. Add official Twitter/X, Instagram, or LinkedIn profiles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {socials.map((soc, idx) => (
                <div
                  key={soc.id || idx}
                  className="p-3.5 rounded-xl bg-[#0A1C3D] border border-[#123E78] flex flex-col justify-between text-xs space-y-2 hover:border-[#1265F8] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#00D9FF] tracking-wider block font-mono">
                        {soc.platform}
                      </span>
                      <span className="font-bold text-[#F1F5FF] text-sm font-mono mt-0.5 block">{soc.handle}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(idx)}
                        className="text-[#91ACD1] hover:text-[#FF315B] p-1 cursor-pointer transition-colors"
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
                    className="text-[11px] text-[#91ACD1] hover:text-[#00D9FF] flex items-center gap-1 font-mono truncate transition-colors"
                  >
                    <span className="truncate">{soc.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>

                  <div className="flex items-center justify-between pt-1 border-t border-[#123E78]/60 text-[10px]">
                    <div>{renderVerificationBadge(soc.verificationStatus)}</div>
                    {soc.notes && <span className="text-[#91ACD1] italic truncate ml-1">{soc.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Social Account Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] space-y-3">
              <span className="text-xs font-bold text-white block font-mono">Add Official Social Account:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Platform</label>
                  <select
                    value={newSocialPlatform}
                    onChange={e => setNewSocialPlatform(e.target.value)}
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden"
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
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Handle / Name *</label>
                  <input
                    type="text"
                    value={newSocialHandle}
                    onChange={e => setNewSocialHandle(e.target.value)}
                    placeholder="@apexpay_official"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] font-mono focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Profile URL *</label>
                  <input
                    type="url"
                    value={newSocialUrl}
                    onChange={e => {
                      setNewSocialUrl(e.target.value);
                      if (socialUrlError) setSocialUrlError('');
                    }}
                    placeholder="https://x.com/apexpay_official"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] font-mono focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Verification Tier</label>
                  <select
                    value={newSocialTier}
                    onChange={e => setNewSocialTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="verified_platform">Platform Verified Badge</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {socialUrlError && <p className="text-[11px] text-[#FF315B]">{socialUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddSocial}
                  className="px-4 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Social Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Official Mobile Applications */}
        <div className="bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#8B5CF6]" />
                4. Official Mobile Applications ({apps.length})
              </h3>
              <p className="text-xs text-[#91ACD1]">
                Official apps and authorized publisher signatures used to detect developer mismatches and rogue APKs.
              </p>
            </div>
            <span className="text-[11px] text-[#8B5CF6] font-mono bg-[#8B5CF6]/15 px-2 py-0.5 rounded border border-[#8B5CF6]/30">
              Authorized Publishers
            </span>
          </div>

          {/* Apps Grid / Empty State */}
          {apps.length === 0 ? (
            <div className="p-8 text-center bg-[#0A1C3D]/50 rounded-xl border border-dashed border-[#123E78] text-[#91ACD1] text-xs">
              <Smartphone className="w-6 h-6 mx-auto mb-1 text-[#91ACD1]" />
              <p>No official mobile applications cataloged. Add your brand's Google Play or App Store applications below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apps.map((app, idx) => (
                <div
                  key={app.id || idx}
                  className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] flex flex-col justify-between text-xs space-y-2 hover:border-[#8B5CF6]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-[#F1F5FF] text-sm block">{app.name}</span>
                      <div className="mt-1 space-y-0.5 text-[#91ACD1] text-[11px]">
                        <p>
                          <strong className="text-white">Authorized Publisher:</strong>{' '}
                          <span className="text-[#00D9FF] font-semibold">{app.developer}</span>
                        </p>
                        <p>
                          <strong className="text-white">Store / Marketplace:</strong> <span>{app.store}</span>
                        </p>
                        {app.appId && (
                          <p>
                            <strong className="text-white">Bundle ID:</strong>{' '}
                            <span className="font-mono text-[#91ACD1]">{app.appId}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveApp(idx)}
                        className="text-[#91ACD1] hover:text-[#FF315B] p-1 cursor-pointer transition-colors"
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
                      className="text-[11px] text-[#91ACD1] hover:text-[#00D9FF] flex items-center gap-1 font-mono truncate transition-colors"
                    >
                      <span className="truncate">{app.storeUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#123E78]/60 text-[10px]">
                    <div>{renderVerificationBadge(app.verificationStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Mobile App Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] space-y-3">
              <span className="text-xs font-bold text-white block font-mono">Catalog Official Mobile App:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">App Name *</label>
                  <input
                    type="text"
                    value={newAppName}
                    onChange={e => setNewAppName(e.target.value)}
                    placeholder="e.g. ApexPay: Mobile Wallet"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">
                    Authorized Developer / Publisher *
                  </label>
                  <input
                    type="text"
                    value={newAppDeveloper}
                    onChange={e => setNewAppDeveloper(e.target.value)}
                    placeholder="e.g. ApexPay Technologies Inc."
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Store Platform</label>
                  <select
                    value={newAppStore}
                    onChange={e => setNewAppStore(e.target.value)}
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden"
                  >
                    <option value="Google Play Store">Google Play Store</option>
                    <option value="Apple App Store">Apple App Store</option>
                    <option value="Google Play & Apple App Store">Google Play &amp; Apple App Store</option>
                    <option value="Samsung Galaxy Store">Samsung Galaxy Store</option>
                    <option value="Amazon Appstore">Amazon Appstore</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Store Listing URL</label>
                  <input
                    type="url"
                    value={newAppStoreUrl}
                    onChange={e => {
                      setNewAppStoreUrl(e.target.value);
                      if (appUrlError) setAppUrlError('');
                    }}
                    placeholder="https://play.google.com/store/apps/details?id=com.apexpay.wallet"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] font-mono focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Verification Tier</label>
                  <select
                    value={newAppTier}
                    onChange={e => setNewAppTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="verified_store">Verified Store Publisher</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {appUrlError && <p className="text-[11px] text-[#FF315B]">{appUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddApp}
                  className="px-4 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Mobile App</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Authorized Third-Party Partners */}
        <div className="bg-[#06142D] p-5 sm:p-6 rounded-2xl border border-[#123E78] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#123E78] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FFB020]" />
                5. Authorized Third-Party Partners ({partners.length})
              </h3>
              <p className="text-xs text-[#91ACD1]">
                Registered affiliates, merchants, and hardware partners allowed to display brand marks without being
                flagged as rogue impersonators.
              </p>
            </div>
            <span className="text-[11px] text-[#FFB020] font-mono bg-[#FFB020]/10 px-2 py-0.5 rounded border border-[#FFB020]/30">
              Co-Marketing Directory
            </span>
          </div>

          {/* Partners Grid / Empty State */}
          {partners.length === 0 ? (
            <div className="p-8 text-center bg-[#0A1C3D]/50 rounded-xl border border-dashed border-[#123E78] text-[#91ACD1] text-xs">
              <Users className="w-6 h-6 mx-auto mb-1 text-[#91ACD1]" />
              <p>No authorized partners registered. Add verified affiliate partners, merchants, or distributors below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {partners.map((partner, idx) => (
                <div
                  key={partner.id || idx}
                  className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] flex flex-col justify-between text-xs space-y-2 hover:border-[#FFB020]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-[#F1F5FF] text-sm block">{partner.name}</span>
                      <span className="text-[10px] uppercase font-bold text-[#FFB020] mt-0.5 block tracking-wider font-mono">
                        {partner.relationshipType}
                      </span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemovePartner(idx)}
                        className="text-[#91ACD1] hover:text-[#FF315B] p-1 cursor-pointer transition-colors"
                        title="Remove Partner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-[#91ACD1] space-y-0.5">
                    <p>
                      <strong className="text-white">Authorized Marks:</strong> {partner.authorizedMarks}
                    </p>
                    {partner.agreementReference && (
                      <p>
                        <strong className="text-white">Contract Reference:</strong>{' '}
                        <span className="font-mono text-[#00D9FF]">{partner.agreementReference}</span>
                      </p>
                    )}
                  </div>

                  {partner.websiteUrl && (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#91ACD1] hover:text-[#00D9FF] flex items-center gap-1 font-mono truncate transition-colors"
                    >
                      <span className="truncate">{partner.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#123E78]/60 text-[10px]">
                    <div>{renderVerificationBadge(partner.verificationStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Partner Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-[#0A1C3D] border border-[#123E78] space-y-3">
              <span className="text-xs font-bold text-white block font-mono">Register Authorized Commercial Partner:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Partner Organization *</label>
                  <input
                    type="text"
                    value={newPartnerName}
                    onChange={e => setNewPartnerName(e.target.value)}
                    placeholder="e.g. FinTech Daily Media Hub"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Relationship Type</label>
                  <select
                    value={newPartnerType}
                    onChange={e => setNewPartnerType(e.target.value as AuthorizedPartner['relationshipType'])}
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden"
                  >
                    <option value="Merchant Partner">Merchant Partner</option>
                    <option value="Affiliate Network">Affiliate Network</option>
                    <option value="Distribution Partner">Distribution Partner</option>
                    <option value="Hardware / POS Partner">Hardware / POS Partner</option>
                    <option value="Technology Integration">Technology Integration</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Partner Website URL</label>
                  <input
                    type="url"
                    value={newPartnerUrl}
                    onChange={e => {
                      setNewPartnerUrl(e.target.value);
                      if (partnerUrlError) setPartnerUrlError('');
                    }}
                    placeholder="https://partner.example"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] font-mono focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Trademark License / Scope</label>
                  <input
                    type="text"
                    value={newPartnerMarks}
                    onChange={e => setNewPartnerMarks(e.target.value)}
                    placeholder="e.g. Co-Branded Showcase Badge"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Agreement / Ticket Ref</label>
                  <input
                    type="text"
                    value={newPartnerAgreement}
                    onChange={e => setNewPartnerAgreement(e.target.value)}
                    placeholder="e.g. PMA-2025-08"
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] font-mono focus:outline-hidden focus:border-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#91ACD1] uppercase block mb-1 font-mono">Verification Tier</label>
                  <select
                    value={newPartnerTier}
                    onChange={e => setNewPartnerTier(e.target.value as AssetVerificationTier)}
                    className="w-full text-xs border border-[#123E78] rounded-lg px-2.5 py-1.5 bg-[#06142D] text-[#F1F5FF] focus:outline-hidden"
                  >
                    <option value="user_declared">User-Declared</option>
                    <option value="contract_verified">Contract License Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {partnerUrlError && <p className="text-[11px] text-[#FF315B]">{partnerUrlError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddPartner}
                  className="px-4 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Partner</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#030D22] via-[#06142D] to-[#0A1C3D] rounded-2xl border border-[#123E78] shadow-2xl">
          <div className="flex items-center gap-2 text-xs">
            {saveSuccess ? (
              <span className="text-[#00E5A0] flex items-center gap-1.5 font-semibold font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#00E5A0]" />
                Brand Profile saved! Active across all Suraksha monitoring modules.
              </span>
            ) : (
              <span className="text-[#91ACD1] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#00D9FF]" />
                Saved assets are automatically exempted from malicious flagging.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-bold shadow-lg shadow-[#1265F8]/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile to Session</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Resetting Demo */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#06142D] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#123E78] space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[#F1F5FF]">
            <div className="flex items-center gap-3 text-[#FFB020]">
              <div className="p-2 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/30">
                <AlertCircle className="w-6 h-6 text-[#FFB020]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Reset to Demo Brand Profile?</h3>
                <span className="text-xs text-[#91ACD1]">Restore fictional ApexPay assets</span>
              </div>
            </div>

            <p className="text-xs text-[#91ACD1] leading-relaxed">
              Are you sure you want to restore the default fictional <strong className="text-white">ApexPay</strong> demo profile?
              Any custom brand assets, domains, or partners added in this browser session will be replaced.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[#123E78] text-[#91ACD1] hover:text-white hover:bg-[#0A1C3D] text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-1.5 rounded-lg bg-[#1265F8] hover:bg-[#1265F8]/90 text-white text-xs font-semibold shadow-md shadow-[#1265F8]/30 cursor-pointer transition-all"
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

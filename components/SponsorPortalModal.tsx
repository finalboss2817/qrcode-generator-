import React, { useState } from 'react';
import {
  X,
  BarChart2,
  TrendingUp,
  MousePointerClick,
  Eye,
  QrCode,
  Download,
  Copy,
  Check,
  Globe,
  Sliders,
  Sparkles,
  ShieldCheck,
  FileText,
  Building2,
  Info,
} from 'lucide-react';
import { NativeSponsor, SponsorAnalytics, AdSettings } from '../types';
import {
  buildSponsorUTM,
  generateSponsorPitchReport,
  saveStoredAdSettings,
} from '../sponsorService';

interface SponsorPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: SponsorAnalytics;
  sponsor: NativeSponsor;
  settings: AdSettings;
  onUpdateSponsor: (updated: NativeSponsor) => void;
  onUpdateSettings: (updated: AdSettings) => void;
}

export const SponsorPortalModal: React.FC<SponsorPortalModalProps> = ({
  isOpen,
  onClose,
  analytics,
  sponsor,
  settings,
  onUpdateSponsor,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'utm' | 'adsense' | 'sponsorEdit'>('analytics');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [copiedUTM, setCopiedUTM] = useState<boolean>(false);
  const [customSponsorUrl, setCustomSponsorUrl] = useState<string>(sponsor.targetUrl);
  const [customBrandName, setCustomBrandName] = useState<string>(sponsor.brandName);

  // Local settings state for editing
  const [localSettings, setLocalSettings] = useState<AdSettings>({ ...settings });
  const [localSponsor, setLocalSponsor] = useState<NativeSponsor>({ ...sponsor });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const ctr = analytics.impressions > 0
    ? ((analytics.clicks / analytics.impressions) * 100).toFixed(2)
    : '0.00';

  const generatedUTM = buildSponsorUTM(customSponsorUrl || 'https://sponsorwebsite.com', customBrandName || 'sponsor');

  const copyReportText = () => {
    const report = generateSponsorPitchReport(analytics, sponsor.brandName);
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2200);
  };

  const copyCustomUTM = () => {
    navigator.clipboard.writeText(generatedUTM);
    setCopiedUTM(true);
    setTimeout(() => setCopiedUTM(false), 2200);
  };

  const handleSaveAll = () => {
    saveStoredAdSettings(localSettings);
    onUpdateSettings(localSettings);
    onUpdateSponsor(localSponsor);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Sponsor Data & Ad Integrations
                </h3>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Live Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Quantitative tracking & monetization manager • Meena Technologies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 bg-white flex gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'analytics', label: 'Quantitative Metrics', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'utm', label: 'Sponsor UTM Links', icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'adsense', label: 'Google AdSense', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'sponsorEdit', label: 'Edit Partner Card', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: QUANTITATIVE METRICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Impressions</span>
                    <Eye className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {analytics.impressions.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Verified card views</span>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Clicks</span>
                    <MousePointerClick className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {analytics.clicks.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Outbound visits</span>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Avg CTR</span>
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {ctr}%
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1">Click-through rate</span>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">QR Activity</span>
                    <QrCode className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {(analytics.qrGenerated + analytics.downloads).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Generations & exports</span>
                </div>
              </div>

              {/* How To Pitch Sponsors Explainer */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>How to prove this data to native brand sponsors</span>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Sponsors can independently verify every visitor from this app inside their own Google Analytics because all outbound links automatically append your verified UTM parameters (<code className="bg-white/80 px-1 py-0.5 rounded text-[11px] text-indigo-950 font-mono">utm_source=meena_technologies</code>).
                </p>
              </div>

              {/* Quick Report Copy Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">1-Click Sponsor Verification Pitch Report</h4>
                    <p className="text-[11px] text-slate-500">Formatted summary ready to send directly to partners or advertisers</p>
                  </div>
                  <button
                    onClick={copyReportText}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs active:scale-97"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? 'Report Copied!' : 'Copy Pitch Report'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: UTM GENERATOR */}
          {activeTab === 'utm' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>Sponsor UTM Link Builder</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate a pre-tagged URL for any sponsor. When their card is clicked, their Google Analytics will categorize the session under Meena Technologies.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sponsor Target Website URL
                    </label>
                    <input
                      type="text"
                      value={customSponsorUrl}
                      onChange={(e) => setCustomSponsorUrl(e.target.value)}
                      placeholder="https://sponsorbrand.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sponsor Brand Name
                    </label>
                    <input
                      type="text"
                      value={customBrandName}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      placeholder="e.g. Acme Cloud"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Generated Outbound URL with UTM Tags
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedUTM}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={copyCustomUTM}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shrink-0 flex items-center gap-1.5"
                    >
                      {copiedUTM ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUTM ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE ADSENSE CONFIG */}
          {activeTab === 'adsense' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900">Monetization Display Mode</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'native', title: 'Native Sponsor Card', desc: 'Direct brand spotlight (Recommended)' },
                    { id: 'adsense', title: 'Google AdSense Banner', desc: 'Automated network banner' },
                    { id: 'dual', title: 'Dual Placement (Both)', desc: 'Show sponsor card + AdSense slot' },
                  ].map((modeOption) => (
                    <button
                      key={modeOption.id}
                      onClick={() => setLocalSettings({ ...localSettings, mode: modeOption.id as any })}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        localSettings.mode === modeOption.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold">{modeOption.title}</span>
                      <span className={`text-[10px] mt-1 ${localSettings.mode === modeOption.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {modeOption.desc}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      AdSense Publisher ID
                    </label>
                    <input
                      type="text"
                      value={localSettings.adSensePublisherId}
                      onChange={(e) => setLocalSettings({ ...localSettings, adSensePublisherId: e.target.value })}
                      placeholder="ca-pub-1234567890123456"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      AdSense Ad Slot ID
                    </label>
                    <input
                      type="text"
                      value={localSettings.adSenseSlotId}
                      onChange={(e) => setLocalSettings({ ...localSettings, adSenseSlotId: e.target.value })}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="testMode"
                      checked={localSettings.isTestMode}
                      onChange={(e) => setLocalSettings({ ...localSettings, isTestMode: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                    />
                    <label htmlFor="testMode" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Test / Placeholder Mode (Simulates ad container without real AdSense script errors)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EDIT PARTNER CARD */}
          {activeTab === 'sponsorEdit' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900">Customize Native Sponsor Spotlight</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Partner Brand Name</label>
                    <input
                      type="text"
                      value={localSponsor.brandName}
                      onChange={(e) => setLocalSponsor({ ...localSponsor, brandName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={localSponsor.badgeText}
                      onChange={(e) => setLocalSponsor({ ...localSponsor, badgeText: e.target.value })}
                      placeholder="Official Partner / Featured"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Pitch</label>
                  <textarea
                    rows={2}
                    value={localSponsor.description}
                    onChange={(e) => setLocalSponsor({ ...localSponsor, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={localSponsor.ctaText}
                      onChange={(e) => setLocalSponsor({ ...localSponsor, ctaText: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Destination URL</label>
                    <input
                      type="text"
                      value={localSponsor.targetUrl}
                      onChange={(e) => setLocalSponsor({ ...localSponsor, targetUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Meena Technologies Partner Suite</span>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
            >
              Close
            </button>

            <button
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs active:scale-97"
            >
              Save Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

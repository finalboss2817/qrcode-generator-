import React from 'react';
import { Sparkles, Layers, Rotate3d, Play, Check } from 'lucide-react';
import { BORDER_THEMES } from '../borderThemes';
import { BorderThemeId, QRConfig } from '../types';

interface BorderThemeSelectorProps {
  config: QRConfig;
  onSelectTheme: (themeId: BorderThemeId) => void;
  onUpdateConfig: (patch: Partial<QRConfig>) => void;
}

export const BorderThemeSelector: React.FC<BorderThemeSelectorProps> = ({
  config,
  onSelectTheme,
  onUpdateConfig,
}) => {
  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 sm:ring-4 ring-pink-50 shrink-0">
            2
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Occasion & Border Themes
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-pink-100/70 text-pink-700 border border-pink-200/60 shrink-0">
                Interactive 3D
              </span>
              <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                Step 2
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
              Select festive animated frames for celebrations, weddings, restaurants, or VIP passes.
            </p>
          </div>
        </div>
      </div>

      {/* Theme Cards Grid - 2 columns on small screens, 3 columns on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {BORDER_THEMES.map((th) => {
          const isSelected = config.borderTheme === th.id;
          return (
            <button
              key={th.id}
              type="button"
              onClick={() => onSelectTheme(th.id)}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[90px] sm:min-h-[96px] group active:scale-98 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Selected Check Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </div>
              )}

              <div className="space-y-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-base sm:text-lg leading-none shrink-0">{th.emoji}</span>
                  <div className="font-bold text-[11px] sm:text-xs text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {th.name}
                  </div>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight line-clamp-2">
                  {th.tagline}
                </p>
              </div>

              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                  {th.category}
                </span>
                <span
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-white shadow-xs shrink-0"
                  style={{ backgroundColor: th.defaultColor }}
                  title="Theme Accent"
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Theme Ribbon Text & 3D Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div>
          <label
            className="block text-xs font-semibold text-slate-700 mb-1.5"
            htmlFor="frameBannerText"
          >
            Border Ribbon Banner <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            id="frameBannerText"
            name="frameBannerText"
            type="text"
            value={config.frameBannerText ?? ''}
            onChange={(e) => onUpdateConfig({ frameBannerText: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium min-h-[44px]"
            placeholder="e.g. SPECIAL OFFER"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 sm:pt-6">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none min-h-[36px]">
            <input
              type="checkbox"
              checked={config.enable3DTilt}
              onChange={(e) => onUpdateConfig({ enable3DTilt: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="flex items-center gap-1.5">
              <Rotate3d className="w-4 h-4 text-indigo-600" />
              <span>3D Perspective Tilt</span>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none min-h-[36px]">
            <input
              type="checkbox"
              checked={config.enableAnimations}
              onChange={(e) => onUpdateConfig({ enableAnimations: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="flex items-center gap-1.5">
              <Play className="w-4 h-4 text-pink-600" />
              <span>Live Animations</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

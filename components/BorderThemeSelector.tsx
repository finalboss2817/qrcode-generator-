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
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Occasion & Border Themes
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Curated themed borders for birthdays, weddings, events & VIP
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
          New 3D Themes
        </span>
      </div>

      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {BORDER_THEMES.map((th) => {
          const isSelected = config.borderTheme === th.id;
          return (
            <button
              key={th.id}
              type="button"
              onClick={() => onSelectTheme(th.id)}
              className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[96px] group active:scale-98 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Selected Check Badge */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{th.emoji}</span>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition truncate max-w-[130px]">
                    {th.name}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                  {th.tagline}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {th.category}
                </span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white shadow-xs shrink-0"
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
            className="block text-xs font-semibold text-slate-700 mb-1"
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
            placeholder="e.g. 🎉 EMILY'S 21ST BIRTHDAY 🎉"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 pt-4 sm:pt-5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={config.enable3DTilt}
              onChange={(e) => onUpdateConfig({ enable3DTilt: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="flex items-center gap-1">
              <Rotate3d className="w-3.5 h-3.5 text-indigo-600" />
              <span>3D Perspective Tilt</span>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={config.enableAnimations}
              onChange={(e) => onUpdateConfig({ enableAnimations: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="flex items-center gap-1">
              <Play className="w-3.5 h-3.5 text-pink-600" />
              <span>Live Animations</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

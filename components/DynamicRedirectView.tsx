import React, { useEffect, useState } from 'react';
import { fetchDynamicQRRecord } from '../dynamicQRService';
import { Sparkles, ExternalLink, ArrowRight, RefreshCw, AlertCircle, QrCode, CheckCircle2 } from 'lucide-react';

interface DynamicRedirectViewProps {
  dynamicId: string;
  onGoHome: () => void;
}

export const DynamicRedirectView: React.FC<DynamicRedirectViewProps> = ({ dynamicId, onGoHome }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [record, setRecord] = useState<{ title: string; destinationUrl: string; updatedAt?: string } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);
  const [isUrl, setIsUrl] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      const data = await fetchDynamicQRRecord(dynamicId);
      if (isMounted) {
        if (data && data.destinationUrl) {
          setRecord(data);
          const trimmed = data.destinationUrl.trim();
          const looksLikeUrl = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
          setIsUrl(looksLikeUrl);
        } else {
          setRecord(null);
        }
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [dynamicId]);

  // Handle auto-redirect if it is a website URL
  useEffect(() => {
    if (!record || !isUrl) return;

    let targetUrl = record.destinationUrl.trim();
    if (/^www\./i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            window.location.replace(targetUrl);
          } catch (e) {
            window.location.href = targetUrl;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [record, isUrl]);

  const handleManualForward = () => {
    if (!record) return;
    let targetUrl = record.destinationUrl.trim();
    if (/^www\./i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }
    try {
      window.location.href = targetUrl;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Top Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs text-indigo-300 font-semibold shadow-inner mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Smart Dynamic QR Engine</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Live Cloud Destination
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            QR ID: {dynamicId}
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Fetching Live Destination...</p>
                <p className="text-xs text-slate-400">Loading updated cloud target for this QR code</p>
              </div>
            </div>
          ) : !record ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Dynamic Code Not Found</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  This dynamic QR code (<span className="font-mono text-slate-300">{dynamicId}</span>) has not been configured or has expired.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                Open QR Studio
              </button>
            </div>
          ) : isUrl ? (
            /* URL Redirection View */
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  {record.title || 'Dynamic Link Active'}
                </h3>
                <p className="text-xs text-slate-400">
                  Redirecting you in <span className="font-bold text-indigo-400">{redirectCountdown}s</span>...
                </p>
              </div>

              {/* Target Destination Box */}
              <div className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-xl text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Current Target URL
                </div>
                <div className="font-mono text-xs text-indigo-300 break-all">
                  {record.destinationUrl}
                </div>
              </div>

              {/* Forward Action Button */}
              <button
                type="button"
                onClick={handleManualForward}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <span>Continue to Destination Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Text / Message Content View (e.g. "hello" -> "bye") */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">Live Dynamic Content</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                  Updated Live
                </span>
              </div>

              <div className="space-y-1.5">
                {record.title && (
                  <h3 className="text-sm font-semibold text-slate-300">
                    {record.title}
                  </h3>
                )}
                <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-xl">
                  <p className="text-base sm:text-lg font-medium text-white whitespace-pre-wrap leading-relaxed break-words">
                    {record.destinationUrl}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Scanned successfully</span>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                >
                  <span>Create your QR</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>Smart QR Studio • Cloud Dynamic Redirect System</p>
        </div>
      </div>
    </div>
  );
};

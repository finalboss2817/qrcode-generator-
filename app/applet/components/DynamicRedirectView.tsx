import React, { useEffect, useState, useRef } from 'react';
import { fetchDynamicQRRecord } from '../dynamicQRService';
import { Sparkles, ArrowRight, AlertCircle, FileText, CheckCircle2, Compass, Loader2 } from 'lucide-react';

interface DynamicRedirectViewProps {
  dynamicId: string;
  onGoHome: () => void;
}

const TOTAL_COUNTDOWN = 3;
const CIRCLE_RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const DynamicRedirectView: React.FC<DynamicRedirectViewProps> = ({ dynamicId, onGoHome }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [record, setRecord] = useState<{ title: string; destinationUrl: string; updatedAt?: string } | null>(null);
  const [isUrl, setIsUrl] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(TOTAL_COUNTDOWN);
  const hasRedirectedRef = useRef<boolean>(false);

  // Normalize URL helper
  const formatDestinationUrl = (url: string): string => {
    let trimmed = url.trim();
    if (/^www\./i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    if (!/^https?:\/\//i.test(trimmed) && trimmed.includes('.') && !trimmed.includes(' ')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const isWebDestination = (url: string): boolean => {
    const trimmed = url.trim();
    return (
      /^https?:\/\//i.test(trimmed) ||
      /^www\./i.test(trimmed) ||
      (trimmed.includes('.') && !trimmed.includes(' ') && trimmed.length > 3)
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchDynamicQRRecord(dynamicId);
        if (!isMounted) return;

        if (data && data.destinationUrl && data.destinationUrl.trim()) {
          setRecord(data);
          const destination = data.destinationUrl.trim();
          setIsUrl(isWebDestination(destination));
        } else {
          setRecord(null);
        }
      } catch (err) {
        if (isMounted) {
          setRecord(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [dynamicId]);

  // Execute redirection
  const executeRedirect = () => {
    if (!record || hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    const target = formatDestinationUrl(record.destinationUrl);
    try {
      window.location.replace(target);
    } catch {
      window.location.href = target;
    }
  };

  // Countdown timer for Web / PDF destinations
  useEffect(() => {
    if (!record || !isUrl) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [record, isUrl]);

  // Calculate SVG stroke offset for smooth circular ring animation
  const strokeOffset = CIRCUMFERENCE * (1 - countdown / TOTAL_COUNTDOWN);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background Soft Glow Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {loading ? (
          /* Clean Initial Fetch Spinner */
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-9 h-9 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">Connecting to destination...</p>
              <p className="text-xs text-slate-400">Loading updated cloud target</p>
            </div>
          </div>
        ) : !record ? (
          /* Clean Not Found Screen - No internal debug info or technical IDs */
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">QR Code Unavailable</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                This link is no longer active or may have expired.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoHome}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              Go to Home
            </button>
          </div>
        ) : isUrl ? (
          /* Interactive & Engaging Redirection Screen with Highlighted Countdown */
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            {/* Top Indicator Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Smart Dynamic Redirect</span>
            </div>

            {/* Circular Interactive Countdown Gauge */}
            <div
              onClick={executeRedirect}
              className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto flex items-center justify-center cursor-pointer group"
              title="Click to redirect immediately"
            >
              {/* Outer Glow */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl group-hover:bg-indigo-500/30 transition-all duration-300" />

              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={CIRCLE_RADIUS}
                  className="stroke-slate-800/90"
                  strokeWidth="7"
                  fill="transparent"
                />
                {/* Animated Dynamic Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={CIRCLE_RADIUS}
                  className="stroke-indigo-500 transition-all duration-1000 ease-linear drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                  strokeWidth="7"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Central Countdown Number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none transition-transform group-hover:scale-105">
                <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tighter drop-shadow-md">
                  {countdown}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/90 mt-0.5">
                  {countdown === 1 ? 'Sec' : 'Secs'}
                </span>
              </div>
            </div>

            {/* Prominently Highlighted Countdown Banner */}
            <div className="space-y-2">
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/25 rounded-2xl shadow-inner">
                <p className="text-sm sm:text-base font-semibold text-slate-300">
                  Redirecting in{' '}
                  <span className="text-base sm:text-lg font-black text-indigo-400 font-mono underline decoration-indigo-500/50 underline-offset-4">
                    {countdown} {countdown === 1 ? 'second' : 'seconds'}
                  </span>
                </p>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight pt-1">
                {record.title || 'Dynamic Link Active'}
              </h2>
              <p className="text-xs text-slate-400">
                Taking you to your destination automatically
              </p>
            </div>

            {/* Engaging Action Button */}
            <button
              type="button"
              onClick={executeRedirect}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98] group cursor-pointer border border-indigo-400/20"
            >
              <span>Continue to Destination Now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ) : (
          /* Plain Text / Message Viewer - Clean view with zero debug or technical metadata */
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-slate-400">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">
                {record.title || 'Note / Message'}
              </span>
            </div>

            <div className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl">
              <p className="text-base font-normal text-slate-100 whitespace-pre-wrap leading-relaxed break-words">
                {record.destinationUrl}
              </p>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Verified
              </span>
              <button
                type="button"
                onClick={onGoHome}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
              >
                Open Studio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  ExternalLink,
  Trash2,
  Check,
  AlertCircle,
  Globe,
  Link2,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  X,
  Edit3,
} from 'lucide-react';
import { QRConfig } from '../types';

interface PdfUploaderHubProps {
  config: QRConfig;
  currentUser: any;
  pdfUploading: boolean;
  pdfError: string | null;
  pdfUploadSuccess: boolean;
  destinationUpdateSuccess: string | null;
  savedDynamicQRs: any[];
  onUploadFile: (file: File) => Promise<void>;
  onClearPdf: () => void;
  onSaveDestination: (newDestination?: string, forceNew?: boolean) => Promise<void>;
  onOpenAuthModal: (reason: string) => void;
  onSwitchToTextMode: () => void;
  onDismissSuccess: () => void;
}

export const PdfUploaderHub: React.FC<PdfUploaderHubProps> = ({
  config,
  currentUser,
  pdfUploading,
  pdfError,
  destinationUpdateSuccess,
  savedDynamicQRs,
  onUploadFile,
  onClearPdf,
  onSaveDestination,
  onOpenAuthModal,
  onSwitchToTextMode,
  onDismissSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCustomUrlOpen, setIsCustomUrlOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const isCurrentPointingToUploadedPdf =
    Boolean(config.uploadedPdfUrl) && config.content === config.uploadedPdfUrl;

  const isSavedInAccount =
    Boolean(config.dynamicId) &&
    savedDynamicQRs.some((item) => item.id === config.dynamicId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    // Reset input value so replacing or choosing another file always fires onChange reliably
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!currentUser) {
        onOpenAuthModal('Sign up free to upload your PDF to cloud storage and create an editable QR code.');
        return;
      }
      onUploadFile(file);
    }
  };

  const handleSaveCustomUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let val = customUrlInput.trim();
    if (!val) return;
    if (!/^https?:\/\//i.test(val) && !val.startsWith('data:') && !val.startsWith('mailto:') && (val.includes('.') || val.includes('/'))) {
      val = `https://${val}`;
    }
    await onSaveDestination(val);
    setIsCustomUrlOpen(false);
  };

  const handleRevertToUploadedPdf = async () => {
    if (config.uploadedPdfUrl) {
      await onSaveDestination(config.uploadedPdfUrl);
      setIsCustomUrlOpen(false);
    }
  };

  return (
    <div className="space-y-4" id="pdf-uploader-hub">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
        id="hidden-pdf-file-input"
      />

      {/* Feature Guidance Banner */}
      <div className="p-3.5 bg-gradient-to-r from-rose-50/90 via-indigo-50/50 to-white rounded-xl border border-rose-100/90 flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
              <span>PDF Document QR Code</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 shrink-0">
                Dynamic Cloud
              </span>
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              When scanned, opens your PDF immediately. Replace or change the file anytime!
            </p>
          </div>
        </div>
        {!currentUser && (
          <button
            type="button"
            onClick={() => onOpenAuthModal('Sign in or register free to upload PDF documents.')}
            className="shrink-0 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition shadow-2xs"
          >
            Sign In Free
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {destinationUpdateSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium truncate">{destinationUpdateSuccess}</span>
          </div>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded transition shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification Alert */}
      {pdfError && (
        <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs flex items-start gap-2 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{pdfError}</span>
        </div>
      )}

      {/* STATE 1: NO PDF UPLOADED YET */}
      {!config.pdfFileName ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!currentUser) {
              onOpenAuthModal('Create a free account to upload your PDF document to cloud storage.');
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            isDragOver
              ? 'border-rose-500 bg-rose-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/20'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs text-rose-600 flex items-center justify-center mb-3 border border-slate-200/80">
            {pdfUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
            {pdfUploading ? 'Uploading PDF Document...' : 'Upload PDF Document'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
            Drag & drop your file here, or click to browse. Perfect for menus, catalogs, flyers, and guides (up to 25MB).
          </p>

          <button
            type="button"
            disabled={pdfUploading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{pdfUploading ? 'Uploading to cloud...' : 'Choose PDF File'}</span>
          </button>

          <div className="mt-4 pt-3 border-t border-slate-200/60 w-full flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <span>Already have a link hosted online?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchToTextMode();
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline"
            >
              Enter Web URL instead
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: ACTIVE CONNECTED PDF DOCUMENT */
        <div className="space-y-3">
          {/* Active File Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            {/* Top Row: File details & Badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {config.pdfFileName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-medium">
                      {config.pdfFileSize || 'Document'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live on QR Code
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Preview & Remove */}
              <div className="flex items-center gap-1 shrink-0">
                {config.uploadedPdfUrl && (
                  <a
                    href={config.uploadedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition"
                    title="View uploaded PDF document in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Preview</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClearPdf}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Remove PDF"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions: Replace PDF */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfUploading}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  {pdfUploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{pdfUploading ? 'Uploading...' : 'Replace with New PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomUrlOpen(!isCustomUrlOpen);
                    setCustomUrlInput(config.content || '');
                  }}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {isCustomUrlOpen
                      ? 'Hide Web Link Option'
                      : !isCurrentPointingToUploadedPdf
                      ? 'Custom Link Active'
                      : 'Redirect to Web Link Instead'}
                  </span>
                </button>
              </div>

              {/* Dynamic QR ID Pill */}
              <div className="text-[11px] font-mono text-slate-500 px-2 py-1 rounded bg-slate-50 border border-slate-200/80">
                ID: {config.dynamicId || 'DYN'}
              </div>
            </div>

            {/* EXPANDABLE: Custom URL Redirection Drawer */}
            {isCustomUrlOpen && (
              <form
                onSubmit={handleSaveCustomUrl}
                className="mt-3 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2.5 animate-fadeIn"
              >
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="custom-destination-url" className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Point QR code to an external link instead of PDF:</span>
                  </label>
                  {!isCurrentPointingToUploadedPdf && config.uploadedPdfUrl && (
                    <button
                      type="button"
                      onClick={handleRevertToUploadedPdf}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Revert back to PDF file</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    id="custom-destination-url"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/menu"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                  >
                    Save Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomUrlOpen(false)}
                    className="px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Scanners will immediately be redirected to this link. Your printed QR code never changes.
                </p>
              </form>
            )}

            {/* Current Destination Status Line */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 text-slate-600">
                <span className="font-bold text-slate-700 shrink-0">Destination:</span>
                {isCurrentPointingToUploadedPdf ? (
                  <span className="truncate text-slate-600 font-medium flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Viewing "{config.pdfFileName}"</span>
                  </span>
                ) : (
                  <span className="truncate font-mono text-indigo-700 font-medium">
                    {config.content}
                  </span>
                )}
              </div>

              {/* Save / Update Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isSavedInAccount ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSaveDestination()}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold text-[11px] transition shadow-2xs"
                      title="Update destination and title for this active QR"
                    >
                      Update QR
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveDestination(undefined, true)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] transition shadow-2xs flex items-center gap-1"
                      title="Save as a brand-new separate QR code"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Save as New</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSaveDestination()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold text-[11px] transition shadow-2xs"
                  >
                    Save to My Account
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Calm Assurance Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong className="text-slate-800">Print Once, Update Anytime: </strong>
              The visual QR code on the right is linked to your cloud ID ({config.dynamicId}). You can print it on posters, table tents, or cards — whenever you upload a new PDF or change the link, scanners automatically see the latest version!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

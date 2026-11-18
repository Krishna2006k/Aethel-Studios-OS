import React, { useState } from 'react';
import { Download, Smartphone, Share, MoreVertical, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'mobile-drawer';
  collapsed?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  collapsed = false,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Hide when already running inside the installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install Aethel OS as a Mobile or Desktop App"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline sm:inline">Install App</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install Aethel OS on Mobile or Desktop"
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-0' : 'justify-between px-2.5'
          } py-1.5 rounded-lg text-xs font-bold text-[#2563EB] bg-[#EFF6FF]/70 hover:bg-[#EFF6FF] border border-[#BFDBFE]/60 transition-colors cursor-pointer`}
        >
          <span className="flex items-center gap-2 truncate">
            <Smartphone className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            {!collapsed && <span>Install Mobile / Desktop App</span>}
          </span>
        </button>
      )}

      {variant === 'mobile-drawer' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Install Aethel OS App on Phone</span>
        </button>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAECEF] max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0B0F19] text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm">
                  A
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                    NATIVE STANDALONE PWA
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0B0F19]">
                    Install Aethel OS on Mobile
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install modal"
                className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInstallable && (
              <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#059669]">
                  <CheckCircle2 className="w-4 h-4" /> Ready for 1-Tap Direct Installation
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowGuideModal(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Install Aethel OS Now
                </button>
              </div>
            )}

            <div className="space-y-3 text-xs text-[#475569]">
              {/* Android Chrome Instructions */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isAndroid
                    ? 'bg-[#EFF6FF]/60 border-[#93C5FD]'
                    : 'bg-[#F8F9FA] border-[#EAECEF]'
                }`}
              >
                <div className="font-extrabold text-[#0B0F19] flex items-center justify-between">
                  <span>Android (Google Chrome)</span>
                  {isAndroid && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB] text-white font-bold">
                      Detected
                    </span>
                  )}
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    Open the direct app URL in <strong>Chrome for Android</strong> (not inside an in-app preview iframe).
                  </li>
                  <li>
                    Tap the <strong>three-dot menu</strong>{' '}
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-white border border-[#E2E8F0]">
                      <MoreVertical className="w-3 h-3" />
                    </span>{' '}
                    in the top-right corner of Chrome.
                  </li>
                  <li>
                    Tap <strong>Install app</strong> (or <strong>Add to Home screen → Install</strong>).
                  </li>
                </ol>
              </div>

              {/* iOS Safari Instructions */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isIOS
                    ? 'bg-[#EFF6FF]/60 border-[#93C5FD]'
                    : 'bg-[#F8F9FA] border-[#EAECEF]'
                }`}
              >
                <div className="font-extrabold text-[#0B0F19] flex items-center justify-between">
                  <span>iPhone &amp; iPad (Safari)</span>
                  {isIOS && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB] text-white font-bold">
                      Detected
                    </span>
                  )}
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    Open Aethel OS in <strong>Safari</strong> on your iPhone or iPad.
                  </li>
                  <li>
                    Tap the <strong>Share</strong> button{' '}
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-white border border-[#E2E8F0]">
                      <Share className="w-3 h-3" />
                    </span>{' '}
                    at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-2 border-t border-[#EAECEF] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] border border-[#EAECEF] text-xs font-bold text-[#0B0F19] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                {copiedUrl ? 'Copied Direct App Link!' : 'Copy Direct App Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-2.5 px-5 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

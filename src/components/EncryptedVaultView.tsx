import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import type { VaultCredential } from '../types';
import {
  decryptSecret,
  encryptSecret,
  formatCipherPreview,
} from '../utils/cryptoService';
import { DEMO_MASTER_PASSPHRASE } from '../services/dbService';

interface EncryptedVaultViewProps {
  credentials: VaultCredential[];
  masterPassphrase: string;
  onChangeMasterPassphrase: (val: string) => void;
  onAddCredential: (cred: VaultCredential) => void;
  onDeleteCredential: (id: string) => void;
  onNotify: (msg: string) => void;
}

export const EncryptedVaultView: React.FC<EncryptedVaultViewProps> = ({
  credentials,
  masterPassphrase,
  onChangeMasterPassphrase,
  onAddCredential,
  onDeleteCredential,
  onNotify,
}) => {
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPassphraseText, setShowPassphraseText] = useState(false);

  // Inline Form to Encrypt & Store New Credential
  const [showAddForm, setShowAddForm] = useState(false);
  const [servicePlatform, setServicePlatform] = useState('');
  const [ownerClientTag, setOwnerClientTag] = useState('Aethel Studios Core');
  const [usernameEmail, setUsernameEmail] = useState('aethelstudios.in@gmail.com');
  const [plainPassword, setPlainPassword] = useState('');
  const [url, setUrl] = useState('https://');
  const [notes, setNotes] = useState('');

  const handleRevealFor10Seconds = async (cred: VaultCredential) => {
    if (revealedSecrets[cred.id]) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[cred.id];
        return next;
      });
      return;
    }

    try {
      const plain = await decryptSecret(
        { ciphertext: cred.ciphertext, iv: cred.iv, salt: cred.salt },
        masterPassphrase
      );
      setRevealedSecrets((prev) => ({ ...prev, [cred.id]: plain }));
      onNotify(`Decrypted ${cred.servicePlatform} for 10 seconds`);

      setTimeout(() => {
        setRevealedSecrets((prev) => {
          const next = { ...prev };
          delete next[cred.id];
          return next;
        });
      }, 10000);
    } catch (err: any) {
      onNotify(err?.message || 'Decryption failed: Check Vault Master Passphrase');
    }
  };

  const handleDecryptAndCopy = async (cred: VaultCredential) => {
    try {
      const plain = await decryptSecret(
        { ciphertext: cred.ciphertext, iv: cred.iv, salt: cred.salt },
        masterPassphrase
      );
      await navigator.clipboard.writeText(plain);
      setCopiedId(cred.id);
      onNotify(`Decrypted & copied ${cred.servicePlatform} secret to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      onNotify(err?.message || 'Decryption failed: Invalid Master Passphrase');
    }
  };

  const handleCreateEncryptedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicePlatform.trim() || !plainPassword.trim()) {
      onNotify('Service name and Plain Password/API Key are required.');
      return;
    }
    if (!masterPassphrase.trim()) {
      onNotify('Enter a Vault Master Passphrase in the Obsidian header first.');
      return;
    }

    try {
      const encrypted = await encryptSecret(
        plainPassword.trim(),
        masterPassphrase
      );
      const newCred: VaultCredential = {
        id: `vlt-${Date.now()}`,
        servicePlatform: servicePlatform.trim(),
        ownerClientTag: ownerClientTag.trim() || 'Aethel Studios Core',
        usernameEmail: usernameEmail.trim() || 'aethelstudios.in@gmail.com',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        url: url.trim() || 'https://aethelstudios.in',
        notes: notes.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onAddCredential(newCred);
      setServicePlatform('');
      setPlainPassword('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      onNotify(err?.message || 'Failed to encrypt credential.');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Signature Obsidian (#0B0F19) Vault Header */}
      <div className="bg-[#0B0F19] text-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_16px_40px_-12px_rgba(11,15,25,0.28)] space-y-5 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>08 / ZERO-KNOWLEDGE ENCRYPTED CREDENTIALS VAULT</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Client-Side AES-GCM 256-Bit &amp; PBKDF2 Key Vault
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Secrets are encrypted in-browser via <code className="font-mono text-white">window.crypto.subtle</code> into <code className="font-mono text-emerald-400">ciphertext + iv + salt</code> before touching localStorage or Supabase. Your Master Passphrase lives strictly in volatile RAM.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start lg:self-auto cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Vault Form' : 'Store Encrypted Secret'}</span>
          </button>
        </div>

        {/* Active Session Master Passphrase Control Bar */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              {masterPassphrase ? (
                <Unlock className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label
                htmlFor="vault-master-passphrase-input"
                className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#94A3B8] block"
              >
                Active Session Master Passphrase (RAM Only — Demo:{' '}
                <code className="text-emerald-400 font-mono">aethel2026</code>)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="vault-master-passphrase-input"
                  type={showPassphraseText ? 'text' : 'password'}
                  value={masterPassphrase}
                  onChange={(e) => {
                    onChangeMasterPassphrase(e.target.value);
                    setRevealedSecrets({});
                  }}
                  placeholder="Enter Vault Master Passphrase (e.g., aethel2026)..."
                  className="w-full max-w-md px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphraseText(!showPassphraseText)}
                  aria-label="Toggle Master Passphrase Visibility"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer shrink-0"
                >
                  {showPassphraseText ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onChangeMasterPassphrase(DEMO_MASTER_PASSPHRASE);
                setRevealedSecrets({});
                onNotify('Loaded demo passphrase (aethel2026) into session memory.');
              }}
              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
            >
              Use Demo Key (aethel2026)
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeMasterPassphrase('');
                setRevealedSecrets({});
                onNotify('Vault locked & session passphrase cleared from RAM.');
              }}
              className="px-3.5 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-rose-300 transition-colors cursor-pointer"
            >
              Lock Vault
            </button>
          </div>
        </div>

        {/* Expandable New Encrypted Secret Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateEncryptedRecord}
            className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/15 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Encrypt &amp; Store New Credential</span>
              </h2>
              <span className="font-mono text-[11px] text-emerald-400">
                PBKDF2 100,000 Iterations + AES-GCM 256
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1">
                  Service / Platform *
                </label>
                <input
                  type="text"
                  required
                  value={servicePlatform}
                  onChange={(e) => setServicePlatform(e.target.value)}
                  placeholder="e.g., Razorpay Live Merchant Key"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">
                  Client / Owner Tag
                </label>
                <input
                  type="text"
                  value={ownerClientTag}
                  onChange={(e) => setOwnerClientTag(e.target.value)}
                  placeholder="e.g., Aurelia Sanctuary Resort"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">
                  Username / Deploying Email
                </label>
                <input
                  type="text"
                  value={usernameEmail}
                  onChange={(e) => setUsernameEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  Plain Password / API Secret *
                </label>
                <input
                  type="text"
                  required
                  value={plainPassword}
                  onChange={(e) => setPlainPassword(e.target.value)}
                  placeholder="Will be AES-GCM encrypted immediately"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-emerald-400/40 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Login / Console URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">2FA / Security Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., OTP sent to Vansh +91 97632 74410"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-full bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0B0F19] text-xs font-bold transition-colors cursor-pointer"
              >
                Encrypt &amp; Save to Vault
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Encrypted Credentials Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {credentials.map((cred) => {
          const decryptedValue = revealedSecrets[cred.id];
          const cipherPreview = formatCipherPreview(cred.ciphertext, cred.iv);

          return (
            <div
              key={cred.id}
              className="bg-white border border-[#EAECEF] rounded-3xl p-4 sm:p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#2563EB] block truncate">
                      {cred.ownerClientTag}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-[#0B0F19] mt-0.5 leading-snug">
                      {cred.servicePlatform}
                    </h2>
                    <p className="font-mono text-xs text-slate-500 mt-0.5 break-all">
                      User: {cred.usernameEmail}
                    </p>
                  </div>

                  <a
                    href={cred.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full bg-[#F8F9FA] border border-[#EAECEF] hover:border-[#0B0F19] text-xs font-semibold text-[#0B0F19] flex items-center gap-1 transition-colors shrink-0"
                  >
                    <span>Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Masked Secret & Cipher Preview */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F19] text-white space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-[#94A3B8]">
                    <span>
                      {decryptedValue
                        ? 'DECRYPTED SECRET (Auto-hides in 10s)'
                        : 'MASKED SECRET & AES-GCM CIPHER'}
                    </span>
                    <span className="font-mono text-emerald-400">
                      {cipherPreview}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="font-mono text-xs sm:text-sm font-bold tracking-wider break-all sm:truncate">
                      {decryptedValue ? (
                        <span className="text-emerald-300 select-all">
                          {decryptedValue}
                        </span>
                      ) : (
                        <span className="text-slate-400">••••••••••••••••</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRevealFor10Seconds(cred)}
                        className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {decryptedValue ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Mask</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Reveal 10s</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecryptAndCopy(cred)}
                        className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-full bg-[#2563EB] hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedId === cred.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Decrypt &amp; Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {cred.notes && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cred.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] truncate">
                  Salt: {cred.salt.slice(0, 10)}... · Encrypted {cred.createdAt}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteCredential(cred.id)}
                  aria-label={`Delete credential ${cred.servicePlatform}`}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

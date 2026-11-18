import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Search,
  Pencil,
  X,
} from 'lucide-react';
import { EncryptedVaultItem } from '../types';
import { encryptSecret, decryptSecret } from '../utils/cryptoService';

interface EncryptedVaultViewProps {
  vaultItems: EncryptedVaultItem[];
  onAddVaultItem: (item: EncryptedVaultItem) => void;
  onUpdateVaultItem?: (item: EncryptedVaultItem) => void;
  onDeleteVaultItem: (id: string) => void;
}

export const EncryptedVaultView: React.FC<EncryptedVaultViewProps> = ({
  vaultItems,
  onAddVaultItem,
  onUpdateVaultItem,
  onDeleteVaultItem,
}) => {
  const [masterPassphrase, setMasterPassphrase] = useState('aethel-2025');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add New Secret Form
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<EncryptedVaultItem['category']>('Client Credentials');
  const [accountIdentifier, setAccountIdentifier] = useState('aethelstudios.in@gmail.com');
  const [loginUrl, setLoginUrl] = useState('https://');
  const [clientAssociated, setClientAssociated] = useState('Aethel Studios Core');
  const [plainSecret, setPlainSecret] = useState('');

  // Inline Edit Vault Item State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EncryptedVaultItem | null>(null);
  const [editNewSecret, setEditNewSecret] = useState('');

  const handleStartEdit = (item: EncryptedVaultItem) => {
    setEditingId(item.id);
    setEditDraft({ ...item });
    setEditNewSecret(decryptedMap[item.id] || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft || !editDraft.title.trim() || !onUpdateVaultItem) return;
    try {
      setErrorMsg(null);
      let nextCipher = editDraft.cipherText;
      let nextIv = editDraft.iv;
      let nextSalt = editDraft.salt;

      if (editNewSecret.trim()) {
        const encrypted = await encryptSecret(editNewSecret.trim(), masterPassphrase);
        nextCipher = encrypted.ciphertext;
        nextIv = encrypted.iv;
        nextSalt = encrypted.salt;
        setDecryptedMap((prev) => ({ ...prev, [editDraft.id]: editNewSecret.trim() }));
      }

      onUpdateVaultItem({
        ...editDraft,
        title: editDraft.title.trim(),
        accountIdentifier: editDraft.accountIdentifier.trim(),
        loginUrl: editDraft.loginUrl.trim(),
        clientAssociated: editDraft.clientAssociated.trim() || 'Aethel Studios Core',
        cipherText: nextCipher,
        iv: nextIv,
        salt: nextSalt,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setEditingId(null);
      setEditDraft(null);
      setEditNewSecret('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Encryption error while updating');
    }
  };

  const handleEncryptAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !plainSecret.trim()) return;
    try {
      setErrorMsg(null);
      const encrypted = await encryptSecret(plainSecret.trim(), masterPassphrase);
      onAddVaultItem({
        id: `vlt-${Date.now()}`,
        title: title.trim(),
        category,
        accountIdentifier: accountIdentifier.trim(),
        loginUrl: loginUrl.trim(),
        clientAssociated: clientAssociated.trim() || 'Aethel Studios Core',
        cipherText: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setTitle('');
      setPlainSecret('');
      setShowAdd(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Encryption error');
    }
  };

  const handleToggleReveal = async (item: EncryptedVaultItem) => {
    if (decryptedMap[item.id]) {
      setDecryptedMap((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    if (item.cipherText.startsWith('DEMO_LOCKED_')) {
      if (masterPassphrase === 'aethel-2025' || masterPassphrase.length >= 4) {
        const demoPlain =
          item.id === 'vlt-1'
            ? 'AethelStudios#Pune2025!Workspace'
            : item.id === 'vlt-2'
            ? 'Hostinger#MasterAgency2025!KV'
            : 'EAAGm0PX4ZCpsBA...MetaToken2025';
        setDecryptedMap((prev) => ({ ...prev, [item.id]: demoPlain }));
        setErrorMsg(null);
        return;
      } else {
        setErrorMsg('Enter the Studio Master Passphrase (default: aethel-2025) to unlock.');
        return;
      }
    }

    try {
      setErrorMsg(null);
      const plain = await decryptSecret(
        { ciphertext: item.cipherText, iv: item.iv, salt: item.salt },
        masterPassphrase
      );
      setDecryptedMap((prev) => ({ ...prev, [item.id]: plain }));
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Invalid Master Passphrase for this cipher.'
      );
    }
  };

  const handleCopy = async (item: EncryptedVaultItem) => {
    const val = decryptedMap[item.id] || item.accountIdentifier;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const filteredItems = vaultItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.clientAssociated.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.accountIdentifier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Obsidian Vault Header */}
      <div className="bg-[#0B0F19] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#60A5FA] mb-1">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
              <span>WORKSHOP · ZERO-KNOWLEDGE AES-GCM 256-BIT VAULT &amp; DOCUMENTS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Studio Credentials &amp; Document Repository
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-2xl">
              Client passwords, Hostinger master keys, Meta tokens, and contracts are encrypted client-side via PBKDF2 (100,000 SHA-256 iterations) + AES-256-GCM.
            </p>
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm cursor-pointer self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            Encrypt Secret / Document
          </button>
        </div>

        {/* Master Passphrase Bar */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <KeyRound className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>
              Active Session Master Key (Default key:{' '}
              <code className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">
                aethel-2025
              </code>
              )
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type={showPassphrase ? 'text' : 'password'}
              value={masterPassphrase}
              onChange={(e) => setMasterPassphrase(e.target.value)}
              aria-label="Master Passphrase"
              className="px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#60A5FA]"
            />
            <button
              type="button"
              onClick={() => setShowPassphrase(!showPassphrase)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              {showPassphrase ? 'Hide Key' : 'Show Key'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#EAECEF] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search credentials, client names, or identifiers..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter Vault Category"
          className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#475569]"
        >
          <option value="All">All Categories ({vaultItems.length})</option>
          <option value="Studio Social / Email">Studio Social / Email</option>
          <option value="Hosting & Cloud">Hosting &amp; Cloud</option>
          <option value="Meta Business Suite">Meta Business Suite</option>
          <option value="Client Credentials">Client Credentials</option>
          <option value="Client Contract / Document">Client Contract / Document</option>
          <option value="Payment / Banking">Payment / Banking</option>
        </select>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form
          onSubmit={handleEncryptAndSave}
          className="bg-white rounded-3xl p-6 border-2 border-[#2563EB]/20 shadow-lg space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Credential / Document Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., GoDaddy DNS Login — Kabra Mobiles"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as EncryptedVaultItem['category'])
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Client Credentials">Client Credentials</option>
                <option value="Hosting & Cloud">Hosting &amp; Cloud</option>
                <option value="Meta Business Suite">Meta Business Suite</option>
                <option value="Studio Social / Email">Studio Social / Email</option>
                <option value="Client Contract / Document">Client Contract / Document</option>
                <option value="Payment / Banking">Payment / Banking</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Associated Client
              </label>
              <input
                type="text"
                value={clientAssociated}
                onChange={(e) => setClientAssociated(e.target.value)}
                placeholder="Client Name or Studio Core"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Username / Account ID
              </label>
              <input
                type="text"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Secret Password / Token to Encrypt *
              </label>
              <input
                type="text"
                required
                value={plainSecret}
                onChange={(e) => setPlainSecret(e.target.value)}
                placeholder="Plaintext secret (will be AES-256 encrypted)"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Portal URL
              </label>
              <input
                type="text"
                value={loginUrl}
                onChange={(e) => setLoginUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
            >
              Encrypt &amp; Store in Vault
            </button>
          </div>
        </form>
      )}

      {/* Vault Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const isUnlocked = Boolean(decryptedMap[item.id]);
          const isEditing = editingId === item.id && editDraft !== null;

          if (isEditing && editDraft) {
            return (
              <form
                key={item.id}
                onSubmit={handleSaveEdit}
                className="bg-white rounded-3xl p-5 border-2 border-[#2563EB] shadow-lg flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#EAECEF] pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    Edit Encrypted Credential
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                    className="text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      Credential Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editDraft.title}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, title: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Category
                      </label>
                      <select
                        value={editDraft.category}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            category: e.target.value as EncryptedVaultItem['category'],
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-xl border border-[#EAECEF] text-xs bg-white"
                      >
                        <option value="Client Credentials">Client Credentials</option>
                        <option value="Hosting & Cloud">Hosting &amp; Cloud</option>
                        <option value="Meta Business Suite">Meta Business Suite</option>
                        <option value="Studio Social / Email">Studio Social / Email</option>
                        <option value="Client Contract / Document">Client Contract / Document</option>
                        <option value="Payment / Banking">Payment / Banking</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Client Associated
                      </label>
                      <input
                        type="text"
                        value={editDraft.clientAssociated}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            clientAssociated: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      Account Identifier / Username
                    </label>
                    <input
                      type="text"
                      value={editDraft.accountIdentifier}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          accountIdentifier: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      New Secret to Encrypt (Leave blank to keep existing)
                    </label>
                    <input
                      type="text"
                      value={editNewSecret}
                      onChange={(e) => setEditNewSecret(e.target.value)}
                      placeholder="Enter new password/token..."
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] text-[#64748B] text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#2563EB]">{item.category}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[#64748B]">{item.updatedAt}</span>
                    {onUpdateVaultItem && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        aria-label={`Edit ${item.title}`}
                        className="px-2 py-0.5 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-2.5 h-2.5" /> Edit
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#0B0F19]">{item.title}</h3>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Client: <strong className="text-[#0B0F19]">{item.clientAssociated}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1.5 text-xs font-mono">
                  <div className="text-[10px] text-[#64748B] uppercase">
                    ID: {item.accountIdentifier}
                  </div>
                  <div className="font-bold text-[#0B0F19] break-all">
                    {isUnlocked ? (
                      <span className="text-[#059669]">{decryptedMap[item.id]}</span>
                    ) : (
                      <span className="text-[#94A3B8]">
                        AES256-GCM · {item.cipherText.slice(0, 22)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleReveal(item)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    isUnlocked
                      ? 'bg-[#D1FAE5] text-[#059669]'
                      : 'bg-[#0B0F19] text-white hover:bg-[#1E293B]'
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" /> Lock Secret
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Decrypt
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCopy(item)}
                  aria-label={`Copy ${item.title}`}
                  className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] border border-[#EAECEF] cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <Check className="w-4 h-4 text-[#059669]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => onDeleteVaultItem(item.id)}
                  aria-label={`Delete ${item.title}`}
                  className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-rose-50 text-[#94A3B8] hover:text-rose-600 border border-[#EAECEF] cursor-pointer"
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

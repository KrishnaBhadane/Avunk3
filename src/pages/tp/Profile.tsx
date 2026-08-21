import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Building, Mail, Upload, ShieldCheck, Check } from 'lucide-react';

export const TPProfileView: React.FC = () => {
  const { tpProfile, updateTPProfile } = useAuth();

  const [name, setName] = useState(tpProfile?.institution_name || '');
  const [address, setAddress] = useState(tpProfile?.address || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const res = await updateTPProfile({
      institution_name: name,
      address: address,
    });
    setSaving(false);
    if (!res.success) {
      setSaveError(res.error || 'Failed to update T&P profile');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isVerified = tpProfile?.verification_status === 'verified';

  return (
    <div className="space-y-8 antialiased">
      <div className="border-b border-surface-border pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building className="w-7 h-7 text-white" />
            Institutional T&P Credentials
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your institution profile and official verification documents.
          </p>
        </div>

        {isVerified ? (
          <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Verified Institution
          </Badge>
        ) : (
          <Badge variant="warning">
            Verification Pending
          </Badge>
        )}
      </div>

      {saveError && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold">
          {saveError}
        </div>
      )}

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> T&P details updated!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="space-y-6">
          <h2 className="text-base font-bold text-white border-b border-surface-border pb-3">Institution Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Institution Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Verified Institutional Email</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-border/50 border border-surface-border rounded-lg text-sm text-slate-400">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{tpProfile?.institution_email}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-bold text-white border-b border-surface-border pb-3">
            Authorization Proof Document
          </h2>
          <div className="p-4 bg-background rounded-lg border border-surface-border flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-white">iitd_tp_authorization_letter.pdf</p>
              <p className="text-slate-400 mt-0.5">Status: {isVerified ? 'Approved' : 'Under Review'}</p>
            </div>
            <Button type="button" variant="outline" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>
              Upload New Proof
            </Button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" loading={saving}>
            Save Details
          </Button>
        </div>
      </form>
    </div>
  );
};

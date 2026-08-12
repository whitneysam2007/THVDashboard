import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { validatePasswordChange } from '@/lib/passwordChange';

type ChangePasswordDialogProps = {
  email: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangePasswordDialog({ email, open, onOpenChange }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const close = (nextOpen: boolean) => {
    if (!nextOpen && !saving) {
      setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setError(''); setSuccess('');
    }
    onOpenChange(nextOpen);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validatePasswordChange(currentPassword, newPassword, confirmation);
    if (validationError) { setError(validationError); return; }
    if (!email) { setError('Your signed-in email is unavailable. Please sign out and sign in again.'); return; }
    setError(''); setSaving(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) { setSaving(false); setError('Your current password is incorrect.'); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (updateError) { setError('We could not update your password. Please try again or contact Liz.'); return; }
    setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setSuccess('Password updated. Use your new password the next time you sign in.');
  };

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Change password</DialogTitle><DialogDescription>Confirm your current password, then choose a private new password.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <PasswordInput value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="Current password" autoComplete="current-password" disabled={saving} />
        <PasswordInput value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="New password (14+ characters)" autoComplete="new-password" disabled={saving} />
        <PasswordInput value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" disabled={saving} />
        {error && <p className="text-sm text-[oklch(0.45_0.20_27)]">{error}</p>}
        {success && <p className="text-sm text-[oklch(0.38_0.09_145)]">{success}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => close(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 animate-spin" size={15} />}Save new password</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

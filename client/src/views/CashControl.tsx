import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { formatMoney } from '../utils/format';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Lock, Unlock } from 'lucide-react';

export default function CashControlView() {
  const { t } = useTranslation();
  const [session, setSession] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingModal, setOpeningModal] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [closeStep, setCloseStep] = useState(0);
  const [closeForm, setCloseForm] = useState({ countedCash: '', expectedCash: '' });
  const [openAmount, setOpenAmount] = useState('');
  const [movementForm, setMovementForm] = useState({ amount: '', reason: '' });
  const [closingResult, setClosingResult] = useState<any>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, movRes] = await Promise.all([api('/cash/status'), api('/cash/movements')]);
      setSession(statusRes.session || null);
      setMovements(Array.isArray(movRes) ? movRes : movRes.data || []);
    } catch { toast(t('cash.loadError'), 'error'); }
    finally { setLoading(false); }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(openAmount) || 0;
    try {
      await api('/cash/open', { method: 'POST', body: JSON.stringify({ initial_amount: amt }) });
      toast(t('cash.cashOpened'), 'success'); setOpeningModal(false); setOpenAmount(''); load();
      window.dispatchEvent(new CustomEvent('cash-status'));
    } catch (e: any) { toast(e.message || t('cash.openError'), 'error'); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/cash/deposit', { method: 'POST', body: JSON.stringify({ amount: parseFloat(movementForm.amount), reason: movementForm.reason }) });
      toast(t('cash.depositRegistered'), 'success'); setDepositModal(false); setMovementForm({ amount: '', reason: '' }); load();
    } catch { toast(t('cash.depositError'), 'error'); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/cash/withdraw', { method: 'POST', body: JSON.stringify({ amount: parseFloat(movementForm.amount), reason: movementForm.reason }) });
      toast(t('cash.withdrawRegistered'), 'success'); setWithdrawModal(false); setMovementForm({ amount: '', reason: '' }); load();
    } catch { toast(t('cash.withdrawError'), 'error'); }
  };

  const startClose = () => { setCloseStep(0); setCloseForm({ countedCash: '', expectedCash: String(session?.current_amount || 0) }); setClosingResult(null); setClosingModal(true); };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const counted = parseFloat(closeForm.countedCash) || 0;
      const res = await api('/cash/close', { method: 'POST', body: JSON.stringify({ counted_cash: counted }) });
      setClosingResult(res); setCloseStep(2); window.dispatchEvent(new CustomEvent('cash-status')); load();
    } catch { toast(t('cash.closeError'), 'error'); }
  };

  const isOpen = !!session;

  const stats = useMemo(() => {
    const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((a, m) => a + (m.amount || 0), 0);
    const totalWithdrawals = movements.filter(m => m.type === 'withdraw').reduce((a, m) => a + Math.abs(m.amount || 0), 0);
    const currentAmount = session?.current_amount || 0;
    return { totalDeposits, totalWithdrawals, currentAmount };
  }, [movements, session]);

  const columns: Column<any>[] = useMemo(() => [
    { key: 'type', label: t('cash.type'), render: m => (
      <Badge variant={m.type === 'deposit' ? 'success' : m.type === 'withdraw' ? 'danger' : m.type === 'opening' ? 'info' : 'neutral'} size="xs">
        {m.type === 'deposit' ? t('cash.deposit') : m.type === 'withdraw' ? t('cash.withdraw') : m.type === 'opening' ? t('cash.opening') : t('cash.sale')}
      </Badge>
    )},
    { key: 'amount', label: t('cash.amount'), render: m => (
      <span className={`font-bold tabular-nums ${m.type === 'deposit' || m.type === 'opening' ? 'text-success-text' : m.type === 'withdraw' ? 'text-danger-text' : 'text-text-primary'}`}>
        {m.type === 'deposit' || m.type === 'opening' ? '+' : '-'}{formatMoney(Math.abs(m.amount))}
      </span>
    )},
    { key: 'reason', label: t('cash.reason'), hideOnMobile: true },
    { key: 'created_at', label: t('cash.date'), render: m => new Date(m.created_at).toLocaleString() },
  ], [t]);

  const multiSteps = [t('cash.count'), t('cash.verification'), t('cash.result')];

  return (
    <div>
      <PageHeader title={t('cash.title')} description={t('cash.description')} icon={Wallet}
        actions={
          <div className="flex items-center gap-2">
            <StatusIndicator status={isOpen ? 'online' : 'offline'} label={isOpen ? t('cash.open') : t('cash.closed')} size="md" />
            {isOpen ? (<>
                <Button variant="secondary" size="sm" onClick={() => setDepositModal(true)}><ArrowDownCircle className="size-3.5" /> {t('cash.deposit')}</Button>
                <Button variant="secondary" size="sm" onClick={() => setWithdrawModal(true)}><ArrowUpCircle className="size-3.5" /> {t('cash.withdraw')}</Button>
                <Button variant="danger" size="sm" onClick={startClose}><Lock className="size-3.5" /> {t('cash.closeCash')}</Button>
              </>) : (<Button size="sm" onClick={() => setOpeningModal(true)}><Unlock className="size-3.5" /> {t('cash.openCash')}</Button>)}
          </div>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard label={t('cash.currentBalance')} value={formatMoney(stats.currentAmount)} />
        <KpiCard label={t('cash.totalDeposits')} value={formatMoney(stats.totalDeposits)} />
        <KpiCard label={t('cash.totalWithdrawals')} value={formatMoney(stats.totalWithdrawals)} />
      </div>

      <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle"><h3 className="text-sm font-bold text-text-primary">{t('cash.movementHistory')}</h3></div>
        <Table columns={columns} data={movements} keyExtractor={m => String(m.id)} loading={loading} emptyMessage={t('cash.noMovements')} density="comfortable" />
      </div>

      <Modal open={openingModal} onClose={() => setOpeningModal(false)} title={t('cash.openCash')} size="sm">
        <form onSubmit={handleOpen} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('cash.openingBalance')}</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-medium">$</span>
              <Input className="pl-7" type="number" step="0.01" min="0" value={openAmount} onChange={e => setOpenAmount(e.target.value)} placeholder="0.00" autoFocus required /></div></div>
          <Button type="submit" className="w-full">{t('cash.openCash')}</Button>
        </form>
      </Modal>

      <Modal open={depositModal} onClose={() => setDepositModal(false)} title={t('cash.registerDeposit')} size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('cash.depositAmount')}</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-medium">$</span>
              <Input className="pl-7" type="number" step="0.01" min="0" value={movementForm.amount} onChange={e => setMovementForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" autoFocus required /></div></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('cash.depositReason')}</label>
            <Input value={movementForm.reason} onChange={e => setMovementForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('cash.depositHint')} /></div>
          <Button type="submit" className="w-full">{t('cash.registerDeposit')}</Button>
        </form>
      </Modal>

      <Modal open={withdrawModal} onClose={() => setWithdrawModal(false)} title={t('cash.registerWithdraw')} size="sm">
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('cash.depositAmount')}</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-medium">$</span>
              <Input className="pl-7" type="number" step="0.01" min="0" value={movementForm.amount} onChange={e => setMovementForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" autoFocus required /></div></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('cash.depositReason')}</label>
            <Input value={movementForm.reason} onChange={e => setMovementForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('cash.withdrawReason')} /></div>
          <Button type="submit" variant="danger" className="w-full">{t('cash.registerWithdraw')}</Button>
        </form>
      </Modal>

      <Modal open={closingModal} onClose={() => { if (closeStep !== 1) setClosingModal(false); }} title={t('cash.closeCash')} size="md">
        <div className="flex items-center gap-2 mb-6">
          {multiSteps.map((label, i) => (
            <React.Fragment key={i}>
              <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= closeStep ? 'bg-action-primary text-[var(--bg-surface)]' : 'bg-bg-inset text-text-tertiary'}`}>
                {i < closeStep ? '\u2713' : i + 1}</div>
              <span className={`text-xs font-medium ${i <= closeStep ? 'text-text-primary' : 'text-text-disabled'}`}>{label}</span>
              {i < 2 && <div className={`flex-1 h-px ${i < closeStep ? 'bg-action-primary' : 'bg-border-subtle'}`} />}
            </React.Fragment>
          ))}
        </div>
        {closeStep === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); setCloseStep(1); }} className="space-y-4">
            <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('cash.countedCash')}</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-medium">$</span>
                <Input className="pl-7" type="number" step="0.01" min="0" value={closeForm.countedCash} onChange={e => setCloseForm(f => ({ ...f, countedCash: e.target.value }))} placeholder="0.00" autoFocus required /></div></div>
            <p className="text-xs text-text-secondary">{t('cash.expectedBalance')} <span className="font-bold text-text-primary">{formatMoney(parseFloat(closeForm.expectedCash) || 0)}</span></p>
            <Button type="submit" className="w-full">{t('cash.next')}</Button>
          </form>
        )}
        {closeStep === 1 && (
          <form onSubmit={handleClose} className="space-y-4">
            <div className="p-4 rounded-lg bg-bg-inset border border-border-subtle space-y-2">
              <div className="flex justify-between text-sm"><span className="text-text-secondary">{t('cash.expected')}</span><span className="font-bold">{formatMoney(parseFloat(closeForm.expectedCash) || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">{t('cash.counted')}</span><span className="font-bold">{formatMoney(parseFloat(closeForm.countedCash) || 0)}</span></div>
              <div className="border-t border-border-subtle pt-2 flex justify-between text-sm"><span className="font-semibold">{t('cash.difference')}</span>
                <span className={`font-bold ${(parseFloat(closeForm.countedCash) || 0) >= (parseFloat(closeForm.expectedCash) || 0) ? 'text-success-text' : 'text-danger-text'}`}>
                  {formatMoney((parseFloat(closeForm.countedCash) || 0) - (parseFloat(closeForm.expectedCash) || 0))}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setCloseStep(0)}>{t('cash.back')}</Button>
              <Button type="submit" className="flex-1" variant="danger">{t('cash.confirmClose')}</Button>
            </div>
          </form>
        )}
        {closeStep === 2 && closingResult && (
          <div className="text-center py-4">
            <div className="size-16 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4"><Lock className="size-8 text-success" /></div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{t('cash.cashClosed')}</h3>
            <p className="text-sm text-text-secondary mb-4">{t('cash.difference')}: {formatMoney(closingResult.difference || 0)}</p>
            <Button onClick={() => setClosingModal(false)}>{t('cash.understood')}</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SENUHU_BANK_RATE_GTQ_PER_USD, summarizeTripExpenses } from '@/lib/tripExpenses';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { TRIP_EXPENSE_CATEGORIES, type TripExpense, type TripOperations } from '../../../shared/tripOperations';

const money = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const optionalNumber = (value: string) => value === '' ? undefined : Number(value);

function ExpenseFields({ draft, onChange }: { draft: Partial<TripExpense>; onChange: (updates: Partial<TripExpense>) => void }) {
  return <div className="grid grid-cols-2 gap-2">
    <Input placeholder="Description" value={draft.description ?? ''} onChange={event => onChange({ description: event.target.value })} />
    <select aria-label="Expense category" value={draft.category ?? ''} onChange={event => onChange({ category: event.target.value as TripExpense['category'] || undefined })} className="h-9 rounded border border-[oklch(0.80_0.018_75)] bg-white px-2 text-sm"><option value="">Select category</option>{TRIP_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select>
    <Input placeholder="Subcategory (optional)" value={draft.subcategory ?? ''} onChange={event => onChange({ subcategory: event.target.value || undefined })} />
    <Input placeholder="Amount USD" type="number" value={draft.usdAmount ?? ''} onChange={event => onChange({ usdAmount: optionalNumber(event.target.value) })} />
    <Input placeholder="Amount quetzales" type="number" value={draft.quetzalAmount ?? ''} onChange={event => onChange({ quetzalAmount: optionalNumber(event.target.value) })} />
    <Input placeholder="Card / reimbursement owner" value={draft.paymentOwner ?? ''} onChange={event => onChange({ paymentOwner: event.target.value })} />
    <Input className="col-span-2" placeholder="Receipt link (optional)" value={draft.receiptLink ?? ''} onChange={event => onChange({ receiptLink: event.target.value })} />
  </div>;
}

export function ExpenseWorkspace({ expenses, ops, expense, setExpense, onAdd, onSave }: { expenses: TripExpense[]; ops: TripOperations; expense: Partial<TripExpense>; setExpense: Dispatch<SetStateAction<Partial<TripExpense>>>; onAdd: () => void; onSave: (updates: Partial<TripOperations>) => void }) {
  const summary = summarizeTripExpenses(expenses, ops);
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<TripExpense | null>(null);
  const rate = summary.quetzalesPerUsd;
  const [rateInput, setRateInput] = useState(String(rate));
  const [divisorInput, setDivisorInput] = useState(ops.expenseDivisor ? String(ops.expenseDivisor) : '');

  useEffect(() => setRateInput(String(rate)), [rate]);
  useEffect(() => setDivisorInput(ops.expenseDivisor ? String(ops.expenseDivisor) : ''), [ops.expenseDivisor]);

  const { usdPurchases: usdTotal, quetzalPurchases: quetzalTotal, combinedUsd, perPersonUsd: perPerson } = summary;
  const addAndClose = () => { onAdd(); setShowAdd(false); };
  const saveEdit = () => {
    if (!editingExpense) return;
    onSave({ expenses: expenses.map(item => item.id === editingExpense.id ? editingExpense : item) });
    setEditingExpense(null);
  };
  const confirmDelete = () => {
    if (!deleteCandidate) return;
    onSave({ expenses: expenses.filter(item => item.id !== deleteCandidate.id) });
    setDeleteCandidate(null);
  };

  return <div className="space-y-3 pt-3">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[740px] text-xs">
        <thead><tr className="text-left text-[oklch(0.52_0.022_65)]"><th>Description</th><th>Category</th><th>USD</th><th>Quetzales</th><th>Card / reimbursement owner</th><th>Receipt link</th><th className="text-right">Actions</th></tr></thead>
        <tbody>
          {expenses.map(item => <>
            <tr key={item.id} className="border-t border-[oklch(0.9_0.012_78)]">
              <td className="py-2">{item.description}</td>
              <td>{item.category ?? 'Uncategorized'}{item.subcategory ? <span className="block text-[10px] text-[oklch(0.52_0.022_65)]">{item.subcategory}</span> : null}</td>
              <td>{item.usdAmount !== undefined ? money(item.usdAmount) : '—'}</td>
              <td>{item.quetzalAmount !== undefined ? `Q ${item.quetzalAmount.toLocaleString()}` : '—'}</td>
              <td>{item.paymentOwner ?? '—'}</td>
              <td>{item.receiptLink ? <a className="text-[oklch(0.48_0.16_250)]" href={item.receiptLink} target="_blank" rel="noreferrer">View receipt</a> : '—'}</td>
              <td className="py-1 text-right"><button aria-label={`Edit ${item.description}`} className="mr-1 rounded p-1 hover:bg-[oklch(0.94_0.02_250)]" onClick={() => setEditingExpense({ ...item })}><Pencil size={13} className="text-[oklch(0.42_0.15_250)]" /></button><button aria-label={`Delete ${item.description}`} className="rounded p-1 hover:bg-red-50" onClick={() => setDeleteCandidate(item)}><Trash2 size={13} className="text-[oklch(0.55_0.20_27)]" /></button></td>
            </tr>
            {editingExpense?.id === item.id && <tr className="border-t border-[oklch(0.88_0.04_250)] bg-[oklch(0.98_0.012_250)]"><td colSpan={7} className="p-3"><p className="mb-2 text-xs font-medium text-[oklch(0.42_0.15_250)]">Edit expense</p><ExpenseFields draft={editingExpense} onChange={updates => setEditingExpense(current => current ? { ...current, ...updates } : current)} /><div className="mt-3 flex gap-2"><Button size="sm" onClick={saveEdit}><Save size={13} className="mr-1" /> Save changes</Button><Button size="sm" variant="outline" onClick={() => setEditingExpense(null)}><X size={13} className="mr-1" /> Cancel</Button></div></td></tr>}
          </>)}
        </tbody>
      </table>
    </div>

    {deleteCandidate && <div role="alertdialog" aria-labelledby="delete-expense-title" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[oklch(0.78_0.10_27)] bg-[oklch(0.98_0.025_27)] p-3"><div><p id="delete-expense-title" className="text-sm font-medium text-[oklch(0.40_0.16_27)]">Delete “{deleteCandidate.description}”?</p><p className="mt-0.5 text-xs text-[oklch(0.46_0.08_27)]">This permanently removes the expense from this trip’s totals.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDeleteCandidate(null)}>Keep expense</Button><Button size="sm" className="bg-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.42_0.18_27)]" onClick={confirmDelete}><Trash2 size={13} className="mr-1" /> Delete expense</Button></div></div>}

    <Button size="sm" onClick={() => setShowAdd(value => !value)}><Plus size={14} className="mr-1" /> Add expense</Button>
    {showAdd && <div className="rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)] p-3"><ExpenseFields draft={expense} onChange={updates => setExpense(current => ({ ...current, ...updates }))} /><div className="mt-3 flex gap-2"><Button size="sm" onClick={addAndClose}>Save expense</Button><Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div></div>}

    {summary.categoryTotals.length > 0 && <div className="rounded-lg border border-[oklch(0.84_0.018_75)] bg-white p-3"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[oklch(0.52_0.022_65)]">Expense totals by category</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{summary.categoryTotals.map(total => <div key={total.category} className="rounded-md bg-[oklch(0.975_0.012_80)] px-3 py-2"><p className="text-xs text-[oklch(0.42_0.018_55)]">{total.category}</p><p className="font-display text-lg">{money(total.combinedUsd)}</p><p className="text-[10px] text-[oklch(0.52_0.022_65)]">{money(total.usdPurchases)} + Q {total.quetzalPurchases.toLocaleString()}</p></div>)}</div></div>}

    <div className="grid gap-3 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.975_0.012_80)] p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><p className="text-xs text-[oklch(0.52_0.022_65)]">Total USD purchases</p><p className="font-display text-xl">{money(usdTotal)}</p></div>
      <div><p className="text-xs text-[oklch(0.52_0.022_65)]">Total quetzal purchases</p><p className="font-display text-xl">Q {quetzalTotal.toLocaleString()}</p></div>
      <div><p className="text-xs text-[oklch(0.52_0.022_65)]">Combined total in USD</p><p className="font-display text-xl">{money(combinedUsd)}</p></div>
      <div><p className="text-xs text-[oklch(0.52_0.022_65)]">Per person</p><p className="font-display text-xl">{perPerson === null ? '—' : money(perPerson)}</p></div>
      <div className="sm:col-span-2"><label className="block text-xs text-[oklch(0.52_0.022_65)]">Saved Senahú bank rate (GTQ per USD)</label><Input type="number" step="0.01" value={rateInput} onChange={event => setRateInput(event.target.value)} onBlur={() => onSave({ quetzalesPerUsd: Number(rateInput) || SENUHU_BANK_RATE_GTQ_PER_USD })} /><p className="mt-1 text-xs text-[oklch(0.52_0.022_65)]">Rate used: {rate.toFixed(2)} GTQ = $1 USD.</p></div>
      <div className="sm:col-span-2"><label className="block text-xs text-[oklch(0.52_0.022_65)]">Divide by people</label><Input type="number" min="1" value={divisorInput} onChange={event => setDivisorInput(event.target.value)} onBlur={() => onSave({ expenseDivisor: Number(divisorInput) || undefined })} /><p className="mt-1 text-xs text-[oklch(0.52_0.022_65)]">Enter the number of people sharing this trip cost.</p></div>
    </div>
  </div>;
}

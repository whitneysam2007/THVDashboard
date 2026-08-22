import { useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, FolderOpen, Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CATEGORIES = ['Reports', 'Resources', 'Trips', 'USANA Garden Towers'] as const;
type ResourceCategory = (typeof CATEGORIES)[number];

const GOOGLE_LINKS: Array<{ category: ResourceCategory; title: string; href: string; folder?: boolean }> = [
  { category: 'Reports', title: '6-Month Church Report 2026', href: 'https://drive.google.com/file/d/19fLOHQwaQwQZ2bLJc8L6Cpv-e7oO0h3u/view?usp=drive_link' },
  { category: 'Reports', title: '2025 Annual Impact Report', href: 'https://drive.google.com/file/d/1n1SiG0RByyZp2eZeb5Kk89TAieQjlyjq/view?usp=drive_link' },
  { category: 'Trips', title: 'Village to Village Expedition Information', href: 'https://drive.google.com/file/d/112znoZwaOUAXR76tjwMfFO5ClFc_yH6Q/view?usp=drive_link' },
  { category: 'Resources', title: 'Narú Circle', href: 'https://drive.google.com/file/d/1PHjwmG1cxPbva7uj8D-_Ej7WkJK0_RfJ/view?usp=drive_link' },
  { category: 'Resources', title: 'Village Meeting Survey', href: 'https://drive.google.com/file/d/1Yixj_vM7UNoYgD_l7M922aALD7Q9UEU7/view?usp=drive_link' },
  { category: 'Resources', title: 'Tri-Fold Brochure', href: 'https://drive.google.com/drive/folders/1RL3hKQelJdh2fdRKhrUE48JOvOX29NHn?usp=drive_link', folder: true },
];

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.readAsDataURL(file);
});

function GoogleLinkCard({ item, category, onMove }: { item: (typeof GOOGLE_LINKS)[number]; category: ResourceCategory; onMove: (category: ResourceCategory) => void }) {
  return <div className="rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)] p-4 shadow-sm"><a href={item.href} target="_blank" rel="noreferrer" className="group block transition hover:-translate-y-0.5"><div className="flex items-start justify-between gap-3"><div className="rounded-lg bg-[oklch(0.94_0.02_315)] p-2 text-[oklch(0.43_0.14_315)]">{item.folder ? <FolderOpen size={18} /> : <FileText size={18} />}</div><ExternalLink size={15} className="mt-1 text-[oklch(0.58_0.022_65)] transition group-hover:text-[oklch(0.43_0.14_315)]" /></div><h3 className="mt-4 font-display text-xl text-[oklch(0.22_0.018_55)]">{item.title}</h3><p className="mt-1 text-xs text-[oklch(0.52_0.022_65)]">{item.folder ? 'Google Drive folder' : 'Open Google Drive file'}</p></a><label className="mt-3 block border-t border-[oklch(0.88_0.018_75)] pt-3 text-[10px] font-medium uppercase tracking-wide text-[oklch(0.52_0.022_65)]">Move to<select aria-label={`Move ${item.title} to another category`} value={category} onChange={event => onMove(event.target.value as ResourceCategory)} className="mt-1 h-8 w-full rounded border border-[oklch(0.82_0.018_75)] bg-white px-2 text-xs normal-case tracking-normal text-[oklch(0.42_0.018_55)]">{CATEGORIES.map(option => <option key={option}>{option}</option>)}</select></label></div>;
}

export default function ReportsResources() {
  const library = trpc.resources.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const linkCategories = trpc.resources.linkCategories.useQuery(undefined, { refetchOnWindowFocus: false });
  const upload = trpc.resources.upload.useMutation({ onSuccess: () => void library.refetch() });
  const getDownloadUrl = trpc.resources.getDownloadUrl.useMutation();
  const updateCategory = trpc.resources.updateCategory.useMutation({ onSuccess: () => void library.refetch() });
  const updateLinkCategory = trpc.resources.updateLinkCategory.useMutation({ onSuccess: () => void linkCategories.refetch() });
  const [category, setCategory] = useState<ResourceCategory>('Resources');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const uploads = library.data ?? [];
  const movedLinkCategories = linkCategories.data ?? {};
  const uploadsByCategory = useMemo(() => new Map(CATEGORIES.map(item => [item, uploads.filter(uploaded => uploaded.category === item)])), [uploads]);
  const uploadSelected = async () => {
    if (!file) return;
    setMessage(null);
    try {
      const base64 = await fileToBase64(file);
      await upload.mutateAsync({ category, fileName: file.name, mimeType: file.type || 'application/octet-stream', base64 });
      setFile(null);
      setMessage(`${file.name} uploaded under ${category}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload that file.');
    }
  };
  const download = async (resourceDocument: typeof uploads[number]) => {
    setMessage(null);
    try {
      const url = await getDownloadUrl.mutateAsync({ key: resourceDocument.key });
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resourceDocument.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not prepare that download.');
    }
  };
  const moveDocument = async (id: string, nextCategory: ResourceCategory) => { try { await updateCategory.mutateAsync({ id, category: nextCategory }); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not move that file.'); } };
  const moveLink = async (href: string, nextCategory: ResourceCategory) => { try { await updateLinkCategory.mutateAsync({ href, category: nextCategory }); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not move that link.'); } };

  return <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    <div className="max-w-3xl"><h1 className="font-display text-4xl text-[oklch(0.22_0.018_55)]">Reports & Resources</h1><p className="mt-2 text-sm text-[oklch(0.52_0.022_65)]">Open report-level materials through their individual Google Drive links. For smaller working files, every approved team member can upload a private dashboard copy below.</p></div>
    <section className="mt-6 rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)] p-4"><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-[oklch(0.42_0.018_55)]">Category<select value={category} onChange={event => setCategory(event.target.value as ResourceCategory)} className="mt-1 block h-9 rounded border border-[oklch(0.80_0.018_75)] bg-white px-2 text-sm">{CATEGORIES.map(option => <option key={option}>{option}</option>)}</select></label><label className="min-w-[250px] flex-1 text-xs font-medium text-[oklch(0.42_0.018_55)]">Choose a file<Input className="mt-1" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.pdf,.jpg,.jpeg,.png,.webp,.heic,.txt,.csv,.doc,.docx,.xls,.xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><Button disabled={!file || upload.isPending} onClick={() => void uploadSelected()}><Upload size={15} className="mr-1" />{upload.isPending ? 'Uploading…' : 'Upload file'}</Button></div><p className="mt-3 text-xs text-[oklch(0.52_0.022_65)]">Direct uploads are private to the approved THV team. Keep larger or collaboratively edited materials in Google Drive and share the individual link with Liz for this page.</p>{message && <p className="mt-3 rounded-md bg-[oklch(0.97_0.02_145)] px-3 py-2 text-xs text-[oklch(0.32_0.10_145)]">{message}</p>}</section>
    {CATEGORIES.map(currentCategory => {
      const googleLinks = GOOGLE_LINKS.filter(item => (movedLinkCategories[item.href] ?? item.category) === currentCategory);
      const documents = uploadsByCategory.get(currentCategory) ?? [];
      return <section key={currentCategory} className="mt-8"><div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="font-display text-2xl text-[oklch(0.22_0.018_55)]">{currentCategory}</h2><span className="text-xs text-[oklch(0.52_0.022_65)]">{googleLinks.length + documents.length} item{googleLinks.length + documents.length === 1 ? '' : 's'}</span></div>{googleLinks.length || documents.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{googleLinks.map(item => <GoogleLinkCard key={item.href} item={item} category={movedLinkCategories[item.href] ?? item.category} onMove={nextCategory => void moveLink(item.href, nextCategory)} />)}{documents.map(document => <div key={document.id} className="rounded-xl border border-[oklch(0.84_0.018_75)] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="rounded-lg bg-[oklch(0.94_0.02_145)] p-2 text-[oklch(0.32_0.10_145)]"><FileText size={18} /></div><Button size="sm" variant="outline" disabled={getDownloadUrl.isPending} onClick={() => void download(document)}><Download size={14} className="mr-1" />Download</Button></div><h3 className="mt-4 break-words font-display text-xl text-[oklch(0.22_0.018_55)]">{document.name}</h3><p className="mt-1 text-xs text-[oklch(0.52_0.022_65)]">Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p><label className="mt-3 block border-t border-[oklch(0.88_0.018_75)] pt-3 text-[10px] font-medium uppercase tracking-wide text-[oklch(0.52_0.022_65)]">Move to<select aria-label={`Move ${document.name} to another category`} value={document.category} disabled={updateCategory.isPending} onChange={event => void moveDocument(document.id, event.target.value as ResourceCategory)} className="mt-1 h-8 w-full rounded border border-[oklch(0.82_0.018_75)] bg-white px-2 text-xs normal-case tracking-normal text-[oklch(0.42_0.018_55)]">{CATEGORIES.map(option => <option key={option}>{option}</option>)}</select></label></div>)}</div> : <p className="rounded-lg border border-dashed border-[oklch(0.84_0.018_75)] px-4 py-5 text-sm italic text-[oklch(0.52_0.022_65)]">No {currentCategory.toLowerCase()} files have been added yet.</p>}</section>;
    })}
  </div>;
}

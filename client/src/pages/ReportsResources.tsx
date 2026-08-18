import { ExternalLink, FileText, FolderOpen } from 'lucide-react';

const RESOURCES = [
  { title: '6-Month Church Report 2026', href: 'https://drive.google.com/file/d/19fLOHQwaQwQZ2bLJc8L6Cpv-e7oO0h3u/view?usp=drive_link' },
  { title: 'Village to Village Expedition Information', href: 'https://drive.google.com/file/d/112znoZwaOUAXR76tjwMfFO5ClFc_yH6Q/view?usp=drive_link' },
  { title: 'Narú Circle', href: 'https://drive.google.com/file/d/1PHjwmG1cxPbva7uj8D-_Ej7WkJK0_RfJ/view?usp=drive_link' },
  { title: '2025 Annual Impact Report', href: 'https://drive.google.com/file/d/1n1SiG0RByyZp2eZeb5Kk89TAieQjlyjq/view?usp=drive_link' },
  { title: 'Village Meeting Survey', href: 'https://drive.google.com/file/d/1Yixj_vM7UNoYgD_l7M922aALD7Q9UEU7/view?usp=drive_link' },
  { title: 'Tri-Fold Brochure', href: 'https://drive.google.com/drive/folders/1RL3hKQelJdh2fdRKhrUE48JOvOX29NHn?usp=drive_link', folder: true },
];

export default function ReportsResources() {
  return <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    <h1 className="font-display text-4xl text-[oklch(0.22_0.018_55)]">Reports & Resources</h1>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {RESOURCES.map(resource => <a key={resource.href} href={resource.href} target="_blank" rel="noreferrer" className="group rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[oklch(0.61_0.08_315)] hover:shadow-md">
        <div className="flex items-start justify-between gap-3"><div className="rounded-lg bg-[oklch(0.94_0.02_315)] p-2 text-[oklch(0.43_0.14_315)]">{resource.folder ? <FolderOpen size={19} /> : <FileText size={19} />}</div><ExternalLink size={16} className="mt-1 text-[oklch(0.58_0.022_65)] transition group-hover:text-[oklch(0.43_0.14_315)]" /></div>
        <h2 className="mt-5 font-display text-2xl text-[oklch(0.22_0.018_55)]">{resource.title}</h2>
      </a>)}
    </div>
  </div>;
}

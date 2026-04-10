'use client';

export default function AdminError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Erreur</h1>
      <div className="rounded-[4px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        {error?.message || 'Une erreur est survenue.'}
      </div>
    </div>
  );
}

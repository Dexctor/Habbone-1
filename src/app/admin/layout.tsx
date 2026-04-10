import 'server-only';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { assertAdmin } from '@/server/authz';
import AdminLayout from '@/components/admin/AdminLayout';

export const metadata = { title: 'Administration – HabbOne' };

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?from=/admin');
  if ((session.user as any).role !== 'admin') redirect('/profile');

  try {
    await assertAdmin();
  } catch {
    redirect('/profile');
  }

  const adminName: string = (session.user as any).nick ?? 'Admin';

  return <AdminLayout adminName={adminName}>{children}</AdminLayout>;
}

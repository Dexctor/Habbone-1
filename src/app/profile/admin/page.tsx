import { redirect } from 'next/navigation';

/** Backward-compat: redirige vers la nouvelle route /admin */
export default function LegacyAdminRedirect() {
  redirect('/admin');
}

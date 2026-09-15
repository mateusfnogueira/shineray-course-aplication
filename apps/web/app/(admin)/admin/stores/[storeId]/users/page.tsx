import { redirect } from 'next/navigation';

// Redirect to main store detail — users are shown from the store detail page
export default function StoreUsersPage({
  params,
}: {
  params: { storeId: string };
}): never {
  redirect(`/admin/stores/${params.storeId}`);
}

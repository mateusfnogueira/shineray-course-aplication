import { redirect } from 'next/navigation';

// Redirect to main store detail — users are shown from the store detail page
export default async function StoreUsersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}): Promise<never> {
  const { storeId } = await params;
  redirect(`/admin/stores/${storeId}`);
}

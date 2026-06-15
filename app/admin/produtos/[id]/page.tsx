import { AdminProductForm } from "@/components/admin-pages";

export default async function AdminProductRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminProductForm productId={id} />;
}

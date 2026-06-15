import { AdminOrderDetail } from "@/components/admin-pages";

export default async function AdminOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminOrderDetail orderId={id} />;
}

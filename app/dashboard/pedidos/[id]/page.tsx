import { OrderDetailPage } from "@/components/dashboard-pages";

export default async function DashboardOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailPage orderId={id} />;
}

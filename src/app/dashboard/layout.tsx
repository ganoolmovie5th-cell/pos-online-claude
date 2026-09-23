import Sidebar from "@/components/Sidebar";
import { requireBusiness } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, role } = await requireBusiness();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar businessName={business.name} role={role} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

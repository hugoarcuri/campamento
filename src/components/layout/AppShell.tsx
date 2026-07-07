import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="animate-fade-in p-6">{children}</main>
      </div>
    </div>
  );
}

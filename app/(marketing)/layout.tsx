import { Navbar } from "@/components/navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-6">
        <p className="text-xs text-muted-foreground opacity-50">
          &copy; {new Date().getFullYear()} AgentMarket. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

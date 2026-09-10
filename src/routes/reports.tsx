import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const router = useRouter();

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B1220" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#101A2B]/95 backdrop-blur-xl border-b border-[#26364D]/60">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.navigate({ to: "/dashboard" })}
              className="text-[#718096] hover:text-[#F3F6FA] hover:bg-[#162235] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-[#F3F6FA]">Relatórios</h1>
              <p className="text-xs text-[#718096]">Análise da sua carteira de empréstimos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="p-4 max-w-5xl mx-auto">
        <Card className="bg-[#162235]/60 border-[#26364D]">
          <CardContent className="p-12 flex flex-col items-center text-center gap-3">
            <div>
              <p className="text-[#AAB5C5] font-semibold text-sm">
                Relatórios em breve
              </p>
              <p className="text-[#718096] text-xs mt-1">
                Novas análises serão adicionadas em breve.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ShieldX, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/conta-bloqueada")({
  component: ContaBloqueadaPage,
});

function ContaBloqueadaPage() {
  const router = useRouter();
  const { status } = Route.useSearch();
  const isPending = status === "pending";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg ${
              isPending
                ? "bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-600/30"
                : "bg-gradient-to-br from-red-600 to-red-700 shadow-red-600/30"
            }`}
          >
            {isPending ? (
              <Clock className="h-8 w-8 text-white" />
            ) : (
              <ShieldX className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isPending ? "Aguardando aprovação" : "Acesso bloqueado"}
          </h1>
          <p className="text-slate-400 text-sm">Empréstimos</p>
        </div>

        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full border flex items-center justify-center ${
                  isPending
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}
              >
                {isPending ? (
                  <Clock className="h-8 w-8 text-blue-400" />
                ) : (
                  <ShieldX className="h-8 w-8 text-red-400" />
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">
                  {isPending ? "Cadastro em análise" : "Conta bloqueada"}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {isPending
                    ? "Seu cadastro foi realizado com sucesso e está aguardando a autorização do administrador. Assim que sua conta for aprovada, você poderá acessar a plataforma."
                    : "Seu acesso à plataforma está bloqueado. Entre em contato com o administrador para mais informações."}
                </p>
              </div>

              <Button
                onClick={() => router.navigate({ to: "/login" })}
                className={`w-full font-medium py-2.5 transition-colors flex items-center justify-center gap-2 ${
                  isPending
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

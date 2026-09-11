import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Wallet, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investments"]["Row"];

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const PERIOD_OPTIONS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
];

function ReportsPage() {
  const router = useRouter();
  const [periodDays, setPeriodDays] = useState(30);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: investments, isLoading } = useQuery({
    queryKey: ["investments", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", session.user.id);
      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!session?.user.id,
  });

  // Filtrar investments pelo período selecionado
  const filteredInvestments = (() => {
    if (!investments) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    return investments.filter((inv) => {
      const startDate = new Date(inv.start_date);
      return startDate >= cutoff;
    });
  })();

  const totalInvested = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.invested_amount),
    0
  );

  const totalExpectedReturn = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.expected_return || 0),
    0
  );

  const totalExpectedProfit = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.expected_profit || 0),
    0
  );

  const totalReceived = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.actual_received || 0),
    0
  );

  const totalActualProfit = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.actual_profit || 0),
    0
  );

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = filteredInvestments.filter(
    (inv) => inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled"
  ).length;

  // Distribuição por status
  const today = new Date().toISOString().slice(0, 10);
  const statusCounts = {
    ativos: investments?.filter((inv) => inv.status === "active").length ?? 0,
    finalizados: investments?.filter((inv) => inv.status === "finished").length ?? 0,
    atrasados: investments?.filter((inv) => inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled").length ?? 0,
    cancelados: investments?.filter((inv) => inv.status === "cancelled").length ?? 0,
  };

  const distributionData = [
    { name: "Ativos", quantidade: statusCounts.ativos, fill: "#60a5fa" },
    { name: "Finalizados", quantidade: statusCounts.finalizados, fill: "#34d399" },
    { name: "Atrasados", quantidade: statusCounts.atrasados, fill: "#f59e0b" },
    { name: "Cancelados", quantidade: statusCounts.cancelados, fill: "#94a3b8" },
  ];

  const distributionConfig = {
    Ativos: { label: "Ativos", color: "#60a5fa" },
    Finalizados: { label: "Finalizados", color: "#34d399" },
    Atrasados: { label: "Atrasados", color: "#f59e0b" },
    Cancelados: { label: "Cancelados", color: "#94a3b8" },
  };

  // Dados para o gráfico — acumulativo por data
  const chartData = (() => {
    if (!investments || investments.length === 0) return [];

    const sorted = [...investments].sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    let acumuladoEmprestado = 0;
    let acumuladoRetorno = 0;
    let acumuladoLucro = 0;

    return sorted.map((inv) => {
      acumuladoEmprestado += Number(inv.invested_amount);
      acumuladoRetorno += Number(inv.expected_return || 0);
      acumuladoLucro += Number(inv.expected_profit || 0);

      const dateObj = new Date(inv.start_date);
      const day = String(dateObj.getUTCDate()).padStart(2, "0");
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const year = dateObj.getUTCFullYear();
      const dateLabel = `${day}/${month}/${year}`;

      return {
        data: dateLabel,
        emprestado: acumuladoEmprestado,
        retorno: acumuladoRetorno,
        lucro: acumuladoLucro,
      };
    });
  })();

  const chartConfig = {
    emprestado: { label: "Total Emprestado", color: "#60a5fa" },
    retorno: { label: "Retorno Previsto", color: "#34d399" },
    lucro: { label: "Lucro Previsto", color: "#f59e0b" },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-[#26364D] bg-[#162235] px-3 py-2 text-xs shadow-xl">
        <p className="mb-2 font-semibold text-[#F3F6FA]">{label}</p>
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: item.color }}>{chartConfig[item.dataKey]?.label}</span>
            <span className="font-mono font-medium text-[#F3F6FA]">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

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
      <main className="p-4 max-w-5xl mx-auto space-y-6">
        {/* Filtro de período */}
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.days}
              variant={periodDays === option.days ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodDays(option.days)}
              className={
                periodDays === option.days
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold text-xs"
                  : "border-[#26364D] text-[#718096] hover:bg-[#162235] hover:text-[#F3F6FA] text-xs"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Emprestado Card */}
          {isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-5 flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl skeleton-shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32 rounded skeleton-shimmer" />
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D] hover:border-blue-500/40 transition-all duration-300">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-blue-600/10 border border-[#26364D] shrink-0">
                  <Wallet className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider">Total Emprestado</p>
                  <p className="text-2xl font-bold text-[#F3F6FA] leading-none mt-1">
                    {formatCurrency(totalInvested)}
                  </p>
                  <p className="text-[10px] text-[#718096] mt-1 font-medium">
                    {filteredInvestments.length} empréstimo{filteredInvestments.length !== 1 ? "s" : ""} no período
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Retorno Previsto Card */}
          {isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-5 flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl skeleton-shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32 rounded skeleton-shimmer" />
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D] hover:border-emerald-500/40 transition-all duration-300">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-[#26364D] shrink-0">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider">Retorno Previsto</p>
                  <p className="text-2xl font-bold text-[#F3F6FA] leading-none mt-1">
                    {formatCurrency(totalExpectedReturn)}
                  </p>
                  <p className="text-[10px] text-[#718096] mt-1 font-medium">
                    Valor total a receber com lucros
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lucro Previsto Card */}
          {isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-5 flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl skeleton-shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32 rounded skeleton-shimmer" />
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D] hover:border-amber-500/40 transition-all duration-300">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-[#26364D] shrink-0">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider">Lucro Previsto</p>
                  <p className="text-2xl font-bold text-[#F3F6FA] leading-none mt-1">
                    {formatCurrency(totalExpectedProfit)}
                  </p>
                  <p className="text-[10px] text-[#718096] mt-1 font-medium">
                    Lucro esperado dos empréstimos
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total Recebido Card */}
          {isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-5 flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl skeleton-shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32 rounded skeleton-shimmer" />
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D] hover:border-violet-500/40 transition-all duration-300">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-[#26364D] shrink-0">
                  <DollarSign className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider">Total Recebido</p>
                  <p className="text-2xl font-bold text-[#F3F6FA] leading-none mt-1">
                    {formatCurrency(totalReceived)}
                  </p>
                  <p className="text-[10px] text-[#718096] mt-1 font-medium">
                    Valor já recebido
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lucro Realizado Card */}
          {isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-5 flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl skeleton-shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32 rounded skeleton-shimmer" />
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D] hover:border-green-500/40 transition-all duration-300">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-green-500/10 border border-[#26364D] shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider">Lucro Realizado</p>
                  <p className="text-2xl font-bold text-[#F3F6FA] leading-none mt-1">
                    {formatCurrency(totalActualProfit)}
                  </p>
                  <p className="text-[10px] text-[#718096] mt-1 font-medium">
                    Lucro já realizado
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Em Atraso Card */}
          {isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-5 flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl skeleton-shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32 rounded skeleton-shimmer" />
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D] hover:border-red-500/40 transition-all duration-300">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-[#26364D] shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider">Em Atraso</p>
                  <p className="text-2xl font-bold text-red-400 leading-none mt-1">
                    {overdueCount}
                  </p>
                  <p className="text-[10px] text-[#718096] mt-1 font-medium">
                    {overdueCount} empréstimo{overdueCount !== 1 ? "s" : ""} em atraso
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gráfico: Evolução da Carteira */}
        <div>
          <h2 className="text-sm font-bold text-[#F3F6FA] mb-3">Evolução da Carteira</h2>
          {chartData.length === 0 && !isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-8 flex items-center justify-center">
                <p className="text-[#718096] text-sm">Nenhum empréstimo cadastrado para exibir o gráfico.</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-4">
                <Skeleton className="h-64 w-full rounded skeleton-shimmer" />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-4">
                <ChartContainer config={chartConfig} className="w-full h-64">
                  <ResponsiveContainer width="100%" height={256}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#26364D" vertical={false} />
                      <XAxis
                        dataKey="data"
                        tick={{ fill: "#718096", fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: "#26364D" }}
                      />
                      <YAxis
                        tick={{ fill: "#718096", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            notation: "compact",
                            maximumFractionDigits: 1,
                          }).format(v)
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        content={() => (
                          <div className="flex items-center justify-center gap-4 pt-2 pb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-[2px] bg-[#60a5fa]" />
                              <span className="text-xs text-[#718096]">Total Emprestado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-[2px] bg-[#34d399]" />
                              <span className="text-xs text-[#718096]">Retorno Previsto</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-[2px] bg-[#f59e0b]" />
                              <span className="text-xs text-[#718096]">Lucro Previsto</span>
                            </div>
                          </div>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="emprestado"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={{ fill: "#60a5fa", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="retorno"
                        stroke="#34d399"
                        strokeWidth={2}
                        dot={{ fill: "#34d399", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="lucro"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: "#f59e0b", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gráfico: Distribuição da Carteira */}
        <div>
          <h2 className="text-sm font-bold text-[#F3F6FA] mb-3">Distribuição da Carteira</h2>
          {chartData.length === 0 && !isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-8 flex items-center justify-center">
                <p className="text-[#718096] text-sm">Nenhum empréstimo cadastrado para exibir o gráfico.</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-4">
                <Skeleton className="h-64 w-full rounded skeleton-shimmer" />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#162235] border-[#26364D]">
              <CardContent className="p-4">
                <ChartContainer config={distributionConfig} className="w-full h-64">
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={distributionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#26364D" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#718096", fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: "#26364D" }}
                      />
                      <YAxis
                        tick={{ fill: "#718096", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border border-[#26364D] bg-[#162235] px-3 py-2 text-xs shadow-xl">
                              <p className="font-semibold text-[#F3F6FA]">
                                {payload[0].payload.name}: <span className="font-mono font-medium">{payload[0].value}</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                        {distributionData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

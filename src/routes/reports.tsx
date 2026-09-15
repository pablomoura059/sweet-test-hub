import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Wallet, TrendingUp, DollarSign, AlertCircle, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChartContainer } from "@/components/ui/chart";
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

const STATUS_OPTIONS = [
  { key: null, label: "Todos", color: "var(--muted-foreground)" },
  { key: "active", label: "Ativos", color: "#60a5fa" },
  { key: "finished", label: "Finalizados", color: "#34d399" },
  { key: "atrasado", label: "Atrasados", color: "#f59e0b" },
  { key: "cancelled", label: "Cancelados", color: "#94a3b8" },
];

function ReportsPage() {
  const router = useRouter();
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.getAttribute("data-theme");
    setIsLight(stored === "light");
    const onChange = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    window.addEventListener("theme-changed", onChange);
    return () => window.removeEventListener("theme-changed", onChange);
  }, []);

  // Theme-aware CSS vars
  const bgMain = "var(--background)";
  const bgSidebar = "var(--sidebar)";
  const bgCard = "var(--card)";
  const bgElevated = "var(--popover)";
  const bgSecondary = "var(--secondary)";
  const fg = "var(--foreground)";
  const fgMuted = "var(--muted-foreground)";
  const border = "var(--border)";
  const skeletonBg = isLight ? "#D5DEE8" : "#1e2d42";

  const handleStatusClick = (status: string | null) => {
    setSelectedStatus((prev) => (prev === status ? null : status));
  };

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

  const { data: peoplePhotos } = useQuery({
    queryKey: ["people-photos", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data, error } = await supabase
        .from("people")
        .select("id, photo_url")
        .eq("user_id", session.user.id);
      if (error) throw error;
      return data as { id: string; photo_url: string | null }[];
    },
    enabled: !!session?.user.id,
  });

  const personPhotoMap = (() => {
    if (!peoplePhotos) return new Map<string, string | null>();
    return new Map(peoplePhotos.map((p) => [p.id, p.photo_url]));
  })();

  const getPersonPhotoUrl = (personId: string | null): string | null => {
    if (!personId) return null;
    const photoPath = personPhotoMap.get(personId);
    if (!photoPath) return null;
    if (
      photoPath.startsWith("data:") ||
      photoPath.startsWith("blob:") ||
      photoPath.startsWith("http://") ||
      photoPath.startsWith("https://")
    )
      return photoPath;
    const { data } = supabase.storage.from("person-photos").getPublicUrl(photoPath);
    return data.publicUrl;
  };

  const filteredInvestments = (() => {
    if (!investments) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    return investments.filter((inv) => {
      const startDate = new Date(inv.start_date);
      return startDate >= cutoff;
    });
  })();

  const getFilteredByStatus = () => {
    if (!selectedStatus) return filteredInvestments;
    switch (selectedStatus) {
      case "active":
        return filteredInvestments.filter(
          (inv) => inv.status === "active" && !(inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled")
        );
      case "finished":
        return filteredInvestments.filter((inv) => inv.status === "finished");
      case "atrasado":
        return filteredInvestments.filter(
          (inv) => inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled"
        );
      case "cancelled":
        return filteredInvestments.filter((inv) => inv.status === "cancelled");
      default:
        return filteredInvestments;
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const filteredByStatus = getFilteredByStatus();

  const totalInvested = filteredByStatus.reduce(
    (sum, inv) => sum + Number(inv.invested_amount),
    0
  );

  const totalExpectedReturn = filteredByStatus.reduce(
    (sum, inv) => sum + Number(inv.expected_return || 0),
    0
  );

  const totalExpectedProfit = filteredByStatus.reduce(
    (sum, inv) => sum + Number(inv.expected_profit || 0),
    0
  );

  const totalReceived = filteredByStatus.reduce(
    (sum, inv) => sum + Number(inv.actual_received || 0),
    0
  );

  const totalActualProfit = filteredByStatus.reduce(
    (sum, inv) => sum + Number(inv.actual_profit || 0),
    0
  );

  const overdueCount = filteredByStatus.filter(
    (inv) => inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled"
  ).length;

  const statusCounts = {
    ativos: filteredByStatus.filter((inv) => inv.status === "active").length ?? 0,
    finalizados: filteredByStatus.filter((inv) => inv.status === "finished").length ?? 0,
    atrasados: filteredByStatus.filter((inv) => inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled").length ?? 0,
    cancelados: filteredByStatus.filter((inv) => inv.status === "cancelled").length ?? 0,
  };

  const allDistributionData = [
    { name: "Ativos", quantidade: statusCounts.ativos, fill: "#60a5fa" },
    { name: "Finalizados", quantidade: statusCounts.finalizados, fill: "#34d399" },
    { name: "Atrasados", quantidade: statusCounts.atrasados, fill: "#f59e0b" },
    { name: "Cancelados", quantidade: statusCounts.cancelados, fill: "#94a3b8" },
  ];

  const filteredDistributionData = allDistributionData;

  const distributionConfig = {
    Ativos: { label: "Ativos", color: "#60a5fa" },
    Finalizados: { label: "Finalizados", color: "#34d399" },
    Atrasados: { label: "Atrasados", color: "#f59e0b" },
    Cancelados: { label: "Cancelados", color: "#94a3b8" },
  };

  const chartData = (() => {
    if (!filteredByStatus || filteredByStatus.length === 0) return [];

    const sorted = [...filteredByStatus].sort(
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
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-xl"
        style={{ backgroundColor: bgElevated, borderColor: border }}
      >
        <p className="mb-2 font-semibold" style={{ color: fg }}>{label}</p>
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: item.color }}>{chartConfig[item.dataKey]?.label}</span>
            <span className="font-mono font-medium" style={{ color: fg }}>
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const getDisplayStatus = (inv: Investment) => {
    if (inv.return_date < today && inv.status !== "finished" && inv.status !== "cancelled") {
      return "atrasado";
    }
    return inv.status;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Ativo", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", icon: Clock };
      case "finished":
        return { label: "Finalizado", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", icon: CheckCircle2 };
      case "cancelled":
        return { label: "Cancelado", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", icon: XCircle };
      case "atrasado":
        return { label: "Atrasado", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", icon: AlertTriangle };
      default:
        return { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", icon: AlertCircle };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgMain }}>
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{ backgroundColor: bgSidebar, borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.navigate({ to: "/dashboard" })}
              className="transition-colors"
              style={{ color: fgMuted }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold" style={{ color: fg }}>Relatórios</h1>
              <p className="text-xs" style={{ color: fgMuted }}>Análise da sua carteira de empréstimos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        {/* Filtros de período e status no topo da página */}
        <div className="flex flex-col gap-3">
          {/* Grupo 1 — Período */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: fgMuted }}>Período</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PERIOD_OPTIONS.map((option) => {
                const isActive = periodDays === option.days;
                return (
                  <button
                    key={option.days}
                    onClick={() => setPeriodDays(option.days)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                      borderColor: isActive ? "var(--color-primary)" : border,
                      color: isActive ? "#fff" : fgMuted,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grupo 2 — Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: fgMuted }}>Status</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = selectedStatus === opt.key;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleStatusClick(opt.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                      borderColor: isActive ? "var(--color-primary)" : border,
                      color: isActive ? "#fff" : fgMuted,
                    }}
                  >
                    <div
                      className="h-2 w-2 rounded-[2px]"
                      style={{ backgroundColor: isActive ? "white" : opt.color }}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Indicadores filtrados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
          {isLoading ? (
            <>
              {[1,2,3,4,5,6].map(i => (
                <Card key={i} className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
                  <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                    <Skeleton className="h-8 w-8 md:h-12 md:w-12 rounded-xl" style={{ background: skeletonBg }} />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-32 rounded" style={{ background: skeletonBg }} />
                      <Skeleton className="h-6 w-40 rounded" style={{ background: skeletonBg }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="border transition-all duration-300" style={{ backgroundColor: bgCard, borderColor: border }}>
                <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)", border: `1px solid ${border}` }}>
                    <Wallet className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: fgMuted }}>Total Emprestado</p>
                    <p className="text-xl font-bold leading-none mt-0.5" style={{ color: fg }}>
                      {formatCurrency(totalInvested)}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium" style={{ color: fgMuted }}>
                      {filteredByStatus.length} empréstimo{filteredByStatus.length !== 1 ? "s" : ""} no período
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border transition-all duration-300" style={{ backgroundColor: bgCard, borderColor: border }}>
                <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "rgba(52,211,153,0.1)", border: `1px solid ${border}` }}>
                    <TrendingUp className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: "#34d399" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: fgMuted }}>Retorno Previsto</p>
                    <p className="text-xl font-bold leading-none mt-0.5" style={{ color: fg }}>
                      {formatCurrency(totalExpectedReturn)}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium" style={{ color: fgMuted }}>
                      Valor total a receber com lucros
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border transition-all duration-300" style={{ backgroundColor: bgCard, borderColor: border }}>
                <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: `1px solid ${border}` }}>
                    <TrendingUp className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: fgMuted }}>Lucro Previsto</p>
                    <p className="text-xl font-bold leading-none mt-0.5" style={{ color: fg }}>
                      {formatCurrency(totalExpectedProfit)}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium" style={{ color: fgMuted }}>
                      Lucro esperado dos empréstimos
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border transition-all duration-300" style={{ backgroundColor: bgCard, borderColor: border }}>
                <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.1)", border: `1px solid ${border}` }}>
                    <DollarSign className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: "#8b5cf6" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: fgMuted }}>Total Recebido</p>
                    <p className="text-xl font-bold leading-none mt-0.5" style={{ color: fg }}>
                      {formatCurrency(totalReceived)}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium" style={{ color: fgMuted }}>
                      Valor já recebido
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border transition-all duration-300" style={{ backgroundColor: bgCard, borderColor: border }}>
                <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "rgba(74,222,128,0.1)", border: `1px solid ${border}` }}>
                    <TrendingUp className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: "#4ade80" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: fgMuted }}>Lucro Realizado</p>
                    <p className="text-xl font-bold leading-none mt-0.5" style={{ color: fg }}>
                      {formatCurrency(totalActualProfit)}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium" style={{ color: fgMuted }}>
                      Lucro já realizado
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border transition-all duration-300" style={{ backgroundColor: bgCard, borderColor: border }}>
                <CardContent className="p-2 md:p-5 flex items-start gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "rgba(248,113,113,0.1)", border: `1px solid ${border}` }}>
                    <AlertCircle className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: "#f87171" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: fgMuted }}>Em Atraso</p>
                    <p className="text-xl font-bold leading-none mt-0.5" style={{ color: overdueCount > 0 ? "#f87171" : fg }}>
                      {overdueCount}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium" style={{ color: fgMuted }}>
                      {overdueCount} empréstimo{overdueCount !== 1 ? "s" : ""} em atraso
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Gráfico: Evolução da Carteira */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: fg }}>Evolução da Carteira</h2>
          {chartData.length === 0 && !isLoading ? (
            <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
              <CardContent className="p-8 flex items-center justify-center">
                <p className="text-sm" style={{ color: fgMuted }}>Nenhum empréstimo cadastrado para exibir o gráfico.</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
              <CardContent className="p-4">
                <Skeleton className="h-64 w-full rounded" style={{ background: skeletonBg }} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
              <CardContent className="p-4">
                <ChartContainer config={chartConfig} className="w-full h-64">
                  <ResponsiveContainer width="100%" height={256}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
                      <XAxis
                        dataKey="data"
                        tick={{ fill: fgMuted, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: border }}
                      />
                      <YAxis
                        tick={{ fill: fgMuted, fontSize: 11 }}
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
                              <span className="text-xs" style={{ color: fgMuted }}>Total Emprestado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-[2px] bg-[#34d399]" />
                              <span className="text-xs" style={{ color: fgMuted }}>Retorno Previsto</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-[2px] bg-[#f59e0b]" />
                              <span className="text-xs" style={{ color: fgMuted }}>Lucro Previsto</span>
                            </div>
                          </div>
                        )}
                      />
                      <Line type="monotone" dataKey="emprestado" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="retorno" stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="lucro" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gráfico: Distribuição da Carteira */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: fg }}>Distribuição da Carteira</h2>
          {chartData.length === 0 && !isLoading ? (
            <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
              <CardContent className="p-8 flex items-center justify-center">
                <p className="text-sm" style={{ color: fgMuted }}>Nenhum empréstimo cadastrado para exibir o gráfico.</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
              <CardContent className="p-4">
                <Skeleton className="h-64 w-full rounded" style={{ background: skeletonBg }} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
              <CardContent className="p-4">
                <ChartContainer config={distributionConfig} className="w-full h-28 md:h-56">
                  <ResponsiveContainer width="100%" height={112}>
                    <BarChart data={filteredDistributionData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis
                        tick={{ fill: fgMuted, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div
                              className="rounded-lg border px-3 py-2 text-xs shadow-xl"
                              style={{ backgroundColor: bgElevated, borderColor: border }}
                            >
                              <p className="font-semibold" style={{ color: fg }}>{d.name}</p>
                              <p className="mt-1">
                                <span style={{ color: fgMuted }}>Quantidade: </span>
                                <span className="font-mono font-medium" style={{ color: fg }}>{d.quantidade}</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="quantidade" radius={[6, 6, 0, 0]} cursor="pointer">
                        {filteredDistributionData.map((entry) => (
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

        {/* Resumo da Carteira */}
        <div>
          <h2 className="text-sm font-bold mb-1" style={{ color: fg }}>Resumo da Carteira</h2>
          <p className="text-xs mb-3" style={{ color: fgMuted }}>Visão consolidada do desempenho dos seus empréstimos</p>
          <Card className="border" style={{ backgroundColor: bgCard, borderColor: border }}>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4">
                <div className="flex flex-col items-center px-3 py-4 first:pl-0 last:pr-0 md:px-4" style={{ borderRight: `1px solid ${border}` }}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ backgroundColor: "rgba(59,130,246,0.1)", border: `1px solid ${border}` }}>
                    <Wallet className="h-4 w-4" style={{ color: "#60a5fa" }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-center mb-1" style={{ color: fgMuted }}>Total</p>
                  <p className="text-xl font-bold leading-none" style={{ color: fg }}>
                    {filteredByStatus.length}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: fgMuted }}>empréstimos</p>
                </div>

                <div className="flex flex-col items-center px-3 py-4 first:pl-0 last:pr-0 md:px-4" style={{ borderRight: `1px solid ${border}` }}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ backgroundColor: "rgba(59,130,246,0.1)", border: `1px solid ${border}` }}>
                    <Clock className="h-4 w-4" style={{ color: "#60a5fa" }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-center mb-1" style={{ color: fgMuted }}>Ativos</p>
                  <p className="text-xl font-bold leading-none" style={{ color: fg }}>
                    {filteredByStatus.filter((inv) => inv.status === "active").length}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: fgMuted }}>em andamento</p>
                </div>

                <div className="flex flex-col items-center px-3 py-4 first:pl-0 last:pr-0 md:px-4" style={{ borderRight: `1px solid ${border}` }}>
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg border mb-2"
                    style={{
                      backgroundColor: overdueCount > 0 ? "rgba(248,113,113,0.1)" : bgSecondary,
                      borderColor: overdueCount > 0 ? "rgba(248,113,113,0.3)" : border,
                    }}
                  >
                    <AlertCircle className="h-4 w-4" style={{ color: overdueCount > 0 ? "#f87171" : fgMuted }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-center mb-1" style={{ color: fgMuted }}>Em Atraso</p>
                  <p className="text-xl font-bold leading-none" style={{ color: overdueCount > 0 ? "#f87171" : fg }}>
                    {overdueCount}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: fgMuted }}>vencidos</p>
                </div>

                <div className="flex flex-col items-center px-3 py-4 first:pl-0 last:pr-0 md:px-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ backgroundColor: "rgba(52,211,153,0.1)", border: `1px solid ${border}` }}>
                    <TrendingUp className="h-4 w-4" style={{ color: "#34d399" }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-center mb-1" style={{ color: fgMuted }}>Taxa Retorno</p>
                  <p className="text-xl font-bold leading-none" style={{ color: "#34d399" }}>
                    {totalInvested > 0
                      ? `${((totalExpectedProfit / totalInvested) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                      : "0,0%"}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: fgMuted }}>lucro/valor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empréstimos do Período */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: fg }}>Empréstimos do Período</h2>
          <Card className="border overflow-hidden" style={{ backgroundColor: bgCard, borderColor: border }}>
            {isLoading ? (
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" style={{ background: skeletonBg }} />
                  ))}
                </div>
              </CardContent>
            ) : filteredByStatus.length === 0 ? (
              <CardContent className="p-8 flex items-center justify-center">
                <p className="text-sm" style={{ color: fgMuted }}>Nenhum empréstimo no período selecionado.</p>
              </CardContent>
            ) : (
              <>
                <div className="hidden md:block overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3" style={{ color: fgMuted }}>Pessoa</th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-3 py-3" style={{ color: fgMuted }}>Emprestado</th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-3 py-3" style={{ color: fgMuted }}>Retorno</th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-3 py-3" style={{ color: fgMuted }}>Lucro</th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-3 py-3" style={{ color: fgMuted }}>Vencimento</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-3 py-3" style={{ color: fgMuted }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredByStatus.map((inv, idx) => {
                        const displayStatus = getDisplayStatus(inv);
                        const statusCfg = getStatusConfig(displayStatus);
                        const StatusIcon = statusCfg.icon;
                        const initials = (inv.person_name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                        const photoUrl = getPersonPhotoUrl(inv.person_id);
                        return (
                          <tr
                            key={inv.id}
                            className="last:border-0 hover:opacity-80 transition-colors"
                            style={{ borderTop: idx === 0 ? "none" : `1px solid ${border}` }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={inv.person_name || "Pessoa"}
                                    className="h-8 w-8 rounded-full object-cover border-2 shrink-0"
                                    style={{ borderColor: border }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <div
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${statusCfg.color}cc, ${statusCfg.color}66)`, color: "#fff" }}
                                  >
                                    {initials}
                                  </div>
                                )}
                                <span className="text-sm font-medium truncate max-w-[140px]" style={{ color: fg }}>
                                  {inv.person_name || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="text-right px-3 py-3">
                              <span className="text-sm font-semibold font-mono" style={{ color: fg }}>
                                {formatCurrency(Number(inv.invested_amount))}
                              </span>
                            </td>
                            <td className="text-right px-3 py-3">
                              <span className="text-sm font-semibold font-mono" style={{ color: fg }}>
                                {formatCurrency(Number(inv.expected_return || 0))}
                              </span>
                            </td>
                            <td className="text-right px-3 py-3">
                              <span className="text-sm font-semibold font-mono" style={{ color: "#34d399" }}>
                                {formatCurrency(Number(inv.expected_profit || 0))}
                              </span>
                            </td>
                            <td className="text-right px-3 py-3">
                              <span className="text-xs font-mono" style={{ color: fgMuted }}>
                                {formatDate(inv.return_date)}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                style={{
                                  color: statusCfg.color,
                                  backgroundColor: statusCfg.bg,
                                  borderColor: statusCfg.border,
                                }}
                              >
                                <StatusIcon className="h-2.5 w-2.5" />
                                {statusCfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y" style={{ borderColor: border }}>
                  {filteredByStatus.map((inv) => {
                    const displayStatus = getDisplayStatus(inv);
                    const statusCfg = getStatusConfig(displayStatus);
                    const StatusIcon = statusCfg.icon;
                    const initials = (inv.person_name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                    const photoUrl = getPersonPhotoUrl(inv.person_id);
                    return (
                      <div key={inv.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={inv.person_name || "Pessoa"}
                                className="h-10 w-10 rounded-full object-cover border-2 shrink-0"
                                style={{ borderColor: border }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div
                                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                style={{ background: `linear-gradient(135deg, ${statusCfg.color}cc, ${statusCfg.color}66)`, color: "#fff" }}
                              >
                                {initials}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold" style={{ color: fg }}>{inv.person_name || "—"}</p>
                              <p className="text-[10px] font-mono" style={{ color: fgMuted }}>Vencimento: {formatDate(inv.return_date)}</p>
                            </div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border"
                            style={{
                              color: statusCfg.color,
                              backgroundColor: statusCfg.bg,
                              borderColor: statusCfg.border,
                            }}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg p-2" style={{ backgroundColor: bgMain }}>
                            <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: fgMuted }}>Emprestado</p>
                            <p className="text-xs font-semibold font-mono leading-tight" style={{ color: fg }}>{formatCurrency(Number(inv.invested_amount))}</p>
                          </div>
                          <div className="rounded-lg p-2" style={{ backgroundColor: bgMain }}>
                            <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: fgMuted }}>Retorno</p>
                            <p className="text-xs font-semibold font-mono leading-tight" style={{ color: fg }}>{formatCurrency(Number(inv.expected_return || 0))}</p>
                          </div>
                          <div className="rounded-lg p-2" style={{ backgroundColor: bgMain }}>
                            <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: fgMuted }}>Lucro</p>
                            <p className="text-xs font-semibold font-mono leading-tight" style={{ color: "#34d399" }}>{formatCurrency(Number(inv.expected_profit || 0))}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

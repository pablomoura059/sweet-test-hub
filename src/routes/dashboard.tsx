import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Menu, Plus, TrendingUp, Clock, DollarSign, Users,
  ChevronDown, ArrowUpRight, ArrowDownRight, Calendar,
  BarChart3, PieChart as PieChartIcon, Target, Wallet,
  Search, X, CheckCircle, AlertCircle, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (!supabase) throw new Error("Não autenticado");
  },
  component: DashboardPage,
});

type Period = "30" | "60" | "90" | "custom";
type StatusFilter = "all" | "active" | "completed" | "overdue" | "cancelled";

interface UserSettings {
  system_name: string;
  system_subtitle: string;
  logo_url: string | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("30");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from("user_settings")
        .select("system_name, system_subtitle, logo_url")
        .eq("user_id", session.user.id)
        .single();
      if (data) setUserSettings(data);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const days = period === "custom" ? 0 : parseInt(period);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  }, [period]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", dateRange.start, dateRange.end, statusFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const filters: Record<string, unknown> = { manager_id: session.user.id };
      if (dateRange.start && dateRange.end) {
        filters["created_at"] = { gte: dateRange.start, lte: dateRange.end };
      }
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const [loansRes, paymentsRes] = await Promise.all([
        supabase.from("investments").select("*").eq("manager_id", session.user.id),
        supabase.from("payments").select("*, investment:investments(*)").gte("payment_date", dateRange.start || "1970-01-01").lte("payment_date", dateRange.end || "2100-01-01"),
      ]);

      const allLoans = loansRes.data || [];
      const allPayments = paymentsRes.data || [];

      const filteredLoans = allLoans.filter(loan => {
        if (!dateRange.start || !dateRange.end) return true;
        const created = loan.created_at?.split("T")[0];
        return created >= dateRange.start && created <= dateRange.end;
      });

      const totalInvested = filteredLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
      const totalReturned = allPayments.reduce((sum, p) => {
        if (p.investment?.manager_id !== session.user.id) return sum;
        if (statusFilter !== "all" && p.investment?.status !== statusFilter) return sum;
        return sum + (p.amount || 0);
      }, 0);
      const activeLoans = filteredLoans.filter(l => l.status === "active").length;
      const overdueLoans = filteredLoans.filter(l => {
        if (l.status !== "active") return false;
        if (!l.due_date) return false;
        return new Date(l.due_date) < new Date();
      }).length;

      return {
        totalInvested,
        totalReturned,
        activeLoans,
        overdueLoans,
        allLoans: filteredLoans,
        allPayments,
      };
    },
  });

  const { data: recentLoans, isLoading: loansLoading } = useQuery({
    queryKey: ["recent-loans", dateRange.start, dateRange.end, statusFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      let query = supabase
        .from("investments")
        .select("*, client:profiles!investments_client_id_fkey(first_name, last_name)")
        .eq("manager_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (dateRange.start && dateRange.end) {
        query = query.gte("created_at", dateRange.start).lte("created_at", dateRange.end + "T23:59:59");
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string, dueDate?: string) => {
    const isOverdue = status === "active" && dueDate && new Date(dueDate) < new Date();
    if (isOverdue) {
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Atrasado</Badge>;
    }
    switch (status) {
      case "active": return <Badge className="text-xs" style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
      case "completed": return <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Finalizado</Badge>;
      case "cancelled": return <Badge variant="outline" className="text-xs text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case "30": return "Últimos 30 dias";
      case "60": return "Últimos 60 dias";
      case "90": return "Últimos 90 dias";
      case "custom": return "Personalizado";
    }
  };

  const logoUrl = userSettings?.logo_url
    ? supabase.storage.from("system-logos").getPublicUrl(userSettings.logo_url).data.publicUrl
    : null;

  const systemName = userSettings?.system_name || "Bg Empréstimos";
  const systemSubtitle = userSettings?.system_subtitle || "contas";

  const statsData = [
    { title: "Total Investido", value: formatCurrency(stats?.totalInvested || 0), icon: DollarSign, trend: null },
    { title: "Total Recebido", value: formatCurrency(stats?.totalReturned || 0), icon: TrendingUp, trend: stats?.totalReturned && stats?.totalInvested ? ((stats.totalReturned / stats.totalInvested - 1) * 100) : null },
    { title: "Empréstimos Ativos", value: stats?.activeLoans || 0, icon: Wallet, trend: null },
    { title: "Em Atraso", value: stats?.overdueLoans || 0, icon: AlertCircle, trend: null, danger: (stats?.overdueLoans || 0) > 0 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background, #0B1220)" }}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 md:hidden" style={{ backgroundColor: "var(--color-sidebar, #162235)", borderBottom: "1px solid var(--color-border, #26364D)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" style={{ color: "var(--color-sidebar-foreground, #718096)" }}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 flex flex-col" style={{ backgroundColor: "var(--color-sidebar, #162235)", borderColor: "var(--color-border, #26364D)" }}>
                <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "var(--color-border, #26364D)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: logoUrl ? "transparent" : `linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))`, boxShadow: "0 8px 24px color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-base font-bold text-white">$</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold leading-tight" style={{ color: "var(--color-sidebar-foreground, #F3F6FA)" }}>{systemName}</div>
                      {systemSubtitle && <div className="text-[11px] mt-0.5" style={{ color: "var(--color-muted-foreground, #718096)" }}>{systemSubtitle}</div>}
                    </div>
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                  {[
                    { label: "Dashboard", icon: BarChart3, active: true, to: "/dashboard" },
                    { label: "Empréstimos", icon: Wallet, to: "/dashboard" },
                    { label: "Pessoas", icon: Users, to: "/people" },
                    { label: "Relatórios", icon: PieChartIcon, to: "/reports" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { setIsMobileMenuOpen(false); navigate({ to: item.to }); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: item.active ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "transparent",
                        color: item.active ? "var(--color-primary)" : "var(--color-sidebar-foreground, #AAB5C5)",
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: logoUrl ? "transparent" : `linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))`, boxShadow: "0 8px 24px color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-sm font-bold text-white">$</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: "var(--color-sidebar-foreground, #F3F6FA)" }}>{systemName}</div>
              {systemSubtitle && <div className="text-[11px] truncate" style={{ color: "var(--color-muted-foreground, #718096)" }}>{systemSubtitle}</div>}
            </div>
          </div>

          <Button size="sm" className="gap-1.5 text-xs" style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}>
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(["30", "60", "90"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: period === p ? "var(--color-primary)" : "var(--color-surface, #18263A)",
                  color: period === p ? "#fff" : "var(--color-muted-foreground, #718096)",
                  border: period !== p ? "1px solid var(--color-border, #26364D)" : "none",
                }}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className="hidden md:flex">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r z-40" style={{ backgroundColor: "var(--color-sidebar, #162235)", borderColor: "var(--color-border, #26364D)" }}>
          <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "var(--color-border, #26364D)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: logoUrl ? "transparent" : `linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))`, boxShadow: "0 8px 24px color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-base font-bold text-white">$</span>
                )}
              </div>
              <div>
                <div className="text-sm font-bold leading-tight" style={{ color: "var(--color-sidebar-foreground, #F3F6FA)" }}>{systemName}</div>
                {systemSubtitle && <div className="text-[11px] mt-0.5" style={{ color: "var(--color-muted-foreground, #718096)" }}>{systemSubtitle}</div>}
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {[
              { label: "Dashboard", icon: BarChart3, active: true, to: "/dashboard" },
              { label: "Empréstimos", icon: Wallet, to: "/dashboard" },
              { label: "Pessoas", icon: Users, to: "/people" },
              { label: "Relatórios", icon: PieChartIcon, to: "/reports" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate({ to: item.to })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: item.active ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "transparent",
                  color: item.active ? "var(--color-primary)" : "var(--color-sidebar-foreground, #AAB5C5)",
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="px-5 py-4 border-t" style={{ borderColor: "var(--color-border, #26364D)" }}>
            <Button
              size="sm"
              className="w-full gap-1.5"
              style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
            >
              <Plus className="h-3.5 w-3.5" /> Novo Empréstimo
            </Button>
          </div>
        </aside>

        {/* Desktop Main Content */}
        <main className="flex-1 ml-64">
          {/* Desktop Header */}
          <header className="sticky top-0 z-30 border-b" style={{ backgroundColor: "var(--color-sidebar, #162235)", borderColor: "var(--color-border, #26364D)" }}>
            <div className="flex items-center justify-between px-8 py-4">
              <div>
                <h1 className="text-xl font-bold" style={{ color: "var(--color-sidebar-foreground, #F3F6FA)" }}>Dashboard</h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground, #718096)" }}>Visão geral dos seus investimentos</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--color-muted-foreground, #718096)" }} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="pl-9 pr-4 py-2 rounded-lg text-sm w-64 border"
                    style={{ backgroundColor: "var(--color-surface, #101A2B)", borderColor: "var(--color-border, #26364D)", color: "var(--color-foreground, #F3F6FA)" }}
                  />
                </div>
                <Button size="sm" className="gap-1.5" style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}>
                  <Plus className="h-3.5 w-3.5" /> Novo
                </Button>
              </div>
            </div>
          </header>

          <div className="p-8 space-y-6">
            {/* Desktop Filters */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(["30", "60", "90"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: period === p ? "var(--color-primary)" : "transparent",
                      color: period === p ? "#fff" : "var(--color-muted-foreground, #718096)",
                      border: period !== p ? "1px solid var(--color-border, #26364D)" : "none",
                    }}
                  >
                    {getPeriodLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-5" style={{ backgroundColor: "var(--color-card, #162235)", borderColor: "var(--color-border, #26364D)" }}>
                      <Skeleton className="h-4 w-24 mb-3" />
                      <Skeleton className="h-8 w-32" />
                    </Card>
                  ))
                : statsData.map((stat, i) => (
                    <Card key={i} className="p-5 relative overflow-hidden" style={{ backgroundColor: "var(--color-card, #162235)", borderColor: "var(--color-border, #26364D)" }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--color-muted-foreground, #718096)" }}>{stat.title}</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: "var(--color-foreground, #F3F6FA)" }}>{stat.value}</p>
                          {stat.trend !== null && stat.trend !== undefined && (
                            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${stat.trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {stat.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(stat.trend).toFixed(1)}%
                            </div>
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.danger ? "rgba(239,68,68,0.1)" : "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}>
                          <stat.icon className="h-5 w-5" style={{ color: stat.danger ? "#ef4444" : "var(--color-primary)" }} />
                        </div>
                      </div>
                    </Card>
                  ))}
            </div>

            {/* Recent Loans Table */}
            <Card style={{ backgroundColor: "var(--color-card, #162235)", borderColor: "var(--color-border, #26364D)" }}>
              <CardHeader className="pb-3" style={{ borderColor: "var(--color-border, #26364D)" }}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold" style={{ color: "var(--color-foreground, #F3F6FA)" }}>Empréstimos do Período</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loansLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : recentLoans && recentLoans.length > 0 ? (
                  <div className="space-y-1">
                    {recentLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between p-3 rounded-xl transition-colors"
                        style={{ backgroundColor: "transparent", borderColor: "var(--color-border, #26364D)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)" }}>
                            {loan.client ? `${loan.client.first_name?.[0] || ""}${loan.client.last_name?.[0] || ""}`.toUpperCase() : "??"}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--color-foreground, #F3F6FA)" }}>
                              {loan.client ? `${loan.client.first_name} ${loan.client.last_name}` : "Cliente"}
                            </p>
                            <p className="text-xs" style={{ color: "var(--color-muted-foreground, #718096)" }}>
                              {loan.amount ? formatCurrency(loan.amount) : "—"} • {loan.interest_rate ? `${loan.interest_rate}%` : "—"} a.m.
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(loan.status, loan.due_date)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: "var(--color-muted-foreground, #718096)" }}>
                    <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum empréstimo encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Mobile Main Content */}
      <main className="md:hidden pb-20">
        <div className="p-4 space-y-4">
          {/* Mobile Stats */}
          <div className="grid grid-cols-2 gap-3">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4" style={{ backgroundColor: "var(--color-card, #162235)", borderColor: "var(--color-border, #26364D)" }}>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-20" />
                  </Card>
                ))
              : statsData.map((stat, i) => (
                  <Card key={i} className="p-4" style={{ backgroundColor: "var(--color-card, #162235)", borderColor: "var(--color-border, #26364D)" }}>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground, #718096)" }}>{stat.title}</p>
                    <p className="text-lg font-bold" style={{ color: "var(--color-foreground, #F3F6FA)" }}>{stat.value}</p>
                    {stat.trend !== null && stat.trend !== undefined && (
                      <div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${stat.trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {stat.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(stat.trend).toFixed(1)}%
                      </div>
                    )}
                  </Card>
                ))}
          </div>

          {/* Mobile Loans */}
          <Card style={{ backgroundColor: "var(--color-card, #162235)", borderColor: "var(--color-border, #26364D)" }}>
            <CardHeader className="pb-3" style={{ borderColor: "var(--color-border, #26364D)" }}>
              <CardTitle className="text-sm font-semibold" style={{ color: "var(--color-foreground, #F3F6FA)" }}>Empréstimos do Período</CardTitle>
            </CardHeader>
            <CardContent>
              {loansLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-24 mb-1" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                      <Skeleton className="h-5 w-14" />
                    </div>
                  ))}
                </div>
              ) : recentLoans && recentLoans.length > 0 ? (
                <div className="space-y-2">
                  {recentLoans.slice(0, 5).map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)" }}>
                          {loan.client ? `${loan.client.first_name?.[0] || ""}${loan.client.last_name?.[0] || ""}`.toUpperCase() : "??"}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--color-foreground, #F3F6FA)" }}>
                            {loan.client ? `${loan.client.first_name} ${loan.client.last_name}` : "Cliente"}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--color-muted-foreground, #718096)" }}>
                            {loan.amount ? formatCurrency(loan.amount) : "—"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(loan.status, loan.due_date)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6" style={{ color: "var(--color-muted-foreground, #718096)" }}>
                  <Wallet className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs">Nenhum empréstimo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

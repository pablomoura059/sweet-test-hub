import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  Plus,
  LogOut,
  Menu,
  ArrowRight,
  Trash2,
  Pencil,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investments"]["Row"];

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) => {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const getStatusInfo = (status: string, returnDate: string) => {
  const today = new Date().toISOString().split("T")[0];
  const isLate = status === "active" && returnDate < today;
  if (isLate) return { label: "ATRASADO", bg: "bg-red-500/15", text: "text-red-400", icon: AlertCircle };
  if (status === "active") return { label: "ATIVO", bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle };
  if (status === "finished") return { label: "FINALIZADO", bg: "bg-blue-500/15", text: "text-blue-400", icon: CheckCircle };
  return { label: "CANCELADO", bg: "bg-slate-500/15", text: "text-slate-400", icon: Clock };
};

const STAT_CARDS = [
  { key: "totalInvested", icon: Wallet, color: "bg-yellow-500/10", iconColor: "text-yellow-500" },
  { key: "totalInStreet", icon: DollarSign, color: "bg-yellow-500/10", iconColor: "text-yellow-500" },
  { key: "expectedProfit", icon: TrendingUp, color: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  { key: "expectedReturn", icon: PieChart, color: "bg-yellow-500/10", iconColor: "text-yellow-500" },
  { key: "receivedProfit", icon: Activity, color: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  { key: "activeCount", icon: Clock, color: "bg-yellow-500/10", iconColor: "text-yellow-500" },
] as const;

const CARD_LABELS: Record<string, { title: string; description: string }> = {
  totalInvested: { title: "Total Investido", description: "Acumulado" },
  totalInStreet: { title: "Na Rua", description: "Emprestado" },
  expectedProfit: { title: "Lucro Previsto", description: "Projeção" },
  expectedReturn: { title: "Retorno Total", description: "Valor + lucro" },
  receivedProfit: { title: "Lucro Recebido", description: "Realizado" },
  activeCount: { title: "Empréstimos Ativos", description: "Em andamento" },
};

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, color, iconColor, description, index }: {
  title: string; value: string; icon: LucideIcon;
  color: string; iconColor: string; description?: string; index: number;
}) {
  return (
    <Card
      className="bg-zinc-900/80 border-zinc-800 hover:border-yellow-500/40 transition-all duration-300 hover:scale-[1.02] cursor-default group animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <CardContent className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4 overflow-hidden">
        <div className={`p-2 sm:p-2.5 rounded-xl ${color} border border-zinc-800 group-hover:border-yellow-500/30 transition-colors shrink-0`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider truncate">{title}</p>
          <p className="stat-value text-zinc-100">{value}</p>
          {description && <p className="text-[9px] sm:text-[10px] text-zinc-600 mt-0.5 sm:mt-1 font-medium">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, returnDate }: { status: string; returnDate: string }) {
  const { label, bg, text, icon: Icon } = getStatusInfo(status, returnDate);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">{title}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
    </div>
  );
}

function InfoRow({ label, value, valueColor = "text-zinc-300" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center gap-2 py-1">
      <span className="text-[11px] text-zinc-600 font-medium">{label}</span>
      <span className={`text-[11px] font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, valueColor = "text-zinc-200" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-zinc-500 font-medium">{label}</span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finishData, setFinishData] = useState<{ investment: Investment; actual_received: string } | null>(null);
  const [editData, setEditData] = useState<Investment | null>(null);

  const emptyForm = {
    person_name: "",
    invested_amount: "",
    profit_percent: "",
    start_date: new Date().toISOString().split("T")[0],
    return_date: "",
    notes: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  const { data: investments, isLoading } = useQuery({
    queryKey: ["investments", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data, error } = await supabase
        .from("investments").select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!session?.user.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("investments").insert({
        user_id: session!.user.id,
        person_name: data.person_name,
        invested_amount: parseFloat(data.invested_amount),
        profit_percent: parseFloat(data.profit_percent),
        start_date: data.start_date,
        return_date: data.return_date,
        notes: data.notes || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo cadastrado com sucesso!", { className: "!bg-zinc-900 !border-yellow-500/30 !text-zinc-100 !font-medium" });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setIsNewLoanOpen(false);
      setFormData(emptyForm);
    },
    onError: () => toast.error("Erro ao cadastrar empréstimo"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Investment> }) => {
      const { error } = await supabase.from("investments").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo atualizado!", { className: "!bg-zinc-900 !border-yellow-500/30 !text-zinc-100 !font-medium" });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setEditData(null);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const finishMutation = useMutation({
    mutationFn: async ({ id, actual_received }: { id: string; actual_received: number }) => {
      const investment = investments?.find((i) => i.id === id);
      if (!investment) throw new Error("Não encontrado");
      const actual_profit = actual_received - Number(investment.invested_amount);
      const profit_difference = actual_profit - Number(investment.expected_profit);
      const { error } = await supabase.from("investments").update({
        actual_received, actual_profit, profit_difference,
        status: "finished", finalized_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo finalizado!", { className: "!bg-zinc-900 !border-yellow-500/30 !text-zinc-100 !font-medium" });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setFinishData(null);
    },
    onError: () => toast.error("Erro ao finalizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo excluído", { className: "!bg-zinc-900 !border-yellow-500/30 !text-zinc-100 !font-medium" });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const activeInvestments = investments?.filter((i) => i.status === "active") || [];
  const totalInvested = investments?.reduce((sum, i) => sum + Number(i.invested_amount), 0) || 0;
  const totalInStreet = activeInvestments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
  const expectedProfit = activeInvestments.reduce((sum, i) => sum + Number(i.expected_profit || 0), 0);
  const expectedReturn = activeInvestments.reduce((sum, i) => sum + Number(i.expected_return || 0), 0);
  const receivedProfit = investments?.filter((i) => i.status === "finished").reduce((sum, i) => sum + Number(i.actual_profit || 0), 0) || 0;

  const stats = { totalInvested, totalInStreet, expectedProfit, expectedReturn, receivedProfit, activeCount: activeInvestments.length };

  const calcProfit = () => (parseFloat(formData.invested_amount) || 0) * (parseFloat(formData.profit_percent) || 0) / 100;
  const calcReturn = () => (parseFloat(formData.invested_amount) || 0) + calcProfit();

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user.id) { toast.error("Você precisa estar logado"); return; }
    if (!formData.person_name || !formData.invested_amount || !formData.profit_percent || !formData.return_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleFinish = () => {
    if (!finishData) return;
    finishMutation.mutate({ id: finishData.investment.id, actual_received: parseFloat(finishData.actual_received) });
  };

  const openEditModal = (investment: Investment) => {
    setEditData(investment);
    setFormData({
      person_name: investment.person_name,
      invested_amount: String(investment.invested_amount),
      profit_percent: String(investment.profit_percent),
      start_date: investment.start_date,
      return_date: investment.return_date,
      notes: investment.notes || "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    updateMutation.mutate({ id: editData.id, data: {
      person_name: formData.person_name,
      invested_amount: parseFloat(formData.invested_amount),
      profit_percent: parseFloat(formData.profit_percent),
      start_date: formData.start_date,
      return_date: formData.return_date,
      notes: formData.notes || null,
    }});
  };

  const openFinishModal = (investment: Investment) => {
    setFinishData({ investment, actual_received: String(investment.expected_return) });
  };

  const statValue = (key: string) => {
    const vals: Record<string, string> = {
      totalInvested: formatCurrency(stats.totalInvested),
      totalInStreet: formatCurrency(stats.totalInStreet),
      expectedProfit: formatCurrency(stats.expectedProfit),
      expectedReturn: formatCurrency(stats.expectedReturn),
      receivedProfit: formatCurrency(stats.receivedProfit),
      activeCount: String(stats.activeCount),
    };
    return vals[key] || "—";
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B0D10" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-zinc-950 border-zinc-800 w-72">
                <SheetHeader>
                  <SheetTitle className="text-zinc-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-600/20">
                      <span className="text-sm font-bold text-white">$</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold">Empréstimos</div>
                      <div className="text-[10px] text-zinc-600 font-normal">Sistema financeiro</div>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 space-y-1">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-600/10 border border-yellow-600/30 text-yellow-500 text-sm font-semibold cursor-default">
                    <Activity className="h-4 w-4" />
                    Dashboard
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 text-sm transition-colors cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-600/20">
              <span className="text-sm font-bold text-white">$</span>
            </div>
            <h1 className="text-base font-bold text-zinc-100 tracking-tight">Empréstimos</h1>
          </div>

          <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white shadow-lg shadow-yellow-600/20 font-semibold transition-all duration-200 active:scale-95">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-zinc-100">Novo Empréstimo</DialogTitle>
                <DialogDescription className="text-zinc-500 text-sm">Cadastre um novo empréstimo ou investimento</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLoan} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="person_name" className="text-xs font-semibold text-zinc-400">Nome da Pessoa *</Label>
                  <Input id="person_name" value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} placeholder="Nome completo" className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invested_amount" className="text-xs font-semibold text-zinc-400">Valor (R$) *</Label>
                    <Input id="invested_amount" type="number" step="0.01" min="0" value={formData.invested_amount} onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })} placeholder="0,00" className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profit_percent" className="text-xs font-semibold text-zinc-400">Porcentagem (%) *</Label>
                    <Input id="profit_percent" type="number" step="0.01" min="0" value={formData.profit_percent} onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })} placeholder="30" className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" required />
                  </div>
                </div>

                {formData.invested_amount && formData.profit_percent && (
                  <div className="p-3 rounded-xl bg-yellow-600/5 border border-yellow-600/20 space-y-1.5">
                    <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">Prévia do cálculo</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-zinc-500">Lucro:</span> <span className="text-emerald-400 font-semibold ml-1">{formatCurrency(calcProfit())}</span></div>
                      <div><span className="text-zinc-500">Retorno:</span> <span className="text-zinc-200 font-semibold ml-1">{formatCurrency(calcReturn())}</span></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-xs font-semibold text-zinc-400">Data de Início *</Label>
                    <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="return_date" className="text-xs font-semibold text-zinc-400">Data de Retorno *</Label>
                    <Input id="return_date" type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-zinc-400">Observações</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações opcionais..." className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 resize-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" rows={3} />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setIsNewLoanOpen(false)} className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors" disabled={createMutation.isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold transition-all active:scale-95" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────── */}
      <main className="p-4 space-y-6 max-w-5xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STAT_CARDS.map(({ key, icon, color, iconColor }, index) => (
            <StatCard
              key={key}
              title={CARD_LABELS[key].title}
              value={statValue(key)}
              icon={icon}
              color={color}
              iconColor={iconColor}
              description={CARD_LABELS[key].description}
              index={index}
            />
          ))}
        </div>

        {/* Investments list */}
        <section className="space-y-3">
          <SectionHeader title="Todos os Empréstimos" />
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 rounded skeleton-shimmer" />
                    <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
                  </div>
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                  <div className="space-y-1.5">
                    {[1,2,3,4].map(j => <Skeleton key={j} className="h-3 w-full rounded skeleton-shimmer" />)}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1 rounded-xl skeleton-shimmer" />
                    <Skeleton className="h-8 flex-1 rounded-xl skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : investments && investments.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {investments.map((inv, idx) => {
                const statusInfo = getStatusInfo(inv.status, inv.return_date);
                return (
                  <Card
                    key={inv.id}
                    className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:scale-[1.01] group animate-fade-in-up"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-zinc-600 shrink-0" />
                          <p className="font-bold text-zinc-100 truncate text-sm">{inv.person_name}</p>
                        </div>
                        <StatusBadge status={inv.status} returnDate={inv.return_date} />
                      </div>

                      {/* Valor principal */}
                      <p className="text-2xl font-bold text-zinc-100 break-words leading-tight">{formatCurrency(Number(inv.invested_amount))}</p>

                      {/* Grid de info */}
                      <div className="border-t border-zinc-800/60 pt-3 space-y-0">
                        <InfoRow label="Porcentagem" value={`${inv.profit_percent}%`} />
                        <InfoRow label="Lucro" value={formatCurrency(Number(inv.expected_profit || 0))} valueColor="text-emerald-400" />
                        <InfoRow label="Retorno" value={formatCurrency(Number(inv.expected_return || 0))} />
                        <InfoRow label="Início" value={formatDate(inv.start_date)} />
                      </div>

                      {/* Ações */}
                      {inv.status === "active" && (
                        <div className="flex gap-2 pt-2 border-t border-zinc-800/60">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(inv)} className="flex-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 text-xs h-8 transition-colors">
                            <Pencil className="h-3 w-3 mr-1 shrink-0" /> Editar
                          </Button>
                          <Button size="sm" onClick={() => openFinishModal(inv)} className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white text-xs h-8 font-semibold transition-all active:scale-95 shadow-md shadow-yellow-600/10">
                            Finalizar <ArrowRight className="h-3 w-3 ml-1 shrink-0" />
                          </Button>
                        </div>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(inv.id)} className="w-full text-zinc-600 hover:text-red-400 hover:bg-red-500/10 text-xs h-8 transition-colors">
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-zinc-600" />
                </div>
                <div>
                  <p className="text-zinc-400 font-semibold text-sm">Nenhum empréstimo cadastrado</p>
                  <p className="text-zinc-600 text-xs mt-1">Clique em "Novo" para começar</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* ── Modal de Edição ─────────────────────────────── */}
      <Dialog open={!!editData} onOpenChange={() => setEditData(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Editar Empréstimo</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">Altere os dados do empréstimo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit_person_name" className="text-xs font-semibold text-zinc-400">Nome da Pessoa *</Label>
              <Input id="edit_person_name" value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_amount" className="text-xs font-semibold text-zinc-400">Valor (R$) *</Label>
                <Input id="edit_amount" type="number" step="0.01" min="0" value={formData.invested_amount} onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_percent" className="text-xs font-semibold text-zinc-400">Porcentagem (%) *</Label>
                <Input id="edit_percent" type="number" step="0.01" min="0" value={formData.profit_percent} onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_start" className="text-xs font-semibold text-zinc-400">Data de Início *</Label>
                <Input id="edit_start" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_return" className="text-xs font-semibold text-zinc-400">Data de Retorno *</Label>
                <Input id="edit_return" type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_notes" className="text-xs font-semibold text-zinc-400">Observações</Label>
              <Textarea id="edit_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-100 resize-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" rows={3} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditData(null)} className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold transition-all active:scale-95" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Finalização ─────────────────────────── */}
      <Dialog open={!!finishData} onOpenChange={() => setFinishData(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Finalizar Empréstimo</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">Informe o valor realmente recebido</DialogDescription>
          </DialogHeader>
          {finishData && (
            <div className="space-y-5">
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-1">
                <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Resumo</h4>
                <SummaryRow label="Pessoa" value={finishData.investment.person_name} />
                <SummaryRow label="Valor emprestado" value={formatCurrency(Number(finishData.investment.invested_amount))} />
                <SummaryRow label="Retorno previsto" value={formatCurrency(Number(finishData.investment.expected_return))} />
                <SummaryRow label="Lucro previsto" value={formatCurrency(Number(finishData.investment.expected_profit))} valueColor="text-emerald-400" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actual_received" className="text-xs font-semibold text-zinc-400">Valor recebido (R$)</Label>
                <Input id="actual_received" type="number" step="0.01" min="0" value={finishData.actual_received}
                  onChange={(e) => setFinishData({ ...finishData, actual_received: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-lg font-semibold placeholder:text-zinc-700 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/50" />
              </div>

              {finishData.actual_received && (
                <div className="rounded-xl bg-yellow-600/5 border border-yellow-600/20 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Lucro real:</span>
                    <span className="text-emerald-400 font-semibold">{formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Diferença:</span>
                    <span className={parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit) >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                      {formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setFinishData(null)} className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors">Cancelar</Button>
                <Button onClick={handleFinish} className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold transition-all active:scale-95 shadow-md shadow-yellow-600/10" disabled={finishMutation.isPending}>
                  {finishMutation.isPending ? "Finalizando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog de Exclusão ───────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-bold">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 text-sm">
              Tem certeza que deseja excluir este empréstimo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

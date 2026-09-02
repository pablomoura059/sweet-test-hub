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
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  ArrowRight,
  Trash2,
  Pencil,
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

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR");

const getStatusInfo = (status: string, returnDate: string) => {
  const today = new Date().toISOString().split("T")[0];
  const isLate = status === "active" && returnDate < today;

  if (isLate) {
    return { label: "ATRASADO", bg: "bg-red-500/15", text: "text-red-400", icon: AlertCircle };
  }
  if (status === "active") {
    return { label: "ATIVO", bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle };
  }
  if (status === "finished") {
    return { label: "FINALIZADO", bg: "bg-blue-500/15", text: "text-blue-400", icon: CheckCircle };
  }
  return { label: "CANCELADO", bg: "bg-slate-500/15", text: "text-slate-400", icon: Clock };
};

const STAT_CARDS = [
  { key: "totalInvested",     icon: Wallet,      color: "bg-violet-500/20",  iconColor: "text-violet-400" },
  { key: "totalInStreet",      icon: DollarSign,   color: "bg-blue-500/20",    iconColor: "text-blue-400" },
  { key: "expectedProfit",     icon: TrendingUp,   color: "bg-emerald-500/20",  iconColor: "text-emerald-400" },
  { key: "expectedReturn",     icon: PieChart,     color: "bg-amber-500/20",    iconColor: "text-amber-400" },
  { key: "receivedProfit",     icon: Activity,     color: "bg-teal-500/20",     iconColor: "text-teal-400" },
  { key: "activeCount",        icon: Clock,        color: "bg-cyan-500/20",     iconColor: "text-cyan-400" },
] as const;

// ─── Componentes small ───────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconColor,
  description,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  description?: string;
}) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/80 backdrop-blur-sm hover:border-slate-600 transition-colors">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="text-lg font-bold text-white mt-0.5 truncate">{value}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, returnDate }: { status: string; returnDate: string }) {
  const { label, bg, text, icon: Icon } = getStatusInfo(status, returnDate);
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-base font-semibold text-slate-200">{title}</h2>;
}

// ─── Componente principal ─────────────────────────────────────────────────────

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

  // Session
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

  // Investments
  const { data: investments, isLoading } = useQuery({
    queryKey: ["investments", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!session?.user.id,
  });

  // Mutations
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
      toast.success("Empréstimo cadastrado com sucesso!");
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
      toast.success("Empréstimo atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setEditData(null);
    },
    onError: () => toast.error("Erro ao atualizar empréstimo"),
  });

  const finishMutation = useMutation({
    mutationFn: async ({ id, actual_received }: { id: string; actual_received: number }) => {
      const investment = investments?.find((i) => i.id === id);
      if (!investment) throw new Error("Empréstimo não encontrado");

      const actual_profit = actual_received - Number(investment.invested_amount);
      const profit_difference = actual_profit - Number(investment.expected_profit);

      const { error } = await supabase
        .from("investments")
        .update({ actual_received, actual_profit, profit_difference, status: "finished", finalized_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo finalizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setFinishData(null);
    },
    onError: () => toast.error("Erro ao finalizar empréstimo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir empréstimo"),
  });

  // Calculations
  const activeInvestments = investments?.filter((i) => i.status === "active") || [];
  const totalInvested = investments?.reduce((sum, i) => sum + Number(i.invested_amount), 0) || 0;
  const totalInStreet = activeInvestments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
  const expectedProfit = activeInvestments.reduce((sum, i) => sum + Number(i.expected_profit || 0), 0);
  const expectedReturn = activeInvestments.reduce((sum, i) => sum + Number(i.expected_return || 0), 0);
  const receivedProfit = investments?.filter((i) => i.status === "finished").reduce((sum, i) => sum + Number(i.actual_profit || 0), 0) || 0;

  const stats = {
    totalInvested,
    totalInStreet,
    expectedProfit,
    expectedReturn,
    receivedProfit,
    activeCount: activeInvestments.length,
  };

  const calcProfit = () => {
    const amount = parseFloat(formData.invested_amount) || 0;
    const percent = parseFloat(formData.profit_percent) || 0;
    return amount * percent / 100;
  };
  const calcReturn = () => parseFloat(formData.invested_amount) || 0 + calcProfit();

  // Handlers
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f172a" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-slate-900 border-slate-800 w-72">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">$</span>
                    </div>
                    Empréstimos
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium cursor-default">
                    <Activity className="h-4 w-4 text-blue-400" />
                    Dashboard
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">$</span>
            </div>
            <h1 className="text-base font-bold text-white">Empréstimos</h1>
          </div>

          <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Novo Empréstimo</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Cadastre um novo empréstimo ou investimento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLoan} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="person_name" className="text-xs font-medium text-slate-300">Nome da Pessoa *</Label>
                  <Input id="person_name" value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} placeholder="Nome completo" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invested_amount" className="text-xs font-medium text-slate-300">Valor (R$) *</Label>
                    <Input id="invested_amount" type="number" step="0.01" min="0" value={formData.invested_amount} onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })} placeholder="0,00" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profit_percent" className="text-xs font-medium text-slate-300">Porcentagem (%) *</Label>
                    <Input id="profit_percent" type="number" step="0.01" min="0" value={formData.profit_percent} onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })} placeholder="30" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>
                </div>

                {formData.invested_amount && formData.profit_percent && (
                  <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-600/20 space-y-1.5">
                    <p className="text-xs font-medium text-blue-400">Prévia do cálculo</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-400">Lucro previsto:</span> <span className="text-emerald-400 font-medium ml-1">{formatCurrency(calcProfit())}</span></div>
                      <div><span className="text-slate-400">Retorno:</span> <span className="text-white font-medium ml-1">{formatCurrency(calcReturn())}</span></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-xs font-medium text-slate-300">Data de Início *</Label>
                    <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="return_date" className="text-xs font-medium text-slate-300">Data de Retorno *</Label>
                    <Input id="return_date" type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-medium text-slate-300">Observações</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações opcionais..." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" rows={3} />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setIsNewLoanOpen(false)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" disabled={createMutation.isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending}>
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
          {STAT_CARDS.map(({ key, icon, color, iconColor }) => (
            <StatCard
              key={key}
              title={{ totalInvested: "Total Investido", totalInStreet: "Dinheiro na Rua", expectedProfit: "Lucro Previsto", expectedReturn: "Retorno Previsto", receivedProfit: "Lucro Recebido", activeCount: "Ativos" }[key]}
              value={{ totalInvested: formatCurrency(stats.totalInvested), totalInStreet: formatCurrency(stats.totalInStreet), expectedProfit: formatCurrency(stats.expectedProfit), expectedReturn: formatCurrency(stats.expectedReturn), receivedProfit: formatCurrency(stats.receivedProfit), activeCount: String(stats.activeCount) }[key]}
              icon={icon}
              color={color}
              iconColor={iconColor}
              description={{ totalInvested: undefined, totalInStreet: `${stats.activeCount} ativo(s)`, expectedProfit: "Empréstimos ativos", expectedReturn: "Valor + lucro", receivedProfit: "Finalizados", activeCount: "Em andamento" }[key]}
            />
          ))}
        </div>

        {/* Investments list */}
        <section className="space-y-3">
          <SectionHeader title="Todos os Empréstimos" />
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-xl bg-slate-800" />)}
            </div>
          ) : investments && investments.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {investments.map((inv) => {
                const statusInfo = getStatusInfo(inv.status, inv.return_date);
                return (
                  <Card key={inv.id} className="bg-slate-800/60 border-slate-700/80 backdrop-blur-sm hover:border-slate-600 transition-colors">
                    <CardContent className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-slate-500 shrink-0" />
                          <p className="font-semibold text-white truncate text-sm">{inv.person_name}</p>
                        </div>
                        <StatusBadge status={inv.status} returnDate={inv.return_date} />
                      </div>

                      {/* Valor principal */}
                      <p className="text-2xl font-bold text-blue-400">{formatCurrency(Number(invested_amount))}</p>

                      {/* Grid de info */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <InfoRow label="Porcentagem" value={`${inv.profit_percent}%`} />
                        <InfoRow label="Lucro" value={formatCurrency(Number(invested_profit || 0))} valueColor="text-emerald-400" />
                        <InfoRow label="Retorno" value={formatCurrency(Number(invested_return || 0))} />
                        <InfoRow label="Início" value={formatDate(inv.start_date)} />
                      </div>

                      {/* Ações */}
                      {inv.status === "active" && (
                        <div className="flex gap-2 pt-1 border-t border-slate-700/60">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(inv)} className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700 text-xs h-8">
                            <Pencil className="h-3 w-3 mr-1" /> Editar
                          </Button>
                          <Button size="sm" onClick={() => openFinishModal(inv)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                            Finalizar <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(inv.id)} className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-xs h-8">
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-slate-800/60 border-slate-700/80">
              <CardContent className="p-10 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-700/60 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium text-sm">Nenhum empréstimo cadastrado</p>
                  <p className="text-slate-500 text-xs mt-1">Clique em "Novo" para começar</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* ── Modal de Edição ─────────────────────────────── */}
      <Dialog open={!!editData} onOpenChange={() => setEditData(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Empréstimo</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">Altere os dados do empréstimo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit_person_name" className="text-xs font-medium text-slate-300">Nome da Pessoa *</Label>
              <Input id="edit_person_name" value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_amount" className="text-xs font-medium text-slate-300">Valor (R$) *</Label>
                <Input id="edit_amount" type="number" step="0.01" min="0" value={formData.invested_amount} onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_percent" className="text-xs font-medium text-slate-300">Porcentagem (%) *</Label>
                <Input id="edit_percent" type="number" step="0.01" min="0" value={formData.profit_percent} onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_start" className="text-xs font-medium text-slate-300">Data de Início *</Label>
                <Input id="edit_start" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_return" className="text-xs font-medium text-slate-300">Data de Retorno *</Label>
                <Input id="edit_return" type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_notes" className="text-xs font-medium text-slate-300">Observações</Label>
              <Textarea id="edit_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-slate-800 border-slate-700 text-white resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" rows={3} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditData(null)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Finalização ─────────────────────────── */}
      <Dialog open={!!finishData} onOpenChange={() => setFinishData(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Finalizar Empréstimo</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">Informe o valor realmente recebido</DialogDescription>
          </DialogHeader>
          {finishData && (
            <div className="space-y-5">
              {/* Resumo */}
              <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Resumo do empréstimo</h4>
                <SummaryRow label="Pessoa" value={finishData.investment.person_name} />
                <SummaryRow label="Valor emprestado" value={formatCurrency(Number(finishData.investment.invested_amount))} />
                <SummaryRow label="Retorno previsto" value={formatCurrency(Number(finishData.investment.expected_return))} />
                <SummaryRow label="Lucro previsto" value={formatCurrency(Number(finishData.investment.expected_profit))} valueColor="text-emerald-400" />
              </div>

              {/* Input do valor */}
              <div className="space-y-1.5">
                <Label htmlFor="actual_received" className="text-xs font-medium text-slate-300">Valor realmente recebido (R$)</Label>
                <Input id="actual_received" type="number" step="0.01" min="0" value={finishData.actual_received}
                  onChange={(e) => setFinishData({ ...finishData, actual_received: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white text-lg font-medium placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>

              {/* Preview */}
              {finishData.actual_received && (
                <div className="rounded-lg bg-blue-600/10 border border-blue-600/20 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Lucro real:</span>
                    <span className="text-emerald-400 font-medium">
                      {formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Diferença:</span>
                    <span className={parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit) >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setFinishData(null)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                  Cancelar
                </Button>
                <Button onClick={handleFinish} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={finishMutation.isPending}>
                  {finishMutation.isPending ? "Finalizando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog de Exclusão ───────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm">
              Tem certeza que deseja excluir este empréstimo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Helpers de render ───────────────────────────────────────────────────────

function InfoRow({ label, value, valueColor = "text-slate-300" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, valueColor = "text-white" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}:</span>
      <span className={`font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

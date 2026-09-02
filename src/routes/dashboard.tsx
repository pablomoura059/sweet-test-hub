import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
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

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finishData, setFinishData] = useState<{ investment: Investment; actual_received: string } | null>(null);
  const [editData, setEditData] = useState<Investment | null>(null);

  const [formData, setFormData] = useState({
    person_name: "",
    invested_amount: "",
    profit_percent: "",
    start_date: new Date().toISOString().split("T")[0],
    return_date: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar sessão
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  // Buscar investimentos
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

  // Mutation para criar investimento
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
      setFormData({
        person_name: "",
        invested_amount: "",
        profit_percent: "",
        start_date: new Date().toISOString().split("T")[0],
        return_date: "",
        notes: "",
      });
    },
    onError: () => {
      toast.error("Erro ao cadastrar empréstimo");
    },
  });

  // Mutation para editar
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Investment> }) => {
      const { error } = await supabase
        .from("investments")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setEditData(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar empréstimo");
    },
  });

  // Mutation para finalizar
  const finishMutation = useMutation({
    mutationFn: async ({ id, actual_received }: { id: string; actual_received: number }) => {
      const investment = investments?.find((i) => i.id === id);
      if (!investment) throw new Error("Empréstimo não encontrado");

      const actual_profit = actual_received - Number(investment.invested_amount);
      const profit_difference = actual_profit - Number(investment.expected_profit);

      const { error } = await supabase
        .from("investments")
        .update({
          actual_received,
          actual_profit,
          profit_difference,
          status: "finished",
          finalized_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo finalizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setFinishData(null);
    },
    onError: () => {
      toast.error("Erro ao finalizar empréstimo");
    },
  });

  // Mutation para excluir
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
    onError: () => {
      toast.error("Erro ao excluir empréstimo");
    },
  });

  // Calcular métricas
  const activeInvestments = investments?.filter((i) => i.status === "active") || [];
  const totalInvested = investments?.reduce((sum, i) => sum + Number(i.invested_amount), 0) || 0;
  const totalInStreet = activeInvestments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
  const expectedProfit = activeInvestments.reduce((sum, i) => sum + Number(i.expected_profit || 0), 0);
  const expectedReturn = activeInvestments.reduce((sum, i) => sum + Number(i.expected_return || 0), 0);
  const receivedProfit = investments?.filter((i) => i.status === "finished").reduce((sum, i) => sum + Number(i.actual_profit || 0), 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateProfit = () => {
    const amount = parseFloat(formData.invested_amount) || 0;
    const percent = parseFloat(formData.profit_percent) || 0;
    return amount * percent / 100;
  };

  const calculateReturn = () => {
    const amount = parseFloat(formData.invested_amount) || 0;
    return amount + calculateProfit();
  };

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user.id) {
      toast.error("Você precisa estar logado");
      return;
    }
    if (!formData.person_name || !formData.invested_amount || !formData.profit_percent || !formData.return_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setIsSubmitting(true);
    createMutation.mutate(formData);
    setIsSubmitting(false);
  };

  const handleFinish = () => {
    if (!finishData) return;
    const amount = parseFloat(finishData.actual_received);
    finishMutation.mutate({ id: finishData.investment.id, actual_received: amount });
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    updateMutation.mutate({
      id: editData.id,
      data: {
        person_name: formData.person_name,
        invested_amount: parseFloat(formData.invested_amount),
        profit_percent: parseFloat(formData.profit_percent),
        start_date: formData.start_date,
        return_date: formData.return_date,
        notes: formData.notes || null,
      },
    });
  };

  const getStatusInfo = (status: string, returnDate: string) => {
    const today = new Date().toISOString().split("T")[0];
    const isLate = status === "active" && returnDate < today;

    if (isLate) {
      return { label: "ATRASADO", color: "bg-red-600/20 text-red-400", icon: AlertCircle };
    }
    switch (status) {
      case "active":
        return { label: "ATIVO", color: "bg-green-600/20 text-green-400", icon: CheckCircle };
      case "finished":
        return { label: "FINALIZADO", color: "bg-blue-600/20 text-blue-400", icon: CheckCircle };
      case "canceled":
        return { label: "CANCELADO", color: "bg-slate-600/20 text-slate-400", icon: X };
      default:
        return { label: status.toUpperCase(), color: "bg-slate-600/20 text-slate-400", icon: Clock };
    }
  };

  const StatCard = ({ title, value, icon, description }: { title: string; value: string; icon: LucideIcon; description?: string }) => (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20">
            <icon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 truncate">{title}</p>
            <p className="text-lg font-bold text-white truncate">{value}</p>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const InvestmentCard = ({ investment }: { investment: Investment }) => {
    const statusInfo = getStatusInfo(investment.status, investment.return_date);
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <p className="font-medium text-white truncate">{investment.person_name}</p>
              </div>
              <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(Number(investment.invested_amount))}</p>
            </div>
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-medium ${statusInfo.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-slate-500">Porcentagem:</span>
              <span className="ml-1 text-white">{investment.profit_percent}%</span>
            </div>
            <div>
              <span className="text-slate-500">Lucro:</span>
              <span className="ml-1 text-green-400">{formatCurrency(Number(investment.expected_profit || 0))}</span>
            </div>
            <div>
              <span className="text-slate-500">Retorno:</span>
              <span className="ml-1 text-white">{formatCurrency(Number(investment.expected_return || 0))}</span>
            </div>
            <div>
              <span className="text-slate-500">Início:</span>
              <span className="ml-1 text-slate-400">{new Date(investment.start_date).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
            {investment.status === "active" && (
              <>
                <Button size="sm" variant="outline" onClick={() => openEditModal(investment)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Editar
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setFinishData({ investment, actual_received: String(investment.expected_return) })}>
                  Finalizar
                </Button>
              </>
            )}
            <Button size="sm" variant="destructive" onClick={() => setDeleteId(investment.id)} className="bg-red-600 hover:bg-red-700">
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Menu mobile
  const MobileMenu = () => (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-slate-900 border-slate-800 w-72">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">$</span>
            </div>
            Empréstimos
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-white bg-slate-800">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f172a" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">$</span>
            </div>
            <h1 className="text-lg font-bold text-white">Empréstimos</h1>
          </div>
          <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-y-auto max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Empréstimo</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Cadastre um novo empréstimo ou investimento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLoan} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="person_name">Nome da Pessoa *</Label>
                  <Input
                    id="person_name"
                    value={formData.person_name}
                    onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                    placeholder="Nome completo"
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invested_amount">Valor (R$) *</Label>
                    <Input
                      id="invested_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.invested_amount}
                      onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })}
                      placeholder="0,00"
                      className="bg-slate-900 border-slate-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profit_percent">Porcentagem (%) *</Label>
                    <Input
                      id="profit_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.profit_percent}
                      onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })}
                      placeholder="30"
                      className="bg-slate-900 border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>

                {formData.invested_amount && formData.profit_percent && (
                  <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-600/20">
                    <p className="text-sm text-blue-400 mb-1">Prévia do cálculo</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400">Lucro previsto:</span>
                        <span className="ml-2 text-green-400 font-medium">{formatCurrency(calculateProfit())}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Retorno previsto:</span>
                        <span className="ml-2 text-white font-medium">{formatCurrency(calculateReturn())}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Data de Início *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="return_date">Data de Retorno *</Label>
                    <Input
                      id="return_date"
                      type="date"
                      value={formData.return_date}
                      onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações opcionais..."
                    className="bg-slate-900 border-slate-700 text-white resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewLoanOpen(false)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard title="Total Investido" value={formatCurrency(totalInvested)} icon={Wallet} />
          <StatCard title="Dinheiro na Rua" value={formatCurrency(totalInStreet)} icon={DollarSign} description={`${activeInvestments.length} ativo(s)`} />
          <StatCard title="Lucro Previsto" value={formatCurrency(expectedProfit)} icon={TrendingUp} description="Empréstimos ativos" />
          <StatCard title="Retorno Previsto" value={formatCurrency(expectedReturn)} icon={PieChart} description="Valor + lucro" />
          <StatCard title="Lucro Recebido" value={formatCurrency(receivedProfit)} icon={Activity} description="Empréstimos finalizados" />
          <StatCard title="Ativos" value={String(activeInvestments.length)} icon={Activity} description="Em andamento" />
        </div>

        {/* Investments List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Todos os Empréstimos</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 bg-slate-800" />)}
            </div>
          ) : investments && investments.length > 0 ? (
            <div className="space-y-3">
              {investments.map((investment) => (
                <InvestmentCard key={investment.id} investment={investment} />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhum empréstimo cadastrado</p>
                <p className="text-sm text-slate-500 mt-1">Clique em "Novo" para começar</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Modal de Edição */}
      <Dialog open={!!editData} onOpenChange={() => setEditData(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Empréstimo</DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere os dados do empréstimo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_person_name">Nome da Pessoa *</Label>
              <Input
                id="edit_person_name"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_amount">Valor (R$) *</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.invested_amount}
                  onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_percent">Porcentagem (%) *</Label>
                <Input
                  id="edit_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.profit_percent}
                  onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start">Data de Início *</Label>
                <Input
                  id="edit_start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_return">Data de Retorno *</Label>
                <Input
                  id="edit_return"
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Observações</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditData(null)} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Finalização */}
      <Dialog open={!!finishData} onOpenChange={() => setFinishData(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Empréstimo</DialogTitle>
            <DialogDescription className="text-slate-400">
              Informe o valor realmente recebido
            </DialogDescription>
          </DialogHeader>
          {finishData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pessoa:</span>
                  <span className="text-white font-medium">{finishData.investment.person_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valor emprestado:</span>
                  <span className="text-white">{formatCurrency(Number(finishData.investment.invested_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Retorno previsto:</span>
                  <span className="text-white">{formatCurrency(Number(finishData.investment.expected_return))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lucro previsto:</span>
                  <span className="text-green-400">{formatCurrency(Number(finishData.investment.expected_profit))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual_received">Valor realmente recebido (R$)</Label>
                <Input
                  id="actual_received"
                  type="number"
                  step="0.01"
                  min="0"
                  value={finishData.actual_received}
                  onChange={(e) => setFinishData({ ...finishData, actual_received: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white text-lg"
                />
              </div>

              {finishData.actual_received && (
                <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-600/20">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400 text-sm">Lucro real:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Diferença:</span>
                    <span className={parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit) >= 0 ? "text-green-400" : "text-red-400"}>
                      {formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setFinishData(null)} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                  Cancelar
                </Button>
                <Button onClick={handleFinish} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-medium py-5" disabled={finishMutation.isPending}>
                  {finishMutation.isPending ? "Finalizando..." : "Confirmar Finalização"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir este empréstimo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
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

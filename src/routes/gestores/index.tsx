import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Users, Shield, AlertCircle, CheckCircle, Ban, RotateCcw,
  Search, LogOut, Menu, Check, Loader2, Trash2, X, AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
};

type FilterType = "all" | "pending" | "active" | "blocked" | "denied";

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide bg-yellow-500/15 text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Pendente
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide bg-emerald-500/15 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Ativo
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide bg-red-500/15 text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Negado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide bg-red-500/15 text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Bloqueado
    </span>
  );
}

function ActionButton({ status, onApprove, onDeny, onBlock, onReactivate, isPending }: {
  status: string;
  onApprove: () => void;
  onDeny: () => void;
  onBlock: () => void;
  onReactivate: () => void;
  isPending: boolean;
}) {
  if (status === "pending") {
    return (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all active:scale-95 shadow-md shadow-emerald-600/20"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Aprovar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDeny}
          disabled={isPending}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-semibold transition-all active:scale-95"
        >
          <X className="h-3 w-3" />
          Negar
        </Button>
      </div>
    );
  }
  if (status === "active") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onBlock}
        disabled={isPending}
        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-semibold transition-all active:scale-95"
      >
        <Ban className="h-3 w-3" />
        Bloquear
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      onClick={onReactivate}
      disabled={isPending}
      className="bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold transition-all active:scale-95 shadow-md shadow-[var(--color-primary)]/20"
    >
      <RotateCcw className="h-3 w-3" />
      Reativar
    </Button>
  );
}

export const Route = createFileRoute("/gestores")({
  component: GestoresPage,
});

function GestoresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [denyTarget, setDenyTarget] = useState<{ id: string; name: string } | null>(null);
  const [permaDeleteTarget, setPermaDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [permaDeleteBlockedTarget, setPermaDeleteBlockedTarget] = useState<{ id: string; name: string } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.navigate({ to: "/login" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", session.user.id)
        .single();
      if (!profile) {
        await supabase.auth.signOut();
        router.navigate({ to: "/login" });
        return;
      }
      if (profile.role !== "admin") {
        router.navigate({ to: "/dashboard" });
        return;
      }
      const canAccess =
        (profile.role === "admin" && profile.status === "active") ||
        (profile.role === "manager" && profile.status === "active");
      if (!canAccess) {
        router.navigate({ to: "/conta-bloqueada" });
        return;
      }
    };
    checkAuth();
  }, [router]);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "manager")
        .in("status", ["pending", "active", "blocked", "denied"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      const messages: Record<string, string> = {
        active: "Gestor aprovado com sucesso.",
        blocked: "Gestor bloqueado com sucesso.",
        denied: "Gestor movido para a lixeira.",
      };
      toast.success(messages[vars.status] || "Status atualizado.", {
        className: "!bg-[#101A2B] !border-[var(--color-primary)]/30 !text-[#F3F6FA] !font-medium !rounded-xl",
      });
      queryClient.invalidateQueries({ queryKey: ["profiles-managers"] });
      setConfirmTarget(null);
      setDenyTarget(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const permaDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const SUPABASE_URL = "https://ajzcvdbakonpjlvknhpa.supabase.co";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir permanentemente");
      }
    },
    onSuccess: () => {
      toast.success("Gestor excluído permanentemente.", {
        className: "!bg-[#101A2B] !border-[var(--color-primary)]/30 !text-[#F3F6FA] !font-medium !rounded-xl",
      });
      queryClient.invalidateQueries({ queryKey: ["profiles-managers"] });
      setPermaDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao excluir permanentemente");
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  const normalManagers = (profiles || []).filter((p) => {
    if (p.status === "denied") return false;
    const matchesSearch =
      !searchQuery ||
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = filter === "all" || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const trashManagers = (profiles || []).filter((p) => {
    if (p.status !== "denied") return false;
    const matchesSearch =
      !searchQuery ||
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const displayedManagers = showTrash ? trashManagers : normalManagers;

  const countBadge = (status: FilterType) => {
    const count = (profiles || []).filter((p) => status === "all" || p.status === status).length;
    return count;
  };

  const handleTrashClick = () => {
    setShowTrash(true);
    setSearchQuery("");
    setFilter("all");
  };

  const handleNormalFilterClick = (newFilter: FilterType) => {
    setShowTrash(false);
    setFilter(newFilter);
    setSearchQuery("");
  };

  const blockedActionsDesktop = (p: Profile) => (
    <div className="flex gap-1.5 justify-end">
      <Button
        size="sm"
        onClick={() => updateMutation.mutate({ id: p.id, status: "active" })}
        disabled={updateMutation.isPending}
        className="bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold transition-all active:scale-95"
      >
        <RotateCcw className="h-3 w-3" />
        Desbloquear
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPermaDeleteBlockedTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
        disabled={permaDeleteMutation.isPending}
        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-semibold transition-all active:scale-95"
      >
        <Trash2 className="h-3 w-3" />
        Excluir
      </Button>
    </div>
  );

  const blockedActionsMobile = (p: Profile) => (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        onClick={() => updateMutation.mutate({ id: p.id, status: "active" })}
        disabled={updateMutation.isPending}
        className="bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold transition-all active:scale-95"
      >
        <RotateCcw className="h-3 w-3" />
        Desbloquear
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPermaDeleteBlockedTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
        disabled={permaDeleteMutation.isPending}
        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-semibold transition-all active:scale-95"
      >
        <Trash2 className="h-3 w-3" />
        Excluir
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B1220" }}>
      <header className="sticky top-0 z-40 bg-[#101A2B]/95 backdrop-blur-xl border-b border-[#26364D]/60">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#718096] hover:text-[#F3F6FA] hover:bg-[#162235] transition-colors">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#101A2B] border-[#26364D] w-[300px] p-0 flex flex-col">
                <div className="px-5 pt-6 pb-5 border-b border-[#26364D]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
                      <span className="text-base font-bold text-white">$</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#F3F6FA] leading-tight">Empréstimos</div>
                      <div className="text-[11px] text-[#718096] font-normal mt-0.5">Sistema financeiro</div>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-3 mb-2">Visão Geral</p>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#AAB5C5] hover:text-[#F3F6FA] hover:bg-[#162235] text-sm font-medium transition-all duration-150 cursor-pointer"
                      onClick={() => { setIsMenuOpen(false); router.navigate({ to: "/dashboard" }); }}
                    >
                      <span className="h-4 w-4">🏠</span>Dashboard
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-3 mb-2">Sistema</p>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-sm font-semibold cursor-default">
                      <Users className="h-4 w-4 shrink-0" />
                      Gestores
                    </button>
                  </div>
                  <div className="h-px bg-[#26364D]/60 mx-1" />
                  <button
                    onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#718096] hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all duration-150 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sair
                  </button>
                </nav>
                <div className="px-5 py-4 border-t border-[#26364D]/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#162235] border border-[#26364D] flex items-center justify-center shrink-0">
                      <Shield className="h-3.5 w-3.5 text-[#718096]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#AAB5C5]">Administrador</p>
                      <p className="text-[9px] text-[#718096] truncate">{session?.user?.email}</p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20">
              <span className="text-sm font-bold text-white">$</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#F3F6FA] tracking-tight">Gestores</h1>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
            <Users className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#F3F6FA]">Gestores da Plataforma</h2>
            <p className="text-[11px] text-[#718096] mt-0.5">Gerencie o acesso dos gestores à plataforma</p>
          </div>
        </div>

        <div className="bg-[#162235] border border-[#26364D] rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
            <Input
              type="text"
              placeholder={showTrash ? "Buscar por nome ou e-mail na lixeira..." : "Buscar por nome ou e-mail..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#101A2B] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/50 text-xs h-9"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-[#718096] mr-1">Status:</span>
            <button
              type="button"
              onClick={() => handleNormalFilterClick("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                !showTrash && filter === "all"
                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                  : "bg-[#101A2B] border-[#26364D] text-[#AAB5C5] hover:border-[var(--color-primary)]/50 hover:text-[#F3F6FA]"
              }`}
            >
              Todos ({countBadge("all") - countBadge("denied")})
            </button>
            <button
              type="button"
              onClick={() => handleNormalFilterClick("pending")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                !showTrash && filter === "pending"
                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                  : "bg-[#101A2B] border-[#26364D] text-[#AAB5C5] hover:border-[var(--color-primary)]/50 hover:text-[#F3F6FA]"
              }`}
            >
              Pendentes ({countBadge("pending")})
            </button>
            <button
              type="button"
              onClick={() => handleNormalFilterClick("active")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                !showTrash && filter === "active"
                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                  : "bg-[#101A2B] border-[#26364D] text-[#AAB5C5] hover:border-[var(--color-primary)]/50 hover:text-[#F3F6FA]"
              }`}
            >
              Ativos ({countBadge("active")})
            </button>
            <button
              type="button"
              onClick={() => handleNormalFilterClick("blocked")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                !showTrash && filter === "blocked"
                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                  : "bg-[#101A2B] border-[#26364D] text-[#AAB5C5] hover:border-[var(--color-primary)]/50 hover:text-[#F3F6FA]"
              }`}
            >
              Bloqueados ({countBadge("blocked")})
            </button>
            <button
              type="button"
              onClick={handleTrashClick}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                showTrash
                  ? "bg-red-600 border-red-600 text-white"
                  : "bg-[#101A2B] border-[#26364D] text-[#AAB5C5] hover:border-red-500/50 hover:text-red-400"
              }`}
            >
              Lixeira ({countBadge("denied")})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
              <p className="text-sm text-[#718096]">Carregando gestores...</p>
            </div>
          </div>
        ) : displayedManagers.length === 0 ? (
          <Card className="bg-[#162235]/60 border-[#26364D]">
            <CardContent className="p-12 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#18263A]/60 flex items-center justify-center">
                <Users className="h-7 w-7 text-[#718096]" />
              </div>
              <div>
                <p className="text-[#AAB5C5] font-semibold text-sm">
                  {showTrash
                    ? "Lixeira vazia"
                    : searchQuery || filter !== "all"
                    ? "Nenhum gestor encontrado"
                    : "Nenhum gestor cadastrado"}
                </p>
                <p className="text-[#718096] text-xs mt-1">
                  {showTrash
                    ? "Gestores negados aparecerão aqui"
                    : searchQuery || filter !== "all"
                    ? "Ajuste os filtros ou a busca"
                    : "Quando um gestor se cadastrar, ele aparecerá aqui"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-[#162235] border border-[#26364D] rounded-2xl overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#26364D]/60">
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#718096] uppercase tracking-widest">Nome</th>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#718096] uppercase tracking-widest">E-mail</th>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#718096] uppercase tracking-widest">Status</th>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#718096] uppercase tracking-widest">Cadastro</th>
                    <th className="text-right px-4 py-3 text-[9px] font-bold text-[#718096] uppercase tracking-widest">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26364D]/60">
                  {displayedManagers.map((p) => (
                    <tr key={p.id} className="hover:bg-[#18263A]/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-[#F3F6FA]">{p.name || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#AAB5C5]">{p.email || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#718096]">{formatDate(p.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "blocked" ? (
                          blockedActionsDesktop(p)
                        ) : showTrash ? (
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: p.id, status: "pending" })}
                              disabled={updateMutation.isPending}
                              className="bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold transition-all active:scale-95"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restaurar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPermaDeleteTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
                              disabled={permaDeleteMutation.isPending}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-semibold transition-all active:scale-95"
                            >
                              <Trash2 className="h-3 w-3" />
                              Excluir
                            </Button>
                          </div>
                        ) : (
                          <ActionButton
                            status={p.status}
                            onApprove={() => updateMutation.mutate({ id: p.id, status: "active" })}
                            onDeny={() => setDenyTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
                            onBlock={() => setConfirmTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
                            onReactivate={() => {
                              if (p.status === "blocked") updateMutation.mutate({ id: p.id, status: "active" });
                              if (p.status === "denied") updateMutation.mutate({ id: p.id, status: "pending" });
                            }}
                            isPending={updateMutation.isPending}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[#26364D]/60">
              {displayedManagers.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F3F6FA] truncate">{p.name || "—"}</p>
                      <p className="text-[11px] text-[#718096] truncate">{p.email || "—"}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#718096]">Cadastrado em {formatDate(p.created_at)}</p>
                    {p.status === "blocked" ? (
                      blockedActionsMobile(p)
                    ) : showTrash ? (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: p.id, status: "pending" })}
                          disabled={updateMutation.isPending}
                          className="bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold transition-all active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPermaDeleteTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
                          disabled={permaDeleteMutation.isPending}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-semibold transition-all active:scale-95"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    ) : (
                      <ActionButton
                        status={p.status}
                        onApprove={() => updateMutation.mutate({ id: p.id, status: "active" })}
                        onDeny={() => setDenyTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
                        onBlock={() => setConfirmTarget({ id: p.id, name: p.name || p.email || "este gestor" })}
                        onReactivate={() => {
                          if (p.status === "blocked") updateMutation.mutate({ id: p.id, status: "active" });
                          if (p.status === "denied") updateMutation.mutate({ id: p.id, status: "pending" });
                        }}
                        isPending={updateMutation.isPending}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={!!confirmTarget} onOpenChange={() => setConfirmTarget(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-[#26364D] animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F3F6FA] font-bold flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-400" />
              Confirmar bloqueio
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              Tem certeza que deseja bloquear <strong className="text-[#F3F6FA]">{confirmTarget?.name}</strong>?<br />
              Este gestor não conseguirá acessar a plataforma até ser reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmTarget) {
                  updateMutation.mutate({ id: confirmTarget.id, status: "blocked" });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Bloquear"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!denyTarget} onOpenChange={() => setDenyTarget(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-[#26364D] animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F3F6FA] font-bold flex items-center gap-2">
              <X className="h-4 w-4 text-red-400" />
              Negar gestor?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              O cadastro de <strong className="text-[#F3F6FA]">{denyTarget?.name}</strong> será movido para a lixeira e não poderá acessar a plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (denyTarget) updateMutation.mutate({ id: denyTarget.id, status: "denied" });
              }}
              className="bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Negar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!permaDeleteTarget} onOpenChange={() => setPermaDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-red-500/50 animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Excluir permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              <strong className="text-[#F3F6FA]">{permaDeleteTarget?.name}</strong> será removido do Supabase Auth, seu profile excluído e todos os dados associados eliminados.<br />
              <span className="text-red-400 font-semibold">Esta ação não poderá ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (permaDeleteTarget) permaDeleteMutation.mutate(permaDeleteTarget.id);
              }}
              className="bg-red-700 hover:bg-red-800 text-white transition-colors active:scale-95"
            >
              {permaDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir permanentemente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!permaDeleteBlockedTarget} onOpenChange={() => setPermaDeleteBlockedTarget(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-red-500/50 animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Excluir gestor permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              <strong className="text-[#F3F6FA]">{permaDeleteBlockedTarget?.name}</strong> será removido do Supabase Auth e todos os dados associados eliminados.<br />
              <span className="text-red-400 font-semibold">Esta ação não poderá ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (permaDeleteBlockedTarget) permaDeleteMutation.mutate(permaDeleteBlockedTarget.id);
              }}
              className="bg-red-700 hover:bg-red-800 text-white transition-colors active:scale-95"
            >
              {permaDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir permanentemente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!pendingMessage} onOpenChange={() => setPendingMessage(null)}>
        <DialogContent className="bg-[#101A2B] border-[#26364D] text-[#F3F6FA] max-w-sm">
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold text-[#F3F6FA]">Cadastro pendente</DialogTitle>
              <DialogDescription className="text-[#AAB5C5] text-sm leading-relaxed">
                Seu e-mail foi confirmado, mas seu acesso ainda precisa ser aprovado pelo administrador.
              </DialogDescription>
            </div>
            <Button
              onClick={() => router.navigate({ to: "/login" })}
              className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white"
            >
              Voltar para o login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

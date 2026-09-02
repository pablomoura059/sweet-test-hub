import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/people")({
  component: PeoplePage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type Person = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

// ─── Main Component ──────────────────────────────────────────────────────────

function PeoplePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formName, setFormName] = useState("");

  // Auth
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // List people
  const { data: people, isLoading } = useQuery({
    queryKey: ["people", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name");
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!session?.user.id,
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("people").insert({
        user_id: session!.user.id,
        name: name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa cadastrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["people"] });
      closeForm();
    },
    onError: () => toast.error("Erro ao cadastrar pessoa"),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("people")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["people"] });
      closeForm();
    },
    onError: () => toast.error("Erro ao atualizar pessoa"),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa excluída com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["people"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir pessoa"),
  });

  // Filter
  const filtered = people?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Form handlers
  const openCreate = () => {
    setEditPerson(null);
    setFormName("");
    setIsFormOpen(true);
  };

  const openEdit = (person: Person) => {
    setEditPerson(person);
    setFormName(person.name);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditPerson(null);
    setFormName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Informe o nome da pessoa");
      return;
    }
    if (editPerson) {
      updateMutation.mutate({ id: editPerson.id, name: formName });
    } else {
      createMutation.mutate(formName);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2F6FED] to-[#1a4fd4] flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#F3F6FA]">Pessoas</h1>
              <p className="text-[10px] text-[#718096]">
                {people ? `${people.length} cadastrada${people.length !== 1 ? "s" : ""}` : "Carregando..."}
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            size="sm"
            className="bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white shadow-lg shadow-blue-600/20 font-semibold transition-all duration-200 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Pessoa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
          <Input
            type="text"
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 text-sm h-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[#162235] border border-[#26364D] rounded-xl p-4 flex items-center justify-between">
                <Skeleton className="h-4 w-40 rounded skeleton-shimmer" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
                  <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((person, idx) => (
              <Card
                key={person.id}
                className="bg-[#162235] border-[#26364D] hover:border-[#2F6FED]/40 transition-all duration-200 animate-fade-in-up"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
              >
                <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#2F6FED]/10 border border-[#2F6FED]/20 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-[#2F6FED]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F3F6FA] truncate">{person.name}</p>
                      <p className="text-[10px] text-[#718096]">
                        Cadastrado em {new Date(person.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(person)}
                      className="h-8 w-8 text-[#718096] hover:text-[#F3F6FA] hover:bg-[#18263A] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(person.id)}
                      className="h-8 w-8 text-[#718096] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-[#162235]/60 border-[#26364D]">
            <CardContent className="p-12 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#18263A]/60 flex items-center justify-center">
                <Search className="h-7 w-7 text-[#718096]" />
              </div>
              <div>
                <p className="text-[#AAB5C5] font-semibold text-sm">
                  {searchQuery ? "Nenhuma pessoa encontrada" : "Nenhuma pessoa cadastrada"}
                </p>
                <p className="text-[#718096] text-xs mt-1">
                  {searchQuery ? "Tente outro termo de busca" : "Clique em Nova Pessoa para começar"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-w-sm animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#F3F6FA]">
              {editPerson ? "Editar Pessoa" : "Nova Pessoa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="person-name" className="text-xs font-semibold text-[#AAB5C5]">
                Nome completo *
              </Label>
              <Input
                id="person-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome da pessoa"
                className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50"
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors"
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white font-semibold transition-all active:scale-95"
                disabled={isPending}
              >
                {isPending ? (
                  "Salvando..."
                ) : editPerson ? (
                  <>
                    <Check className="h-4 w-4" /> Salvar
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Cadastrar
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-[#26364D] animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F3F6FA] font-bold">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

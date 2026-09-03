import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Plus, Search, Pencil, Trash2, ArrowLeft, Users, Check,
  Camera, User, Phone, Calendar, FileText, DollarSign,
  TrendingUp, Clock, ChevronRight,
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/people")({
  component: PeoplePage,
});

type Person = {
  id: string; user_id: string; name: string;
  photo_url: string | null; phone: string | null;
  birth_date: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

type Investment = {
  id: string; person_name: string; invested_amount: number;
  profit_percent: number; expected_profit: number;
  expected_return: number; actual_received: number | null;
  status: string; start_date: string; return_date: string;
};

const applyPhoneMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatPhoneDisplay = (phone: string | null | undefined) => {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
};

const formatDateBR = (date: string | null | undefined) => {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const getSignedPhotoUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // data: URLs, CDN, ou URLs já completas — retornar direto
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Path relativo — montar URL pública do Supabase Storage
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `https://ajzcvdbakonpjlvknhpa.supabase.co/storage/v1/object/public/${cleanPath}`;
};

function PersonAvatar({ photoUrl, name, size = "md" }: {
  photoUrl: string | null | undefined; name: string; size?: "sm" | "md" | "lg" | "xl";
}) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = getSignedPhotoUrl(photoUrl);
  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const sc = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14", xl: "w-20 h-20" };
  const ic = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7", xl: "h-10 w-10" };

  return (
    <div className={`${sc[size]} rounded-full overflow-hidden bg-[#1e2d42] border-2 border-[#26364D] flex items-center justify-center shrink-0`}>
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => { try { setImgError(true); } catch (_) { /* ignorar */ } }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center">
          {size === "xl" && <span className="text-sm font-bold text-[#718096]">{initials}</span>}
          <User className={ic[size] + " text-[#718096]"} />
        </div>
      )}
    </div>
  );
}

function PersonAvatarSmall({ photoUrl, name }: {
  photoUrl: string | null | undefined; name: string;
}) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = getSignedPhotoUrl(photoUrl);

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-[#1e2d42] border border-[#26364D] flex items-center justify-center shrink-0">
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => { try { setImgError(true); } catch (_) { /* ignorar */ } }}
        />
      ) : (
        <User className="h-3.5 w-3.5 text-[#718096]" />
      )}
    </div>
  );
}

function PeoplePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [viewPerson, setViewPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => { const { data: { session } } = await supabase.auth.getSession(); return session; },
  });

  const { data: people, isLoading } = useQuery({
    queryKey: ["people", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data, error } = await supabase.from("people").select("*").eq("user_id", session.user.id).order("name");
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!session?.user.id,
  });

  const { data: investments } = useQuery({
    queryKey: ["investments", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data } = await supabase.from("investments").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return data as Investment[];
    },
    enabled: !!session?.user.id,
  });

  // Padronizado: retorna caminho relativo (userId/personId.ext)
  const uploadPhoto = async (userId: string, personId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${personId}.${ext}`;
    const { data, error } = await supabase.storage.from("person-photos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro ao fazer upload da foto: " + error.message);
      return null;
    }
    // Confirmar que o arquivo existe no Storage antes de salvar no banco
    const { data: fileCheck } = await supabase.storage.from("person-photos").list(userId, { searchByExt: ext });
    if (!fileCheck || fileCheck.length === 0) {
      toast.error("Upload concluído mas não foi possível confirmar o arquivo. Tente novamente.");
      return null;
    }
    // Retornar o PATH RELATIVO — não a URL completa
    return path;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error("Not authenticated");

      // Inserir pessoa sem photo_url
      const { data, error } = await supabase.from("people").insert({
        user_id: session.user.id,
        name: formName.trim(),
        phone: formPhone || null,
        birth_date: formBirthDate || null,
        notes: formNotes || null,
        photo_url: null,
      }).select().single();

      if (error) throw error;

      // Se tem foto, fazer upload e atualizar com o path relativo
      if (photoFile && data) {
        const photoPath = await uploadPhoto(session.user.id, data.id, photoFile);
        if (photoPath) {
          await supabase.from("people").update({ photo_url: photoPath }).eq("id", data.id);
        } else {
          // upload falhou — continua com photo_url null
        }
      }
    },
    onSuccess: () => {
      toast.success("Pessoa cadastrada com sucesso!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      closeForm();
    },
    onError: () => toast.error("Erro ao cadastrar pessoa"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!session?.user.id) throw new Error("Not authenticated");

      let photoUrl: string | null = editPerson?.photo_url || null;

      // Se o usuário selecionou uma nova foto, fazer upload
      if (photoFile) {
        const uploaded = await uploadPhoto(session.user.id, id, photoFile);
        if (uploaded) photoUrl = uploaded;
      }

      const { error } = await supabase.from("people").update({
        name: formName.trim(),
        phone: formPhone || null,
        birth_date: formBirthDate || null,
        notes: formNotes || null,
        photo_url: photoUrl,
      }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa atualizada com sucesso!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      closeForm();
    },
    onError: () => toast.error("Erro ao atualizar pessoa"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa excluída com sucesso.", { className: "!bg-[#101A2B] !border-red-500/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir pessoa"),
  });

  const openCreate = () => {
    setEditPerson(null);
    setFormName(""); setFormPhone(""); setFormBirthDate(""); setFormNotes("");
    setPhotoPreview(null); setPhotoFile(null);
    setIsFormOpen(true);
  };

  const openEdit = (person: Person) => {
    setEditPerson(person);
    setFormName(person.name);
    setFormPhone(person.phone || "");
    setFormBirthDate(person.birth_date || "");
    setFormNotes(person.notes || "");
    setPhotoPreview(person.photo_url ? getSignedPhotoUrl(person.photo_url) : null);
    setPhotoFile(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditPerson(null);
    setFormName(""); setFormPhone(""); setFormBirthDate(""); setFormNotes("");
    setPhotoPreview(null); setPhotoFile(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormPhone(applyPhoneMask(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error("Informe o nome da pessoa"); return; }
    if (editPerson) updateMutation.mutate({ id: editPerson.id });
    else createMutation.mutate();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filtered = people?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.replace(/\D/g, "").includes(searchQuery.replace(/\D/g, "")))
  ) || [];

  const getPersonInvestments = (person: Person): Investment[] => {
    if (!investments) return [];
    return investments.filter((i) => i.person_name.toLowerCase() === person.name.toLowerCase());
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B1220" }}>

      <header className="sticky top-0 z-40 bg-[#101A2B]/95 backdrop-blur-xl border-b border-[#26364D]/60">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: "/dashboard" })}
              className="text-[#718096] hover:text-[#F3F6FA] hover:bg-[#162235] transition-colors">
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
          <Button onClick={openCreate} size="sm"
            className="bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white shadow-lg shadow-blue-600/20 font-semibold transition-all duration-200 active:scale-95">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Pessoa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
          <Input type="text" placeholder="Buscar por nome ou telefone..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 text-sm h-10" />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#162235] border border-[#26364D] rounded-xl p-4 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded skeleton-shimmer" />
                  <Skeleton className="h-3 w-28 rounded skeleton-shimmer" />
                </div>
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
              <Card key={person.id}
                className="bg-[#162235] border-[#26364D] hover:border-[#2F6FED]/40 transition-all duration-200 cursor-pointer animate-fade-in-up group"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
                onClick={() => setViewPerson(person)}>
                <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PersonAvatar photoUrl={person.photo_url} name={person.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F3F6FA] truncate">{person.name}</p>
                      <p className="text-[11px] text-[#718096] flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        {formatPhoneDisplay(person.phone)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(person)}
                        className="h-8 w-8 text-[#718096] hover:text-[#F3F6FA] hover:bg-[#18263A] transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(person.id)}
                        className="h-8 w-8 text-[#718096] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#718096] group-hover:text-[#2F6FED] transition-colors" />
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#F3F6FA]">
              {editPerson ? "Editar Pessoa" : "Nova Pessoa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <PersonAvatar photoUrl={photoPreview || formName ? getSignedPhotoUrl(photoPreview) : null} name={formName || "Pessoa"} size="xl" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#2F6FED] border-2 border-[#101A2B] flex items-center justify-center hover:bg-[#3d7ef5] transition-colors">
                  <Camera className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <p className="text-[10px] text-[#718096]">Toque para adicionar foto</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="person-name" className="text-xs font-semibold text-[#AAB5C5]">Nome completo *</Label>
              <Input id="person-name" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome da pessoa"
                className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50"
                autoFocus required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="person-phone" className="text-xs font-semibold text-[#AAB5C5]">Telefone</Label>
              <Input id="person-phone" type="tel" value={formPhone} onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="person-birth" className="text-xs font-semibold text-[#AAB5C5]">Data de nascimento</Label>
              <Input id="person-birth" type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)}
                className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="person-notes" className="text-xs font-semibold text-[#AAB5C5]">Observações</Label>
              <Textarea id="person-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Observações opcionais..."
                className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] resize-none focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50"
                rows={3} />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={closeForm}
                className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors"
                disabled={isPending}>Cancelar</Button>
              <Button type="submit"
                className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white font-semibold transition-all active:scale-95"
                disabled={isPending}>
                {isPending ? "Salvando..." : editPerson ? <><Check className="h-4 w-4 mr-1" /> Salvar</> : <><Plus className="h-4 w-4 mr-1" /> Cadastrar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPerson} onOpenChange={() => setViewPerson(null)}>
        <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
          {viewPerson && (() => {
            const personInvs = getPersonInvestments(viewPerson);
            const activeInvs = personInvs.filter((i) => i.status === "active");
            const finishedInvs = personInvs.filter((i) => i.status === "finished");
            const totalInvested = personInvs.reduce((s, i) => s + Number(i.invested_amount), 0);
            const totalReceived = personInvs.reduce((s, i) => s + Number(i.actual_received || 0), 0);
            const totalProfit = totalReceived - totalInvested;

            return (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center gap-3 pt-2">
                  <PersonAvatar photoUrl={viewPerson.photo_url} name={viewPerson.name} size="xl" />
                  <div>
                    <h2 className="text-lg font-bold text-[#F3F6FA]">{viewPerson.name}</h2>
                    <p className="text-xs text-[#718096] mt-0.5">
                      Cadastrado em {formatDateBR(viewPerson.created_at?.split("T")[0])}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {viewPerson.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#162235] border border-[#26364D]">
                      <div className="w-8 h-8 rounded-lg bg-[#2F6FED]/10 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-[#2F6FED]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider">Telefone</p>
                        <p className="text-sm font-semibold text-[#F3F6FA]">{formatPhoneDisplay(viewPerson.phone)}</p>
                      </div>
                    </div>
                  )}
                  {viewPerson.birth_date && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#162235] border border-[#26364D]">
                      <div className="w-8 h-8 rounded-lg bg-[#2F6FED]/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-[#2F6FED]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider">Nascimento</p>
                        <p className="text-sm font-semibold text-[#F3F6FA]">{formatDateBR(viewPerson.birth_date)}</p>
                      </div>
                    </div>
                  )}
                  {viewPerson.notes && (
                    <div className="p-3 rounded-xl bg-[#162235] border border-[#26364D]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#2F6FED]/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-[#2F6FED]" />
                        </div>
                        <p className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider">Observações</p>
                      </div>
                      <p className="text-sm text-[#AAB5C5] leading-relaxed pl-11">{viewPerson.notes}</p>
                    </div>
                  )}
                </div>

                {personInvs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Resumo financeiro</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-[#162235] border border-[#26364D]">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-[#718096]" />
                          <p className="text-[9px] font-semibold text-[#718096] uppercase tracking-wider">Empréstimos</p>
                        </div>
                        <p className="text-base font-bold text-[#F3F6FA]">{personInvs.length}</p>
                        <p className="text-[9px] text-[#718096] mt-0.5">
                          {activeInvs.length} ativo{activeInvs.length !== 1 ? "s" : ""} · {finishedInvs.length} finalizado{finishedInvs.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#162235] border border-[#26364D]">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          <p className="text-[9px] font-semibold text-[#718096] uppercase tracking-wider">Investido</p>
                        </div>
                        <p className="text-base font-bold text-[#F3F6FA]">{formatCurrency(totalInvested)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: totalProfit >= 0 ? "#34d399" : "#f87171" }}>
                          {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)} lucrado
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#162235] border border-[#26364D] divide-y divide-[#26364D]/50">
                      {personInvs.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <p className="text-xs font-semibold text-[#F3F6FA]">{formatCurrency(Number(inv.invested_amount))}</p>
                            <p className="text-[9px] text-[#718096]">{inv.profit_percent}% · {formatDateBR(inv.start_date)}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                            inv.status === "active" ? "bg-emerald-500/15 text-emerald-400" :
                            inv.status === "finished" ? "bg-blue-500/15 text-blue-400" :
                            "bg-slate-500/15 text-slate-400"
                          }`}>
                            <Clock className="h-2.5 w-2.5" />
                            {inv.status === "active" ? "Ativo" : inv.status === "finished" ? "Finalizado" : "Outro"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => { setViewPerson(null); openEdit(viewPerson); }}
                    className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">
                    <Pencil className="h-4 w-4 mr-1.5" /> Editar
                  </Button>
                  <Button variant="outline" onClick={() => { setViewPerson(null); setDeleteId(viewPerson.id); }}
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-[#26364D] animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F3F6FA] font-bold">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

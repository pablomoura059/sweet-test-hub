import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import {
  Wallet, TrendingUp, DollarSign, PieChart, Activity,
  Plus, LogOut, Menu, ArrowRight, Trash2, Pencil,
  CheckCircle, AlertCircle, Clock, User, Search, Filter,
  ChevronRight, Calendar, Home, Users, BarChart2, Settings,
  type LucideIcon, ChevronDown, X, UserPlus, Check,
  Camera,
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
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investments"]["Row"];

type Person = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

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
  if (isLate) return { label: "Atrasado", bg: "bg-red-500/15", text: "text-red-400", icon: AlertCircle };
  if (status === "active") return { label: "Ativo", bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle };
  if (status === "finished") return { label: "Finalizado", bg: "bg-blue-500/15", text: "text-blue-400", icon: CheckCircle };
  return { label: "Cancelado", bg: "bg-slate-500/15", text: "text-slate-400", icon: Clock };
};

type FilterType = "all" | "active" | "finished" | "late" | "cancelled";

const STAT_CARDS = [
  { key: "totalInvested", icon: Wallet, color: "bg-blue-600/10", iconColor: "text-blue-400" },
  { key: "totalInStreet", icon: DollarSign, color: "bg-blue-600/10", iconColor: "text-blue-400" },
  { key: "expectedProfit", icon: TrendingUp, color: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  { key: "expectedReturn", icon: PieChart, color: "bg-blue-600/10", iconColor: "text-blue-400" },
  { key: "receivedProfit", icon: Activity, color: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  { key: "activeCount", icon: Clock, color: "bg-blue-600/10", iconColor: "text-blue-400" },
] as const;

const CARD_LABELS: Record<string, { title: string; description: string }> = {
  totalInvested: { title: "Total Emprestado", description: "Acumulado" },
  totalInStreet: { title: "Na Rua", description: "Emprestado" },
  expectedProfit: { title: "Lucro Previsto", description: "Projeção" },
  expectedReturn: { title: "Retorno Total", description: "Valor + lucro" },
  receivedProfit: { title: "Lucro Recebido", description: "Realizado" },
  activeCount: { title: "Empréstimos Ativos", description: "Em andamento" },
};

// ─── getPhotoUrl ───────────────────────────────────────────────────────────────

const getPhotoUrl = (photoPath: string | null | undefined): string | null => {
  if (!photoPath) return null;
  if (photoPath.startsWith('data:')) return photoPath;
  if (photoPath.startsWith('blob:')) return photoPath;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;

  const { data } = supabase.storage
    .from('person-photos')
    .getPublicUrl(photoPath);

  return data.publicUrl;
};

// ─── Person Avatar ─────────────────────────────────────────────────────────────

function PersonAvatarSmall({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const resolvedUrl = getPhotoUrl(photoUrl);

  return (
    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1e2d42] border-2 border-[#26364D] flex items-center justify-center shrink-0">
      {resolvedUrl ? (
        <img src={resolvedUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-[#718096]">{initials}</span>
          <User className="h-5 w-5 text-[#718096]" />
        </div>
      )}
    </div>
  );
}

// ─── Person Selector Component ────────────────────────────────────────────────

function PersonSelector({
  people,
  selectedPerson,
  onSelect,
  onAddNew,
}: {
  people: Person[];
  selectedPerson: Person | null;
  onSelect: (p: Person | null) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedPerson) {
      setQuery("");
    }
  }, [selectedPerson]);

  return (
    <div className="relative" ref={ref}>
      <Label className="text-xs font-semibold text-[#AAB5C5] block mb-1.5">Nome da Pessoa *</Label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#162235] border border-[#26364D] rounded-lg text-left transition-all focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 hover:border-[#2F6FED]/50"
      >
        <span className={selectedPerson ? "text-[#F3F6FA] text-sm" : "text-[#718096] text-sm"}>
          {selectedPerson ? selectedPerson.name : "Selecione uma pessoa..."}
        </span>
        {selectedPerson ? (
          <X
            className="h-4 w-4 text-[#718096] hover:text-red-400 shrink-0 transition-colors"
            onClick={(e) => { e.stopPropagation(); onSelect(null); }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#718096] shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#162235] border border-[#26364D] rounded-xl shadow-xl z-50 max-h-64 overflow-hidden flex flex-col animate-scale-in">
          <div className="p-2 border-b border-[#26364D]/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718096]" />
              <input
                type="text"
                placeholder="Buscar pessoa..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#101A2B] border border-[#26364D] rounded-lg text-[#F3F6FA] placeholder:text-[#718096] text-xs focus:outline-none focus:border-[#2F6FED]"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {filtered.length > 0 ? (
              filtered.map((p) => {
                const photoUrl = getPhotoUrl(p.photo_url);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onSelect(p); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#18263A] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#1e2d42] border border-[#26364D] flex items-center justify-center shrink-0 overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                      ) : (
                        <User className="h-3.5 w-3.5 text-[#718096]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F3F6FA] truncate">{p.name}</p>
                      {p.phone && (
                        <p className="text-[10px] text-[#718096] truncate">{p.phone}</p>
                      )}
                    </div>
                    {selectedPerson?.id === p.id && (
                      <Check className="h-3.5 w-3.5 text-[#2F6FED] ml-auto shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-[#718096]">Nenhuma pessoa encontrada</p>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-[#26364D]/60">
            <button
              type="button"
              onClick={() => { setOpen(false); onAddNew(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#2F6FED]/10 border border-[#2F6FED]/30 text-[#2F6FED] hover:bg-[#2F6FED]/20 transition-colors text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              Cadastrar nova pessoa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, color, iconColor, description, index }: {
  title: string; value: string; icon: LucideIcon;
  color: string; iconColor: string; description?: string; index: number;
}) {
  return (
    <Card
      className="bg-[#162235] border-[#26364D] hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02] cursor-default group animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <CardContent className="p-3 sm:p-5 flex items-start gap-2.5 sm:gap-4 overflow-hidden">
        <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${color} border border-[#26364D] group-hover:border-blue-500/30 transition-colors shrink-0`}>
          <Icon className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[9px] sm:text-[11px] font-semibold text-[#718096] uppercase tracking-wider truncate">{title}</p>
          <p className="stat-value text-[#F3F6FA] leading-none">{value}</p>
          {description && <p className="text-[8px] sm:text-[10px] text-[#718096] mt-0.5 sm:mt-1 font-medium">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, returnDate }: { status: string; returnDate: string }) {
  const { label, bg, text, icon: Icon } = getStatusInfo(status, returnDate);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#26364D] to-transparent" />
      <h2 className="text-xs font-bold text-[#718096] uppercase tracking-widest px-2">{title}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#26364D] to-transparent" />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
        active
          ? "bg-[#2F6FED] text-white shadow-md shadow-blue-600/20"
          : "bg-[#162235] border border-[#26364D] text-[#718096] hover:text-[#F3F6FA] hover:border-blue-500/30"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Add Person Dialog ────────────────────────────────────────────────────────

function AddPersonDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (person: Person) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyPhoneMask = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(applyPhoneMask(e.target.value));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
  };

  const uploadPhoto = async (userId: string, personId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${personId}.${ext}`;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5 MB");
      return null;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido");
      return null;
    }

    const { data, error } = await supabase.storage.from("person-photos").upload(path, file, { upsert: false });
    if (error) {
      toast.error("Erro ao fazer upload da foto: " + error.message);
      return null;
    }

    if (!data?.path) {
      toast.error("Upload não retornou confirmação. Tente novamente.");
      return null;
    }

    const { error: downloadError } = await supabase.storage.from("person-photos").download(data.path);
    if (downloadError) {
      toast.error("Arquivo enviado mas não pôde ser verificado. Tente novamente.");
      return null;
    }

    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome da pessoa"); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("people")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        phone: phone || null,
        birth_date: birthDate || null,
        notes: notes || null,
        photo_url: null,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error("Erro ao cadastrar pessoa");
      return;
    }

    if (photoFile && data) {
      const uploadedUrl = await uploadPhoto(session.user.id, data.id, photoFile);
      if (uploadedUrl) {
        await supabase.from("people").update({ photo_url: uploadedUrl }).eq("id", data.id);
        data.photo_url = uploadedUrl;
      }
    }

    setLoading(false);
    toast.success("Pessoa cadastrada com sucesso!", {
      className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl",
    });
    queryClient.invalidateQueries({ queryKey: ["people"] });
    setName(""); setPhone(""); setBirthDate(""); setNotes("");
    setPhotoPreview(null); setPhotoFile(null);
    onCreated(data as Person);
    onClose();
  };

  const initials = name.trim().split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#F3F6FA]">Nova Pessoa</DialogTitle>
          <DialogDescription className="text-[#AAB5C5] text-sm">Cadastre uma nova pessoa para vincular ao empréstimo</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1e2d42] border-2 border-[#26364D] flex items-center justify-center shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    {name.trim() && <span className="text-sm font-bold text-[#718096]">{initials}</span>}
                    <User className="h-5 w-5 text-[#718096]" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#2F6FED] border-2 border-[#101A2B] flex items-center justify-center hover:bg-[#3d7ef5] transition-colors"
              >
                <Camera className="h-3 w-3 text-white" />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            <p className="text-[10px] text-[#718096]">Toque para adicionar foto</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-person-name" className="text-xs font-semibold text-[#AAB5C5]">Nome completo *</Label>
            <Input
              id="new-person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da pessoa"
              className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-person-phone" className="text-xs font-semibold text-[#AAB5C5]">Telefone</Label>
            <Input
              id="new-person-phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-person-birth" className="text-xs font-semibold text-[#AAB5C5]">Data de nascimento</Label>
            <Input
              id="new-person-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-person-notes" className="text-xs font-semibold text-[#AAB5C5]">Observações</Label>
            <Textarea
              id="new-person-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais..."
              className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] resize-none focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors"
              disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit"
              className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white font-semibold transition-all active:scale-95"
              disabled={loading}>
              {loading ? "Salvando..." : <><UserPlus className="h-4 w-4 mr-1" /> Cadastrar</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finishData, setFinishData] = useState<{ investment: Investment; actual_received: string; finalized_date: string } | null>(null);
  const [editData, setEditData] = useState<Investment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  const emptyForm = {
    person_id: null as string | null,
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

  const { data: people } = useQuery({
    queryKey: ["people", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return [];
      const { data } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name");
      return (data || []) as Person[];
    },
    enabled: !!session?.user.id,
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
        person_id: data.person_id,
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
      toast.success("Empréstimo cadastrado com sucesso!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
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
      toast.success("Empréstimo atualizado com sucesso!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setEditData(null);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const finishMutation = useMutation({
    mutationFn: async ({ id, actual_received, finalized_at }: { id: string; actual_received: number; finalized_at: string }) => {
      const investment = investments?.find((i) => i.id === id);
      if (!investment) throw new Error("Não encontrado");
      const actual_profit = actual_received - Number(investment.invested_amount);
      const profit_difference = actual_profit - Number(investment.expected_profit);
      const { error } = await supabase.from("investments").update({
        actual_received, actual_profit, profit_difference,
        status: "finished", finalized_at: finalized_at,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empréstimo finalizado com sucesso!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
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
      toast.success("Empréstimo excluído com sucesso.", { className: "!bg-[#101A2B] !border-red-500/30 !text-[#F3F6FA] !font-medium !rounded-xl" });
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
    finishMutation.mutate({
      id: finishData.investment.id,
      actual_received: parseFloat(finishData.actual_received),
      finalized_at: finishData.finalized_date,
    });
  };

  const openEditModal = (investment: Investment) => {
    setEditData(investment);
    setFormData({
      person_id: investment.person_id,
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
      person_id: formData.person_id,
      person_name: formData.person_name,
      invested_amount: parseFloat(formData.invested_amount),
      profit_percent: parseFloat(formData.profit_percent),
      start_date: formData.start_date,
      return_date: formData.return_date,
      notes: formData.notes || null,
    }});
  };

  const openFinishModal = (investment: Investment) => {
    setFinishData({
      investment,
      actual_received: String(investment.expected_return),
      finalized_date: new Date().toISOString().split("T")[0],
    });
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

  const today = new Date().toISOString().split("T")[0];

  const filteredInvestments = investments?.filter((inv) => {
    const matchesSearch = inv.person_name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (filter === "active") matchesFilter = inv.status === "active" && inv.return_date >= today;
    else if (filter === "finished") matchesFilter = inv.status === "finished";
    else if (filter === "late") matchesFilter = inv.status === "active" && inv.return_date < today;
    else if (filter === "cancelled") matchesFilter = inv.status === "cancelled";
    return matchesSearch && matchesFilter;
  }) || [];

  const upcomingDue = activeInvestments
    .filter((i) => i.return_date >= today)
    .sort((a, b) => a.return_date.localeCompare(b.return_date))
    .slice(0, 5);

  const handlePersonSelected = (person: Person | null) => {
    setFormData({ ...formData, person_id: person?.id || null, person_name: person?.name || "" });
  };

  const handlePersonCreated = (person: Person) => {
    setFormData({ ...formData, person_id: person.id, person_name: person.name });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B1220" }}>
      <AddPersonDialog
        open={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onCreated={handlePersonCreated}
      />

      {/* ── Header ─────────────────────────────────────────── */}
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2F6FED] to-[#1a4fd4] flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                      <span className="text-base font-bold text-white">$</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#F3F6FA] leading-tight">(Seu Nome) Emprestimos</div>
                      <div className="text-[11px] text-[#718096] font-normal mt-0.5">Sistema financeiro</div>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-3 mb-2">Visão Geral</p>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#2F6FED]/10 border border-[#2F6FED]/30 text-[#2F6FED] text-sm font-semibold cursor-default">
                      <Home className="h-4 w-4 shrink-0" />
                      Dashboard
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-3 mb-2">Gestão</p>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#AAB5C5] hover:text-[#F3F6FA] hover:bg-[#162235] text-sm font-medium transition-all duration-150 cursor-pointer"
                      onClick={() => { setIsMenuOpen(false); setFilter("all"); setSearchQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      <Wallet className="h-4 w-4 shrink-0" />
                      Empréstimos
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#AAB5C5] hover:text-[#F3F6FA] hover:bg-[#162235] text-sm font-medium transition-all duration-150 cursor-pointer"
                      onClick={() => { setIsMenuOpen(false); router.navigate({ to: "/people" }); }}>
                      <Users className="h-4 w-4 shrink-0" />
                      Pessoas
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#AAB5C5] hover:text-[#F3F6FA] hover:bg-[#162235] text-sm font-medium transition-all duration-150 cursor-pointer"
                      onClick={() => { setIsMenuOpen(false); setFilter("finished"); setSearchQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      Finalizados
                      <span className="ml-auto text-[10px] bg-[#162235] border border-[#26364D] text-[#718096] px-2 py-0.5 rounded-full font-medium">
                        {investments?.filter((i) => i.status === "finished").length ?? 0}
                      </span>
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-3 mb-2">Análises</p>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#AAB5C5] hover:text-[#F3F6FA] hover:bg-[#162235] text-sm font-medium transition-all duration-150 cursor-pointer"
                      onClick={() => { setIsMenuOpen(false); toast.info("Relatórios em breve!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" }); }}>
                      <BarChart2 className="h-4 w-4 shrink-0" />
                      Relatórios
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-3 mb-2">Sistema</p>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#AAB5C5] hover:text-[#F3F6FA] hover:bg-[#162235] text-sm font-medium transition-all duration-150 cursor-pointer"
                      onClick={() => { setIsMenuOpen(false); toast.info("Configurações em breve!", { className: "!bg-[#101A2B] !border-[#2F6FED]/30 !text-[#F3F6FA] !font-medium !rounded-xl" }); }}>
                      <Settings className="h-4 w-4 shrink-0" />
                      Configurações
                    </button>
                  </div>
                  <div className="h-px bg-[#26364D]/60 mx-1" />
                  <button onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#718096] hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all duration-150 cursor-pointer">
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sair
                  </button>
                </nav>
                <div className="px-5 py-4 border-t border-[#26364D]/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#162235] border border-[#26364D] flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-[#718096]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#AAB5C5]">Administrador</p>
                      <p className="text-[9px] text-[#718096] truncate">{session?.user?.email}</p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2F6FED] to-[#1a4fd4] flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-sm font-bold text-white">$</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#F3F6FA] tracking-tight whitespace-nowrap">(Seu Nome) Emprestimos</h1>
          </div>

          <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white shadow-lg shadow-blue-600/20 font-semibold transition-all duration-200 active:scale-95">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Empréstimo</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#F3F6FA]">Novo Empréstimo</DialogTitle>
                <DialogDescription className="text-[#AAB5C5] text-sm">Cadastre um novo empréstimo</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLoan} className="space-y-5">
                <PersonSelector
                  people={people || []}
                  selectedPerson={people?.find((p) => p.id === formData.person_id) || null}
                  onSelect={handlePersonSelected}
                  onAddNew={() => setIsAddPersonOpen(true)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invested_amount" className="text-xs font-semibold text-[#AAB5C5]">Valor (R$) *</Label>
                    <Input id="invested_amount" type="number" step="0.01" min="0" value={formData.invested_amount} onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })} placeholder="0,00" className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profit_percent" className="text-xs font-semibold text-[#AAB5C5]">Porcentagem (%) *</Label>
                    <Input id="profit_percent" type="number" step="0.01" min="0" value={formData.profit_percent} onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })} placeholder="30" className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" required />
                  </div>
                </div>

                {formData.invested_amount && formData.profit_percent && (
                  <div className="p-3 rounded-xl bg-[#C9A45C]/5 border border-[#C9A45C]/20 space-y-1.5">
                    <p className="text-[10px] font-bold text-[#C9A45C] uppercase tracking-wider">Prévia do cálculo</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-[#AAB5C5]">Lucro:</span> <span className="text-emerald-400 font-semibold ml-1">{formatCurrency(calcProfit())}</span></div>
                      <div><span className="text-[#AAB5C5]">Retorno:</span> <span className="text-[#F3F6FA] font-semibold ml-1">{formatCurrency(calcReturn())}</span></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-xs font-semibold text-[#AAB5C5]">Data de Início *</Label>
                    <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="return_date" className="text-xs font-semibold text-[#AAB5C5]">Data de Retorno *</Label>
                    <Input id="return_date" type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-[#AAB5C5]">Observações</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações opcionais..." className="bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] resize-none focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" rows={3} />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setIsNewLoanOpen(false)} className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors" disabled={createMutation.isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white font-semibold transition-all active:scale-95" disabled={createMutation.isPending}>
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

        {upcomingDue.length > 0 && (
          <section className="space-y-3 animate-fade-in-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
            <SectionHeader title="Próximos Vencimentos" />
            <div className="bg-[#162235] border border-[#26364D] rounded-2xl overflow-hidden">
              <div className="divide-y divide-[#26364D]/60">
                {upcomingDue.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status, inv.return_date);
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#18263A]/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg ${statusInfo.bg} shrink-0`}>
                          <Calendar className={`h-3.5 w-3.5 ${statusInfo.text}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#F3F6FA] truncate">{inv.person_name}</p>
                          <p className="text-[10px] text-[#718096]">{formatDate(inv.return_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#F3F6FA] whitespace-nowrap">{formatCurrency(Number(inv.expected_return))}</p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${statusInfo.text}`}>
                            <statusInfo.icon className="h-2.5 w-2.5" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#718096]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <SectionHeader title="Todos os Empréstimos" />
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
              <Input
                type="text"
                placeholder="Buscar por pessoa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#162235] border-[#26364D] text-[#F3F6FA] placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 text-xs h-9"
              />
            </div>
            <div className="w-full overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1.5 min-w-max">
                <Filter className="h-3.5 w-3.5 text-[#718096] shrink-0" />
                <FilterChip label="Todos" active={filter === "all"} onClick={() => setFilter("all")} />
                <FilterChip label="Ativos" active={filter === "active"} onClick={() => setFilter("active")} />
                <FilterChip label="Finalizados" active={filter === "finished"} onClick={() => setFilter("finished")} />
                <FilterChip label="Atrasados" active={filter === "late"} onClick={() => setFilter("late")} />
                <FilterChip label="Cancelados" active={filter === "cancelled"} onClick={() => setFilter("cancelled")} />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#162235] border border-[#26364D] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 rounded skeleton-shimmer" />
                    <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
                  </div>
                  <Skeleton className="h-8 w-40 rounded skeleton-shimmer" />
                  <div className="space-y-1.5">
                    {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-3 w-full rounded skeleton-shimmer" />)}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1 rounded-xl skeleton-shimmer" />
                    <Skeleton className="h-8 flex-1 rounded-xl skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInvestments.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredInvestments.map((inv, idx) => {
                const statusInfo = getStatusInfo(inv.status, inv.return_date);
                return (
                  <Card
                    key={inv.id}
                    className="bg-[#162235] border-[#26364D] hover:border-[#2F6FED]/40 transition-all duration-300 hover:scale-[1.01] group animate-fade-in-up"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
                  >
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-[#718096] shrink-0" />
                          <p className="font-bold text-[#F3F6FA] truncate text-sm">{inv.person_name}</p>
                        </div>
                        <StatusBadge status={inv.status} returnDate={inv.return_date} />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-[#F3F6FA] leading-none">{formatCurrency(Number(inv.invested_amount))}</p>
                      <div className="border-t border-[#26364D]/60 pt-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-[#718096] font-medium">Porcentagem</span>
                            <span className="text-[11px] font-semibold text-[#AAB5C5]">{inv.profit_percent}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-[#718096] font-medium">Lucro</span>
                            <span className="text-[11px] font-semibold text-emerald-400">{formatCurrency(Number(inv.expected_profit || 0))}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-[#718096] font-medium">Retorno</span>
                            <span className="text-[11px] font-semibold text-[#AAB5C5]">{formatCurrency(Number(inv.expected_return || 0))}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-[#718096] font-medium">Início</span>
                            <span className="text-[11px] font-semibold text-[#AAB5C5]">{formatDate(inv.start_date)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 col-span-2">
                            <span className="text-[11px] text-[#718096] font-medium">Data de retorno</span>
                            <span className="text-[11px] font-semibold text-[#AAB5C5]">{inv.return_date ? formatDate(inv.return_date) : "—"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-[#26364D]/60">
                        {inv.status === "active" ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEditModal(inv)} className="flex-1 text-[#718096] hover:text-[#F3F6FA] hover:bg-[#18263A] text-xs h-8 transition-colors">
                              <Pencil className="h-3 w-3 mr-1 shrink-0" /> Editar
                            </Button>
                            <Button size="sm" onClick={() => openFinishModal(inv)} className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white text-xs h-8 font-semibold transition-all active:scale-95 shadow-md shadow-blue-600/10">
                              Finalizar <ArrowRight className="h-3 w-3 ml-1 shrink-0" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => openFinishModal(inv)} className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white text-xs h-8 font-semibold transition-all active:scale-95 shadow-md shadow-blue-600/10">
                            Visualizar
                          </Button>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(inv.id)} className="w-full text-[#718096] hover:text-red-400 hover:bg-red-500/10 text-xs h-8 transition-colors">
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-[#162235]/60 border-[#26364D]">
              <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#18263A]/60 flex items-center justify-center">
                  <Search className="h-7 w-7 text-[#718096]" />
                </div>
                <div>
                  <p className="text-[#AAB5C5] font-semibold text-sm">
                    {searchQuery || filter !== "all" ? "Nenhum resultado encontrado" : "Nenhum empréstimo cadastrado"}
                  </p>
                  <p className="text-[#718096] text-xs mt-1">
                    {searchQuery || filter !== "all" ? "Ajuste os filtros ou a busca" : "Clique em Novo para começar"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* ── Modal de Edição ─────────────────────────────── */}
      <Dialog open={!!editData} onOpenChange={() => setEditData(null)}>
        <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-h-[90vh] overflow-y-auto max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Editar Empréstimo</DialogTitle>
            <DialogDescription className="text-[#AAB5C5] text-sm">Altere os dados do empréstimo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit_person_name" className="text-xs font-semibold text-[#AAB5C5]">Nome da Pessoa *</Label>
              <Input id="edit_person_name" value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_amount" className="text-xs font-semibold text-[#AAB5C5]">Valor (R$) *</Label>
                <Input id="edit_amount" type="number" step="0.01" min="0" value={formData.invested_amount} onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_percent" className="text-xs font-semibold text-[#AAB5C5]">Porcentagem (%) *</Label>
                <Input id="edit_percent" type="number" step="0.01" min="0" value={formData.profit_percent} onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_start" className="text-xs font-semibold text-[#AAB5C5]">Data de Início *</Label>
                <Input id="edit_start" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_return" className="text-xs font-semibold text-[#AAB5C5]">Data de Retorno *</Label>
                <Input id="edit_return" type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_notes" className="text-xs font-semibold text-[#AAB5C5]">Observações</Label>
              <Textarea id="edit_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-[#162235] border-[#26364D] text-[#F3F6FA] resize-none focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" rows={3} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditData(null)} className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white font-semibold transition-all active:scale-95" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Finalização ─────────────────────────── */}
      <Dialog open={!!finishData} onOpenChange={() => setFinishData(null)}>
        <DialogContent className="bg-[#101A2B] border border-[#26364D] text-[#F3F6FA] max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Finalizar Empréstimo</DialogTitle>
            <DialogDescription className="text-[#AAB5C5] text-sm">Informe o valor realmente recebido</DialogDescription>
          </DialogHeader>
          {finishData && (
            <div className="space-y-5">
              <div className="rounded-xl bg-[#162235]/80 border border-[#26364D] p-4 space-y-1">
                <h4 className="text-[10px] font-bold text-[#718096] uppercase tracking-widest mb-3">Resumo</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-[#AAB5C5] font-medium">Pessoa</span>
                    <span className="text-xs font-semibold text-[#F3F6FA]">{finishData.investment.person_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-[#AAB5C5] font-medium">Valor emprestado</span>
                    <span className="text-xs font-semibold text-[#F3F6FA]">{formatCurrency(Number(finishData.investment.invested_amount))}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-[#AAB5C5] font-medium">Retorno previsto</span>
                    <span className="text-xs font-semibold text-[#F3F6FA]">{formatCurrency(Number(finishData.investment.expected_return))}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-[#AAB5C5] font-medium">Lucro previsto</span>
                    <span className="text-xs font-semibold text-emerald-400">{formatCurrency(Number(finishData.investment.expected_profit))}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#18263A] border border-[#26364D] p-3 space-y-3">
                <h4 className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">Valores</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#718096]">Retorno previsto</span>
                    <span className="text-xs font-semibold text-[#F3F6FA]">{formatCurrency(Number(finishData.investment.expected_return))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#718096]">Lucro previsto</span>
                    <span className="text-xs font-semibold text-emerald-400">{formatCurrency(Number(finishData.investment.expected_profit))}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actual_received" className="text-xs font-semibold text-[#AAB5C5]">Valor recebido (R$)</Label>
                <Input id="actual_received" type="number" step="0.01" min="0" value={finishData.actual_received}
                  onChange={(e) => setFinishData({ ...finishData, actual_received: e.target.value })}
                  className="bg-[#162235] border-[#26364D] text-[#F3F6FA] text-base font-semibold placeholder:text-[#718096] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50" />
              </div>

              {finishData.actual_received && (
                <div className="rounded-xl border p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#718096]">Lucro real:</span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount))}</span>
                  </div>
                  {(() => {
                    const diff = parseFloat(finishData.actual_received) - Number(finishData.investment.invested_amount) - Number(finishData.investment.expected_profit);
                    return (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#718096]">Diferença:</span>
                        <span className={diff >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
                          {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="finalized_date" className="text-xs font-semibold text-[#AAB5C5]">Data de conclusão</Label>
                <Input id="finalized_date" type="date" value={finishData.finalized_date}
                  onChange={(e) => setFinishData({ ...finishData, finalized_date: e.target.value })}
                  className="bg-[#162235] border-[#26364D] text-[#F3F6FA] focus:border-[#2F6FED] focus:ring-1 focus:ring-[#2F6FED]/50 [&::-webkit-calendar-picker-indicator]:invert-50" />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setFinishData(null)} className="flex-1 border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">Cancelar</Button>
                <Button onClick={handleFinish} className="flex-1 bg-gradient-to-r from-[#2F6FED] to-[#1a4fd4] hover:from-[#3d7ef5] hover:to-[#2a5ee0] text-white font-semibold transition-all active:scale-95 shadow-md shadow-blue-600/10" disabled={finishMutation.isPending}>
                  {finishMutation.isPending ? "Finalizando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog de Exclusão ───────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#101A2B] border-[#26364D] animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F3F6FA] font-bold">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-[#AAB5C5] text-sm">
              Tem certeza que deseja excluir este empréstimo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#26364D] text-[#AAB5C5] hover:bg-[#162235] hover:text-[#F3F6FA] transition-colors">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

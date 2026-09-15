import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Menu, Home, Wallet, Users, CheckCircle, BarChart2, Settings,
  LogOut, User, Upload,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/minha-conta")({
  component: MinhaContaPage,
});

export default function MinhaContaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Estados dos campos de perfil
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Estados de logo do sistema
  const [logoDbPath, setLogoDbPath] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Máscara brasileira de telefone
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  // ── Upload de logo do sistema ─────────────────────────────────────────
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Use apenas JPG ou PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 5 MB");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      toast.error(`Usuário não autenticado: ${userError?.message || "sessão inválida"}`);
      return;
    }
    const userId = userData.user.id;

    const blobUrl = URL.createObjectURL(file);
    setLogoPreview(blobUrl);
    setIsUploadingLogo(true);

    try {
      const fileExt = file.type === "image/png" ? "png" : "jpg";
      const filePath = `${userId}/logo.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("system-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error(`Erro ao fazer upload da logo: ${uploadError.message}`);
        return;
      }

      setLogoDbPath(filePath);

      const { data: urlData } = supabase.storage
        .from("system-logos")
        .getPublicUrl(filePath);
      setLogoPreview(urlData.publicUrl);

      toast.success("Logo carregada com sucesso!");
    } catch (err: unknown) {
      console.error("[Logo] Erro:", err);
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao fazer upload: ${message}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const openLogoInput = () => {
    logoInputRef.current?.click();
  };

  // Estados dos campos de configuração
  const [systemName, setSystemName] = useState("");
  const [systemSubtitle, setSystemSubtitle] = useState("Sistema financeiro");
  const [theme, setTheme] = useState<string>("dark");
  const [primaryColor, setPrimaryColor] = useState<string>("#2F6FED");

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("role, first_name, last_name, phone, birth_date")
        .eq("id", session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user.id,
  });

  const calculateAge = (dateStr: string): number => {
    if (!dateStr) return 0;
    const today = new Date();
    const birth = new Date(dateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };

  useEffect(() => {
    const profileFirst = currentProfile?.first_name;
    const profileLast = currentProfile?.last_name;
    const metaFirst = session?.user?.user_metadata?.first_name;
    const metaLast = session?.user?.user_metadata?.last_name;
    const metaName = session?.user?.user_metadata?.name;
    if (profileFirst !== undefined && profileFirst !== null && profileFirst !== "") {
      setFirstName(profileFirst);
    } else if (metaFirst) {
      setFirstName(metaFirst);
    } else if (metaName) {
      setFirstName(metaName.split(" ")[0] || "");
    }
    if (profileLast !== undefined && profileLast !== null && profileLast !== "") {
      setLastName(profileLast);
    } else if (metaLast) {
      setLastName(metaLast);
    } else if (metaName) {
      const parts = metaName.split(" ");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (currentProfile?.phone) setPhone(currentProfile.phone);
    if (currentProfile?.birth_date) setBirthDate(currentProfile.birth_date);
  }, [currentProfile, session]);

  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["user-settings", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null;
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user.id,
  });

  useEffect(() => {
    if (userSettings) {
      setSystemName(userSettings.system_name || "");
      setSystemSubtitle(userSettings.system_subtitle || "Sistema financeiro");
      setTheme(userSettings.theme || "dark");
      setPrimaryColor(colorNameToHex(userSettings.primary_color) || "#2F6FED");
      if (userSettings.logo_url) {
        setLogoDbPath(userSettings.logo_url);
        const { data: urlData } = supabase.storage
          .from("system-logos")
          .getPublicUrl(userSettings.logo_url);
        setLogoPreview(urlData.publicUrl);
      }
    }
  }, [userSettings]);

  useEffect(() => {
    if (!session?.user.id || userSettings) return;

    queryClient.ensureQueryData({
      queryKey: ["current-profile", session.user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("profiles")
          .select("role, first_name, last_name")
          .eq("id", session.user.id)
          .single();
        return data;
      },
    }).then(({ data: profile }) => {
      if (!profile) return;

      const fullName = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ");
      const defaultSystemName = fullName ? `${fullName} Empréstimos` : "Empréstimos";

      supabase
        .from("user_settings")
        .upsert(
          {
            user_id: session.user.id,
            system_name: defaultSystemName,
            system_subtitle: "Sistema financeiro",
            theme: "dark",
            primary_color: "blue",
          },
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (error) {
            console.error("Erro ao criar settings inicial:", error);
          } else {
            queryClient.invalidateQueries({ queryKey: ["user-settings", session.user.id] });
          }
        });
    }).catch(console.error);
  }, [session?.user.id, userSettings, queryClient]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error("Usuário não autenticado");

      const colorValue = hexToColorName(primaryColor);

      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: session.user.id,
            system_name: systemName,
            system_subtitle: systemSubtitle,
            theme,
            primary_color: colorValue,
            logo_url: logoDbPath || null,
          },
          { onConflict: "user_id" }
        )
        .select("primary_color, logo_url")
        .single();

      if (settingsError) {
        console.error("[MinhaConta] Erro ao salvar settings:", settingsError);
        throw settingsError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: phone || null,
          birth_date: birthDate || null,
        })
        .eq("id", session.user.id);

      if (profileError) {
        console.error("[MinhaConta] Erro ao salvar perfil:", profileError);
        throw profileError;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.resetQueries({ queryKey: ["user-settings", session?.user.id] });
      queryClient.refetchQueries({ queryKey: ["user-settings", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["current-profile", session?.user.id] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  const handleSave = () => {
    saveSettingsMutation.mutate();
  };

  const fullName = [firstName, lastName].filter(Boolean).join(" ") ||
    [currentProfile?.first_name, currentProfile?.last_name].filter(Boolean).join(" ") ||
    "";
  const defaultSystemName = fullName ? `${fullName} Empréstimos` : "Empréstimos";
  const displaySystemName = systemName || defaultSystemName;
  const calculatedAge = calculateAge(birthDate);

  const logoPreviewSrc = logoPreview || null;

  const themeOptions = [
    { id: "dark", label: "Escuro", icon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> },
    { id: "light", label: "Claro", icon: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></> },
  ];

  const colorOptions = [
    { color: "#2F6FED", name: "blue", label: "Azul" },
    { color: "#8B5CF6", name: "purple", label: "Roxo" },
    { color: "#10B981", name: "green", label: "Verde" },
    { color: "#F59E0B", name: "orange", label: "Âmbar" },
    { color: "#EF4444", name: "red", label: "Vermelho" },
    { color: "#EC4899", name: "pink", label: "Rosa" },
  ];

  function colorNameToHex(name: string | null): string {
    if (!name) return "#2F6FED";
    const found = colorOptions.find((c) => c.name === name);
    return found ? found.color : "#2F6FED";
  }

  function hexToColorName(hex: string): string {
    const found = colorOptions.find((c) => c.color === hex);
    return found ? found.name : "blue";
  }

  // ── Theme-aware semantic variables ─────────────────────────────────────
  const isLight = theme === "light";

  // Background & surfaces
  const bgMain = "var(--background)";
  const bgSurface = "var(--card)";
  const bgElevated = "var(--popover)";
  const bgSecondary = "var(--secondary)";

  // Text
  const textPrimary = "var(--foreground)";
  const textSecondary = "var(--secondary-foreground)";
  const textMuted = "var(--muted-foreground)";

  // Border & input
  const borderColor = "var(--border)";
  const inputBg = "var(--input)";

  // Shadow
  const cardShadow = "var(--shadow-card)";

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: bgMain }}
      data-theme={isLight ? "light" : "dark"}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: isLight ? "var(--sidebar-border)" : "var(--border)",
          backgroundColor: isLight ? "var(--sidebar-background)" : "var(--card)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-accent transition-colors"
                  style={{ color: textSecondary }}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 flex flex-col"
                style={{ backgroundColor: bgElevated, borderColor }}
              >
                <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                      style={{
                        background: `linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))`,
                        boxShadow: `0 8px 24px color-mix(in srgb, var(--color-primary) 25%, transparent)`,
                      }}
                    >
                      <span className="text-base font-bold text-white">$</span>
                    </div>
                    <div>
                      <div
                        className="text-sm font-bold leading-tight"
                        style={{ color: textPrimary }}
                      >
                        {fullName ? `${fullName} Empréstimos` : "Empréstimos"}
                      </div>
                      <div
                        className="text-[11px] font-normal mt-0.5"
                        style={{ color: textMuted }}
                      >
                        Sistema financeiro
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                  <div className="space-y-0.5">
                    <p
                      className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2"
                      style={{ color: textMuted }}
                    >
                      Visão Geral
                    </p>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-accent"
                      style={{ color: textSecondary }}
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.navigate({ to: "/dashboard" });
                      }}
                    >
                      <Home className="h-4 w-4 shrink-0" />
                      Dashboard
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <p
                      className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2"
                      style={{ color: textMuted }}
                    >
                      Gestão
                    </p>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-accent"
                      style={{ color: textSecondary }}
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.navigate({ to: "/dashboard" });
                      }}
                    >
                      <Wallet className="h-4 w-4 shrink-0" />
                      Empréstimos
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-accent"
                      style={{ color: textSecondary }}
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.navigate({ to: "/people" });
                      }}
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      Pessoas
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-accent"
                      style={{ color: textSecondary }}
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.navigate({ to: "/dashboard" });
                      }}
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      Finalizados
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <p
                      className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2"
                      style={{ color: textMuted }}
                    >
                      Análises
                    </p>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-accent"
                      style={{ color: textSecondary }}
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.navigate({ to: "/reports" });
                      }}
                    >
                      <BarChart2 className="h-4 w-4 shrink-0" />
                      Relatórios
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <p
                      className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2"
                      style={{ color: textMuted }}
                    >
                      Sistema
                    </p>
                    {currentProfile?.role === "admin" && (
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-accent"
                        style={{ color: textSecondary }}
                        onClick={() => {
                          setIsMenuOpen(false);
                          router.navigate({ to: "/gestores" });
                        }}
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        Gestores
                      </button>
                    )}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-default"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                        borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      Minha Conta
                    </button>
                  </div>

                  <div className="h-px mx-1" style={{ backgroundColor: borderColor }} />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 shrink-0" style={{ color: textMuted }} />
                    <span style={{ color: textMuted }}>Sair</span>
                  </button>
                </nav>

                <div className="px-5 py-4 border-t" style={{ borderColor }}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
                      style={{ backgroundColor: bgSurface, borderColor }}
                    >
                      <User className="h-3.5 w-3.5" style={{ color: textMuted }} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-semibold"
                        style={{ color: textSecondary }}
                      >
                        {currentProfile?.role === "admin" ? "Administrador" : "Gestor"}
                      </p>
                      <p
                        className="text-[9px] truncate"
                        style={{ color: textMuted }}
                      >
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))`,
                boxShadow: `0 8px 24px color-mix(in srgb, var(--color-primary) 25%, transparent)`,
              }}
            >
              <span className="text-sm font-bold text-white">$</span>
            </div>
            <h1
              className="text-sm sm:text-base font-bold tracking-tight whitespace-nowrap"
              style={{ color: textPrimary }}
            >
              Minha Conta
            </h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-2xl mx-auto px-4 py-8 pb-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: textPrimary }}>
            Minha Conta
          </h1>
          <p className="mt-1 text-sm sm:text-base" style={{ color: textMuted }}>
            Gerencie seu perfil e as preferências do sistema
          </p>
        </div>

        {/* Card Perfil */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            backgroundColor: bgSurface,
            borderColor,
            boxShadow: cardShadow,
          }}
        >
          <div className="border-b px-6 py-4 sm:px-8" style={{ borderColor }}>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>
              Perfil
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: textMuted }}>
              Suas informações pessoais
            </p>
          </div>
          <div className="px-6 py-6 sm:px-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={firstName}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border px-3.5 py-2.5 text-sm shadow-sm"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textMuted,
                  }}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Sobrenome
                </label>
                <input
                  type="text"
                  value={lastName}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border px-3.5 py-2.5 text-sm shadow-sm"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textMuted,
                  }}
                  placeholder="Seu sobrenome"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border px-3.5 py-2.5 text-sm shadow-sm"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textMuted,
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textPrimary,
                    outlineColor: "var(--color-primary)",
                  }}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Data de nascimento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textPrimary,
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Idade
                </label>
                <input
                  type="text"
                  value={calculatedAge > 0 ? `${calculatedAge} anos` : "—"}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border px-3.5 py-2.5 text-sm shadow-sm"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textMuted,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card Identidade do Sistema */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            backgroundColor: bgSurface,
            borderColor,
            boxShadow: cardShadow,
          }}
        >
          <div className="border-b px-6 py-4 sm:px-8" style={{ borderColor }}>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>
              Identidade do Sistema
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: textMuted }}>
              Personalize como seu sistema será apresentado.
            </p>
          </div>
          <div className="px-6 py-6 sm:px-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Nome do sistema
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: "var(--color-primary)",
                    color: textPrimary,
                    outlineColor: "var(--color-primary)",
                  }}
                  placeholder="Nome do seu sistema"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: textSecondary }}>
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={systemSubtitle}
                  onChange={(e) => setSystemSubtitle(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: inputBg,
                    borderColor,
                    color: textPrimary,
                  }}
                  placeholder="Ex: Sistema financeiro"
                />
              </div>
            </div>

            {/* Upload de Logo do Sistema */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: textSecondary }}>
                Logo do sistema
              </label>
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border"
                  style={{ backgroundColor: bgElevated, borderColor }}
                >
                  {logoPreviewSrc ? (
                    <img
                      src={logoPreviewSrc}
                      alt="Logo do sistema"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span
                      className="text-xl font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      $
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />

                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors active:scale-95 disabled:opacity-50"
                    style={{
                      borderColor,
                      backgroundColor: bgElevated,
                      color: textSecondary,
                    }}
                  >
                    {isUploadingLogo ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {logoPreviewSrc ? "Trocar logo" : "Adicionar logo"}
                      </>
                    )}
                  </button>
                  <p className="text-xs" style={{ color: textMuted }}>
                    PNG ou JPG, máximo 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Prévia da identidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: textSecondary }}>
                Prévia
              </label>
              <div
                className="rounded-xl border p-4 flex items-center gap-3"
                style={{
                  backgroundColor: bgElevated,
                  borderColor,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    background: logoPreviewSrc
                      ? "transparent"
                      : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
                  }}
                >
                  {logoPreviewSrc ? (
                    <img
                      src={logoPreviewSrc}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">$</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: textPrimary }}>
                    {displaySystemName}
                  </p>
                  <p className="text-[11px]" style={{ color: textMuted }}>
                    {systemSubtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Aparência */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            backgroundColor: bgSurface,
            borderColor,
            boxShadow: cardShadow,
          }}
        >
          <div className="border-b px-6 py-4 sm:px-8" style={{ borderColor }}>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>
              Aparência
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: textMuted }}>
              Personalize a aparência do seu sistema.
            </p>
          </div>
          <div className="px-6 py-6 sm:px-8 space-y-6">
            {/* Tema */}
            <div className="space-y-3">
              <label className="text-sm font-medium" style={{ color: textSecondary }}>
                Tema
              </label>
              <div className="flex gap-2">
                {themeOptions.map((t) => {
                  const isActive = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all active:scale-95"
                      style={{
                        borderColor: isActive ? "var(--color-primary)" : borderColor,
                        backgroundColor: isActive
                          ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
                          : bgElevated,
                        boxShadow: isActive
                          ? `0 0 0 1px var(--color-primary)`
                          : "none",
                        color: isActive ? "var(--color-primary)" : textSecondary,
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        {t.icon}
                      </svg>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cor principal */}
            <div className="space-y-3">
              <label className="text-sm font-medium" style={{ color: textSecondary }}>
                Cor principal
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {colorOptions.map((item) => {
                  const isActive = item.color === primaryColor;
                  return (
                    <button
                      key={item.color}
                      onClick={() => setPrimaryColor(item.color)}
                      className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: isActive
                          ? `0 0 0 3px ${bgSurface}, 0 0 0 5px ${item.color}`
                          : "none",
                      }}
                      title={item.label}
                    >
                      {isActive && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prévia */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: textSecondary }}>
                Prévia
              </label>
              <div
                className="rounded-xl border p-4 space-y-3"
                style={{
                  backgroundColor: bgElevated,
                  borderColor,
                }}
              >
                <div
                  className="flex items-center gap-2 pb-3 border-b"
                  style={{ borderColor }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">$</span>
                  </div>
                  <div
                    className="h-2 w-24 rounded"
                    style={{ backgroundColor: borderColor }}
                  />
                  <div className="ml-auto flex gap-1">
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: primaryColor, opacity: 0.4 }}
                    />
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: primaryColor, opacity: 0.4 }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div
                    className="flex-1 rounded-lg p-2.5 border"
                    style={{ backgroundColor: bgSurface, borderColor }}
                  >
                    <div
                      className="h-1.5 w-16 rounded mb-1.5"
                      style={{ backgroundColor: primaryColor, opacity: 0.7 }}
                    />
                    <div
                      className="h-1.5 w-10 rounded"
                      style={{ backgroundColor: textMuted, opacity: 0.4 }}
                    />
                  </div>
                  <div
                    className="flex-1 rounded-lg p-2.5 border"
                    style={{ backgroundColor: bgSurface, borderColor }}
                  >
                    <div
                      className="h-1.5 w-16 rounded mb-1.5"
                      style={{ backgroundColor: primaryColor, opacity: 0.7 }}
                    />
                    <div
                      className="h-1.5 w-10 rounded"
                      style={{ backgroundColor: textMuted, opacity: 0.4 }}
                    />
                  </div>
                </div>
                <div className="flex justify-center pt-1">
                  <div
                    className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
                    }}
                  >
                    Ação principal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending || settingsLoading}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors active:scale-95 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 80%, white))`,
              boxShadow: `0 4px 14px color-mix(in srgb, var(--color-primary) 40%, transparent)`,
            }}
          >
            {saveSettingsMutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Salvando...
              </span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

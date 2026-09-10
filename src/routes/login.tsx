import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal de recuperação de senha
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);



  // Verificar se já está logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.navigate({ to: "/dashboard" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const isEmailNotConfirmed = authError.message.toLowerCase().includes("email not confirmed");
        const isInvalidCredentials = authError.message.toLowerCase().includes("invalid login credentials") && email.includes("@");
        if (isEmailNotConfirmed || isInvalidCredentials) {
          setError("E-mail ou senha incorretos.");
        } else {
          setError(authError.message);
        }
        toast.error("Erro ao fazer login");
        return;
      }

      if (data.user) {
        // Verificar status do profile no banco
              const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", data.user.id)
        .maybeSingle();

        if (profile) {
          // Admin ou manager ativo entra normalmente
          if ((profile.role === "admin" || profile.role === "manager") && profile.status === "active") {
            toast.success("Login realizado com sucesso!");
            router.navigate({ to: "/dashboard" });
            return;
          }

          // Manager pending: encerra sessão e redireciona com status pending
          if (profile.role === "manager" && profile.status === "pending") {
            await supabase.auth.signOut();
            setError("");
            router.navigate({ to: "/conta-bloqueada", search: { status: "pending" } });
            return;
          }

          // Manager blocked: encerra sessão e redireciona com status blocked
          if (profile.role === "manager" && profile.status === "blocked") {
            await supabase.auth.signOut();
            setError("");
            router.navigate({ to: "/conta-bloqueada", search: { status: "blocked" } });
            return;
          }
        }

        // Se não tiver profile (caso legacy), permite acesso
        toast.success("Login realizado com sucesso!");
        router.navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setIsRecoveryOpen(true);
    setRecoveryEmail(email);
    setRecoverySent(false);
  };

  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      toast.error("Digite seu e-mail para recuperar a senha");
      return;
    }

    setIsRecoveryLoading(true);
    try {
      const appUrl = window.location.origin.includes('localhost')
        ? import.meta.env.VITE_APP_URL
        : window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setRecoverySent(true);
        toast.success("Link de recuperação enviado! Verifique seu e-mail.");
      }
    } catch (err) {
      toast.error("Erro ao enviar e-mail de recuperação");
    } finally {
      setIsRecoveryLoading(false);
    }
  };



  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-2xl font-bold text-white">$</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Empréstimos</h1>
          <p className="text-slate-400 text-sm">Sistema de gerenciamento de investimentos</p>
        </div>

        {/* Card de Login */}
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white text-center">Acessar conta</CardTitle>
            <CardDescription className="text-slate-400 text-center">
              Entre com suas credenciais para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </form>

            <div className="h-px bg-slate-700 my-4" />

            <p className="text-center text-slate-400 text-sm">
              Não possui uma conta?{" "}
              <button
                type="button"
                onClick={() => router.navigate({ to: "/signup" })}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Criar conta
              </button>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Recuperação de Senha */}
      <Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          {!recoverySent ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Recuperar senha</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Informe seu e-mail para receber o link de recuperação
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendRecovery} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email" className="text-slate-300">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="flex gap-2 sm:flex-col sm:space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRecoveryOpen(false)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isRecoveryLoading}
                  >
                    {isRecoveryLoading ? "Enviando..." : "Enviar link"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">E-mail enviado!</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Enviamos um link de recuperação para <strong className="text-white">{recoveryEmail}</strong>
                </p>
                <p className="text-slate-500 text-xs mb-6">
                  Verifique também a pasta de spam.
                </p>
                <Button
                  onClick={() => {
                    setIsRecoveryOpen(false);
                    setRecoverySent(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Entendi
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

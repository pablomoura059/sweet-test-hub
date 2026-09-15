import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[#1a3a5c] !text-white !border !border-emerald-500/40 !rounded-xl !shadow-xl !px-4 !py-3",
              success:
                "!border-emerald-500/50",
              error:
                "!border-red-500/50",
              description:
                "!text-slate-200",
              icon:
                "![&>svg]:!text-emerald-400",
            },
            duration: 3000,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [primaryColor, setPrimaryColor] = useState("#2F6FED");

  // Carregar cor primária e tema do user_settings
  useEffect(() => {
    const loadTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        document.documentElement.style.setProperty("--color-primary", "#2F6FED");
        document.documentElement.removeAttribute("data-theme");
        return;
      }

      const { data } = await supabase
        .from("user_settings")
        .select("primary_color, theme")
        .eq("user_id", session.user.id)
        .single();

      const colorMap: Record<string, string> = {
        blue: "#2F6FED",
        purple: "#7C3AED",
        green: "#059669",
        orange: "#D97706",
        red: "#DC2626",
        pink: "#DB2777",
      };
      const hex = data?.primary_color ? (colorMap[data.primary_color] || "#2F6FED") : "#2F6FED";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const dark = "#" + [r, g, b].map((v, i) => Math.round([r, g, b][i] * 0.65)).map(v => Math.max(0, v).toString(16).padStart(2, "0")).join("");
      const light = "#" + [r, g, b].map(v => Math.min(255, Math.round(v * 1.25))).map(v => v.toString(16).padStart(2, "0")).join("");
      setPrimaryColor(hex);
      document.documentElement.style.setProperty("--color-primary", hex);
      document.documentElement.style.setProperty("--color-primary-dark", dark);
      document.documentElement.style.setProperty("--color-primary-light", light);

      // Aplicar tema claro ou escuro
      if (data?.theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    };

    loadTheme();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadTheme();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Atualizar todas as variáveis de cor primária sempre que primaryColor mudar
  useEffect(() => {
    const colorMap: Record<string, string> = {
      blue: "#2F6FED",
      purple: "#7C3AED",
      green: "#059669",
      orange: "#D97706",
      red: "#DC2626",
      pink: "#DB2777",
    };
    const hex = colorMap[primaryColor] || primaryColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dark = "#" + [40, 20, 120].map((v, i) => Math.round([r, g, b][i] * 0.65)).map(v => Math.max(0, v).toString(16).padStart(2, "0")).join("");
    const light = "#" + [r, g, b].map(v => Math.min(255, Math.round(v * 1.25))).map(v => v.toString(16).padStart(2, "0")).join("");
    document.documentElement.style.setProperty("--color-primary", hex);
    document.documentElement.style.setProperty("--color-primary-dark", dark);
    document.documentElement.style.setProperty("--color-primary-light", light);
  }, [primaryColor]);

  // Proteção global: verificar profile em cada navegação
  useEffect(() => {
    const checkProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile) return;

      // Se manager pending ou blocked, encerrar sessão e redirecionar com status
      if (profile.role === "manager") {
        if (profile.status === "pending") {
          await supabase.auth.signOut();
          router.navigate({ to: "/conta-bloqueada", search: { status: "pending" } });
          return;
        }
        if (profile.status === "blocked") {
          await supabase.auth.signOut();
          router.navigate({ to: "/conta-bloqueada", search: { status: "blocked" } });
          return;
        }
      }
    };

    checkProfile();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

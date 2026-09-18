import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_THEME,
  PRIMARY_COLOR_OPTIONS,
  applyPrimaryColor,
  applyResolvedTheme,
  getPrimaryColorHex,
  normalizeTheme,
  type ThemePreference,
} from "@/lib/theme";

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

  // Fonte global única para tema e cor principal do usuário autenticado.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    let currentPreference: ThemePreference = DEFAULT_THEME;

    const applyThemePreference = () => {
      const resolvedTheme = currentPreference === "system"
        ? (mediaQuery.matches ? "dark" : "light")
        : currentPreference;
      applyResolvedTheme(resolvedTheme);
    };

    const resetTheme = () => {
      currentPreference = DEFAULT_THEME;
      applyThemePreference();
      applyPrimaryColor(getPrimaryColorHex(null));
    };

    const loadUserTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        resetTheme();
        return;
      }

      const { data } = await supabase
        .from("user_settings")
        .select("theme, primary_color")
        .eq("user_id", session.user.id)
        .maybeSingle();

      currentPreference = normalizeTheme(data?.theme);
      applyThemePreference();
      // Always resolve to hex so applyPrimaryColor receives a consistent value
      const rawColor = data?.primary_color;
      const colorHex = rawColor && (PRIMARY_COLOR_OPTIONS as readonly { name: string; color: string }[]).some((o) => o.name === rawColor)
        ? getPrimaryColorHex(rawColor)
        : getPrimaryColorHex(null);
      applyPrimaryColor(colorHex);
    };

    const handleSystemThemeChange = () => {
      if (currentPreference === "system") applyThemePreference();
    };

    const handleThemeChanged = () => {
      void loadUserTheme();
    };

    void loadUserTheme();
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("theme-changed", handleThemeChanged);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      window.setTimeout(() => {
        void loadUserTheme();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("theme-changed", handleThemeChanged);
    };
  }, []);

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

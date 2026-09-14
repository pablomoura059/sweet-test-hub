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

  // Carregar cor primária do user_settings e definir em document.documentElement
  useEffect(() => {
    const loadPrimaryColor = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        document.documentElement.style.setProperty("--color-primary", "#2F6FED");
        return;
      }

      const { data } = await supabase
        .from("user_settings")
        .select("primary_color")
        .eq("user_id", session.user.id)
        .single();

      const colorMap: Record<string, string> = {
        blue: "#2F6FED",
        purple: "#8B5CF6",
        green: "#10B981",
        orange: "#F59E0B",
        red: "#EF4444",
        pink: "#EC4899",
      };
      const hex = data?.primary_color ? (colorMap[data.primary_color] || "#2F6FED") : "#2F6FED";
      setPrimaryColor(hex);
      document.documentElement.style.setProperty("--color-primary", hex);
    };

    loadPrimaryColor();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPrimaryColor();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Atualizar --color-primary em document.documentElement sempre que primaryColor mudar
  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", primaryColor);
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

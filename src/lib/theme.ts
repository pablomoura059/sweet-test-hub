export const PRIMARY_COLOR_OPTIONS = [
  { name: "blue", color: "#2F6FED", label: "Azul" },
  { name: "purple", color: "#7C3AED", label: "Roxo" },
  { name: "green", color: "#059669", label: "Verde" },
  { name: "orange", color: "#D97706", label: "Âmbar" },
  { name: "red", color: "#DC2626", label: "Vermelho" },
  { name: "pink", color: "#DB2777", label: "Rosa" },
] as const;

export type PrimaryColorName = (typeof PRIMARY_COLOR_OPTIONS)[number]["name"];
export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const DEFAULT_PRIMARY_COLOR: PrimaryColorName = "blue";
export const DEFAULT_THEME: ThemePreference = "dark";

const primaryColorByName = new Map<string, string>(
  PRIMARY_COLOR_OPTIONS.map(({ name, color }) => [name, color]),
);

const primaryColorNameByHex = new Map<string, PrimaryColorName>(
  PRIMARY_COLOR_OPTIONS.map(({ name, color }) => [color.toLowerCase(), name]),
);

export function getPrimaryColorHex(name: string | null | undefined): string {
  return primaryColorByName.get(name ?? "") ?? primaryColorByName.get(DEFAULT_PRIMARY_COLOR) ?? "#2F6FED";
}

export function getPrimaryColorName(hex: string): PrimaryColorName {
  return primaryColorNameByHex.get(hex.toLowerCase()) ?? DEFAULT_PRIMARY_COLOR;
}

export function normalizeTheme(theme: string | null | undefined): ThemePreference {
  if (theme === "light" || theme === "system") return theme;
  return DEFAULT_THEME;
}

function mixWith(hex: string, target: number, amount: number): string {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `#${channels
    .map((channel) => Math.round(channel * (1 - amount) + target * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function applyPrimaryColor(hex: string): void {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", hex);
  root.style.setProperty("--color-primary-dark", mixWith(hex, 0, 0.35));
  root.style.setProperty("--color-primary-light", mixWith(hex, 255, 0.25));
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}
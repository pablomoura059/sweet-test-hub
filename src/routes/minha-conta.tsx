import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/minha-conta")({
  component: MinhaContaPage,
});

export default function MinhaContaPage() {
  const [firstName, setFirstName] = useState("Pablo");
  const [lastName, setLastName] = useState("Moreira");
  const [email] = useState("pablo@email.com");

  const systemName = `${firstName} ${lastName} Empréstimos`.trim();
  const systemSubtitle = "Sistema financeiro";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-10">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-[#F3F6FA] sm:text-3xl"
            style={{ color: "#F3F6FA" }}
          >
            Minha Conta
          </h1>
          <p className="mt-1 text-sm text-[#718096] sm:text-base">
            Gerencie seu perfil e as preferências do sistema
          </p>
        </div>

        {/* Card Perfil */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{ backgroundColor: "#162235", borderColor: "#26364D" }}
        >
          <div
            className="border-b px-6 py-4 sm:px-8"
            style={{ borderColor: "#26364D" }}
          >
            <h2 className="text-base font-semibold text-[#F3F6FA]">Perfil</h2>
            <p className="mt-0.5 text-sm text-[#718096]">Suas informações pessoais</p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {/* Avatar */}
            <div className="mb-6 flex flex-col items-center sm:flex-row sm:items-start sm:gap-5">
              <div
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white sm:h-24 sm:w-24 sm:text-3xl"
                style={{ background: "linear-gradient(135deg, #2F6FED, #1a4fd4)" }}
              >
                {firstName?.[0]?.toUpperCase()}{lastName?.[0]?.toUpperCase()}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:mt-0">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-[#AAB5C5] shadow-sm transition-colors hover:bg-[#18263A] active:scale-95"
                  style={{ borderColor: "#26364D", backgroundColor: "#101A2B" }}
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Alterar foto
                </button>
                <p className="text-xs text-[#718096]">JPG ou PNG. Máximo 2MB.</p>
              </div>
            </div>

            {/* Campos */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#AAB5C5]">Nome</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#F3F6FA] shadow-sm transition-colors placeholder:text-[#718096] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "#101A2B",
                    borderColor: "#26364D",
                    color: "#F3F6FA",
                  }}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#AAB5C5]">Sobrenome</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#F3F6FA] shadow-sm transition-colors placeholder:text-[#718096] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "#101A2B",
                    borderColor: "#26364D",
                    color: "#F3F6FA",
                  }}
                  placeholder="Seu sobrenome"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-[#AAB5C5]">E-mail</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border px-3.5 py-2.5 text-sm shadow-sm"
                  style={{
                    backgroundColor: "#0B1220",
                    borderColor: "#26364D",
                    color: "#718096",
                  }}
                />
              </div>
            </div>

            {/* Botão */}
            <div className="mt-6 flex justify-end">
              <button
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #2F6FED, #1a4fd4)",
                  boxShadow: "0 4px 14px rgba(47, 111, 237, 0.25)",
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
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Salvar alterações
              </button>
            </div>
          </div>
        </div>

        {/* Card Identidade do Sistema */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{ backgroundColor: "#162235", borderColor: "#26364D" }}
        >
          <div
            className="border-b px-6 py-4 sm:px-8"
            style={{ borderColor: "#26364D" }}
          >
            <h2 className="text-base font-semibold text-[#F3F6FA]">Identidade do Sistema</h2>
            <p className="mt-0.5 text-sm text-[#718096]">Personalize como seu sistema será apresentado.</p>
          </div>

          <div className="px-6 py-6 sm:px-8 space-y-6">
            {/* Campos */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#AAB5C5]">Nome do sistema</label>
                <input
                  type="text"
                  defaultValue={systemName}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#F3F6FA] shadow-sm transition-colors placeholder:text-[#718096] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "#101A2B",
                    borderColor: "#26364D",
                    color: "#F3F6FA",
                  }}
                  placeholder="Nome do seu sistema"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#AAB5C5]">Subtítulo</label>
                <input
                  type="text"
                  defaultValue={systemSubtitle}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#F3F6FA] shadow-sm transition-colors placeholder:text-[#718096] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "#101A2B",
                    borderColor: "#26364D",
                    color: "#F3F6FA",
                  }}
                  placeholder="Ex: Sistema financeiro"
                />
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#AAB5C5]">Logo do sistema</label>
              <div className="flex items-start gap-4">
                {/* Preview quadrado */}
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2F6FED, #1a4fd4)" }}
                >
                  <span className="text-xl font-bold text-white">$</span>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-[#AAB5C5] shadow-sm transition-colors hover:bg-[#18263A] active:scale-95"
                    style={{ borderColor: "#26364D", backgroundColor: "#101A2B" }}
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Adicionar logo
                  </button>
                  <p className="text-xs text-[#718096]">PNG ou JPG, máximo 2MB</p>
                </div>
              </div>
            </div>

            {/* Prévia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#AAB5C5]">Prévia</label>
              <div
                className="rounded-xl border p-4 flex items-center gap-3"
                style={{ backgroundColor: "#101A2B", borderColor: "#26364D" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2F6FED, #1a4fd4)" }}
                >
                  <span className="text-sm font-bold text-white">$</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#F3F6FA]">{systemName}</p>
                  <p className="text-[11px] text-[#718096]">{systemSubtitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Aparência */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{ backgroundColor: "#162235", borderColor: "#26364D" }}
        >
          <div
            className="border-b px-6 py-4 sm:px-8"
            style={{ borderColor: "#26364D" }}
          >
            <h2 className="text-base font-semibold text-[#F3F6FA]">Aparência</h2>
            <p className="mt-0.5 text-sm text-[#718096]">Personalize a aparência do seu sistema.</p>
          </div>

          <div className="px-6 py-6 sm:px-8 space-y-6">
            {/* Tema */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#AAB5C5]">Tema</label>
              <div className="flex gap-2">
                {[
                  { id: "dark", label: "Escuro", icon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> },
                  { id: "light", label: "Claro", icon: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></> },
                  { id: "system", label: "Sistema", icon: <><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></> },
                ].map((theme) => {
                  const isActive = theme.id === "dark";
                  return (
                    <button
                      key={theme.id}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                        isActive ? "text-white shadow-sm" : "text-[#AAB5C5]"
                      }`}
                      style={{
                        borderColor: isActive ? "#2F6FED" : "#26364D",
                        backgroundColor: isActive ? "rgba(47,111,237,0.15)" : "#101A2B",
                        boxShadow: isActive ? "0 0 0 1px #2F6FED" : "none",
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
                        {theme.icon}
                      </svg>
                      <span className="hidden sm:inline">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cor principal */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#AAB5C5]">Cor principal</label>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { color: "#2F6FED", name: "Azul" },
                  { color: "#8B5CF6", name: "Roxo" },
                  { color: "#10B981", name: "Verde" },
                  { color: "#F59E0B", name: "Âmbar" },
                  { color: "#EF4444", name: "Vermelho" },
                  { color: "#EC4899", name: "Rosa" },
                ].map((item) => {
                  const isActive = item.color === "#2F6FED";
                  return (
                    <button
                      key={item.color}
                      className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90"
                      style={{ backgroundColor: item.color, boxShadow: isActive ? `0 0 0 3px #162235, 0 0 0 5px ${item.color}` : "none" }}
                      title={item.name}
                    >
                      {isActive && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                <button
                  className="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-dashed"
                  style={{ borderColor: "#26364D", backgroundColor: "transparent" }}
                  title="Personalizada"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Prévia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#AAB5C5]">Prévia</label>
              <div
                className="rounded-xl border p-4 space-y-3"
                style={{ backgroundColor: "#101A2B", borderColor: "#26364D" }}
              >
                {/* Barra de navegação simulada */}
                <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: "#26364D" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2F6FED, #1a4fd4)" }}>
                    <span className="text-[10px] font-bold text-white">$</span>
                  </div>
                  <div className="h-2 w-24 rounded" style={{ backgroundColor: "#26364D" }} />
                  <div className="ml-auto flex gap-1">
                    <div className="h-6 w-6 rounded-full" style={{ backgroundColor: "#2F6FED", opacity: 0.4 }} />
                    <div className="h-6 w-6 rounded-full" style={{ backgroundColor: "#2F6FED", opacity: 0.4 }} />
                  </div>
                </div>
                {/* Cards simulados */}
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg p-2.5" style={{ backgroundColor: "#162235", border: "1px solid #26364D" }}>
                    <div className="h-1.5 w-16 rounded mb-1.5" style={{ backgroundColor: "#2F6FED", opacity: 0.7 }} />
                    <div className="h-1.5 w-10 rounded" style={{ backgroundColor: "#718096", opacity: 0.4 }} />
                  </div>
                  <div className="flex-1 rounded-lg p-2.5" style={{ backgroundColor: "#162235", border: "1px solid #26364D" }}>
                    <div className="h-1.5 w-16 rounded mb-1.5" style={{ backgroundColor: "#2F6FED", opacity: 0.7 }} />
                    <div className="h-1.5 w-10 rounded" style={{ backgroundColor: "#718096", opacity: 0.4 }} />
                  </div>
                </div>
                {/* Botão simulado */}
                <div className="flex justify-center pt-1">
                  <div className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #2F6FED, #1a4fd4)" }}>
                    Ação principal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

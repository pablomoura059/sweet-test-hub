import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/minha-conta")({
  component: MinhaContaPage,
});

export default function MinhaContaPage() {
  const [firstName, setFirstName] = useState("Pablo");
  const [lastName, setLastName] = useState("Moreira");
  const [email] = useState("pablo@email.com");

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Minha Conta
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Gerencie seu perfil e as preferências do sistema
          </p>
        </div>

        {/* Card Perfil */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
            <h2 className="text-base font-semibold text-slate-800">Perfil</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Suas informações pessoais
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {/* Avatar */}
            <div className="mb-6 flex flex-col items-center sm:flex-row sm:items-start sm:gap-5">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-400 sm:h-24 sm:w-24 sm:text-3xl">
                {firstName?.[0]?.toUpperCase()}{lastName?.[0]?.toUpperCase()}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:mt-0">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100">
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
                <p className="text-xs text-slate-400">JPG ou PNG. Máximo 2MB.</p>
              </div>
            </div>

            {/* Campos */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Sobrenome</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Seu sobrenome"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* Botão */}
            <div className="mt-6 flex justify-end">
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800">
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
      </div>
    </div>
  );
}

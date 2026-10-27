import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Gerenciador de Vida" },
      { name: "description", content: "Entre com e-mail ou Google para acessar seus dados." },
      { property: "og:title", content: "Entrar — Gerenciador de Vida" },
      { property: "og:description", content: "Entre com e-mail ou Google para acessar seus dados." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function emailAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth` },
          });
    setBusy(false);
    if (res.error) {
      setError(
        res.error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : res.error.message.includes("not confirmed")
            ? "Confirme seu e-mail pelo link enviado antes de entrar."
            : `Não foi possível continuar: ${res.error.message}`,
      );
      return;
    }
    if (mode === "up" && !res.data.session)
      setInfo("Conta criada! Abra o link enviado ao seu e-mail para confirmar e depois entre.");
  }

  async function signIn() {
    // Checa antes de redirecionar: o Supabase devolve uma página de erro crua se o Google estiver desligado.
    const url = import.meta.env["VITE_SUPABASE_URL"];
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    try {
      const s = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then((r) => r.json());
      if (!s?.external?.google) {
        setError("O login com Google ainda não foi ativado. Use e-mail e senha.");
        return;
      }
    } catch {
      /* segue para o fluxo normal */
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      setBusy(false);
      setError(
        error.message.includes("not enabled")
          ? "O login com Google ainda não foi ativado no Supabase."
          : `Não foi possível entrar: ${error.message}`,
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src="/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl" />
        <div>
          <h1 className="text-2xl font-semibold">Gerenciador de Vida</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para acessar suas finanças, negócio, rotina e treinos em qualquer aparelho.
          </p>
        </div>
        <form onSubmit={emailAuth} className="space-y-3 text-left">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border bg-secondary px-3"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border bg-secondary px-3"
          />
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="text-sm text-primary underline"
        >
          {mode === "in" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
        {info && <p className="text-sm text-primary">{info}</p>}
        <Button variant="outline" className="w-full" size="lg" onClick={signIn} disabled={busy}>
          {busy ? "Aguarde…" : "Entrar com Google"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}

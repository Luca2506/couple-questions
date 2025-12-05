"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";

type Question = {
  id: string;
  question_date: string;
  text: string;
};

export default function HomePage() {
  // Auth-Status
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Advent-Tür / Frage
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [qaMessage, setQaMessage] = useState<string | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);

  // Session laden + Listener
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        setSession(data.session);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Frage laden, sobald eingeloggt
  useEffect(() => {
    if (!session?.user) return;

    async function loadQuestion() {
      setLoadingQuestion(true);
      setQaMessage(null);
      setQuestion(null);
      setDoorOpen(false);

      const today = new Date().toISOString().slice(0, 10);

      const { data: qData, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("question_date", today)
        .maybeSingle();

      if (qError) {
        setQaMessage("Fehler beim Laden der Frage: " + qError.message);
        setLoadingQuestion(false);
        return;
      }

      if (!qData) {
        setQaMessage("Für heute ist noch keine Frage hinterlegt. 🕯️");
        setLoadingQuestion(false);
        return;
      }

      setQuestion(qData as Question);
      setLoadingQuestion(false);
    }

    loadQuestion();
  }, [session]);

  // Auth absenden
  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthMessage(null);
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        setAuthMessage(
          "Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte Postfach prüfen und danach einloggen. ♡"
        );
        setAuthMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        setAuthMessage("Login erfolgreich. Willkommen zurück. 🖤");
      }
    } catch (err: any) {
      setAuthMessage(err.message ?? "Unbekannter Fehler");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setQuestion(null);
    setQaMessage(null);
    setDoorOpen(false);
  }

  // Aktueller Tag (für Adventszahl)
  const currentDay =
    question?.question_date
      ?.split("-")
      ?.at(2)
      ?.replace(/^0/, "") ?? new Date().getDate().toString();

  // 1) Nicht eingeloggt → Login wie bisher
  if (!session?.user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-fuchsia-500 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-indigo-500 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md rounded-3xl border border-fuchsia-500/40 bg-slate-950/80 shadow-[0_0_40px_rgba(236,72,153,0.4)] backdrop-blur-xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-300/80">
                for us two only
              </p>
              <h1 className="text-2xl font-semibold text-slate-50 flex items-center gap-2">
                <span>Gothic Q&A</span>
                <span className="text-fuchsia-300 text-xl">♡</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Kleine Fragen, große Emotionen – nur ihr zwei.
              </p>
            </div>
            <div className="rounded-full border border-fuchsia-400/60 bg-slate-900/80 px-3 py-1 text-[11px] text-fuchsia-200 shadow-lg shadow-fuchsia-500/40">
              Day <span className="font-semibold">∞</span>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-200">E-Mail</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400"
                placeholder="deine@mail.de"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-200">Passwort</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400"
                placeholder="Mind. 6 Zeichen"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 hover:from-fuchsia-400 hover:via-pink-400 hover:to-violet-400 disabled:opacity-60 disabled:cursor-not-allowed py-2.5 text-sm font-medium text-white shadow-lg shadow-fuchsia-500/40 transition-all"
            >
              {authLoading
                ? "Bitte warten…"
                : authMode === "signup"
                ? "Konto erstellen ♡"
                : "Einloggen ♡"}
            </button>
          </form>

          <button
            type="button"
            className="w-full text-xs text-slate-300 hover:text-fuchsia-200 transition flex items-center justify-center gap-1"
            onClick={() =>
              setAuthMode(authMode === "signup" ? "login" : "signup")
            }
          >
            {authMode === "signup"
              ? "Schon ein Konto? Hier einloggen"
              : "Noch kein Konto? Hier registrieren"}
            <span className="text-fuchsia-300">↺</span>
          </button>

          {authMessage && (
            <p className="text-xs text-fuchsia-200 whitespace-pre-wrap border border-fuchsia-500/40 rounded-2xl bg-slate-950/60 px-3 py-2">
              {authMessage}
            </p>
          )}

          <p className="text-[10px] text-slate-500 text-center">
            made for us • keep it secret, keep it cute
          </p>
        </div>
      </main>
    );
  }

  // 2) Eingeloggt → Adventstür mit heutiger Frage
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-10 left-4 h-40 w-40 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-32 right-10 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute bottom-0 -right-10 h-52 w-52 rounded-full bg-indigo-500 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl rounded-3xl border border-fuchsia-500/40 bg-slate-950/85 shadow-[0_0_45px_rgba(236,72,153,0.5)] backdrop-blur-xl p-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/60 bg-slate-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-200">
              <span>advent door</span>
              <span className="text-[11px]">✦</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-50 mt-2 flex items-center gap-2">
              <span>Heutige Tür</span>
              <span className="text-fuchsia-300 text-xl">♡</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Eingeloggt als{" "}
              <span className="font-medium text-fuchsia-200">
                {session.user?.email}
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] px-3 py-1.5 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-900 hover:border-fuchsia-400 hover:text-fuchsia-100 transition"
          >
            Logout
          </button>
        </header>

        {loadingQuestion && (
          <p className="text-sm text-slate-300">Lade Tür & Frage…</p>
        )}

        {!loadingQuestion && !question && (
          <p className="text-sm text-slate-300">
            {qaMessage ?? "Heute ist keine Frage hinterlegt. 🕯️"}
          </p>
        )}

        {!loadingQuestion && question && (
          <>
            {/* Adventstür */}
            <section className="flex flex-col items-center gap-4">
              <div className="relative w-56 h-72 md:w-64 md:h-80">
                {/* Tür-Hintergrund (Frage) */}
                <div
                  className={`absolute inset-0 rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-4 flex flex-col items-center justify-center text-center transition-opacity duration-500 ${
                    doorOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Frage des Tages
                  </p>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {question.text}
                  </p>
                </div>

                {/* Tür-Front */}
                <button
                  type="button"
                  onClick={() => setDoorOpen(true)}
                  className={`absolute inset-0 rounded-3xl border border-fuchsia-500/60 bg-gradient-to-br from-fuchsia-700 via-slate-900 to-purple-800 shadow-[0_0_35px_rgba(236,72,153,0.6)] flex flex-col items-center justify-center text-center transition-all duration-500 ${
                    doorOpen
                      ? "opacity-0 translate-y-2 scale-95 pointer-events-none"
                      : "opacity-100 translate-y-0 scale-100"
                  }`}
                >
                  <span className="text-xs uppercase tracking-[0.25em] text-fuchsia-200/80 mb-2">
                    Tür des Tages
                  </span>
                  <span className="text-6xl md:text-7xl font-bold text-slate-50 drop-shadow-[0_0_20px_rgba(15,23,42,0.9)]">
                    {currentDay}
                  </span>
                  <span className="mt-3 text-[11px] text-fuchsia-100">
                    Tippe, um die Tür zu öffnen ✧
                  </span>
                </button>
              </div>

              {/* Hinweis unter der Tür */}
              <p className="text-[11px] text-slate-400 text-center max-w-sm">
                Erst Tür öffnen, zusammen die Frage lesen – und danach unten auf{" "}
                <span className="text-fuchsia-300 font-semibold">
                  „Beantworten“
                </span>{" "}
                gehen, um eure Antworten zu schreiben.
              </p>
            </section>

            {/* Button "Beantworten" */}
            <section className="flex flex-col items-center gap-2 pt-2">
              <Link
                href="/answer"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 hover:from-fuchsia-400 hover:via-pink-400 hover:to-violet-400 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-fuchsia-500/40 transition-all disabled:opacity-60"
              >
                Beantworten ✍️
              </Link>
              {qaMessage && (
                <p className="text-[11px] text-fuchsia-200 whitespace-pre-wrap text-center">
                  {qaMessage}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

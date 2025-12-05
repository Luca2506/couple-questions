"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

type Question = {
  id: string;
  question_date: string;
  text: string;
};

type Answer = {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
};

export default function HomePage() {
  // Auth-Status
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Frage & Antworten
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);
  const [partnerAnswer, setPartnerAnswer] = useState<Answer | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [qaMessage, setQaMessage] = useState<string | null>(null);

  // Beim Start: Session laden & Listener setzen
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

  // Wenn Session da ist → Frage des Tages laden
  useEffect(() => {
    const user = session?.user;
    if (!user) return;

    const userId = user.id;

    async function loadQuestion() {
      setLoadingQuestion(true);
      setQaMessage(null);
      setQuestion(null);
      setMyAnswer(null);
      setPartnerAnswer(null);

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
        setQaMessage("Für heute ist noch keine Frage hinterlegt.");
        setLoadingQuestion(false);
        return;
      }

      const q = qData as Question;
      setQuestion(q);

      const { data: aData, error: aError } = await supabase
        .from("answers")
        .select("*")
        .eq("question_id", q.id);

      if (aError) {
        setQaMessage("Fehler beim Laden der Antworten: " + aError.message);
        setLoadingQuestion(false);
        return;
      }

      const answers = (aData || []) as Answer[];
      const mine = answers.find((a) => a.user_id === userId) || null;
      const partner = answers.find((a) => a.user_id !== userId) || null;

      setMyAnswer(mine);
      setPartnerAnswer(partner);
      setAnswerText(mine ? mine.answer_text : "");

      setLoadingQuestion(false);
    }

    loadQuestion();
  }, [session]);

  // Auth-Formular absenden
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

  // Antwort speichern
  async function handleAnswerSubmit(e: FormEvent) {
    e.preventDefault();
    setQaMessage(null);

    const user = session?.user;
    if (!user || !question) {
      setQaMessage("Kein User oder keine Frage geladen.");
      return;
    }

    const userId = user.id;
    const text = answerText.trim();
    if (!text) {
      setQaMessage("Bitte gib eine Antwort ein. ✨");
      return;
    }

    const { data, error } = await supabase
      .from("answers")
      .upsert(
        {
          question_id: question.id,
          user_id: userId,
          answer_text: text,
        },
        { onConflict: "question_id,user_id" }
      )
      .select()
      .single();

    if (error) {
      setQaMessage("Fehler beim Speichern: " + error.message);
      return;
    }

    const saved = data as Answer;
    setMyAnswer(saved);
    setQaMessage("Antwort gespeichert. ♡");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setQuestion(null);
    setMyAnswer(null);
    setPartnerAnswer(null);
    setAnswerText("");
    setQaMessage(null);
  }

  // 1) Nicht eingeloggt → Auth-Formular
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

          <div className="flex items-center gap-2 text-[11px] text-slate-400 border border-dashed border-slate-700/70 rounded-2xl px-3 py-2 bg-slate-950/70">
            <span className="text-fuchsia-300">✦</span>
            <p>
              Am besten jede*r macht sein eigenes Konto – ihr beantwortet
              dieselbe Frage und seht dann beide Antworten nebeneinander.
            </p>
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

  // 2) Eingeloggt → Frage des Tages
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-10 left-4 h-40 w-40 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-32 right-10 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute bottom-0 -right-10 h-52 w-52 rounded-full bg-indigo-500 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl rounded-3xl border border-fuchsia-500/40 bg-slate-950/85 shadow-[0_0_45px_rgba(236,72,153,0.5)] backdrop-blur-xl p-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/60 bg-slate-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-200">
              <span>couple ritual</span>
              <span className="text-[11px]">✦</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-50 mt-2 flex items-center gap-2">
              <span>Frage des Tages</span>
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
          <p className="text-sm text-slate-300">Lade Frage…</p>
        )}

        {!loadingQuestion && !question && (
          <p className="text-sm text-slate-300">
            {qaMessage ?? "Heute ist keine Frage hinterlegt. 🕯️"}
          </p>
        )}

        {!loadingQuestion && question && (
          <>
            <section className="space-y-3 border border-slate-800/80 rounded-2xl bg-slate-950/70 px-4 py-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="text-fuchsia-300">✶</span>
                  {question.question_date}
                </span>
                <span className="text-slate-500">just for you two</span>
              </div>
              <p className="text-lg font-medium text-slate-50">
                {question.text}
              </p>
            </section>

            <section className="space-y-3">
              <form
                onSubmit={handleAnswerSubmit}
                className="space-y-2 border border-slate-800/80 rounded-2xl bg-slate-950/70 px-4 py-3"
              >
                <label className="text-xs text-slate-200 flex items-center gap-1">
                  <span>Deine Antwort</span>
                  <span className="text-fuchsia-300 text-xs">✧</span>
                </label>
                <textarea
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400 resize-y"
                  placeholder="Schreib auf, was dir wirklich durch den Kopf geht…"
                />
                <div className="flex items-center justify-between gap-3 mt-1">
                  <p className="text-[11px] text-slate-500">
                    Ihr könnt unabhängig voneinander antworten und danach
                    vergleichen. 🕯️
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 hover:from-fuchsia-400 hover:via-pink-400 hover:to-violet-400 px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-fuchsia-500/40 transition-all"
                  >
                    Antwort speichern
                  </button>
                </div>
              </form>
            </section>

            <section className="space-y-3 border-t border-slate-800/80 pt-3">
              <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span className="h-px w-6 bg-slate-600" />
                <span>Antwort-Übersicht</span>
                <span className="h-px w-6 bg-slate-600" />
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-fuchsia-500/40 bg-slate-950/80 p-3 shadow-[0_0_25px_rgba(236,72,153,0.25)]">
                  <p className="text-[11px] font-semibold text-fuchsia-200 mb-1 flex items-center gap-1">
                    <span>Du</span>
                    <span className="text-[12px]">♡</span>
                  </p>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {myAnswer
                      ? myAnswer.answer_text
                      : "Noch nichts beantwortet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3">
                  <p className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <span>Dein Gegenüber</span>
                    <span className="text-[12px] text-fuchsia-300">✧</span>
                  </p>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {partnerAnswer
                      ? partnerAnswer.answer_text
                      : "Noch keine Antwort von der anderen Person."}
                  </p>
                </div>
              </div>
            </section>

            {qaMessage && (
              <p className="text-xs text-fuchsia-200 whitespace-pre-wrap">
                {qaMessage}
              </p>
            )}

            <p className="text-[10px] text-slate-500 text-center pt-1">
              stay soft • stay spooky • stay in love
            </p>
          </>
        )}
      </div>
    </main>
  );
}

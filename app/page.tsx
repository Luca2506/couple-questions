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
          "Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte Postfach prüfen und danach einloggen."
        );
        setAuthMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        setAuthMessage("Login erfolgreich.");
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
      setQaMessage("Bitte gib eine Antwort ein.");
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
    setQaMessage("Antwort gespeichert.");
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
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 shadow-2xl backdrop-blur-sm p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              {authMode === "signup" ? "Konto anlegen" : "Einloggen"}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Kleine Q&A-App nur für euch zwei.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">E-Mail</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="deine@mail.de"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">Passwort</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Mind. 6 Zeichen"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed py-2 text-sm font-medium text-white transition-colors"
            >
              {authLoading
                ? "Bitte warten..."
                : authMode === "signup"
                ? "Konto erstellen"
                : "Einloggen"}
            </button>
          </form>

          <button
            type="button"
            className="w-full text-sm text-slate-300 hover:text-white transition"
            onClick={() =>
              setAuthMode(authMode === "signup" ? "login" : "signup")
            }
          >
            {authMode === "signup"
              ? "Schon ein Konto? Hier einloggen"
              : "Noch kein Konto? Hier registrieren"}
          </button>

          {authMessage && (
            <p className="text-sm text-amber-300 whitespace-pre-wrap">
              {authMessage}
            </p>
          )}
        </div>
      </main>
    );
  }

  // 2) Eingeloggt → Frage des Tages
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/80 shadow-2xl backdrop-blur-sm p-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Frage des Tages
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Eingeloggt als{" "}
              <span className="font-medium text-slate-200">
                {session.user?.email}
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
          >
            Logout
          </button>
        </header>

        {loadingQuestion && (
          <p className="text-sm text-slate-300">Lade Frage…</p>
        )}

        {!loadingQuestion && !question && (
          <p className="text-sm text-slate-300">
            {qaMessage ?? "Heute ist keine Frage hinterlegt."}
          </p>
        )}

        {!loadingQuestion && question && (
          <>
            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {question.question_date}
              </p>
              <p className="text-lg font-medium text-slate-50">
                {question.text}
              </p>
            </section>

            <section className="space-y-3">
              <form onSubmit={handleAnswerSubmit} className="space-y-2">
                <label className="text-sm text-slate-200">
                  Deine Antwort
                </label>
                <textarea
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  placeholder="Schreib auf, was dir wirklich durch den Kopf geht…"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-400 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  Antwort speichern
                </button>
              </form>
            </section>

            <section className="space-y-2 border-t border-slate-800 pt-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Übersicht
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    Deine Antwort
                  </p>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {myAnswer
                      ? myAnswer.answer_text
                      : "Noch nichts beantwortet."}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    Antwort deines Gegenübers
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
              <p className="text-xs text-amber-300 whitespace-pre-wrap">
                {qaMessage}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

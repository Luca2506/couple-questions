"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";

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

export default function AnswerPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);
  const [partnerAnswer, setPartnerAnswer] = useState<Answer | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [qaMessage, setQaMessage] = useState<string | null>(null);

  // Session laden
  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setQaMessage("Fehler beim Session-Check: " + error.message);
        return;
      }
      if (!data.session) {
        router.push("/");
        return;
      }
      setSession(data.session);
    }
    init();
  }, [router]);

  // Frage + Antworten laden
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
        setQaMessage("Für heute ist noch keine Frage hinterlegt. 🕯️");
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
    router.push("/");
  }

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
              <span>answer mode</span>
              <span className="text-[11px]">✧</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-50 mt-2 flex items-center gap-2">
              <span>Antworten</span>
              <span className="text-fuchsia-300 text-xl">♡</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Eingeloggt als{" "}
              <span className="font-medium text-fuchsia-200">
                {session?.user?.email}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[11px] px-3 py-1.5 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-900 hover:border-fuchsia-400 hover:text-fuchsia-100 transition"
            >
              Zur Tür
            </Link>
            <button
              onClick={handleLogout}
              className="text-[11px] px-3 py-1.5 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-900 hover:border-fuchsia-400 hover:text-fuchsia-100 transition"
            >
              Logout
            </button>
          </div>
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
                <span className="text-slate-500">Frage des Tages</span>
              </div>
              <p className="text-sm text-slate-100 whitespace-pre-wrap">
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
                  <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">
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
                  <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">
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

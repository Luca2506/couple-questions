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

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Wenn Session da ist → Frage des Tages laden
  useEffect(() => {
    if (!session?.user) return;

    async function loadQuestion() {
      setLoadingQuestion(true);
      setQaMessage(null);
      setQuestion(null);
      setMyAnswer(null);
      setPartnerAnswer(null);

      const userId = session.user.id;

      // Heutiges Datum im Format YYYY-MM-DD
      const today = new Date().toISOString().slice(0, 10);

      // 1. Frage für heute holen
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

      // 2. Antworten zu dieser Frage holen
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

    if (!session?.user || !question) {
      setQaMessage("Kein User oder keine Frage geladen.");
      return;
    }

    const userId = session.user.id;
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
      <main
        style={{
          maxWidth: 400,
          margin: "40px auto",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>
          {authMode === "signup" ? "Registrieren" : "Einloggen"}
        </h1>

        <form
          onSubmit={handleAuthSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <input
            type="email"
            placeholder="E-Mail"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            required
            style={{ padding: 8 }}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            required
            style={{ padding: 8 }}
          />

          <button type="submit" disabled={authLoading} style={{ padding: 8 }}>
            {authLoading
              ? "Bitte warten..."
              : authMode === "signup"
              ? "Konto anlegen"
              : "Login"}
          </button>
        </form>

        <button
          style={{ marginTop: 12 }}
          onClick={() =>
            setAuthMode(authMode === "signup" ? "login" : "signup")
          }
        >
          {authMode === "signup"
            ? "Schon ein Konto? Hier einloggen"
            : "Noch kein Konto? Hier registrieren"}
        </button>

        {authMessage && (
          <p style={{ marginTop: 12, whiteSpace: "pre-wrap", color: "darkred" }}>
            {authMessage}
          </p>
        )}
      </main>
    );
  }

  // 2) Eingeloggt → Frage des Tages
  return (
    <main
      style={{
        maxWidth: 700,
        margin: "20px auto",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: 16,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1>Frage des Tages</h1>
          <p style={{ fontSize: 14, opacity: 0.7 }}>
            Eingeloggt als {session.user.email}
          </p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </header>

      {loadingQuestion && <p>Lade Frage...</p>}

      {!loadingQuestion && !question && (
        <p>{qaMessage ?? "Heute ist keine Frage hinterlegt."}</p>
      )}

      {!loadingQuestion && question && (
        <>
          <section style={{ marginBottom: 24 }}>
            <p>
              <strong>Datum:</strong> {question.question_date}
            </p>
            <p style={{ fontSize: 18, marginTop: 8 }}>{question.text}</p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <form
              onSubmit={handleAnswerSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <label>Deine Antwort:</label>
              <textarea
                rows={4}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                style={{ padding: 8, resize: "vertical" }}
              />
              <button type="submit">Antwort speichern</button>
            </form>
          </section>

          <section>
            <h2>Übersicht</h2>
            <p>
              <strong>Deine Antwort:</strong>{" "}
              {myAnswer ? myAnswer.answer_text : "Noch nichts beantwortet."}
            </p>
            <p>
              <strong>Antwort deines Gegenübers:</strong>{" "}
              {partnerAnswer
                ? partnerAnswer.answer_text
                : "Noch keine Antwort von der anderen Person."}
            </p>
          </section>

          {qaMessage && (
            <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{qaMessage}</p>
          )}
        </>
      )}
    </main>
  );
}

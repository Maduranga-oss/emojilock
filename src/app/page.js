"use client";

import { useEffect, useMemo, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Page() {
  const [puzzle, setPuzzle] = useState(null);         // { day, emojis, equations, token, attemptCap, hard }
  const [vals, setVals] = useState([1, 2, 3]);        // current guess digits
  const [rows, setRows] = useState([]);               // [[ "ok"|"up"|"down", ... ], ...]
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState("idle");       // "idle" | "win" | "lose"
  const [loading, setLoading] = useState(false);

  // Ready the Mini App SDK & load today's puzzle
  useEffect(() => {
    sdk.actions.ready().catch(() => {});
    loadPuzzle();
  }, []);

  async function loadPuzzle() {
    try {
      const res = await fetch("/api/puzzle", { cache: "no-store" });
      const j = await res.json();
      setPuzzle(j);
      setVals([1, 2, 3]);
      setRows([]);
      setAttemptsUsed(0);
      setStreak(0);
      setStatus("idle");
    } catch (e) {
      console.error(e);
    }
  }

  const remaining = useMemo(() => {
    if (!puzzle) return 0;
    return Math.max(0, puzzle.attemptCap - attemptsUsed);
  }, [puzzle, attemptsUsed]);

  function setDigit(i, v) {
    const next = [...vals];
    next[i] = Number(v);
    setVals(next);
  }

  function shake() {
    if (typeof document === "undefined") return;
    document.body.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 180, iterations: 1 }
    );
  }

  async function submit() {
    if (!puzzle || loading) return;

    // client-side guard: 3 distinct digits 1–9
    if (new Set(vals).size !== 3 || vals.some((n) => n < 1 || n > 9)) {
      shake();
      try { await sdk.haptics.notificationOccurred?.("warning"); } catch {}
      return;
    }

    setLoading(true);
    try {
      const res = await sdk.quickAuth.fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: puzzle.token, guess: vals }),
      });
      const j = await res.json();

      if (!res.ok) {
        console.error(j?.error || "guess error");
        try { await sdk.haptics.notificationOccurred?.("error"); } catch {}
        return;
      }

      setRows((r) => [...r, j.hints]);
      setAttemptsUsed(j.attemptsUsed ?? attemptsUsed);

      if (j.correct) {
        setStatus("win");
        setStreak(j.streak || 0);
        try { await sdk.haptics.notificationOccurred?.("success"); } catch {}
      } else {
        try { await sdk.haptics.notificationOccurred?.("warning"); } catch {}
        const used = j.attemptsUsed ?? attemptsUsed;
        if (used >= puzzle.attemptCap) setStatus("lose");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!puzzle) return;
    const result =
      status === "win"
        ? `WON ${rows.length}/${puzzle.attemptCap}`
        : status === "lose"
        ? `LOST ${rows.length}/${puzzle.attemptCap}`
        : `${rows.length}/${puzzle.attemptCap}`;

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_DOMAIN;

    try {
      const imgRes = await fetch("/api/share-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, streak, rows }),
      });
      const blob = await imgRes.blob();
      const file = new File([blob], "emojilock.png", { type: "image/png" });
      await sdk.actions.composeCast({
        text: `EmojiLock — ${result} · Streak ${streak}. Play:`,
        embeds: [origin],
        attachments: [file],
      });
    } catch (e) {
      console.error(e);
    }
  }

  function resetGuess() {
    setVals([1, 2, 3]);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: 16,
        display: "grid",
        gap: 16,
        background: "#0B0B0B",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>EmojiLock</div>
        <div style={{ opacity: 0.8 }}>
          {puzzle?.day || ""} UTC {puzzle?.hard ? "· Hard" : ""}
        </div>
      </header>

      {/* Loading skeleton */}
      {!puzzle ? (
        <section
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 12,
            height: 180,
            background:
              "linear-gradient(90deg, #0b0b0b 0%, #111 50%, #0b0b0b 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s infinite",
          }}
        />
      ) : (
        <>
          {/* Equations */}
          <section
            style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Equations</div>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {puzzle.equations.map((eq, i) => (
                <li key={i} style={{ margin: "6px 0" }}>
                  {eq.terms.map((t, k) => (
                    <span key={k}>
                      {k > 0
                        ? eq.op
                          ? eq.op[k - 1] === "×"
                            ? " × "
                            : " + "
                          : " + "
                        : ""}
                      {puzzle.emojis[t]}
                    </span>
                  ))}
                  <span>
                    {" "}
                    = <b>{eq.result}</b>
                  </span>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Digits are 1–9 and all three must be <b>distinct</b>. Attempts:{" "}
              {attemptsUsed}/{puzzle.attemptCap}
            </div>
          </section>

          {/* Input / Controls */}
          <section
            style={{
              border: "1px solid #333",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              Enter code for: {puzzle.emojis.join("")}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <DigitSelect
                  key={i}
                  value={vals[i]}
                  onChange={(v) => setDigit(i, v)}
                  taken={vals.filter((_, idx) => idx !== i)}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={submit}
                disabled={loading || status !== "idle"}
                style={btn}
                aria-label="Submit guess"
              >
                {loading ? "Submitting…" : "Submit"}
              </button>
              <button onClick={share} style={btnGhost} aria-label="Share result">
                Share
              </button>
              <button
                onClick={resetGuess}
                style={btnGhost}
                aria-label="Reset guess"
              >
                Clear
              </button>
              <button onClick={loadPuzzle} style={btnGhost} aria-label="Refresh">
                Refresh
              </button>
            </div>

            {status === "win" && (
              <div style={{ color: "#9be28a" }}>
                🎉 Unlocked! Streak {streak}.
              </div>
            )}
            {status === "lose" && (
              <div style={{ color: "#e89b9b" }}>
                ⏳ Out of attempts. Try again tomorrow.
              </div>
            )}
            {status === "idle" && (
              <div style={{ opacity: 0.7 }}>Tries left: {remaining}</div>
            )}
          </section>

          {/* Attempts log */}
          <section
            style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Attempts</div>
            {rows.length === 0 && (
              <div style={{ opacity: 0.7 }}>No attempts yet.</div>
            )}
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {rows.map((r, i) => (
                <li key={i} style={{ margin: "6px 0" }}>
                  {r.map((h, j) => (
                    <span key={j} style={{ marginRight: 8 }}>
                      {h === "ok" ? "✓" : h === "up" ? "↑" : "↓"}
                    </span>
                  ))}
                </li>
              ))}
            </ol>
          </section>

          {/* Footer */}
          <footer style={{ textAlign: "center", opacity: 0.7, fontSize: 12 }}>
            New puzzle at 00:00 UTC. Play inside the Farcaster app to save your
            streak.
          </footer>
        </>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </main>
  );
}

/** Digit dropdown with taken-state disabling & accessible labeling */
function DigitSelect({ value, onChange, taken }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8, textAlign: "center" }}>
        Digit
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: "#111",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: 12,
          padding: "10px 12px",
          minWidth: 80,
        }}
      >
        {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (
          <option key={n} value={n} disabled={taken.includes(n)}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

const btn = {
  background: "#8A63D2",
  color: "#fff",
  border: 0,
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 700,
  minWidth: 120,
};
const btnGhost = {
  background: "transparent",
  color: "#fff",
  border: "1px solid #444",
  padding: "10px 14px",
  borderRadius: 12,
  minWidth: 100,
};

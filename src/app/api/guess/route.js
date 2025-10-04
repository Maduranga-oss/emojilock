// src/app/api/guess/route.js
import { NextResponse } from 'next/server';
import { getFidOrNull } from '@/src/lib/auth';         // note the path; adjust if your alias differs
import { dayUTC, signToken, deriveSolution } from '@/src/lib/crypto';
import { equationsFor, hintsFor } from '@/src/lib/game';
import { getAttempts, incrAttempts, rateLimit, markWin, bumpStreak } from '@/src/lib/redis';

export async function POST(req) {
  try {
    const fid = await getFidOrNull(req); // may be null on web/preview
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0';
    const rlKey = fid ? `rl:guess:${fid}` : `rl:guess:ip:${ip}`;

    const okRL = await rateLimit(rlKey, Number(process.env.RATE_MAX || 30), Number(process.env.RATE_WINDOW_SEC || 60));
    if (!okRL) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const { token, guess } = body;
    if (!token || !Array.isArray(guess) || guess.length !== 3) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const day = dayUTC();
    const { a, b, c } = deriveSolution(day);
    const expected = signToken(day, a, b, c);
    if (expected !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

    const [ga, gb, gc] = guess.map(Number);
    const distinct = new Set(guess).size === 3;
    const inRange = [ga, gb, gc].every(n => Number.isInteger(n) && n >= 1 && n <= 9);
    if (!distinct || !inRange) return NextResponse.json({ error: 'Digits 1–9, distinct' }, { status: 400 });

    const attemptCap = Number(process.env.ATTEMPT_CAP || 5);
    const used = fid ? (await getAttempts(day, fid)) : 0;

    if (fid && used >= attemptCap) {
      const hints = hintsFor({ a, b, c }, [ga, gb, gc], equationsFor(a, b, c));
      return NextResponse.json({ ok: true, hints, correct: false, attemptsUsed: used });
    }

    const equations = equationsFor(a, b, c);
    const hints = hintsFor({ a, b, c }, [ga, gb, gc], equations);
    const correct = ga === a && gb === b && gc === c;

    let attemptsUsed = fid ? await incrAttempts(day, fid) : (used + 1);

    if (correct) {
      if (fid) {
        await markWin(day, fid);
        const streak = await bumpStreak(fid, day);
        return NextResponse.json({ ok: true, hints, correct: true, attemptsUsed, streak });
      }
      return NextResponse.json({ ok: true, hints, correct: true, attemptsUsed, streak: 0, anonymous: true });
    }

    return NextResponse.json({ ok: true, hints, correct: false, attemptsUsed, anonymous: !fid });
  } catch (e) {
    console.error('/api/guess error:', e?.message || e);
    // Return a readable 400/401 instead of a raw 500 where possible
    const msg = String(e?.message || e);
    const status = /token|auth|jwt/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

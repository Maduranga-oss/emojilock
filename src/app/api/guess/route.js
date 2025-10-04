import { NextResponse } from 'next/server';
import { requireFid } from '@/lib/auth';
import { dayUTC, signToken, deriveSolution } from '@/lib/crypto';
import { equationsFor, hintsFor } from '@/lib/game';
import { getAttempts, incrAttempts, rateLimit, markWin, bumpStreak } from '@/lib/redis';


export async function POST(req) {
try {
const fid = await requireFid(req); // streaks require sign-in


const rl = await rateLimit(`rl:guess:${fid}`, Number(process.env.RATE_MAX||30), Number(process.env.RATE_WINDOW_SEC||60));
if (!rl) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });


const body = await req.json();
const { token, guess } = body || {};
if (!token || !Array.isArray(guess) || guess.length !== 3) return NextResponse.json({ error:'Bad request' }, { status:400 });


const day = dayUTC();
const { a,b,c } = deriveSolution(day);
const expected = signToken(day, a,b,c);
if (expected !== token) return NextResponse.json({ error:'Invalid token' }, { status:400 });


const attemptCap = Number(process.env.ATTEMPT_CAP || 5);
const used = await getAttempts(day, fid);
if (used >= attemptCap) {
// Already out of attempts
const equations = equationsFor(a,b,c);
const hints = hintsFor({a,b,c}, guess, equations); // still return hints to keep UX consistent
return NextResponse.json({ ok:true, hints, correct:false, attemptsUsed: used });
}


const [ga,gb,gc] = guess.map(Number);
const distinct = new Set(guess).size === 3;
const inRange = [ga,gb,gc].every(n => Number.isInteger(n) && n>=1 && n<=9);
if (!distinct || !inRange) return NextResponse.json({ error:'Digits 1–9, distinct' }, { status:400 });


const equations = equationsFor(a,b,c);
const hints = hintsFor({a,b,c}, guess, equations);


const correct = (ga===a && gb===b && gc===c);
const attemptsUsed = await incrAttempts(day, fid);


if (correct) {
await markWin(day, fid);
const streak = await bumpStreak(fid, day);
return NextResponse.json({ ok:true, hints, correct:true, attemptsUsed, streak });
}


return NextResponse.json({ ok:true, hints, correct:false, attemptsUsed });
} catch (e) {
const msg = e?.message || 'error';
const code = msg.includes('Missing token') ? 401 : 500;
return NextResponse.json({ error: msg }, { status: code });
}
}
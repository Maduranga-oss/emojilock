import { NextResponse } from 'next/server';
import { dayUTC, deriveSolution, signToken } from '@/lib/crypto';
import { equationsFor } from '@/lib/game';


// Hard day example: every Wednesday add multiplicative hint
function isHardDay() {
const d = new Date();
const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
return dow === 3; // Wednesday
}


export async function GET() {
const day = dayUTC();
const hard = isHardDay();
const { a,b,c, emojis } = deriveSolution(day);
const equations = equationsFor(a,b,c, hard);
const token = signToken(day, a,b,c);
const attemptCap = Number(process.env.ATTEMPT_CAP || 5);
return NextResponse.json({ day, emojis, equations, token, attemptCap, hard });
}
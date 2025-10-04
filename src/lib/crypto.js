import crypto from 'crypto';


export function dayUTC() { return new Date().toISOString().slice(0,10); }


function hmacBuf(input) {
const key = process.env.EMOJI_SECRET || 'dev-secret';
return crypto.createHmac('sha256', key).update(input).digest();
}


export function deriveSolution(day) {
// Pick 3 distinct digits 1..9 and 3 emojis deterministically from HMAC(day)
const digest = hmacBuf(day);
const digits = pickDistinctFromBytes(digest, 9, 3, 1); // 1..9
const [a,b,c] = digits;
const EMOJIS = ["🍇","🍋","🍒","🍉","🍊","🍎","🥝","🍑","🍍","🍓","🥥","🍐","🍌","🥕","🌶️","🥨","🧊","🥚","🧀","🍔","🥟","🍪"];
const emojiIdx = pickDistinctFromBytes(digest.subarray(8), EMOJIS.length, 3, 0);
const chosen = emojiIdx.map(i => EMOJIS[i]);
return { a, b, c, emojis: chosen };
}


export function signToken(day, a, b, c) {
const key = process.env.EMOJI_SECRET || 'dev-secret';
const msg = `${day}|${a}${b}${c}`;
return crypto.createHmac('sha256', key).update(msg).digest('base64url');
}


function pickDistinctFromBytes(bytes, base, count, min=0) {
const out = [];
for (let i=0; i<bytes.length && out.length<count; i++) {
const v = (bytes[i] % base) + min;
if (!out.includes(v)) out.push(v);
}
return out;
}
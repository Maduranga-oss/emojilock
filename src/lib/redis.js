import { Redis } from '@upstash/redis';


const redis = new Redis({
url: process.env.UPSTASH_REDIS_REST_URL,
token: process.env.UPSTASH_REDIS_REST_TOKEN
});


export async function rateLimit(key, max, windowSec) {
const now = Math.floor(Date.now()/1000);
const bucket = `${key}:${Math.floor(now/windowSec)}`;
const n = await redis.incr(bucket);
if (n === 1) await redis.expire(bucket, windowSec);
return n <= max;
}


export async function getAttempts(day, fid) {
return Number(await redis.get(`el:attempts:${day}:${fid}`)) || 0;
}
export async function incrAttempts(day, fid) {
const k = `el:attempts:${day}:${fid}`;
const n = await redis.incr(k);
await redis.expire(k, 60*60*48);
return n;
}
export async function markWin(day, fid) {
await redis.set(`el:win:${day}:${fid}`, 1, { ex: 60*60*48 });
}
export async function getStreak(fid) {
return (await redis.get(`el:streak:${fid}`)) || { lastDay: null, streak: 0 };
}
export async function bumpStreak(fid, day) {
const cur = await getStreak(fid);
let streak = 1;
if (cur.lastDay) {
const prev = new Date(cur.lastDay);
const next = new Date(prev.getTime() + 86400000);
const curDay = new Date(day + 'T00:00:00Z');
if (next.toISOString().slice(0,10) === curDay.toISOString().slice(0,10)) {
streak = (cur.streak || 0) + 1;
}
}
await redis.set(`el:streak:${fid}`, { lastDay: day, streak }, { ex: 60*60*24*90 });
return streak;
}
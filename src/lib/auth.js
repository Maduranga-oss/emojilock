// src/lib/auth.js
import { createClient } from '@farcaster/quick-auth';
const qa = createClient();

export async function requireFid(req) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) throw new Error('Missing token');
  const token = auth.split(' ')[1];

  // Must be the bare hostname (no scheme/path)
  const domain =
    process.env.NEXT_PUBLIC_APP_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/+$/, '') ||
    new URL(req.url).hostname;

  const { sub: fid } = await qa.verifyJwt({ token, domain });
  return Number(fid);
}

// NEW: return null instead of throwing, so app still responds (no streaks)
export async function getFidOrNull(req) {
  try {
    return await requireFid(req);
  } catch (e) {
    console.error('QuickAuth verify failed:', e?.message || e);
    return null;
  }
}

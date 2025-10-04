import { createClient } from '@farcaster/quick-auth';
const qa = createClient();


export async function requireFid(req) {
const auth = req.headers.get('authorization');
if (!auth?.startsWith('Bearer ')) throw new Error('Missing token');
const token = auth.split(' ')[1];
const domain = process.env.NEXT_PUBLIC_APP_DOMAIN?.replace(/^https?:\/\//,'')
|| new URL(req.url).hostname;
const { sub: fid } = await qa.verifyJwt({ token, domain });
return Number(fid);
}
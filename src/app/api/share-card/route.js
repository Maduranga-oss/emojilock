export const runtime = 'edge';
import { ImageResponse } from 'next/og';


export async function POST(req) {
const { result = 'X/5', streak = 0, rows = [] } = await req.json();
const glyph = (h) => h==='ok' ? '✓' : (h==='up' ? '↑' : '↓');
const blocks = rows.flat();
return new ImageResponse(
(
<div style={{ width:1200, height:630, background:'#0B0B0B', color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
<div style={{ fontSize:72, fontWeight:800 }}>EmojiLock</div>
<div style={{ marginTop:8, fontSize:36 }}>Result: {result} · Streak: {streak}</div>
<div style={{ marginTop:24, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
{blocks.map((h,i)=> (
<div key={i} style={{ width:120, height:120, borderRadius:16, border:'2px solid #333', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>
{glyph(h)}
</div>
))}
</div>
</div>
),
{ width:1200, height:630 }
);
}
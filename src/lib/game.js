export function equationsFor(a,b,c, hard=false) {
if (!hard) {
return [
{ terms:[0,0,2], result: 2*a + c },
{ terms:[0,1], result: a + b },
{ terms:[1,2], result: b + c }
];
}
// Hard mode: add a fourth equation with a small multiply or subtraction
return [
{ terms:[0,2,2], op:['+','+'], result: a + c + c },
{ terms:[0,1], op:['+'], result: a + b },
{ terms:[1,2], op:['+'], result: b + c },
{ terms:[1,0], op:['×'], result: b * a } // one multiplicative hint
];
}


export function hintsFor(solution, guess, equations) {
const [ga,gb,gc] = guess;
const [a,b,c] = [solution.a, solution.b, solution.c];
function evalEq(eq, va, vb, vc) {
// For our forms we only need + or ×, order matches terms
let v = valueOf(eq.terms[0], va, vb, vc);
for (let i=1;i<eq.terms.length;i++) {
const op = eq.op ? eq.op[i-1] : '+';
const val = valueOf(eq.terms[i], va, vb, vc);
v = op === '×' ? (v * val) : (v + val);
}
return v;
}
function valueOf(t, va,vb,vc) { return t===0?va : t===1?vb : vc; }
return equations.map(eq => {
const trial = evalEq(eq, ga,gb,gc);
if (trial === eq.result) return 'ok';
return trial < eq.result ? 'up' : 'down';
});
}
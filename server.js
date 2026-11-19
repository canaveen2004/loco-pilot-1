// Loco Pilot TN backend: login, career save, leaderboard, AI Control proxy
const express=require('express'),fs=require('fs'),path=require('path');
const app=express();app.use(express.json({limit:'20kb'}));
app.use((q,s,n)=>{s.set('Access-Control-Allow-Origin','*');s.set('Access-Control-Allow-Headers','Content-Type');s.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');q.method=='OPTIONS'?s.sendStatus(204):n()});
const F=path.join(__dirname,'data.json');let D={players:{}};try{D=JSON.parse(fs.readFileSync(F))}catch(e){}
const save=()=>fs.writeFile(F,JSON.stringify(D),()=>{});
const nm=s=>String(s||'').trim().slice(0,20).replace(/[^\p{L}\p{N} _-]/gu,'');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,+v||a));
app.post('/api/login',(q,s)=>{const n=nm(q.body.name);if(!n)return s.status(400).json({error:'name'});
 const p=D.players[n]||(D.players[n]={name:n,age:21,r:0,gen:1,best:0,duties:0,total:0});save();s.json(p)});
app.post('/api/progress',(q,s)=>{const b=q.body,p=D.players[nm(b.name)];if(!p)return s.status(404).json({error:'login first'});
 Object.assign(p,{age:clamp(b.age,21,60),r:clamp(b.r,0,6),gen:clamp(b.gen,1,999)});
 const sc=clamp(b.score,0,100);p.best=Math.max(p.best,sc);p.duties++;p.total+=sc;save();s.json(p)});
app.get('/api/leaderboard',(q,s)=>s.json(Object.values(D.players).sort((a,b)=>b.best-a.best||b.total-a.total).slice(0,10).map(p=>({name:p.name,best:p.best,r:p.r,gen:p.gen,duties:p.duties}))));
// AI Control: key stays on the server (set ANTHROPIC_API_KEY)
app.post('/api/control',async(q,s)=>{const k=process.env.ANTHROPIC_API_KEY;if(!k)return s.status(503).json({error:'no key'});
 try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01'},
  body:JSON.stringify({model:'claude-sonnet-5-5',max_tokens:300,messages:[{role:'user',content:String(q.body.prompt||'').slice(0,2000)}]})});
  const j=await r.json();s.json({text:(j.content||[]).map(c=>c.text||'').join('')})}catch(e){s.status(502).json({error:'ai'})}});
app.use(express.static(path.join(__dirname,'public')));
app.listen(process.env.PORT||3000,()=>console.log('Loco Pilot server running'));

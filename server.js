'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 10000);
const TOKEN = process.env.ANF_RELAY_TOKEN || '';
const MAX_BODY = 64 * 1024;
const rooms = new Map();
function send(res, code, obj, type='application/json; charset=utf-8') {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, {'Content-Type':type,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'}); res.end(body);
}
function validRoom(s){ return typeof s==='string' && /^[a-zA-Z0-9_-]{1,48}$/.test(s); }
function cleanData(d){
  if(!d || typeof d!=='object') return null;
  const n=(x)=>Number.isFinite(Number(x))?Number(x):0;
  return {seq:n(d.seq),t:n(d.t),ok:!!d.ok,countsOk:!!d.countsOk,status:String(d.status||'unknown').slice(0,24),name:String(d.name||'ANF Player').slice(0,24),acc:n(d.acc),perfect:n(d.perfect),early:n(d.early),late:n(d.late),miss:n(d.miss),overload:n(d.overload),receivedAt:Date.now()};
}
function handler(req,res){
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-ANF-Token'});return res.end();}
  const u=new URL(req.url,'http://localhost');
  if(req.method==='GET' && u.pathname==='/health') return send(res,200,{ok:true,service:'ANFOverlay relay',time:Date.now()});
  if(req.method==='GET' && u.pathname==='/overlay'){
    const file=path.join(__dirname,'overlay.html'); return send(res,200,fs.readFileSync(file,'utf8'),'text/html; charset=utf-8');
  }
  if(req.method==='POST' && u.pathname==='/api/state'){
    if(!TOKEN || req.headers['x-anf-token']!==TOKEN) return send(res,401,{ok:false,error:'unauthorized'});
    let body=''; req.on('data',chunk=>{body+=chunk;if(body.length>MAX_BODY){send(res,413,{ok:false,error:'too_large'});req.destroy();}});
    req.on('end',()=>{try{
      const x=JSON.parse(body); if(!validRoom(x.room)) return send(res,400,{ok:false,error:'invalid_room'});
      if(x.slot!=='A' && x.slot!=='B') return send(res,400,{ok:false,error:'invalid_slot'});
      const data=cleanData(x.data); if(!data) return send(res,400,{ok:false,error:'invalid_data'});
      if(!rooms.has(x.room)) rooms.set(x.room,{A:null,B:null}); rooms.get(x.room)[x.slot]=data;
      return send(res,200,{ok:true,room:x.room,slot:x.slot,receivedAt:data.receivedAt});
    }catch(e){return send(res,400,{ok:false,error:'invalid_json'});}}); return;
  }
  if(req.method==='GET' && u.pathname==='/api/state'){
    const room=u.searchParams.get('room')||''; if(!validRoom(room)) return send(res,400,{ok:false,error:'invalid_room'});
    const r=rooms.get(room)||{A:null,B:null}; const now=Date.now();
    const player=(p)=>p?Object.assign({},p,{stale:now-p.receivedAt>5000}):null;
    return send(res,200,{ok:true,room,players:{A:player(r.A),B:player(r.B)},serverTime:now});
  }
  return send(res,404,{ok:false,error:'not_found'});
}
if(require.main===module){
 if(!TOKEN) console.warn('WARNING: ANF_RELAY_TOKEN is not set; POST /api/state will reject all uploads.');
 http.createServer(handler).listen(PORT,'0.0.0.0',()=>console.log(`ANFOverlay relay listening on 0.0.0.0:${PORT}`));
}
module.exports={handler,cleanData,validRoom};

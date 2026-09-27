const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Store, id, hashPassword, verifyPassword } = require('./store');

async function startServer({ dataDir, port = 0, publicHost = '127.0.0.1' } = {}) {
  const store = new Store(dataDir);
  store.seed();
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  const upload = multer({ dest: path.join(dataDir, 'tmp') });
  fs.mkdirSync(path.join(dataDir, 'tmp'), { recursive: true });

  const sessions = new Map();
  const sessionUser = (req) => sessions.get(req.headers.authorization?.replace(/^Bearer /,'') || '');
  const auth = (req, res, next) => { const u = sessionUser(req); if (!u) return res.status(401).json({error:'Session invalide'}); req.user=u; next(); };
  const can = (req, roles) => roles.includes(req.user.role) || req.user.role === 'ADMIN';
  const audit = (action, entity, entityId, user, extra={}) => store.insert('events', { id:id(), at:new Date().toISOString(), action, entity, entityId, userId:user?.id||null, userName:user?.name||'Système', ...extra });

  app.get('/api/health', (_,res)=>res.json({ok:true, version:'5.0.0'}));
  app.post('/api/auth/login', (req,res)=>{
    const { username, password } = req.body || {};
    const u = store.find('users', x => x.username === username && x.active !== false);
    if (!u || !verifyPassword(password || '', u.salt, u.hash)) return res.status(401).json({error:'Identifiant ou mot de passe incorrect'});
    const token = id(); sessions.set(token, { id:u.id, username:u.username, name:u.name, role:u.role });
    audit('LOGIN','USER',u.id,{id:u.id,name:u.name});
    res.json({ token, user:sessions.get(token) });
  });
  app.post('/api/auth/logout', auth, (req,res)=>{ for (const [t,u] of sessions) if (u.id===req.user.id) sessions.delete(t); res.json({ok:true}); });
  app.get('/api/me', auth, (req,res)=>res.json(req.user));

  app.get('/api/settings', auth, (_,res)=>res.json({settings:store.db.settings, types:store.db.settingsTypes}));
  app.put('/api/settings', auth, (req,res)=>{ if (!can(req,['ADMIN'])) return res.status(403).json({error:'Accès refusé'}); store.db.settings={...store.db.settings,...req.body}; store.save(); res.json(store.db.settings); });
  app.post('/api/settings/types', auth, (req,res)=>{ if (!can(req,['ADMIN'])) return res.status(403).json({error:'Accès refusé'}); const x={id:id(),active:true,...req.body}; store.db.settingsTypes.push(x); store.save(); res.json(x); });
  app.put('/api/settings/types/:id', auth, (req,res)=>{ if (!can(req,['ADMIN'])) return res.status(403).json({error:'Accès refusé'}); const x=store.update('settingsTypes',req.params.id,req.body); res.json(x); });

  app.get('/api/users', auth, (req,res)=>{ if (!can(req,['ADMIN'])) return res.status(403).json({error:'Accès refusé'}); res.json(store.db.users.map(({salt,hash,...u})=>u)); });
  app.post('/api/users', auth, (req,res)=>{ if (!can(req,['ADMIN'])) return res.status(403).json({error:'Accès refusé'}); const {username,password,name,role='TECHNICIEN'}=req.body; if (!username||!password) return res.status(400).json({error:'Utilisateur et mot de passe requis'}); const hp=hashPassword(password); const u={id:id(),username,name,role,salt:hp.salt,hash:hp.hash,active:true,createdAt:new Date().toISOString()}; store.db.users.push(u); store.save(); const {salt,hash,...safe}=u; res.json(safe); });
  app.put('/api/users/:id', auth, (req,res)=>{ if (!can(req,['ADMIN'])) return res.status(403).json({error:'Accès refusé'}); const patch={...req.body}; if (patch.password){const hp=hashPassword(patch.password); patch.salt=hp.salt; patch.hash=hp.hash; delete patch.password;} const u=store.update('users',req.params.id,patch); const {salt,hash,...safe}=u; res.json(safe); });

  const crud = (route, collection, roles=['ADMIN','RESPONSABLE','RECEPTION','TECHNICIEN','MAGASINIER','COMPTA']) => {
    app.get(`/api/${route}`, auth, (req,res)=>res.json(store.list(collection)));
    app.post(`/api/${route}`, auth, (req,res)=>{ if (!can(req,roles)) return res.status(403).json({error:'Accès refusé'}); const x={id:id(),createdAt:new Date().toISOString(),createdBy:req.user.id,...req.body}; store.insert(collection,x); audit('CREATE',collection,x.id,req.user); res.json(x); });
    app.put(`/api/${route}/:id`, auth, (req,res)=>{ if (!can(req,roles)) return res.status(403).json({error:'Accès refusé'}); const x=store.find(collection,y=>y.id===req.params.id); if(!x) return res.status(404).json({error:'Introuvable'}); if(x.status==='CLOTURE') return res.status(409).json({error:'Document clôturé, modification interdite'}); const y=store.update(collection,req.params.id,req.body); audit('UPDATE',collection,y.id,req.user); res.json(y); });
  };

  crud('clients','clients',['ADMIN','RESPONSABLE','RECEPTION']);
  crud('vehicles','vehicles',['ADMIN','RESPONSABLE','RECEPTION','TECHNICIEN']);
  crud('suppliers','suppliers',['ADMIN','RESPONSABLE','MAGASINIER']);
  crud('stock','stock',['ADMIN','RESPONSABLE','MAGASINIER','TECHNICIEN']);
  crud('labor-rates','laborRates',['ADMIN','RESPONSABLE']);

  function docNumber(kind, nature='VENTE') {
    const type = store.db.settingsTypes.find(t=>t.module===kind && t.nature===nature && t.active!==false);
    return store.nextNumber(kind.toLowerCase(), type?.prefix || kind);
  }

  app.get('/api/documents', auth, (req,res)=>{
    let docs=store.db.documents;
    if(req.query.module) docs=docs.filter(d=>d.module===req.query.module);
    if(req.query.nature) docs=docs.filter(d=>d.nature===req.query.nature);
    res.json(docs);
  });
  app.post('/api/documents', auth, (req,res)=>{
    const module=req.body.module; const nature=req.body.nature||'VENTE';
    if(!['DEVIS','OR','BC','RECEPTION','FACTURE'].includes(module)) return res.status(400).json({error:'Module invalide'});
    const x={id:id(),module,nature,status:'BROUILLON',number:req.body.number||docNumber(module,nature),createdAt:new Date().toISOString(),createdBy:req.user.id,lines:[],...req.body};
    store.db.documents.push(x); store.save(); audit('CREATE',module,x.id,req.user); res.json(x);
  });
  app.put('/api/documents/:id', auth, (req,res)=>{
    const x=store.find('documents',d=>d.id===req.params.id); if(!x)return res.status(404).json({error:'Document introuvable'});
    if(x.status==='CLOTURE') return res.status(409).json({error:'Document clôturé, modification interdite'});
    const y=store.update('documents',x.id,req.body); audit('UPDATE',x.module,x.id,req.user); res.json(y);
  });
  app.post('/api/documents/:id/close', auth, (req,res)=>{
    const x=store.find('documents',d=>d.id===req.params.id); if(!x)return res.status(404).json({error:'Document introuvable'});
    if(x.status==='CLOTURE') return res.status(409).json({error:'Déjà clôturé'});
    const y=store.update('documents',x.id,{status:'CLOTURE',closedAt:new Date().toISOString(),closedBy:req.user.id}); audit('CLOSE',x.module,x.id,req.user); res.json(y);
  });

  // Lookup pièces/MO automatique
  app.get('/api/lookups/stock/:ref', auth, (req,res)=>{ const x=store.find('stock',s=>String(s.reference).toUpperCase()===String(req.params.ref).toUpperCase()); if(!x)return res.status(404).json({error:'Référence non trouvée'}); res.json(x); });
  app.get('/api/lookups/labor/:ref', auth, (req,res)=>{ const x=store.find('laborRates',s=>String(s.code).toUpperCase()===String(req.params.ref).toUpperCase()); if(!x)return res.status(404).json({error:'Tarif MO non trouvé'}); res.json(x); });

  // BC depuis OR
  app.post('/api/or/:orId/create-po', auth, (req,res)=>{
    const or=store.find('documents',d=>d.id===req.params.orId && d.module==='OR'); if(!or)return res.status(404).json({error:'OR introuvable'});
    if(or.status==='CLOTURE') return res.status(409).json({error:'OR clôturé'});
    const lines=(or.lines||[]).filter(l=>l.kind==='PIECE').map(l=>({...l,qtyOrdered:l.qty||1,qtyReceived:0}));
    const po={id:id(),module:'BC',nature:or.nature,status:'BROUILLON',number:docNumber('BC',or.nature),orId:or.id,clientId:or.clientId,vehicleId:or.vehicleId,supplierId:req.body.supplierId||'',lines,createdAt:new Date().toISOString(),createdBy:req.user.id};
    store.db.documents.push(po); store.save(); audit('CREATE','BC',po.id,req.user,{linkedOrId:or.id}); res.json(po);
  });

  // Réception : met à jour le stock puis lie au BC et OR
  app.post('/api/bc/:bcId/receive', auth, (req,res)=>{
    const bc=store.find('documents',d=>d.id===req.params.bcId && d.module==='BC'); if(!bc)return res.status(404).json({error:'BC introuvable'});
    if(bc.status==='CLOTURE') return res.status(409).json({error:'BC clôturé'});
    const rec={id:id(),module:'RECEPTION',nature:bc.nature,status:'CLOTURE',number:docNumber('RECEPTION',bc.nature),bcId:bc.id,orId:bc.orId,lines:[],createdAt:new Date().toISOString(),createdBy:req.user.id};
    for(const item of (req.body.lines||[])){
      const line=bc.lines.find(l=>l.id===item.lineId);
      if(!line) continue;
      const qty=Math.max(0,Number(item.qtyReceived||0));
      line.qtyReceived=(line.qtyReceived||0)+qty;
      rec.lines.push({lineId:line.id,reference:line.reference,designation:line.designation,qtyReceived:qty});
      if(qty>0){ const s=store.find('stock',z=>z.reference===line.reference); if(s) store.update('stock',s.id,{quantity:Number(s.quantity||0)+qty}); }
    }
    bc.status=bc.lines.length && bc.lines.every(l=>(l.qtyReceived||0)>=(l.qtyOrdered||l.qty||0)) ? 'RECEPTIONNE' : 'PARTIEL';
    store.db.documents.push(rec); store.save(); audit('RECEIVE','BC',bc.id,req.user,{receptionId:rec.id});
    res.json({bc,reception:rec});
  });

  // Pièces jointes
  app.get('/api/attachments', auth, (req,res)=>{ let a=store.db.attachments; if(req.query.entityId)a=a.filter(x=>x.entityId===req.query.entityId); res.json(a); });
  app.post('/api/attachments', auth, upload.single('file'), (req,res)=>{
    if(!req.file)return res.status(400).json({error:'Fichier manquant'});
    const ext=path.extname(req.file.originalname); const safe=`${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`; const final=path.join(store.attachmentsDir,safe); fs.renameSync(req.file.path,final);
    const a={id:id(),number:store.nextNumber('attachment','DOC'),entityType:req.body.entityType,entityId:req.body.entityId,type:req.body.type||'DOCUMENT',name:req.file.originalname,mime:req.file.mimetype,size:req.file.size,fileName:safe,comment:req.body.comment||'',createdAt:new Date().toISOString(),createdBy:req.user.id}; store.db.attachments.push(a); store.save(); audit('ATTACH','ATTACHMENT',a.id,req.user,{entityId:a.entityId}); res.json(a);
  });
  app.get('/api/attachments/:id/download', auth, (req,res)=>{ const a=store.find('attachments',x=>x.id===req.params.id); if(!a)return res.status(404).end(); res.download(path.join(store.attachmentsDir,a.fileName),a.name); });
  app.delete('/api/attachments/:id', auth, (req,res)=>{ const a=store.find('attachments',x=>x.id===req.params.id); if(!a)return res.status(404).end(); if(!can(req,['ADMIN','RESPONSABLE']))return res.status(403).json({error:'Accès refusé'}); try{fs.unlinkSync(path.join(store.attachmentsDir,a.fileName))}catch{} store.remove('attachments',a.id); res.json({ok:true}); });

  // Communications
  app.get('/api/communications', auth, (req,res)=>{ let a=store.db.communications; if(req.query.entityId)a=a.filter(x=>x.entityId===req.query.entityId); res.json(a); });
  app.post('/api/communications', auth, (req,res)=>{ const c={id:id(),number:store.nextNumber('communication','COM'),createdAt:new Date().toISOString(),createdBy:req.user.id,...req.body}; store.insert('communications',c); res.json(c); });

  // Dashboard
  app.get('/api/dashboard', auth, (req,res)=>{
    const docs=store.db.documents;
    const period=req.query.period||'month';
    const now=new Date(); const start=new Date(now.getFullYear(), period==='year'?0:now.getMonth(), 1).getTime();
    const inPeriod=docs.filter(d=>d.createdAt && new Date(d.createdAt).getTime()>=start);
    const money=(d)=>Number(d.totalTTC||d.totalHt||0);
    const sum=(arr,nature)=>arr.filter(d=>d.module==='FACTURE'&&d.status==='CLOTURE'&&(!nature||d.nature===nature)).reduce((a,d)=>a+money(d),0);
    res.json({sales:sum(inPeriod,'VENTE'), cessions:sum(inPeriod,'CESSION'), invoices:inPeriod.filter(d=>d.module==='FACTURE').length, devis:inPeriod.filter(d=>d.module==='DEVIS').length, orOpen:docs.filter(d=>d.module==='OR'&&d.status!=='CLOTURE').length, stockLow:store.db.stock.filter(s=>Number(s.quantity||0)<=Number(s.min||0)).length, recent:docs.slice(-10).reverse()});
  });

  const server=http.createServer(app);
  await new Promise(resolve=>server.listen(port, publicHost, resolve));
  const address=server.address();
  const actualPort=typeof address==='object' ? address.port : port;
  return { app, server, baseUrl:`http://127.0.0.1:${actualPort}`, close:()=>new Promise(r=>server.close(r)), store };
}
module.exports = { startServer };

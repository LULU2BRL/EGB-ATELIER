const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.dbPath = path.join(dataDir, 'egb-db.json');
    this.attachmentsDir = path.join(dataDir, 'attachments');
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.mkdirSync(this.attachmentsDir, { recursive: true });
    this.db = this.load();
  }

  seed() {
    const now = new Date().toISOString();
    if (!this.db.meta) this.db.meta = { version: 1, createdAt: now, updatedAt: now };
    if (!this.db.settings) this.db.settings = {
      company: 'EGB MAINTENANCES ET SERVICES', phone: '78 99 80', address: '', email: '', ridet: '', tgc: 0.22,
      currency: 'XPF', logo: 'EGB_logo_bleu.png'
    };
    const ensure = (k, v) => { if (!Array.isArray(this.db[k])) this.db[k] = v; };
    ensure('users', []); ensure('clients', []); ensure('vehicles', []); ensure('documents', []);
    ensure('suppliers', []); ensure('stock', []); ensure('laborRates', []); ensure('attachments', []); ensure('communications', []); ensure('events', []); ensure('settingsTypes', []);
    if (!this.db.counters) this.db.counters = { client: 1, vehicle: 1, devis: 1, or: 1, po: 1, reception: 1, facture: 1, attachment: 1, communication: 1 };
    if (!this.db.users.some(u => u.username === 'admin')) {
      const { salt, hash } = hashPassword('admin');
      this.db.users.push({ id: id(), username: 'admin', name: 'Administrateur', role: 'ADMIN', salt, hash, active: true, createdAt: now });
    }
    if (!this.db.settingsTypes.length) {
      this.db.settingsTypes.push(
        { id:id(), module:'DEVIS', code:'VENTE', label:'Vente', nature:'VENTE', prefix:'DEV-V', active:true },
        { id:id(), module:'DEVIS', code:'CESSION', label:'Cession', nature:'CESSION', prefix:'DEV-C', active:true },
        { id:id(), module:'OR', code:'VENTE', label:'Vente', nature:'VENTE', prefix:'OR-V', active:true },
        { id:id(), module:'OR', code:'CESSION', label:'Cession', nature:'CESSION', prefix:'OR-C', active:true },
        { id:id(), module:'FACTURE', code:'VENTE', label:'Vente', nature:'VENTE', prefix:'FAC-V', active:true },
        { id:id(), module:'FACTURE', code:'CESSION', label:'Cession', nature:'CESSION', prefix:'FAC-C', active:true }
      );
    }
    this.save();
  }

  load() {
    try { return JSON.parse(fs.readFileSync(this.dbPath, 'utf8')); }
    catch { const db = {}; this.db = db; this.seed(); return db; }
  }

  save() {
    this.db.meta = this.db.meta || {};
    this.db.meta.updatedAt = new Date().toISOString();
    const tmp = `${this.dbPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2), 'utf8');
    fs.renameSync(tmp, this.dbPath);
  }

  nextNumber(type, prefix = '') {
    const n = this.db.counters[type] || 1;
    this.db.counters[type] = n + 1;
    const padded = String(n).padStart(6, '0');
    return `${prefix || type.toUpperCase()}-${padded}`;
  }

  find(collection, predicate) { return (this.db[collection] || []).find(predicate); }
  list(collection, filter) { const a = [...(this.db[collection] || [])]; return filter ? a.filter(filter) : a; }
  insert(collection, obj) { this.db[collection].push(obj); this.save(); return obj; }
  update(collection, idValue, patch) {
    const i = this.db[collection].findIndex(x => x.id === idValue);
    if (i < 0) return null;
    this.db[collection][i] = { ...this.db[collection][i], ...patch, updatedAt: new Date().toISOString() };
    this.save(); return this.db[collection][i];
  }
  remove(collection, idValue) {
    const i = this.db[collection].findIndex(x => x.id === idValue);
    if (i < 0) return false;
    this.db[collection].splice(i,1); this.save(); return true;
  }
}

function id() { return crypto.randomUUID(); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, expected) {
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
module.exports = { Store, id, hashPassword, verifyPassword };

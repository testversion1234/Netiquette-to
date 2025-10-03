// jc.js — Core (Firebase + Datenmodell). Keine Layout-Änderungen.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  getDatabase, ref, push, serverTimestamp, onChildAdded, onChildRemoved,
  onValue, set, update, remove, query, orderByChild, startAt, limitToLast, onDisconnect
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { FALLBACK_CONFIG } from './firebase-config.js';

// ===== Firebase Init =====
const app = initializeApp(FALLBACK_CONFIG);
const auth = getAuth(app);
const db = getDatabase(app);

let uid = null;
onAuthStateChanged(getAuth(), (u) => { if (u) uid = u.uid; });
signInAnonymously(auth).catch(console.error);

// ===== Profanity =====
const baseBanned = ["arsch","depp","blöd","idiot"];
let banned = new Set(baseBanned);
async function loadBanned() {
  try {
    const res = await fetch('./banned-words.txt');
    if (res.ok) {
      const t = await res.text();
      t.split(/\r?\n/).map(s=>s.trim().toLowerCase()).filter(Boolean).forEach(w=>banned.add(w));
    }
  } catch(_) {}
}
loadBanned();

function norm(s){
  return s.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}+/gu,'')
    .replace(/[@€$]/g,'a').replace(/[!1|]/g,'i')
    .replace(/3/g,'e').replace(/0/g,'o').replace(/7/g,'t');
}
function violates(text){
  const n = norm(text);
  for (const w of banned){
    const re = new RegExp(`(?<![a-z])${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![a-z])`,'i');
    if (re.test(n)) return true;
  }
  return false;
}

// ===== Public API =====
let roomId = null;
let presenceRef = null;
let scoreRef = null;
let messagesQuery = null;

export function currentUid(){ return uid; }
export function currentRoom(){ return roomId; }

export async function joinRoom(nick, room){
  if (!uid) throw new Error('Auth noch nicht bereit');
  await leaveRoom();

  roomId = room;
  // Presence
  presenceRef = ref(db, `rooms/${roomId}/presence/${uid}`);
  await set(presenceRef, { nick, ts: serverTimestamp() });
  onDisconnect(presenceRef).remove();

  // Score
  scoreRef = ref(db, `rooms/${roomId}/scores/${uid}`);
  await update(scoreRef, { nick, value: 0 });

  return true;
}

export async function leaveRoom(){
  try { if (presenceRef) await remove(presenceRef); } catch(_){}
  presenceRef = null; roomId = null; scoreRef = null; messagesQuery = null;
}

export function watchPresence(cb){
  return onValue(ref(db, `rooms/${roomId}/presence`), (snap)=>{
    cb(snap.val()||{});
  });
}

export function watchMessages(cbAdd, cbRemove){
  const since = Date.now() - (30*60*1000);
  messagesQuery = query(
    ref(db, `rooms/${roomId}/messages`),
    orderByChild('ts'),
    startAt(since),
    limitToLast(200)
  );
  const offAdd = onChildAdded(messagesQuery, (snap)=> cbAdd(snap.key, snap.val()));
  const offRem = onChildRemoved(messagesQuery, (snap)=> cbRemove(snap.key));
  return () => { try{offAdd();offRem();}catch(_){}};
}

export async function sendMessage(nick, rawText){
  if (!roomId) throw new Error('Kein Raum');
  const violated = violates(rawText);
  const text = violated ? '⛔️ [automatisch entfernt]' : rawText;

  await push(ref(db, `rooms/${roomId}/messages`), {
    uid, nick, text, violated, ts: Date.now()
  });

  if (violated) await adjustScore(-3);
  else await adjustScore(+1);

  return { violated };
}

export function watchScore(cb){
  return onValue(scoreRef, (snap)=> cb((snap.val() && snap.val().value) || 0));
}

async function adjustScore(delta){
  const v = await getScore();
  await update(scoreRef, { value: v + delta });
}

function getScore(){
  return new Promise(resolve=>{
    onValue(scoreRef, (s)=> resolve((s.val() && s.val().value) || 0), { onlyOnce:true });
  });
}

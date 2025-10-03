// === Firebase Init (muss GANZ oben stehen, vor jedem getDatabase/ref) ===
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { FALLBACK_CONFIG } from "./firebase-config.js";

if (!getApps().length) {
  initializeApp(FALLBACK_CONFIG);
  console.log("[Debug-Ausgabe]", "Firebase databaseURL:", FALLBACK_CONFIG.databaseURL);
  console.log("[chat] Firebase already inited");
}

// Danach (wie bei dir schon vorhanden):
import { getDatabase, ref, set, onValue, onDisconnect, remove, push, onChildAdded }
// Presence + Auto-Cleanup when last user leaves
import { getDatabase, ref, set, onValue, onDisconnect, remove }
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

export function setupPresenceAndAutoCleanup(roomId, nickname) {
  const db = getDatabase();
  const myPresenceRef  = ref(db, `rooms/${roomId}/online/${nickname}`);
  const onlineRef      = ref(db, `rooms/${roomId}/online`);
  const messagesRef    = ref(db, `rooms/${roomId}/messages`);

  // Set own presence and auto-remove on disconnect
  set(myPresenceRef, true);
  onDisconnect(myPresenceRef).remove();

  // Arm/disarm cleanup depending on whether I'm the only user
  let cleanupArmed = false;
  onValue(onlineRef, async (snap) => {
    const online = snap.val() || {};
    const names  = Object.keys(online);
    const iAmOnlyOne = (names.length === 1 && names[0] === nickname);

    if (iAmOnlyOne && !cleanupArmed) {
      await onDisconnect(messagesRef).remove(); // wipe messages when I leave
      cleanupArmed = True;
    } else if (!iAmOnlyOne && cleanupArmed) {
      await onDisconnect(messagesRef).cancel(); // disarm cleanup
      cleanupArmed = false;
    }
  });
}
// === PATCH END ===

// === CALL SITE (insert once where roomId and nick are known; e.g. after user joined)
// if (!window.__presenceSetup) { setupPresenceAndAutoCleanup(roomId, nick); window.__presenceSetup = true; }
// === END CALL SITE ===
// -----------------
// Moderationslisten
// -----------------
// Trage hier deine Wörter ein (nur in dieser Datei pflegen).
// Achte auf Kleinschreibung, die Prüfung ist case-insensitive.

const RUDE_WORDS = [
  // normale Beleidigungen (allgemein)
  // "beispiel1", "beispiel2"
];

const SEXISM_WORDS = [
  // sexistische / genderbezogene Begriffe
  // "beispiel3"
];

const RACISM_WORDS = [
  // rassistische / herkunftsbezogene Begriffe
  // "beispiel4"
];

// ---- Hilfsfunktionen ----
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const makeWordBoundaryRegex = (list) =>
  list.length ? new RegExp(`\\b(${list.map(escapeRx).join('|')})\\b`, 'i') : null;

const RX_RUDE   = makeWordBoundaryRegex(RUDE_WORDS);
const RX_SEXISM = makeWordBoundaryRegex(SEXISM_WORDS);
const RX_RACISM = makeWordBoundaryRegex(RACISM_WORDS);

/**
 * Prüft eine Nachricht und liefert Kategorie + Text fürs UI zurück.
 * return { blocked:false }  -> okay
 * return { blocked:true, reason:"Rassismus"|"Sexismus"|"Beleidigung" }
 */
export function checkMessageModeration(text) {
  if (!text) return { blocked: false };

  // Reihenfolge: erst schwere Kategorien
  if (RX_RACISM && RX_RACISM.test(text))  return { blocked: true, reason: "Rassismus" };
  if (RX_SEXISM && RX_SEXISM.test(text))  return { blocked: true, reason: "Sexismus" };
  if (RX_RUDE   && RX_RUDE.test(text))    return { blocked: true, reason: "Beleidigung" };

  return { blocked: false };
}// chatroom.js — verdrahtet DOM mit jc.js. Keine Layoutänderungen.
import { joinRoom, leaveRoom, watchPresence, watchMessages, sendMessage, watchScore, currentUid } from './jc.js';

// DOM refs (IDs müssen im bestehenden Layout vorhanden sein)
const nicknameEl = document.getElementById('nickname');
const roomSelectEl = document.getElementById('roomSelect');
const joinBtn = document.getElementById('joinBtn');
const roomNameEl = document.getElementById('roomName');
const presenceList = document.getElementById('presenceList');
const chatLogEl = document.getElementById('chatLog');
const msgEl = document.getElementById('message');
const sendBtn = document.getElementById('sendBtn');

let unwatchPresence = null;
let unwatchMessages = null;

// Join
joinBtn.addEventListener('click', async () => {
  const nick = (nicknameEl.value || 'Gast').trim();
  await ensureAnonSignIn(auth);
  // Präsenz/Auto-Cleanup EINMALIG aktivieren
if (!window.__presenceSetup) {
  setupPresenceAndAutoCleanup(roomId, nick);
  window.__presenceSetup = true;
}
  const room = (roomSelectEl.value || '5a');
  try {
    await joinRoom(nick, room);
    roomNameEl.textContent = room;
    msgEl.disabled = false; sendBtn.disabled = false; msgEl.focus();
    toast(`Raum „${room}“ beigetreten.`);

    // Presence
    if (unwatchPresence) unwatchPresence();
    unwatchPresence = watchPresence((data)=>{
      presenceList.innerHTML = '';
      Object.values(data).forEach((p)=>{
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nick || 'Gast'}</span><span>•</span>`;
        presenceList.appendChild(li);
      });
    });

    // Score UI
    const scoreEl = document.getElementById('scoreValue');
    watchScore(v => scoreEl.textContent = v);

    // Messages
    if (unwatchMessages) unwatchMessages();
    chatLogEl.innerHTML = '';
    unwatchMessages = watchMessages(renderMessage, removeMessage);
  } catch (e) {
    toast(e.message || 'Fehler beim Beitreten');
  }
});

sendBtn.addEventListener('click', doSend);
msgEl.addEventListener('keydown', (e)=> { if (e.key === 'Enter') doSend(); });

async function doSend(){
  const text = msgEl.value.trim();
  if (!text) return;
  const nick = (nicknameEl.value || 'Gast').trim();
  try {
    const { violated } = await sendMessage(nick, text);
    if (violated) toast('Verstoß erkannt: –3 Punkte, Nachricht ausgeblendet.');
    msgEl.value='';
  } catch(e){
    toast('Senden fehlgeschlagen.');
  }
}

function renderMessage(key, data){
  const el = document.createElement('div');
  el.className = 'msg' + (data.uid === currentUid() ? ' me' : '');
  const when = new Date(data.ts || Date.now()).toLocaleTimeString();
  el.innerHTML = `<div class="meta">${data.nick} · ${when}${data.violated ? ' · ⚠️ Verstoß' : ''}</div>
                  <div class="text"></div>`;
  el.querySelector('.text').textContent = data.text;
  el.dataset.key = key;
  chatLogEl.appendChild(el);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}
function removeMessage(key){
  const n = [...chatLogEl.children].find(c => c.dataset.key === key);
  if (n) n.remove();
}

// Toast helper
let toastTimer=null;
function toast(msg){
  let t = document.querySelector('.toast');
  if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}
import { getDatabase, ref, set, onValue, onDisconnect, remove }
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

function setupPresenceAndAutoCleanup(roomId, nickname) {
  const db = getDatabase();
  const myPresenceRef  = ref(db, `rooms/${roomId}/online/${nickname}`);
  const onlineRef      = ref(db, `rooms/${roomId}/online`);
  const messagesRef    = ref(db, `rooms/${roomId}/messages`);

  // Präsenz setzen und bei Disconnect löschen
  set(myPresenceRef, true);
  onDisconnect(myPresenceRef).remove();

  let cleanupArmed = false;
  onValue(onlineRef, async (snap) => {
    const online = snap.val() || {};
    const names  = Object.keys(online);
    const iAmOnlyOne = (names.length === 1 && names[0] === nickname);

    if (iAmOnlyOne && !cleanupArmed) {
      // Ich bin der letzte → beim Disconnect: Nachrichten löschen
      await onDisconnect(messagesRef).remove();
      cleanupArmed = true;
    } else if (!iAmOnlyOne && cleanupArmed) {
      // Nicht mehr alleine → Cleanup deaktivieren
      await onDisconnect(messagesRef).cancel();
      cleanupArmed = false;
    }
  });
}

// room_chat_logic_fixed.js – bindet room_chat.html an Realtime DB (jc.js)
import { joinRoom, watchMessages, sendMessage, watchScore } from './jc.js';

const qs = new URLSearchParams(location.search);
const room = (qs.get('room') || '5a').trim();
const nick = (qs.get('nick') || 'Gast').trim() || 'Gast';

const roomChip = document.getElementById('roomChip');
const nickChip = document.getElementById('nickChip');
if (roomChip) roomChip.textContent = room;
if (nickChip) nickChip.textContent = nick;

const messagesEl = document.getElementById('messages');
const scoreEl    = document.getElementById('score');
const input      = document.getElementById('msgInput');
const btn        = document.getElementById('sendBtn');

function render(key, v){
  const li = document.createElement('li');
  li.dataset.key = key;
  li.className = v.violated ? 'bad' : 'ok';
  li.innerHTML = `<strong>${(v.nick||v.user)||'?'}</strong>: ${v.text}`;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

(async function init(){
  await joinRoom(nick, room);
  watchMessages((key, v)=>render(key, v), (key)=>{
    const el = messagesEl.querySelector(`[data-key="${key}"]`);
    if (el) el.remove();
  });
  watchScore(v => { if (scoreEl) scoreEl.textContent = v; });
  if (btn && input){
    btn.disabled = false;
    btn.addEventListener('click', async ()=>{
      const t = input.value.trim();
      if (!t) return;
      await sendMessage(nick, t);
      input.value=''; input.focus();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
  }
})();
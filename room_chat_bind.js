// room_chat_bind.js — bind jc.js to room_chat.html DOM
import { joinRoom, watchMessages, sendMessage, watchScore, currentUid } from './jc.js';

function $(id){ return document.getElementById(id); }

// Read room & nick from URL (?room=5a&nick=Hans) or default
const qs = new URLSearchParams(location.search);
const room = (qs.get('room') || '5a').trim();
const nick = (qs.get('nick') || 'Gast').trim() || 'Gast';

// Show chips
const roomChip = $('roomChip');
const nickChip = $('nickChip');
if (roomChip) roomChip.textContent = room;
if (nickChip) nickChip.textContent = nick;

// Join the room, then wire UI
(async () => {
  try {
    await joinRoom(nick, room);

    // Score
    const scoreEl = $('score');
    if (scoreEl) watchScore(v => scoreEl.textContent = String(v));

    // Messages stream
    const list = $('messages');
    if (list) {
      // Clear current
      list.innerHTML = '';
      watchMessages((key, data) => {
        const el = document.createElement('div');
        el.className = 'msg';
        el.innerHTML = `
          <div class="who">${data.nick || '??'}</div>
          <div class="txt ${data.violated ? 'bad' : 'ok'}">${data.text || ''}</div>
          <div class="muted">${new Date(data.ts || Date.now()).toLocaleTimeString()}</div>
        `;
        list.appendChild(el);
        list.scrollTop = list.scrollHeight;
      });
    }

    // Send handler
    const input = $('text');
    const btn = $('send');
    if (btn && input) {
      btn.disabled = false;
      btn.addEventListener('click', async () => {
        const t = input.value.trim();
        if (!t) return;
        await sendMessage(nick, t);
        input.value = '';
        input.focus();
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    }
  } catch (e) {
    console.error('Bind failed:', e);
    alert('Chat-Initialisierung fehlgeschlagen: ' + (e?.message || e));
  }
})();
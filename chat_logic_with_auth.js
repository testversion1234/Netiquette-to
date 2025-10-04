// chat_logic_with_auth.js — nur Logik, kein Layout-Change
(function(){
  // === URL-Parameter ===
  const params = new URLSearchParams(location.search);
  const ROOM = (params.get('room') || '5a').trim();
  const NICK = (params.get('nick') || 'Gast').trim() || 'Gast';

  // === Firebase-Konfiguration laden ===
  if (!window.FIREBASE_CONFIG) {
    console.error('[Chat] window.FIREBASE_CONFIG fehlt. Binde firebase_config.js vor diesem Script ein.');
    return;
  }

  // === SDK-Prüfung und Init ===
  if (!window.firebase || !window.firebase.initializeApp) {
    console.error('[Chat] Firebase SDK (compat) nicht geladen. Bitte app-compat, database-compat und auth-compat einbinden.');
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);

  var db = firebase.database();
  var auth = firebase.auth();

  // === DOM-Elemente ===
  var chatEl = document.getElementById('chat');
  var msgEl  = document.getElementById('msg');
  var sendEl = document.getElementById('send');
  if (!chatEl || !msgEl || !sendEl) {
    console.error('[Chat] Erwartete Elemente #chat, #msg, #send wurden nicht gefunden.');
    return;
  }

  // === Pfad gem. deinen Regeln: /rooms/{room}/messages ===
  var roomRef = db.ref(['rooms', ROOM, 'messages'].join('/'));
  var currentUid = null;

  // === Anonyme Anmeldung (erforderlich wegen DB-Regeln mit auth.uid) ===
  function ensureAuth() {
    return auth.signInAnonymously().catch(function(err){
      console.error('[Chat] Anonyme Anmeldung fehlgeschlagen:', err);
      alert('Anmeldung fehlgeschlagen. Bitte Seite neu laden.');
      throw err;
    });
  }

  // === Listener erst aktivieren, wenn auth aktiv ist ===
  auth.onAuthStateChanged(function(user){
    if (!user) return;
    currentUid = user.uid;

    // Live-Listener
    chatEl.innerHTML = '';
    roomRef.off();
    roomRef.limitToLast(200).on('child_added', function(snap){
      var v = snap.val();
      if (!v) return;
      var p = document.createElement('p');
      var who = (v.user === NICK) ? '<strong>Du</strong>' : '<span>' + escapeHtml(v.user) + '</span>';
      p.className = 'msg';
      p.innerHTML = who + ': ' + linkify(escapeHtml(v.text));
      chatEl.appendChild(p);
      chatEl.scrollTop = chatEl.scrollHeight;
    });
  });

  // === Senden ===
  function sendNow(){
    var t = (msgEl.value || '').trim();
    if (!t || !currentUid) return;
    var msg = { user: NICK, text: t, ts: Date.now(), uid: currentUid };
    roomRef.push(msg).catch(function(err){
      alert('Senden fehlgeschlagen: ' + (err && err.message ? err.message : err));
    });
    msgEl.value = '';
    msgEl.focus();
  }
  sendEl.addEventListener('click', sendNow);
  msgEl.addEventListener('keydown', function(e){
    if (e.key === 'Enter') sendNow();
  });

  // === Optional: Raum leeren (einmalig) via ?reset=1 oder Konsole window.__resetRoom() ===
  function resetRoom() { return roomRef.set(null); }
  window.__resetRoom = resetRoom;
  if (params.get('reset') === '1') { resetRoom().catch(console.error); }

  // === Utils ===
  function escapeHtml(s){
    return s.replace(/[&<>\"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]);
    });
  }
  function linkify(s){
    return s.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  // Start: sicherstellen, dass Auth an ist
  ensureAuth();
  console.log('[Chat] Raum:', ROOM, '| Nick:', NICK);
})();
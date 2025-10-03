# MP · Klassenchat (Neuaufbau, Skript-only)
- **Layout/Logo/Board-Liste** bleiben wie bisher. Diese Dateien ersetzen nur die **Skripte**.
- Verwende deine bestehende `index.html` oder die beiliegende als Platzhalter.

## Dateien
- `jc.js` – Kernlogik (Firebase, Presence, Messages, Scores, Profanity)
- `chatroom.js` – Verdrahtet DOM-Elemente mit `jc.js` (IDs: nickname, roomSelect, joinBtn, roomName, presenceList, chatLog, message, sendBtn, scoreValue)
- `firebase-config.js` – Trage deine Web-App-Konfiguration ein
- `database.rules.json` – Realtime-DB-Regeln
- `banned-words.txt` – Liste der verbotenen Wörter (optional zusätzlich direkt in jc.js erweitern)

## Schnellstart
1. In Firebase Web-App anlegen und Config in `firebase-config.js` einfügen.
2. In Realtime Database → **Regeln** durch `database.rules.json` ersetzen und veröffentlichen.
3. In deiner bestehenden `index.html` sicherstellen, dass die IDs vorhanden sind.
4. Vor `</body>` einfügen:
   <script type="module" src="./firebase-config.js"></script>
   <script type="module" src="./jc.js"></script>
   <script type="module" src="./chatroom.js"></script>

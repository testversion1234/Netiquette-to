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

// Nur die Config exportieren, NICHT direkt initialisieren
// firebase-config.js — export only (no imports, no initialize here)
export const FALLBACK_CONFIG = {
  apiKey: "AIzaSyBK9iwsc9kpAW006Jmh197ToCSQbTk-X34",
  authDomain: "netiquette-74729.firebaseapp.com",
  databaseURL: "https://netiquette-74729-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "netiquette-74729",
  storageBucket: "netiquette-74729.appspot.com",
  messagingSenderId: "178454261761",
  appId: "1:178454261761:web:6f4bb26f0a3b39eb0a5000",
  measurementId: "G-HEVQ0TFE4Y"
  };

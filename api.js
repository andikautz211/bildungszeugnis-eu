// Gemeinsame Helfer: Aufruf der freigegebenen Datenbankfunktionen, Gerätekennung, Speicher
(function () {
  var C = window.CONFIG;
  function speicherLesen(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function speicherSchreiben(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  async function rpc(name, args) {
    var kopf = { 'Content-Type': 'application/json', 'apikey': C.SUPABASE_KEY };
    if (/^eyJ/.test(C.SUPABASE_KEY)) kopf['Authorization'] = 'Bearer ' + C.SUPABASE_KEY; // alter "anon"-Schlüssel
    var antwort;
    try {
      antwort = await fetch(C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
        method: 'POST', headers: kopf, body: JSON.stringify(args || {}), cache: 'no-store'
      });
    } catch (e) {
      throw new Error('Keine Verbindung. Bitte Internet prüfen und erneut versuchen.');
    }
    var daten = await antwort.json().catch(function () { return null; });
    if (!antwort.ok) throw new Error((daten && daten.message) || 'Der Server antwortet gerade nicht. Bitte später erneut versuchen.');
    return daten;
  }

  function geraet() {
    var id = speicherLesen('geraet');
    if (!/^[0-9a-f-]{36}$/.test(id || '')) {
      id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      }));
      speicherSchreiben('geraet', id);
    }
    return id;
  }

  // Kleiner DOM-Helfer: erzeugt Elemente, Text immer per textContent (kein HTML aus Daten)
  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text != null) e.textContent = text;
    return e;
  }

  document.querySelectorAll('[data-titel]').forEach(function (e) { e.textContent = C.TITEL; });
  document.querySelectorAll('[data-kontakt]').forEach(function (e) { e.textContent = C.KONTAKT; });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  window.APP = { rpc: rpc, geraet: geraet, el: el, lesen: speicherLesen, schreiben: speicherSchreiben };
})();

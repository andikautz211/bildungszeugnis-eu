(function () {
  var A = window.APP, el = A.el;
  var STUFEN = ['5', '6', '7', '8', '9', '10', 'EF', 'Q1', 'Q2'];
  var ANDERES = '__anderes__';
  var form = document.getElementById('meldeformular');
  var schule = document.getElementById('schule'), stufenBox = document.getElementById('stufen');
  var zug = document.getElementById('zug'), zugFeld = document.getElementById('zug-feld');
  var datum = document.getElementById('datum'), fach = document.getElementById('fach'), fachFrei = document.getElementById('fach-frei');
  var stundenBox = document.getElementById('stunden'), meldung = document.getElementById('meldung');
  var knopf = document.getElementById('absenden');
  var jeStunde = document.getElementById('je-stunde'), jeStundeFeld = document.getElementById('je-stunde-feld');
  var fachListe = document.getElementById('fach-liste');
  var FAECHER = [], fachJeStunde = {};
  var WEISS_NICHT = 'Sonstiges';
  var oberstufe = {};

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function zeigen(art, titel, punkte) {
    meldung.hidden = false;
    meldung.className = 'hinweis ' + art;
    meldung.replaceChildren(el('strong', null, titel));
    if (punkte && punkte.length) {
      var ul = el('ul');
      punkte.forEach(function (p) { ul.appendChild(el('li', null, p)); });
      meldung.appendChild(ul);
    }
    meldung.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function chip(name, wert, text, typ) {
    var l = el('label', 'chip'), i = el('input');
    i.type = typ || 'checkbox'; i.name = name; i.value = wert;
    l.append(i, el('span', null, text));
    return l;
  }
  function gewaehlteStufe() { var i = form.querySelector('input[name=stufe]:checked'); return i ? i.value : ''; }

  // Oberstufen-Knöpfe nur bei Schulen mit Oberstufe; Buchstabe nur für 5–10
  function anpassen() {
    var mitOS = !!oberstufe[schule.value];
    stufenBox.querySelectorAll('.chip').forEach(function (c) {
      var os = /^(EF|Q1|Q2)$/.test(c.firstChild.value);
      c.classList.toggle('aus', os && !mitOS);
      if (os && !mitOS) c.firstChild.checked = false;
    });
    zugFeld.hidden = /^(EF|Q1|Q2)$/.test(gewaehlteStufe());
  }

  STUFEN.forEach(function (s) { stufenBox.appendChild(chip('stufe', s, s, 'radio')); });
  stufenBox.addEventListener('change', anpassen);
  schule.addEventListener('change', anpassen);
  fach.addEventListener('change', function () {
    fachFrei.hidden = fach.value !== ANDERES;
    if (!fachFrei.hidden) fachFrei.focus();
  });

  // Fach je Stunde: bei mehreren Stunden kann jede Stunde ein eigenes Fach bekommen
  function gewaehlteStunden() {
    return Array.from(form.querySelectorAll('input[name=stunden]:checked')).map(function (i) { return +i.value; });
  }
  function jeStundeAufbauen() {
    var stunden = gewaehlteStunden();
    jeStundeFeld.hidden = stunden.length < 2;
    var an = jeStunde.checked && stunden.length >= 2;
    fachListe.hidden = !an;
    fach.hidden = an;
    fachFrei.hidden = an || fach.value !== ANDERES;
    if (!an) return;
    fachListe.replaceChildren();
    stunden.forEach(function (st) {
      var zeile = el('label', 'fach-zeile'), sel = el('select');
      sel.appendChild(el('option', null, 'Bitte wählen')); sel.firstChild.value = '';
      FAECHER.forEach(function (f) { sel.appendChild(el('option', null, f)); });
      var w = el('option', null, 'Weiß nicht / Sonstiges'); w.value = WEISS_NICHT; sel.appendChild(w);
      sel.value = fachJeStunde[st] || '';
      sel.addEventListener('change', function () { fachJeStunde[st] = sel.value; });
      zeile.append(el('span', null, st + '. Std.'), sel);
      fachListe.appendChild(zeile);
    });
  }
  stundenBox.addEventListener('change', jeStundeAufbauen);
  jeStunde.addEventListener('change', jeStundeAufbauen);

  // Formular aufbauen (Schulen, Fächer und Regeln kommen aus der Datenbank)
  A.rpc('formular_daten').then(function (d) {
    schule.replaceChildren(el('option', null, 'Bitte wählen'));
    schule.firstChild.value = '';
    d.schulen.forEach(function (s) {
      var o = el('option', null, s.name); o.value = s.kurz; schule.appendChild(o);
      oberstufe[s.kurz] = s.oberstufe;
    });
    fach.replaceChildren(el('option', null, 'Bitte wählen'));
    fach.firstChild.value = '';
    FAECHER = d.faecher;
    d.faecher.forEach(function (f) { fach.appendChild(el('option', null, f)); });
    var andere = el('option', null, 'Anderes Fach eintippen …'); andere.value = ANDERES; fach.appendChild(andere);
    var weiss = el('option', null, 'Weiß nicht / mehrere Fächer'); weiss.value = WEISS_NICHT; fach.appendChild(weiss);
    for (var s = 1; s <= d.max_stunde; s++) stundenBox.appendChild(chip('stunden', s, s + '.'));
    var heute = new Date(d.heute + 'T12:00:00');
    datum.max = iso(heute);
    var min = new Date(heute); min.setDate(min.getDate() - d.meldefrist_tage); datum.min = iso(min);

    // Gemerkte Klasse wiederherstellen
    var gemerkt = {};
    try { gemerkt = JSON.parse(A.lesen('klasse') || '{}') || {}; } catch (e) {}
    if (gemerkt.schule && Object.prototype.hasOwnProperty.call(oberstufe, gemerkt.schule)) schule.value = gemerkt.schule;
    if (STUFEN.indexOf(gemerkt.stufe) >= 0) stufenBox.querySelector('input[value="' + gemerkt.stufe + '"]').checked = true;
    if (typeof gemerkt.zug === 'string') zug.value = gemerkt.zug;
    anpassen();
  }).catch(function (e) { zeigen('fehler', e.message); });

  // Datum: Heute / Gestern (am Montag: Freitag)
  var knoepfe = document.querySelectorAll('#datum-schnell button');
  function markieren() { knoepfe.forEach(function (b) { b.classList.toggle('aktiv', b.dataset.wert === datum.value); }); }
  knoepfe.forEach(function (b) {
    var d = new Date();
    if (b.dataset.tage === '1') {
      do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
      if (new Date().getDay() === 1) b.textContent = 'Freitag';
    }
    b.dataset.wert = iso(d);
    b.addEventListener('click', function () { datum.value = b.dataset.wert; markieren(); });
  });
  datum.value = iso(new Date());
  datum.addEventListener('change', markieren);
  markieren();

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var stufe = gewaehlteStufe(), oberstufig = /^(EF|Q1|Q2)$/.test(stufe);
    var zugWert = oberstufig ? '' : zug.value.trim().toLowerCase();
    var stunden = gewaehlteStunden();
    var einzeln = jeStunde.checked && stunden.length >= 2;
    var kat = form.querySelector('input[name=kategorie]:checked');
    var anderes = fach.value === ANDERES;
    var fehlt = [];
    if (!schule.value) fehlt.push('Schule auswählen.');
    if (!stufe) fehlt.push('Klassenstufe antippen.');
    if (stufe && !oberstufig && !/^[a-z]{1,2}$/.test(zugWert)) fehlt.push('Klassenbuchstaben eingeben, z. B. a.');
    if (!datum.value) fehlt.push('Datum wählen.');
    if (!stunden.length) fehlt.push('Mindestens eine Stunde antippen.');
    if (einzeln) {
      if (stunden.some(function (st) { return !fachJeStunde[st]; })) fehlt.push('Für jede Stunde ein Fach wählen.');
    } else if (!fach.value || (anderes && !fachFrei.value.trim())) fehlt.push('Fach auswählen oder eintippen.');
    if (!kat) fehlt.push('Angeben, was passiert ist.');
    if (fehlt.length) return zeigen('fehler', 'Bitte noch ergänzen:', fehlt);

    knopf.disabled = true; knopf.textContent = 'Wird gesendet …';
    try {
      // Stunden nach Fach gruppieren: eine Meldung je Fach
      var gruppen = {};
      if (einzeln) stunden.forEach(function (st) { (gruppen[fachJeStunde[st]] = gruppen[fachJeStunde[st]] || []).push(st); });
      else gruppen[anderes ? 'Sonstiges' : fach.value] = stunden;
      var r = null;
      for (var f in gruppen) {
        var teil = await A.rpc('stunde_melden', {
          p_schule: schule.value, p_stufe: stufe, p_zug: zugWert, p_datum: datum.value, p_stunden: gruppen[f],
          p_fach: f, p_fach_frei: (!einzeln && anderes) ? fachFrei.value.trim() : null,
          p_kategorie: kat.value, p_geraet: A.geraet()
        });
        if (r) r.stunden = r.stunden.concat(teil.stunden); else r = teil;
      }
      r.stunden.sort(function (a, b) { return a.stunde - b.stunde; });
      A.schreiben('klasse', JSON.stringify({ schule: schule.value, stufe: stufe, zug: zugWert }));
      var tag = new Date(r.datum + 'T12:00:00').toLocaleDateString('de-DE');
      var punkte = r.stunden.map(function (s) {
        if (s.status === 'neu') return s.stunde + '. Stunde: neu angelegt.';
        if (s.status === 'bestaetigt') return s.stunde + '. Stunde: war schon gemeldet, Ihre Meldung zählt als +1 Bestätigung (jetzt ' + s.bestaetigungen + ').';
        return s.stunde + '. Stunde: hatten Sie bereits gemeldet, nichts geändert.';
      });
      var alleDoppelt = r.stunden.every(function (s) { return s.status === 'schon_gemeldet'; });
      zeigen('erfolg', alleDoppelt ? 'Diese Meldung hatten Sie schon abgegeben.' : 'Danke! Gespeichert für ' + r.klasse + ' am ' + tag + '.', punkte);
      form.querySelectorAll('input[name=stunden], input[name=kategorie]').forEach(function (i) { i.checked = false; });
      fach.value = ''; fachFrei.value = ''; fachFrei.hidden = true;
      jeStunde.checked = false; fachJeStunde = {}; jeStundeAufbauen();
    } catch (e) {
      zeigen('fehler', e.message);
    } finally {
      knopf.disabled = false; knopf.textContent = 'Meldung absenden';
    }
  });
})();

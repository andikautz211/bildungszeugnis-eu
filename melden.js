(function () {
  var A = window.APP, el = A.el;
  var form = document.getElementById('meldeformular');
  var code = document.getElementById('code'), info = document.getElementById('code-info');
  var datum = document.getElementById('datum'), fach = document.getElementById('fach');
  var stundenBox = document.getElementById('stunden'), meldung = document.getElementById('meldung');
  var knopf = document.getElementById('absenden');

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

  // Formular aufbauen (Fächer und Regeln kommen aus der Datenbank)
  A.rpc('formular_daten').then(function (d) {
    fach.replaceChildren(el('option', null, 'Bitte wählen'));
    fach.firstChild.value = '';
    d.faecher.forEach(function (f) { fach.appendChild(el('option', null, f)); });
    for (var s = 1; s <= d.max_stunde; s++) {
      var l = el('label', 'chip'), i = el('input');
      i.type = 'checkbox'; i.name = 'stunden'; i.value = s;
      l.append(i, el('span', null, s + '.'));
      stundenBox.appendChild(l);
    }
    var heute = new Date(d.heute + 'T12:00:00');
    datum.max = iso(heute);
    var min = new Date(heute); min.setDate(min.getDate() - d.meldefrist_tage); datum.min = iso(min);
  }).catch(function (e) { zeigen('fehler', e.message); });

  // Klassen-Code merken und prüfen
  code.value = A.lesen('klassencode') || '';
  var timer;
  function pruefen() {
    var v = code.value.trim();
    if (v.length < 4) return;
    A.rpc('klasse_pruefen', { p_code: v }).then(function (d) {
      if (d.ok) { info.textContent = '✓ ' + d.klasse; info.className = 'info ok'; A.schreiben('klassencode', v); }
      else { info.textContent = 'Code nicht gefunden. Bitte mit der Eltern-Gruppe abgleichen.'; info.className = 'info falsch'; }
    }).catch(function () {});
  }
  code.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(pruefen, 500); });
  pruefen();

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
    var stunden = Array.from(form.querySelectorAll('input[name=stunden]:checked')).map(function (i) { return +i.value; });
    var kat = form.querySelector('input[name=kategorie]:checked');
    var fehlt = [];
    if (!code.value.trim()) fehlt.push('Klassen-Code eingeben.');
    if (!datum.value) fehlt.push('Datum wählen.');
    if (!stunden.length) fehlt.push('Mindestens eine Stunde antippen.');
    if (!fach.value) fehlt.push('Fach auswählen.');
    if (!kat) fehlt.push('Angeben, was passiert ist.');
    if (fehlt.length) return zeigen('fehler', 'Bitte noch ergänzen:', fehlt);

    knopf.disabled = true; knopf.textContent = 'Wird gesendet …';
    try {
      var r = await A.rpc('stunde_melden', {
        p_code: code.value.trim(), p_datum: datum.value, p_stunden: stunden,
        p_fach: fach.value, p_kategorie: kat.value, p_geraet: A.geraet()
      });
      A.schreiben('klassencode', code.value.trim());
      var tag = new Date(r.datum + 'T12:00:00').toLocaleDateString('de-DE');
      var punkte = r.stunden.map(function (s) {
        if (s.status === 'neu') return s.stunde + '. Stunde: neu angelegt.';
        if (s.status === 'bestaetigt') return s.stunde + '. Stunde: war schon gemeldet, Ihre Meldung zählt als +1 Bestätigung (jetzt ' + s.bestaetigungen + ').';
        return s.stunde + '. Stunde: hatten Sie bereits gemeldet, nichts geändert.';
      });
      var alleDoppelt = r.stunden.every(function (s) { return s.status === 'schon_gemeldet'; });
      zeigen('erfolg', alleDoppelt ? 'Diese Meldung hatten Sie schon abgegeben.' : 'Danke! Gespeichert für ' + r.klasse + ' am ' + tag + '.', punkte);
      form.querySelectorAll('input[name=stunden], input[name=kategorie]').forEach(function (i) { i.checked = false; });
      fach.value = '';
    } catch (e) {
      zeigen('fehler', e.message);
    } finally {
      knopf.disabled = false; knopf.textContent = 'Meldung absenden';
    }
  });
})();

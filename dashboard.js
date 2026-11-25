(function () {
  var A = window.APP, el = A.el;
  var MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  var monitor = /[?&]monitor\b/.test(location.search);
  var zahl = new Intl.NumberFormat('de-DE');

  function setze(id, wert) { document.getElementById(id).textContent = wert; }

  function balken(id, zeilen, max) {
    var box = document.getElementById(id);
    var hoechst = Math.max.apply(null, zeilen.map(function (r) { return r.gesamt; }).concat([1]));
    box.replaceChildren();
    if (!zeilen.length) { box.appendChild(el('p', 'info', 'Noch keine Meldungen.')); return; }
    zeilen.slice(0, max || zeilen.length).forEach(function (r) {
      var ohne = r.ausfall + r.aufsicht;
      var z = el('div', 'zeile'), k = el('div', 'zeile-kopf'), n = el('span', 'zahl', zahl.format(ohne) + ' ');
      n.appendChild(el('small', null, 'von ' + zahl.format(r.gesamt)));
      k.append(el('span', null, r.gruppe), n);
      var b = el('div', 'balken');
      b.setAttribute('role', 'img');
      b.setAttribute('aria-label', r.gruppe + ': ' + r.ausfall + ' ersatzlos ausgefallen, ' + r.aufsicht + ' nur Aufsicht, ' + r.vertretung + ' fachgerecht vertreten');
      ['ausfall', 'aufsicht', 'vertretung'].forEach(function (kat) {
        if (r[kat] > 0) { var s = el('span', 'seg seg-' + kat); s.style.width = (100 * r[kat] / hoechst) + '%'; b.appendChild(s); }
      });
      z.append(k, b);
      box.appendChild(z);
    });
  }

  async function laden() {
    try {
      var d = await A.rpc('dashboard_daten');
      var s = d.summe;
      setze('schuljahr', d.schuljahr);
      setze('grosszahl', zahl.format(s.ausfall + s.aufsicht));
      setze('unterzeile', 'gemeldet von Eltern aus ' + s.klassen + (s.klassen === 1 ? ' Klasse' : ' Klassen') + ' an ' + s.schulen + (s.schulen === 1 ? ' Schule' : ' Schulen'));
      setze('z-ausfall', zahl.format(s.ausfall));
      setze('z-aufsicht', zahl.format(s.aufsicht));
      setze('z-vertretung', zahl.format(s.vertretung));
      setze('z-bestaetigt', (s.gesamt ? Math.round(100 * s.bestaetigt / s.gesamt) : 0) + ' %');
      setze('stand', s.zuletzt ? 'Letzte Meldung: ' + new Date(s.zuletzt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) + ' Uhr.' : '');
      balken('g-schulen', d.schulen, monitor ? 6 : 0);
      balken('g-jahrgaenge', d.jahrgaenge);
      balken('g-faecher', d.faecher, monitor ? 5 : 10);
      balken('g-monate', d.monate.map(function (m) {
        var t = m.monat.split('-'); m.gruppe = MONATE[+t[1] - 1] + ' ' + t[0]; return m;
      }), monitor ? 6 : 0);
      document.getElementById('fehler').hidden = true;
    } catch (e) {
      var f = document.getElementById('fehler'); f.hidden = false; f.textContent = e.message;
    }
  }

  // Monitor-Modus: Vollbild, ohne Kopf/Fuß, aktualisiert sich jede Minute.
  // Direkt aufrufbar über ...?monitor (z. B. als Lesezeichen am Bildschirm zu Hause).
  var timer;
  function monitorSetzen(an) {
    monitor = an;
    document.body.classList.toggle('monitor', an);
    history.replaceState(null, '', an ? '?monitor' : location.pathname);
    setze('adresse', location.host + location.pathname.replace(/index\.html$/, '') + 'melden.html');
    if (an && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
    if (!an && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    clearInterval(timer);
    timer = setInterval(function () { if (!document.hidden) laden(); }, an ? 60000 : 300000);
    laden();
  }
  document.getElementById('monitor-knopf').addEventListener('click', function () { monitorSetzen(true); });
  document.getElementById('monitor-aus').addEventListener('click', function () { monitorSetzen(false); });
  document.addEventListener('dblclick', function () {
    if (monitor && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) laden(); });
  monitorSetzen(monitor);

  // Weitersagen: Teilen-Menü des Handys, sonst WhatsApp-Link (keine Fremd-Skripte)
  var teilenText = 'Wie viel Unterricht fällt an Euskirchener Schulen wirklich aus? Eltern melden ausgefallene Stunden anonym und ohne Anmeldung. Bitte mitmachen und weitersagen:';
  var teilenUrl = location.origin + location.pathname.replace(/index\.html$/, '') + 'melden.html';
  document.getElementById('teilen').addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ title: document.title, text: teilenText, url: teilenUrl }).catch(function () {});
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(teilenText + ' ' + teilenUrl), '_blank', 'noopener');
    }
  });
})();

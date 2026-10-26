(function () {
  "use strict";
  var DATA = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function $(html) {
    document.getElementById("app").innerHTML = html;
    window.scrollTo(0, 0);
  }
  var PAPER_HOST = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/";
  function fileUrl(rel) {
    // PDFs are not stored in the site; link to the public host
    if (/\.pdf$/i.test(rel)) {
      return PAPER_HOST + rel.split("/").pop();
    }
    // Local preview lives at /website/, so worked files sit one level up.
    // On GitHub Pages the worked folders sit next to index.html.
    var inWebsite = /\/website\//.test(location.pathname);
    return (inWebsite ? "../" : "") + rel;
  }
  function crumbs(items) {
    return '<nav class="crumbs">' + items.map(function (it) {
      return it.href
        ? '<a href="' + it.href + '">' + esc(it.label) + '</a>'
        : '<span>' + esc(it.label) + '</span>';
    }).join(' <span>/</span> ') + '</nav>';
  }

  function countSubject(s) {
    var years = Object.keys(s.years || {}).length;
    var worked = 0, qps = 0;
    Object.keys(s.years || {}).forEach(function (y) {
      Object.keys(s.years[y] || {}).forEach(function (p) {
        ["May", "Oct"].forEach(function (season) {
          (s.years[y][p][season] || []).forEach(function (v) {
            if (v.qp) qps++;
            if (v.worked) worked++;
          });
        });
      });
    });
    return { years: years, qps: qps, worked: worked };
  }

  function home() {
    document.title = "ALevelSolved";
    var order = DATA.order || Object.keys(DATA.subjects);
    var cards = order.map(function (code) {
      var s = DATA.subjects[code];
      if (!s) return "";
      var c = countSubject(s);
      if (!c.qps && !c.worked) return "";
      var slug = String(s.name).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return '<a class="card" href="/' + slug + '-' + code + '/">' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<p class="codes">Syllabus ' + esc(code) + '</p>' +
        '<p class="muted">' + c.years + ' year(s) · ' + c.qps + ' papers · ' + c.worked + ' worked solutions</p>' +
        '<span class="pill">' + (c.worked ? 'Open library' : 'Papers library') + '</span></a>';
    }).join("");
    $('<section class="hero">' +
      '<h1>ALevelSolved</h1>' +
      '<p>Cambridge International A-Level papers organised by subject, year, May/October session and variant — with worked solutions written from the mark schemes.</p>' +
      '</section>' +
      '<h2>Subjects</h2><div class="grid">' + cards + '</div>');
  }

  function subject(code) {
    var s = DATA.subjects[code];
    if (!s) return notFound();
    document.title = s.name + " | ALevelSolved";
    var years = Object.keys(s.years || {}).sort().reverse().filter(function (y) {
      var papers = s.years[y] || {};
      return Object.keys(papers).some(function (p) {
        return (papers[p].May || []).length + (papers[p].Oct || []).length > 0;
      });
    });
    var cards = years.map(function (y) {
      var papers = Object.keys(s.years[y] || {}).sort();
      return '<a class="card" href="#/subject/' + code + '/' + y + '">' +
        '<h3>' + esc(y) + '</h3>' +
        '<p class="muted">' + papers.join(', ') + '</p>' +
        '<span class="pill">Browse year</span></a>';
    }).join("") || '<div class="empty">No papers downloaded for this subject yet.</div>';
    $(crumbs([{ href: '#/', label: 'Subjects' }, { label: s.name }]) +
      '<h1>' + esc(s.name) + '</h1>' +
      '<p class="muted">Syllabus code ' + esc(code) + '</p>' +
      '<div class="grid">' + cards + '</div>');
  }

  function yearPage(code, year) {
    var s = DATA.subjects[code];
    if (!s || !s.years[year]) return notFound();
    document.title = s.name + ' ' + year + ' | ALevelSolved';
    var papers = Object.keys(s.years[year]).sort();
    var blocks = papers.map(function (p) {
      var may = s.years[year][p].May || [];
      var oct = s.years[year][p].Oct || [];
      return '<div class="card" style="margin-bottom:14px">' +
        '<h3>' + esc(p) + '</h3>' +
        '<p><a class="btn secondary" href="#/subject/' + code + '/' + year + '/' + p + '/May">May/June (' + may.length + ' variants)</a> ' +
        '<a class="btn secondary" href="#/subject/' + code + '/' + year + '/' + p + '/Oct">Oct/Nov (' + oct.length + ' variants)</a></p>' +
        '</div>';
    }).join("");
    $(crumbs([
      { href: '#/', label: 'Subjects' },
      { href: '#/subject/' + code, label: s.name },
      { label: year }
    ]) + '<h1>' + esc(s.name) + ' · ' + esc(year) + '</h1>' + blocks);
  }

  function sessionPage(code, year, paper, season) {
    var s = DATA.subjects[code];
    if (!s || !s.years[year] || !s.years[year][paper]) return notFound();
    var list = s.years[year][paper][season] || [];
    document.title = s.name + ' ' + year + ' ' + paper + ' ' + season + ' | ALevelSolved';
    var rows = list.map(function (v) {
      var links = '';
      if (v.worked) links += '<a class="btn" href="' + fileUrl(v.worked) + '" target="_blank" rel="noopener">Worked solution</a> ';
      else links += '<span class="pill pill-miss">Worked solution pending</span> ';
      if (v.qp) links += '<a class="btn ghost" href="' + fileUrl(v.qp) + '" target="_blank" rel="noopener">Question paper</a> ';
      if (v.ms) links += '<a class="btn ghost" href="' + fileUrl(v.ms) + '" target="_blank" rel="noopener">Mark scheme</a> ';
      if (v.in) links += '<a class="btn ghost" href="' + fileUrl(v.in) + '" target="_blank" rel="noopener">Insert</a>';
      return '<tr><td><strong>Variant ' + esc(v.variant) + '</strong></td><td>' + links + '</td></tr>';
    }).join("") || '<tr><td colspan="2">No papers in this session yet.</td></tr>';

    $(crumbs([
      { href: '#/', label: 'Subjects' },
      { href: '#/subject/' + code, label: s.name },
      { href: '#/subject/' + code + '/' + year, label: year },
      { label: paper + ' · ' + season }
    ]) +
      '<h1>' + esc(s.name) + ' · ' + esc(year) + ' · ' + esc(paper) + '</h1>' +
      '<div class="season-tabs">' +
      '<a class="' + (season === 'May' ? 'active' : '') + '" href="#/subject/' + code + '/' + year + '/' + paper + '/May">May/June</a>' +
      '<a class="' + (season === 'Oct' ? 'active' : '') + '" href="#/subject/' + code + '/' + year + '/' + paper + '/Oct">Oct/Nov</a>' +
      '</div>' +
      '<table><thead><tr><th>Variant</th><th>Resources</th></tr></thead><tbody>' + rows + '</tbody></table>');
  }

  function about() {
    document.title = 'About | ALevelSolved';
    $(crumbs([{ href: '#/', label: 'Subjects' }, { label: 'About' }]) +
      '<article class="prose"><h1>About</h1>' +
      '<p>ALevelSolved organises Cambridge International A-Level past papers by subject, year, May/October session and variant.</p>' +
      '<p>Where a worked solution exists, it is written as step-by-step reasoning based on the official mark scheme — not a copy of the mark scheme itself.</p>' +
      '<p>This site is for private study use with locally stored papers. It is not affiliated with Cambridge Assessment International Education.</p>' +
      '</article>');
  }

  function notFound() {
    $('<h1>Page not found</h1><p><a href="#/">Back to subjects</a></p>');
  }

  function route() {
    var hash = (location.hash || '#/').replace(/^#/, '') || '/';
    var parts = hash.split('/').filter(Boolean);
    if (!parts.length) return home();
    if (parts[0] === 'about') return about();
    if (parts[0] === 'subject' && parts[1] && !parts[2]) return subject(parts[1]);
    if (parts[0] === 'subject' && parts[1] && parts[2] && !parts[3]) return yearPage(parts[1], parts[2]);
    if (parts[0] === 'subject' && parts[1] && parts[2] && parts[3] && parts[4])
      return sessionPage(parts[1], parts[2], parts[3], parts[4]);
    return notFound();
  }

  function boot(data) {
    DATA = data;
    window.addEventListener('hashchange', route);
    route();
  }

  function fail() {
    $('<div class="empty"><p>Could not load the paper library. Re-run <code>python3 scripts/build_manifest.py</code> from the Cie_Bank folder, then refresh.</p></div>');
  }

  function load() {
    // 1) JSON embedded in index.html (works on file:// and http://)
    var el = document.getElementById("alevel-manifest");
    if (el && el.textContent && el.textContent.trim() && el.textContent.trim() !== "{}") {
      try {
        boot(JSON.parse(el.textContent));
        return;
      } catch (e) { /* fall through */ }
    }
    // 2) sibling script that sets window.ALEVEL_MANIFEST
    if (window.ALEVEL_MANIFEST) {
      boot(window.ALEVEL_MANIFEST);
      return;
    }
    // 3) fetch (needs a local http server)
    fetch("manifest.json")
      .then(function (r) {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then(boot)
      .catch(fail);
  }
  load();
})();

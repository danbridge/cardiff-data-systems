// Data science checker. Runs entirely in the browser; nothing is sent anywhere.
// Results can be emailed to Dan via a prefilled mailto: link (no backend needed).
(function () {
  'use strict';

  var CONTACT = 'dan@cardiffdatasystems.co.uk';

  // ---- Scored questions about the raw material (each option scores 0-3) ----
  var FOUNDATIONS = [
    { id: 'history', label: 'How long have you kept records digitally?',
      hint: 'Forecasting and trend-spotting need a steady history.',
      short: 'History',
      options: [
        ['Less than a year', 0], ['1–3 years', 1], ['3–10 years', 2], ['More than 10 years', 3]
      ],
      fix: 'Start capturing the key events consistently now. Each month of reliable, dated records makes forecasting more trustworthy later.' },
    { id: 'volume', label: 'Roughly how many records are in your main system?',
      hint: 'Clients, cases, jobs or transactions, whichever matters most.',
      short: 'Volume',
      options: [
        ['Fewer than 200', 0], ['200–2,000', 1], ['2,000–20,000', 2], ['More than 20,000', 3], ['Not sure', 1]
      ],
      fix: 'With a small number of records, statistical models are limited. Clear charts and simple analysis usually give you more, and they are cheaper to build.' },
    { id: 'where', label: 'Where does the data live?',
      hint: 'The fewer places, the easier it is to use.',
      short: 'Where it lives',
      options: [
        ['Paper, or in people\'s heads', 0], ['Spreadsheets and email', 1],
        ['Several separate systems', 2], ['One main system or database', 3]
      ],
      fix: 'Bring the records together first. Joining your systems, or moving the spreadsheets into a proper database, is usually the biggest single step towards useful analysis.' },
    { id: 'consistent', label: 'How consistently is it recorded?',
      hint: 'Do people fill things in the same way every time?',
      short: 'Consistency',
      options: [
        ['Mostly free text and notes', 0], ['Patchy, with gaps', 1],
        ['Mostly consistent', 2], ['Structured and reliable', 3]
      ],
      fix: 'Agree how the key fields are filled in, and tidy the history. Models learn from whatever is there, so messy records mean unreliable answers.' },
    { id: 'outcomes', label: 'Do you record how things turned out?',
      hint: 'For example which enquiries became work, which invoices were paid late, how long jobs took.',
      short: 'Outcomes',
      options: [
        ['No', 0], ['Sometimes, or from memory', 1], ['In some systems', 2], ['Yes, consistently', 3]
      ],
      fix: 'Start recording outcomes alongside activity (the result of each enquiry, the date each invoice was paid, how long each job took). Without them it is hard to learn what works.' }
  ];

  var GOALS = [
    { value: 'forecast', label: 'What happens next (forecasting)',
      text: 'You said you most want to know what is likely to happen next. Forecasting depends on a steady, dated history, so your answers on history and consistency matter most.' },
    { value: 'why', label: 'Why something keeps happening',
      text: 'You said you most want to understand why something keeps happening. That needs outcomes recorded alongside the details, so it is worth checking that results are captured as well as activity.' },
    { value: 'prioritise', label: 'What to prioritise',
      text: 'You said you most want to prioritise better. That is usually a scoring approach built on past outcomes, so recorded results matter most.' },
    { value: 'lose', label: 'Where we lose time or money',
      text: 'You said you most want to find where you lose time or money. That is often the quickest win: bringing time, cost and outcome records together to see where effort really goes.' },
    { value: 'unknown', label: 'I don\'t know yet',
      text: 'You are not sure yet what you would like to know, which is normal. A short discovery would start from what you hold and the decisions that matter to you.' }
  ];

  var AMOUNT = [
    { label: 'None', value: 0 },
    { label: 'A little', value: 1 },
    { label: 'A fair amount', value: 2 },
    { label: 'A lot', value: 3 }
  ];

  // ---- Kinds of data an organisation might hold ----
  var TYPES = [
    { id: 'clients', weight: 1.0,
      label: 'Client or customer records',
      hint: 'Who they are, when they joined, what they buy or use.',
      tells: 'Which clients are most valuable, which are drifting away, and how your clients naturally group together.',
      check: 'Duplicates and inconsistent names, and whether each client has a reliable identifier.' },
    { id: 'invoices', weight: 1.2,
      label: 'Invoices and payments',
      hint: 'What was billed, when, and when it was paid.',
      tells: 'Likely cash flow, which invoices tend to be paid late, and unusual transactions worth a look.',
      check: 'That both the invoice date and the date paid are recorded.' },
    { id: 'cases', weight: 1.3,
      label: 'Cases, matters or jobs, with dates and outcomes',
      hint: 'When work started and finished, and how it ended.',
      tells: 'How long new work is likely to take, where work stalls, and what separates the jobs that go well from those that don\'t.',
      check: 'That statuses, end dates and outcomes are recorded the same way each time.' },
    { id: 'enquiries', weight: 1.2,
      label: 'Enquiries and what happened to them',
      hint: 'Where they came from and whether they became work.',
      tells: 'Which sources and kinds of enquiry turn into paying work, and which are worth chasing.',
      check: 'That the source and the result of each enquiry are written down.' },
    { id: 'time', weight: 1.1,
      label: 'Timesheets or time records',
      hint: 'Hours spent, by person, client or type of work.',
      tells: 'Real profitability by client and type of work, and better pricing and capacity planning.',
      check: 'That time is recorded against the right client or job, and recorded promptly.' },
    { id: 'documents', weight: 0.8,
      label: 'Documents, emails and notes',
      hint: 'Free text rather than neat fields.',
      tells: 'Common topics and recurring issues, and a way to find and group similar documents.',
      check: 'Confidentiality, and whether the text can be used where it sits.' },
    { id: 'feedback', weight: 0.7,
      label: 'Surveys, reviews or feedback',
      hint: 'What clients, members or staff say about you.',
      tells: 'The themes behind the comments, and how they change over time.',
      check: 'Whether there are enough responses, and whether they can be linked to the client.' },
    { id: 'usage', weight: 0.8,
      label: 'Website, app or system usage',
      hint: 'Logs of how people use the tools you run.',
      tells: 'How your tools are really used, where people get stuck, and early signs of failure.',
      check: 'Whether the logs are kept, and for how long.' }
  ];

  var form = document.getElementById('checker');
  var list = document.getElementById('task-list');
  var foundList = document.getElementById('found-list');
  var resultsSection = document.getElementById('results');
  var resultsBody = document.getElementById('results-body');
  if (!form || !list || !foundList) return;

  function addRow(target, id, label, hint, optionsHtml, aria) {
    var li = document.createElement('li');
    li.className = 'task';
    li.innerHTML =
      '<div><label class="task-name" for="' + id + '">' + label + '</label>' +
      '<p class="task-desc">' + hint + '</p></div>' +
      '<select id="' + id + '" aria-label="' + aria + '">' + optionsHtml + '</select>';
    target.appendChild(li);
  }

  // Scored foundation questions, then the goal question.
  FOUNDATIONS.forEach(function (q) {
    var opts = q.options.map(function (o, i) { return '<option value="' + i + '">' + o[0].replace(/"/g, '&quot;') + '</option>'; }).join('');
    addRow(foundList, 'found-' + q.id, q.label, q.hint, opts, q.label);
  });
  var goalOpts = GOALS.map(function (g, i) { return '<option value="' + i + '"' + (g.value === 'unknown' ? ' selected' : '') + '>' + g.label.replace(/"/g, '&quot;') + '</option>'; }).join('');
  addRow(foundList, 'goal', 'What would you most like to know?', 'The one question you wish your records could answer: what happens next, why something keeps happening, what to prioritise, or where you lose time or money.', goalOpts, 'What would you most like to know');

  // Kinds of data.
  TYPES.forEach(function (t) {
    var opts = AMOUNT.map(function (a, i) { return '<option value="' + i + '">' + a.label + '</option>'; }).join('');
    addRow(list, 'type-' + t.id, t.label, t.hint, opts, 'How much: ' + t.label);
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function statusFor(score) { return score >= 3 ? 'Strong' : score === 2 ? 'Good' : score === 1 ? 'Patchy' : 'Weak'; }

  function compute() {
    var found = FOUNDATIONS.map(function (q) {
      var sel = document.getElementById('found-' + q.id);
      var opt = q.options[parseInt(sel.value, 10)];
      return { q: q, answer: opt[0], score: opt[1] };
    });
    var total = found.reduce(function (n, f) { return n + f.score; }, 0);
    var types = [];
    TYPES.forEach(function (t) {
      var sel = document.getElementById('type-' + t.id);
      var amt = AMOUNT[parseInt(sel.value, 10)];
      if (amt.value === 0) return;
      types.push({ t: t, amount: amt.label, score: amt.value * t.weight });
    });
    types.sort(function (a, b) { return b.score - a.score; });
    var goal = GOALS[parseInt(document.getElementById('goal').value, 10)];
    return { found: found, total: total, types: types, goal: goal };
  }

  function band(total) {
    if (total >= 11) return { key: 'strong', heading: 'Your data looks <em>promising.</em>',
      lead: 'The raw material is in good shape. A focused piece of work could turn it into answers fairly quickly.' };
    if (total >= 7) return { key: 'mid', heading: 'There is something to work with, <em>with some preparation.</em>',
      lead: 'You hold useful records, but a few gaps would limit what data science can reliably tell you today. The good news is that they are fixable.' };
    return { key: 'low', heading: 'It\'s <em>early days</em> for your data, and that is fixable.',
      lead: 'Data science would struggle with what you hold today, and anyone who says otherwise is selling. A few practical steps would change that, and some of them cost very little.' };
  }

  function buildSummary(ctx, r, b) {
    var lines = ['Data science checker results', 'Organisation: ' + ctx.type + ', ' + ctx.size,
      'Readiness: ' + r.total + ' out of 15 (' + b.key + ')', 'Most want to know: ' + r.goal.label, ''];
    r.found.forEach(function (f) { lines.push(f.q.short + ': ' + f.answer + ' (' + statusFor(f.score).toLowerCase() + ')'); });
    lines.push('');
    if (r.types.length) {
      lines.push('Data held:');
      r.types.forEach(function (s, i) { lines.push((i + 1) + '. ' + s.t.label + ' (' + s.amount.toLowerCase() + ')'); });
    }
    lines.push('', 'Name:', 'Organisation:', 'Best way to reach me:');
    return lines.join('\n');
  }

  function renderResults() {
    var ctx = { type: document.getElementById('biz-type').value, size: document.getElementById('biz-size').value };
    var r = compute();
    var b = band(r.total);
    var html = '';

    html += '<h2 id="results-title">' + b.heading + '</h2>';
    html += '<p class="large-copy">' + b.lead + ' This is a rough, indicative view for ' + esc(ctx.type) + ' with ' + esc(ctx.size) +
      '. A short look at your actual records would confirm it.</p>';

    html += '<h3 class="results-heading">The raw material</h3><ul class="later-list">';
    r.found.forEach(function (f) {
      html += '<li>' + esc(f.q.short) + ': ' + esc(f.answer) + ' <span>' + statusFor(f.score) + '</span></li>';
    });
    html += '</ul>';

    if (r.types.length) {
      html += '<h3 class="results-heading">Where to look first</h3>';
      r.types.slice(0, 4).forEach(function (s, i) {
        html += '<article class="result-card"><span class="result-rank">' + String(i + 1).padStart(2, '0') + '</span><div>' +
          '<h4>' + esc(s.t.label) + '</h4>' +
          '<p class="result-meta"><span>' + esc(s.amount) + ' held</span></p>' +
          '<p><strong>It could tell you:</strong> ' + esc(s.t.tells) + '</p>' +
          '<p class="result-human"><strong>Check first:</strong> ' + esc(s.t.check) + '</p>' +
          '</div></article>';
      });
      if (r.types.length > 4) {
        html += '<h3 class="results-heading">Worth a look later</h3><ul class="later-list">';
        r.types.slice(4).forEach(function (s) { html += '<li>' + esc(s.t.label) + ' <span>' + esc(s.amount) + ' held</span></li>'; });
        html += '</ul>';
      }
    } else {
      html += '<p class="results-honest"><strong>You did not mark any records as held,</strong> so there is nothing to rank yet. If you do keep some, go back and say roughly how much.</p>';
    }

    // Weakest foundations first, up to three fixes.
    var gaps = r.found.filter(function (f) { return f.score <= 1; }).sort(function (a, b2) { return a.score - b2.score; }).slice(0, 3);
    if (gaps.length) {
      html += '<h3 class="results-heading">What to fix first</h3>';
      gaps.forEach(function (f, i) {
        html += '<article class="result-card"><span class="result-rank">' + String(i + 1).padStart(2, '0') + '</span><div>' +
          '<h4>' + esc(f.q.short) + ': ' + esc(statusFor(f.score).toLowerCase()) + '</h4><p>' + esc(f.q.fix) + '</p></div></article>';
      });
    }

    html += '<p class="results-honest">' + esc(r.goal.text) + '</p>';
    html += '<p class="results-honest"><strong>Not every problem needs data science.</strong> Sometimes the right answer is a clean spreadsheet and a good chart, and I will say so.</p>';
    html += '<div class="callout"><h3>Worth knowing: personal and confidential data</h3><p>Much business data is personal or confidential. Analysis can usually be done inside your own systems, or on anonymised data, so this shapes how the work is done rather than whether it can be.</p></div>';

    var subject = 'Data science checker results (' + ctx.type + ')';
    var mailto = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(buildSummary(ctx, r, b));
    html += '<div class="results-cta"><h3>Want a proper look at your data?</h3>' +
      '<p>Email your results to me and I\'ll reply with a short, honest view of what is worth trying first, and what isn\'t. No obligation and no sales sequence.</p>' +
      '<p><a class="button" href="' + mailto + '">Email me these results <span aria-hidden="true">↗</span></a> ' +
      '<button type="button" class="button button-outline" data-action="back">Change my answers</button></p></div>';

    resultsBody.innerHTML = html;
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultsSection.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); renderResults(); });
  resultsBody.addEventListener('click', function (e) {
    if (e.target.closest('[data-action="back"]')) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

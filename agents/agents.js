// AI agent checker. Runs entirely in the browser; nothing is sent anywhere.
// Results can be emailed to Dan via a prefilled mailto: link (no backend needed).
// To capture leads automatically later, replace the mailto link in renderResults()
// with a POST to a form endpoint (Formspree, Web3Forms, a Cloudflare Worker, etc.).
(function () {
  'use strict';

  var CONTACT = 'dan@cardiffdatasystems.co.uk';

  // Hours per week the whole team spends on a task, mapped from the select options.
  var HOURS = [
    { label: 'None', value: 0 },
    { label: 'Under 1 hour', value: 0.5 },
    { label: '1–3 hours', value: 2 },
    { label: '3–8 hours', value: 5 },
    { label: '8+ hours', value: 10 }
  ];

  // Share of the time an agent could plausibly take over, by potential.
  var FACTOR = {
    high: { low: 0.5, high: 0.8, label: 'High potential' },
    medium: { low: 0.3, high: 0.5, label: 'Medium potential' }
  };

  var TASKS = [
    { id: 'chase-invoices', potential: 'high',
      label: 'Chasing late payments and sending invoice reminders',
      hint: 'Spotting overdue invoices and following them up.',
      agent: 'Watches your accounts, drafts and sends polite reminders on a schedule, and escalates to a person when someone replies or a threshold is passed.',
      human: 'Anything involving disputes or sensitive client relationships.' },
    { id: 'enquiries', potential: 'high',
      label: 'Triaging and replying to new enquiries',
      hint: 'Email, web forms and phone messages that need sorting and a first response.',
      agent: 'Reads each enquiry, works out what it is and how urgent it is, sends an acknowledgement, collects the missing details and routes it to the right person.',
      human: 'Judgement calls on whether to take the work on.' },
    { id: 'diary', potential: 'high',
      label: 'Booking appointments and juggling diaries',
      hint: 'Back-and-forth emails to find a time that works.',
      agent: 'Offers available slots, books them, sends confirmations and reminders, and reschedules when plans change.',
      human: 'Priority clients and unusual requests.' },
    { id: 'rekeying', potential: 'high',
      label: 'Typing the same information into more than one system',
      hint: 'Copying details between email, spreadsheets, practice or case management software.',
      agent: 'Moves the data between systems as it arrives and flags anything that doesn\'t match, so people stop acting as the glue between your apps.',
      human: 'Reviewing mismatches and exceptions.' },
    { id: 'filing', potential: 'high',
      label: 'Filing documents and emails against the right client or matter',
      hint: 'Naming, sorting and saving things where others can find them.',
      agent: 'Recognises the client or matter from the content, names and files documents consistently, and asks when it isn\'t sure.',
      human: 'Spot checks, especially for confidential material.' },
    { id: 'extract', potential: 'high',
      label: 'Pulling details out of PDFs, scans and forms',
      hint: 'Reading documents and entering what\'s in them into a system.',
      agent: 'Reads each document, extracts the fields you care about and puts them in the right place, with anything unclear queued for a person.',
      human: 'Checking figures and anything legally or financially significant.' },
    { id: 'chase-docs', potential: 'high',
      label: 'Chasing clients for missing documents or information',
      hint: 'Reminding people to send what you need to move forward.',
      agent: 'Knows what is outstanding for each client, sends tailored reminders, and tells you only when something is still missing after a set time.',
      human: 'Clients who need a phone call rather than an email.' },
    { id: 'drafting', potential: 'medium',
      label: 'Drafting routine letters, emails and standard documents',
      hint: 'The same kinds of correspondence, written again and again.',
      agent: 'Prepares a first draft from your templates and the case details, ready for a person to review and send.',
      human: 'Every draft is reviewed before it goes out.' },
    { id: 'onboarding', potential: 'medium',
      label: 'Onboarding new clients',
      hint: 'Forms, identity checks, engagement letters and getting set up.',
      agent: 'Sends the right paperwork, tracks what has come back, creates the records and tells you when a client is ready to start.',
      human: 'Compliance decisions and identity verification sign-off.' },
    { id: 'reporting', potential: 'medium',
      label: 'Preparing regular reports and management figures',
      hint: 'Pulling numbers together every week or month.',
      agent: 'Collects the figures from your systems on schedule and produces the report, highlighting anything unusual.',
      human: 'Interpreting the numbers and deciding what to do.' },
    { id: 'summarising', potential: 'medium',
      label: 'Summarising long documents, calls and meetings',
      hint: 'Reading or listening back, then writing it up.',
      agent: 'Produces a structured summary and action list, and files it with the right record.',
      human: 'Checking the summary against anything that matters.' },
    { id: 'faq', potential: 'medium',
      label: 'Answering the same client questions again and again',
      hint: 'Opening hours, progress updates, "what do I need to bring?".',
      agent: 'Answers routine questions from your own approved information and hands over to a person when it can\'t.',
      human: 'Anything that amounts to advice.' },
    { id: 'deadlines', potential: 'medium',
      label: 'Tracking deadlines, renewals and follow-ups',
      hint: 'Things that fall through the cracks when one person holds them in their head.',
      agent: 'Keeps a single list of what is due, nudges the right person in good time and notices when something hasn\'t been done.',
      human: 'Deciding priorities when things collide.' }
  ];

  var form = document.getElementById('checker');
  var list = document.getElementById('task-list');
  var resultsSection = document.getElementById('results');
  var resultsBody = document.getElementById('results-body');
  if (!form || !list) return;

  // ---- Build the task rows ----
  TASKS.forEach(function (t) {
    var li = document.createElement('li');
    li.className = 'task';
    var selectId = 'task-' + t.id;
    var options = HOURS.map(function (h, i) {
      return '<option value="' + i + '">' + h.label + '</option>';
    }).join('');
    li.innerHTML =
      '<div><label class="task-name" for="' + selectId + '">' + t.label + '</label>' +
      '<p class="task-desc">' + t.hint + '</p></div>' +
      '<select id="' + selectId + '" data-task="' + t.id + '" aria-label="Hours per week: ' + t.label + '">' + options + '</select>';
    list.appendChild(li);
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtHours(n) {
    var r = Math.round(n * 2) / 2; // nearest half hour
    return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1));
  }

  function compute() {
    var scored = [];
    TASKS.forEach(function (t) {
      var sel = document.getElementById('task-' + t.id);
      var hours = HOURS[parseInt(sel.value, 10)].value;
      if (hours === 0) return;
      var f = FACTOR[t.potential];
      scored.push({
        task: t,
        hours: hours,
        low: hours * f.low,
        high: hours * f.high,
        mid: hours * (f.low + f.high) / 2,
        hoursLabel: HOURS[parseInt(sel.value, 10)].label
      });
    });
    scored.sort(function (a, b) { return b.mid - a.mid; });
    return scored;
  }

  function governanceNote(aiUse) {
    if (aiUse === 'informal' || aiUse === 'unsure') {
      return {
        title: 'Before anything else: how AI is already being used',
        body: aiUse === 'informal'
          ? 'When individuals use free tools as they see fit, client and business information can end up in places you don\'t control, with no record of what was shared. Agreeing which tools are approved, what may go into them and who checks the output is usually the best first step, and it makes any later automation safer.'
          : 'If you\'re not sure how your team uses AI, it\'s worth finding out. Staff pasting client or business information into free tools is common, and rarely visible. A quick look at what is actually happening is the best first step, and it makes any later automation safer.'
      };
    }
    if (aiUse === 'none') {
      return {
        title: 'Worth knowing',
        body: 'Even if nobody has been told to use AI, some people may well be using it already. A short, clear policy on approved tools and what must never be pasted in is cheap to put in place before you automate anything.'
      };
    }
    return null;
  }

  function buildSummary(ctx, scored, totalLow, totalHigh) {
    var lines = [];
    lines.push('AI agent checker results');
    lines.push('Business: ' + ctx.type + ', ' + ctx.size);
    lines.push('AI use today: ' + ctx.aiLabel);
    lines.push('');
    if (!scored.length) {
      lines.push('No tasks selected.');
    } else {
      lines.push('Indicative time that agents could take over: ' + fmtHours(totalLow) + '–' + fmtHours(totalHigh) + ' hours a week');
      lines.push('');
      scored.forEach(function (s, i) {
        lines.push((i + 1) + '. ' + s.task.label + ' (' + s.hoursLabel + ' a week, ' + FACTOR[s.task.potential].label.toLowerCase() + ')');
      });
    }
    lines.push('');
    lines.push('Name:');
    lines.push('Business:');
    lines.push('Best way to reach me:');
    return lines.join('\n');
  }

  function renderResults() {
    var typeSel = document.getElementById('biz-type');
    var sizeSel = document.getElementById('biz-size');
    var aiSel = document.getElementById('ai-use');
    var ctx = {
      type: typeSel.value,
      size: sizeSel.value,
      ai: aiSel.value,
      aiLabel: aiSel.options[aiSel.selectedIndex].text
    };
    var scored = compute();
    var totalLow = 0, totalHigh = 0;
    scored.forEach(function (s) { totalLow += s.low; totalHigh += s.high; });

    var html = '';

    if (!scored.length) {
      html += '<h2 id="results-title">Nothing stands out yet.</h2>' +
        '<p class="large-copy">You didn\'t mark any task as taking up time, so there\'s nothing to rank. Go back and set the hours for the tasks that eat your team\'s week.</p>' +
        '<p><button type="button" class="button" data-action="back">Back to the questions <span aria-hidden="true">↑</span></button></p>';
    } else {
      var priority = scored.slice(0, 5);
      var later = scored.slice(5);

      html += '<h2 id="results-title">Roughly <em>' + fmtHours(totalLow) + '–' + fmtHours(totalHigh) +
        ' hours a week</em> could be handed to agents.</h2>';
      html += '<p class="large-copy">That\'s across ' + scored.length + (scored.length === 1 ? ' task' : ' tasks') +
        ' for ' + esc(ctx.type) + ' with ' + esc(ctx.size) + '. It is a rough, indicative figure: the real number depends on how your processes work today, which is exactly what a short discovery would pin down.</p>';

      html += '<h3 class="results-heading">Where to look first</h3>';
      priority.forEach(function (s, i) {
        html += '<article class="result-card">' +
          '<span class="result-rank">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div>' +
          '<h4>' + esc(s.task.label) + '</h4>' +
          '<p class="result-meta"><span>' + esc(s.hoursLabel) + ' a week now</span><span>' + FACTOR[s.task.potential].label + '</span>' +
          '<span>Could free ~' + fmtHours(s.low) + '–' + fmtHours(s.high) + ' h</span></p>' +
          '<p><strong>An agent could:</strong> ' + esc(s.task.agent) + '</p>' +
          '<p class="result-human"><strong>Keep a person on:</strong> ' + esc(s.task.human) + '</p>' +
          '</div></article>';
      });

      if (later.length) {
        html += '<h3 class="results-heading">Worth a look later</h3><ul class="later-list">';
        later.forEach(function (s) {
          html += '<li>' + esc(s.task.label) + ' <span>' + esc(s.hoursLabel) + ' a week</span></li>';
        });
        html += '</ul>';
      }

      html += '<p class="results-honest"><strong>Not everything should be automated.</strong> Anything that amounts to advice, a professional judgement or a sensitive client conversation should stay with a person. A good agent does the legwork and hands over at the right moment.</p>';
    }

    var gov = governanceNote(ctx.ai);
    if (gov) {
      html += '<div class="callout"><h3>' + esc(gov.title) + '</h3><p>' + esc(gov.body) + '</p></div>';
    }

    if (scored.length) {
      var summary = buildSummary(ctx, scored, totalLow, totalHigh);
      var subject = 'AI agent checker results (' + ctx.type + ')';
      var mailto = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(summary);
      html += '<div class="results-cta">' +
        '<h3>Want this turned into a plan?</h3>' +
        '<p>Email your results to us and we\'ll reply with a short, honest view of what\'s worth doing first, and what isn\'t. No obligation and no sales sequence.</p>' +
        '<p><a class="button" href="' + mailto + '">Email us these results <span aria-hidden="true">↗</span></a> ' +
        '<button type="button" class="button button-outline" data-action="back">Change my answers</button></p>' +
        '</div>';
    }

    resultsBody.innerHTML = html;
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultsSection.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    renderResults();
  });

  resultsBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action="back"]');
    if (!btn) return;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

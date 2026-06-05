const GAS_WEB_APP_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

const QUESTIONS = [
  {
    no: 1,
    title: "What is the most appropriate interpretation of the patient's results?",
    options: [
      { code: '315', text: 'The patient is an A1 blood type and has detectable anti-A1 antibodies.' },
      { code: '316', text: 'The patient is an A1 blood type and has detectable warm autoantibodies.' },
      { code: '317', text: 'The patient is a non-A1 blood type and has naturally-occurring anti-A1 antibodies.' },
      { code: '318', text: 'The patient converted to a group O blood type and has naturally-occurring anti-A1 antibodies.' },
    ]
  },
  {
    no: 2,
    title: 'Which of the following is the most likely source of the detected antibodies?',
    options: [
      { code: '319', text: 'Naturally-occurring anti-A1 antibodies of recipient origin' },
      { code: '320', text: 'Passive administration from intravenous immune globulin received six months prior' },
      { code: '321', text: 'Passive administration from transfusion of out-of-group blood products' },
      { code: '322', text: 'Passenger lymphocyte syndrome (PLS) from the minor ABO-incompatible lung transplant' },
    ]
  },
  {
    no: 3,
    title: 'Based on the case study findings, which RBCs should be crossmatched and issued to the patient?',
    options: [
      { code: '323', text: 'Group O, Rh-negative RBCs' },
      { code: '324', text: 'Group O, Rh-positive RBCs' },
      { code: '325', text: 'Group A, Rh-negative RBCs' },
      { code: '326', text: 'Group A, Rh-positive RBCs' },
    ]
  },
  {
    no: 4,
    title: 'The clinical team considered various potential causes of hemolytic anemia and initiated first-line treatment for suspected PLS. Which cells are responsible for causing PLS?',
    options: [
      { code: '327', text: 'Donor B lymphocytes' },
      { code: '328', text: 'Donor T lymphocytes' },
      { code: '329', text: 'Recipient B lymphocytes' },
      { code: '330', text: 'Recipient T lymphocytes' },
    ]
  },
];

let answerKey = {};
let keyPublished = false;

document.addEventListener('DOMContentLoaded', () => {
  renderQuestions();
  renderAnswerKeyForm();
  bindEvents();
  loadAnswerKey();
});

function bindEvents() {
  document.getElementById('btnSave').addEventListener('click', saveAnswers);
  document.getElementById('btnReview').addEventListener('click', saveReview);
  document.getElementById('btnReload').addEventListener('click', loadExistingAnswer);
  document.getElementById('btnSaveKey').addEventListener('click', saveAnswerKey);
  document.getElementById('btnPrint').addEventListener('click', () => {
    syncPrintName();
    window.print();
  });
}

function renderQuestions() {
  const root = document.getElementById('questions');
  root.innerHTML = QUESTIONS.map(q => `
    <div class="question" data-q="${q.no}">
      <div class="question-title">${q.no}. ${escapeHtml(q.title)}</div>
      ${q.options.map(opt => `
        <label class="option">
          <input type="radio" name="q${q.no}" value="${opt.code}">
          <span>${opt.code} ${escapeHtml(opt.text)}</span>
        </label>
      `).join('')}
      <div class="result-box" id="resultQ${q.no}"></div>
      <label class="review-label">เหตุผลทบทวนหลังทราบเฉลย / กรณีตอบผิด
        <textarea class="review-textarea" id="reviewQ${q.no}" placeholder="ให้น้องพิมพ์อธิบายว่าทำไมตนจึงตอบผิด หรือสรุปสิ่งที่เรียนรู้"></textarea>
      </label>
    </div>
  `).join('');
}

function renderAnswerKeyForm() {
  const root = document.getElementById('answerKeyForm');
  root.innerHTML = QUESTIONS.map(q => `
    <div class="answer-key-row">
      <strong>ข้อ ${q.no}</strong>
      <select id="keyQ${q.no}">
        <option value="">-- เลือกเฉลย --</option>
        ${q.options.map(o => `<option value="${o.code}">${o.code} ${escapeHtml(o.text)}</option>`).join('')}
      </select>
      <textarea id="explainQ${q.no}" placeholder="Explanation / note"></textarea>
    </div>
  `).join('');
}

function getProfile() {
  return {
    fullName: document.getElementById('fullName').value.trim(),
    empCode: document.getElementById('empCode').value.trim(),
  };
}

function collectAnswers() {
  const answers = {};
  QUESTIONS.forEach(q => {
    const selected = document.querySelector(`input[name="q${q.no}"]:checked`);
    answers[`Q${q.no}`] = selected ? selected.value : '';
  });
  return answers;
}

function collectReviews() {
  const reviews = {};
  QUESTIONS.forEach(q => {
    reviews[`ReviewReason_Q${q.no}`] = document.getElementById(`reviewQ${q.no}`).value.trim();
  });
  return reviews;
}

async function saveAnswers() {
  const profile = getProfile();
  if (!profile.fullName || !profile.empCode) return showToast('กรุณากรอกชื่อและรหัสพนักงาน');
  const answers = collectAnswers();
  if (Object.values(answers).some(v => !v)) return showToast('กรุณาตอบให้ครบทุกข้อ');
  const res = await postToGas({ action: 'saveAnswers', ...profile, answers });
  if (res.ok) showToast('บันทึกคำตอบเรียบร้อย');
  else showToast(res.message || 'บันทึกไม่สำเร็จ');
}

async function saveReview() {
  const profile = getProfile();
  if (!profile.empCode) return showToast('กรุณากรอกรหัสพนักงานก่อน');
  const res = await postToGas({ action: 'saveReview', ...profile, reviews: collectReviews() });
  if (res.ok) showToast('บันทึกเหตุผลทบทวนเรียบร้อย');
  else showToast(res.message || 'บันทึกไม่สำเร็จ');
}

async function loadExistingAnswer() {
  const profile = getProfile();
  if (!profile.empCode) return showToast('กรุณากรอกรหัสพนักงานก่อนโหลดข้อมูล');
  const res = await postToGas({ action: 'getAnswer', empCode: profile.empCode });
  if (!res.ok || !res.data) return showToast(res.message || 'ไม่พบข้อมูลเดิม');
  document.getElementById('fullName').value = res.data.FullName || profile.fullName;
  QUESTIONS.forEach(q => {
    const ans = res.data[`Q${q.no}`] || '';
    const radio = document.querySelector(`input[name="q${q.no}"][value="${ans}"]`);
    if (radio) radio.checked = true;
    document.getElementById(`reviewQ${q.no}`).value = res.data[`ReviewReason_Q${q.no}`] || '';
  });
  renderResults();
  showToast('โหลดข้อมูลเดิมแล้ว');
}

async function loadAnswerKey() {
  const res = await postToGas({ action: 'getAnswerKey' });
  if (!res.ok) return;
  answerKey = res.answerKey || {};
  keyPublished = !!res.keyPublished;
  document.getElementById('keyPublished').value = keyPublished ? 'TRUE' : 'FALSE';
  QUESTIONS.forEach(q => {
    if (answerKey[`Q${q.no}`]) {
      document.getElementById(`keyQ${q.no}`).value = answerKey[`Q${q.no}`].answer || '';
      document.getElementById(`explainQ${q.no}`).value = answerKey[`Q${q.no}`].explanation || '';
    }
  });
  renderResults();
}

async function saveAnswerKey() {
  const adminPin = document.getElementById('adminPin').value.trim();
  const published = document.getElementById('keyPublished').value === 'TRUE';
  const payloadKey = {};
  QUESTIONS.forEach(q => {
    payloadKey[`Q${q.no}`] = {
      answer: document.getElementById(`keyQ${q.no}`).value,
      explanation: document.getElementById(`explainQ${q.no}`).value.trim(),
    };
  });
  const res = await postToGas({ action: 'saveAnswerKey', adminPin, published, answerKey: payloadKey });
  if (res.ok) {
    answerKey = payloadKey;
    keyPublished = published;
    renderResults();
    showToast('บันทึกเฉลยเรียบร้อย');
  } else showToast(res.message || 'บันทึกเฉลยไม่สำเร็จ');
}

function renderResults() {
  if (!keyPublished) {
    QUESTIONS.forEach(q => document.getElementById(`resultQ${q.no}`).classList.remove('show'));
    return;
  }
  QUESTIONS.forEach(q => {
    const selected = document.querySelector(`input[name="q${q.no}"]:checked`);
    const userAns = selected ? selected.value : '-';
    const key = answerKey[`Q${q.no}`] || {};
    const correct = key.answer && userAns === key.answer;
    const box = document.getElementById(`resultQ${q.no}`);
    box.classList.add('show');
    box.innerHTML = `
      <span class="print-answer-line">คำตอบที่เลือก: ${escapeHtml(userAns)}</span>
      <span class="print-answer-line">เฉลย: ${escapeHtml(key.answer || '-')}</span>
      <span class="${correct ? 'correct' : 'wrong'}">${key.answer ? (correct ? 'ถูก' : 'ผิด') : ''}</span>
      ${key.explanation ? `<div><b>Explanation:</b> ${escapeHtml(key.explanation)}</div>` : ''}
    `;
  });
}

async function postToGas(payload) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('PASTE_YOUR')) {
    return { ok: false, message: 'ยังไม่ได้ใส่ GAS_WEB_APP_URL ใน app.js' };
  }
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

function syncPrintName() {
  const profile = getProfile();
  document.querySelector('[data-print="fullName"]').textContent = profile.fullName || '-';
  document.querySelector('[data-print="empCode"]').textContent = profile.empCode || '-';
  renderResults();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

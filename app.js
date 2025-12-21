// ===== DOM =====
const elIdx = document.getElementById("idx");
const elTotal = document.getElementById("total");
const elScore = document.getElementById("score");
const elModeLabel = document.getElementById("modeLabel");
const elQuestion = document.getElementById("question");
const elHint = document.getElementById("hint");
const elChoices = document.getElementById("choices");

const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const modeBtn = document.getElementById("modeBtn");
const resetBtn = document.getElementById("resetBtn");

const AUTO_NEXT_DELAY = 800;
const qa = document.getElementById("qa");

// ===== State =====
let vocab = [];
let quiz = [];
let current = 0;
let score = 0;
let answered = false;
let mode = "JP_TH"; // "JP_TH" or "TH_JP"


// ===== Utils =====
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeVocab(list) {
  return (list || [])
    .filter(x => x && typeof x.jp === "string" && typeof x.th === "string")
    .map(x => ({ jp: x.jp.trim(), th: x.th.trim() }))
    .filter(x => x.jp && x.th);
}

function getPrompt(item) {
  return mode === "JP_TH" ? item.jp : item.th;
}

function getAnswerText(item) {
  return mode === "JP_TH" ? item.th : item.jp;
}

function buildChoices(correctItem) {
  const pool = vocab.filter(v => v !== correctItem);
  const wrong = shuffle(pool).slice(0, 3);
  const options = shuffle([correctItem, ...wrong]).map(getAnswerText);
  const correctAnswer = getAnswerText(correctItem);
  return { options, correctAnswer };
}

function playQAAnimation() {
  if (!qa) return;
  qa.classList.remove("animate-in");
  // บังคับให้ browser รีเฟรชสถานะก่อนใส่ class กลับ
  void qa.offsetWidth;
  qa.classList.add("animate-in");
}

// ===== Render =====
function render() {
  elTotal.textContent = quiz.length;
  elScore.textContent = score;
  elModeLabel.textContent = (mode === "JP_TH") ? "JP → TH" : "TH → JP";

  if (quiz.length === 0) {
    elIdx.textContent = "0";
    elQuestion.textContent = "ยังไม่มีคำศัพท์";
    elHint.textContent = "ตรวจสอบไฟล์ data/vocab.json";
    elChoices.innerHTML = "";
    return;
  }

  if (current >= quiz.length) {
    elIdx.textContent = quiz.length;
    elQuestion.textContent = "จบแล้ว 🎉";
    elHint.textContent = `คะแนนรวม: ${score}/${quiz.length}`;
    elChoices.innerHTML = "";
    return;
  }

  elIdx.textContent = current + 1;

  const item = quiz[current];
  elQuestion.textContent = getPrompt(item);
  elHint.textContent = "เลือกคำตอบที่ถูกต้อง (เฉลยหลังคลิก)";

  playQAAnimation();

  elChoices.innerHTML = "";

  const { options, correctAnswer } = buildChoices(item);
  answered = false;

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = opt;
    btn.addEventListener("click", () => onChoose(btn, opt, correctAnswer));
    elChoices.appendChild(btn);
  });
}

function onChoose(btn, chosen, correct) {
  if (answered) return;
  answered = true;

  const buttons = [...document.querySelectorAll(".choice")];
  buttons.forEach(b => b.disabled = true);

  // ไฮไลต์เฉลย
  buttons.forEach(b => {
    if (b.textContent === correct) b.classList.add("ok");
  });

  if (chosen === correct) {
    btn.classList.add("ok");
    score++;
    elScore.textContent = score;
    elHint.textContent = "ถูกต้อง ✅";
  } else {
    btn.classList.add("bad");
    elHint.textContent = `ผิด ❌ เฉลย: ${correct}`;
  }

  // 👉 ไปข้อต่อไปอัตโนมัติ
  setTimeout(() => {
    current++;
    render();
  }, AUTO_NEXT_DELAY);
}

// ===== Controls =====
function restart({ reshuffle = true } = {}) {
  quiz = reshuffle ? shuffle(vocab) : vocab.slice();
  current = 0;
  score = 0;
  answered = false;
  render();
}

nextBtn.addEventListener("click", () => {
  if (quiz.length === 0) return;
  current++;
  render();
});

shuffleBtn.addEventListener("click", () => restart({ reshuffle: true }));
resetBtn.addEventListener("click", () => restart({ reshuffle: false }));

modeBtn.addEventListener("click", () => {
  mode = (mode === "JP_TH") ? "TH_JP" : "JP_TH";
  restart({ reshuffle: true });
});

// ===== Load vocab.json =====
async function loadVocab() {
  try {
    const res = await fetch("./data/vocab.json", { cache: "no-store" });
    if (!res.ok) throw new Error("โหลด vocab.json ไม่สำเร็จ");
    const data = await res.json();

    vocab = normalizeVocab(data);

    if (vocab.length < 4) {
      throw new Error("คำศัพท์น้อยกว่า 4 คำ ทำช้อยส์ 4 ข้อไม่ได้");
    }

    restart({ reshuffle: true });
  } catch (err) {
    elQuestion.textContent = "เกิดข้อผิดพลาดในการโหลดคำศัพท์";
    elHint.textContent = String(err.message || err);
    elChoices.innerHTML = "";
  }
}

loadVocab();

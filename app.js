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
const micBtn = document.getElementById("micBtn");
const speakBtn = document.getElementById("speakBtn");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP"; // ภาษาญี่ปุ่น
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

// ===== State =====
let vocab = [];
let quiz = [];
let current = 0;
let score = 0;
let answered = false;
let mode = "JP_TH"; // "JP_TH" or "TH_JP"

// ===== TTS (Japanese) =====
let ttsEnabled = true;

// เลือกเสียงญี่ปุ่น (พยายามเลือกเสียงที่เสถียรกว่า Online/Natural ก่อน)
function pickJaVoice() {
  const voices = speechSynthesis.getVoices() || [];
  const jaVoices = voices.filter(v => (v.lang || "").toLowerCase().startsWith("ja"));
  if (jaVoices.length === 0) return null;

  // Prefer non-online voices if possible
  const nonOnline = jaVoices.find(v => !/online|natural/i.test(v.name || ""));
  return nonOnline || jaVoices[0];
}

let ttsBusy = false;
let ttsQueue = null;
let ttsRetry = 0;

function speakJapanese(text) {
  if (!ttsEnabled) return;
  if (!("speechSynthesis" in window)) return;
  if (!text) return;

  // ถ้ากำลังพูดอยู่: เก็บไว้เป็นคิว (อันล่าสุด) แล้วรอให้จบ
  if (ttsBusy) {
    ttsQueue = text;
    return;
  }

  const synth = speechSynthesis;
  synth.resume(); // กันค้าง paused ใน Edge

  const voice = pickJaVoice();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  if (voice) u.voice = voice;
  u.rate = 0.9;
  u.pitch = 1;
  u.volume = 1;

  ttsBusy = true;

  u.onend = () => {
    ttsBusy = false;
    ttsRetry = 0;
    if (ttsQueue) {
      const next = ttsQueue;
      ttsQueue = null;
      setTimeout(() => speakJapanese(next), 80);
    }
  };

  u.onerror = (e) => {
    // Edge มักขึ้น error = 'interrupted' ถ้า cancel/speak ชนกัน
    // เราจะลองพูดใหม่ 1 ครั้งแบบหน่วงเวลา และหลีกเลี่ยงการยิงถี่
    ttsBusy = false;

    if (e && e.error === "interrupted" && ttsRetry < 1) {
      ttsRetry++;
      setTimeout(() => speakJapanese(text), 250);
      return;
    }
    ttsRetry = 0;
  };

  // ❗ ไม่ใช้ synth.cancel() ทุกครั้ง (ทำให้ interrupted บ่อยใน Edge)
  setTimeout(() => synth.speak(u), 60);
}

// ให้ voices โหลดเสร็จไวขึ้น (บางเครื่องต้องมี onvoiceschanged ถึงจะเติม voices)
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {};
}


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
    .filter(
      (x) =>
        x &&
        typeof x.jp === "string" &&
        typeof x.th === "string"
    )
    .map((x) => ({
      jp: x.jp.trim(),
      th: x.th.trim(),
      kana: typeof x.kana === "string" ? x.kana.trim() : "" // ✅ เก็บ kana
    }))
    .filter((x) => x.jp && x.th);
}


function getPrompt(item) {
  return mode === "JP_TH" ? item.jp : item.th;
}

function getAnswerText(item) {
  return mode === "JP_TH" ? item.th : item.jp;
}

function buildChoices(correctItem) {
  const pool = vocab.filter((v) => v !== correctItem);
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
  elModeLabel.textContent = mode === "JP_TH" ? "JP → TH" : "TH → JP";

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
  const promptText = getPrompt(item);

  elQuestion.textContent = promptText;
  elHint.textContent = "เลือกคำตอบที่ถูกต้อง (เฉลยหลังคลิก)";

  // ✅ อ่านเสียงเมื่ออยู่โหมด JP -> TH
  if (mode === "JP_TH") {
    speakJapanese(item.kana || item.jp);
  }

  playQAAnimation();

  elChoices.innerHTML = "";

  const { options, correctAnswer } = buildChoices(item);
  answered = false;

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = opt;
    btn.addEventListener("click", () => onChoose(btn, opt, correctAnswer));
    elChoices.appendChild(btn);
  });

  if (micBtn) {
    micBtn.onclick = () => startListening(correctAnswer);
  }

  if (speakBtn) {
    speakBtn.disabled = mode !== "JP_TH";

    speakBtn.onclick = () => {
      const currentItem = quiz[current]; // 👈 ดึงใหม่ตรงนี้

      if (!currentItem || !currentItem.kana) {
        alert("ไม่พบ kana สำหรับข้อนี้ (เช็กว่า vocab.json มีฟิลด์ kana)");
        return;
      }

      console.log("🔊 Speak:", currentItem.kana);
      speakJapanese(currentItem.kana);
    };
  }
}

function onChoose(btn, chosen, correct) {
  if (answered) return;
  answered = true;

  const buttons = [...document.querySelectorAll(".choice")];
  buttons.forEach((b) => (b.disabled = true));

  // ไฮไลต์เฉลย
  buttons.forEach((b) => {
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
  mode = mode === "JP_TH" ? "TH_JP" : "JP_TH";
  restart({ reshuffle: true });
});

// ===== Get vocab file path from script tag =====
function getVocabPath() {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const vocabAttr = scripts[i].getAttribute("data-vocab");
    if (vocabAttr) return vocabAttr;
  }
  return "./data/vocab.json"; // default fallback
}

// ===== Load vocab.json =====
async function loadVocab() {
  const vocabPath = getVocabPath();
  try {
    const res = await fetch(vocabPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`โหลด ${vocabPath} ไม่สำเร็จ`);
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

// ======= Mic =======
function startListening(correctAnswer) {
  if (!recognition) {
    alert("เบราว์เซอร์ไม่รองรับ Speech Recognition");
    return;
  }

  micBtn.classList.add("listening");
  micBtn.textContent = "🎤 กำลังฟัง…";

  recognition.start();

  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript.trim();
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎤 พูดคำตอบ";

    checkSpokenAnswer(spoken, correctAnswer);
  };
  recognition.onerror = () => {
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎤 พูดคำตอบ";
  };
  recognition.onend = () => {
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎤 พูดคำตอบ";
  };
}

//========= Check Answer With mic
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\/・、。.,!?]/g, "")
    .replace(/ครับ|ค่ะ|นะ|นะครับ|ค่ะครับ|です|だ/g, "");
}

function checkSpokenAnswer(spoken, correct) {
  const spokenNorm = normalize(spoken);
  const acceptable = getAcceptableAnswers(correct);

  const isCorrect = acceptable.some((ans) => spokenNorm.includes(ans));

  // สร้างปุ่มหลอกเพื่อ reuse onChoose
  const fakeBtn = document.createElement("button");

  onChoose(fakeBtn, isCorrect ? correct : spoken, correct);
}
function getAcceptableAnswers(correct) {
  return correct
    .split("/") // แยก "ครู / อาจารย์"
    .map((x) => normalize(x))
    .filter(Boolean);
}

document.addEventListener(
  "click",
  () => {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  },
  { once: true }
);

loadVocab();

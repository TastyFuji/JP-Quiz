// ===== Conversation Quiz System =====

// DOM Elements
const elIdx = document.getElementById("idx");
const elTotal = document.getElementById("total");
const elScore = document.getElementById("score");
const elQuestion = document.getElementById("question");
const elQuestionTh = document.getElementById("questionTh");
const elHint = document.getElementById("hint");
const elChoices = document.getElementById("choices");
const elDisplayArea = document.getElementById("displayArea");
const elAnswerPattern = document.getElementById("answerPattern");

const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const speakBtn = document.getElementById("speakBtn");

const AUTO_NEXT_DELAY = 1200;

// State
let quizData = null;
let questions = [];
let currentQuestions = []; // คำถามที่สุ่มค่าแล้ว
let current = 0;
let score = 0;
let answered = false;

// ===== Load Quiz Data =====
async function loadQuizData() {
  const quizPath = getQuizPath();
  try {
    const res = await fetch(quizPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`โหลด ${quizPath} ไม่สำเร็จ`);
    quizData = await res.json();
    questions = quizData.questions || [];
    
    if (questions.length === 0) {
      throw new Error("ไม่มีคำถามในไฟล์");
    }
    
    restart();
  } catch (err) {
    elQuestion.textContent = "เกิดข้อผิดพลาด";
    elHint.textContent = String(err.message || err);
    elChoices.innerHTML = "";
  }
}

function getQuizPath() {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const attr = scripts[i].getAttribute("data-quiz");
    if (attr) return attr;
  }
  return "./data/quiz-template.json";
}

// ===== Generate Question with Random Values =====
function generateQuestion(q) {
  const generated = { ...q };
  
  switch (q.type) {
    case "time":
      const time = randomTime();
      generated.generatedTime = time;
      generated.displayValue = formatTimeDisplay(time.hour, time.minute);
      generated.correctAnswer = timeToJapaneseWithPeriod(time.hour, time.minute).full;
      generated.choices = generateTimeChoices(time);
      break;
      
    case "time_range":
      const range = randomTimeRange();
      generated.generatedTimeRange = range;
      generated.displayValue = `${formatTimeDisplay(range.start.hour, range.start.minute)} - ${formatTimeDisplay(range.end.hour, range.end.minute)}`;
      const startJp = timeToJapaneseWithPeriod(range.start.hour, range.start.minute).full;
      const endJp = timeToJapaneseWithPeriod(range.end.hour, range.end.minute).full;
      generated.correctAnswer = `${startJp} kara ${endJp} made`;
      generated.choices = generateTimeRangeChoices(range);
      break;
      
    case "phone":
      const phone = randomPhoneNumber();
      generated.generatedPhone = phone;
      generated.displayValue = phone;
      generated.correctAnswer = phoneDigitsToJapanese(phone.replace(/-/g, ""));
      generated.choices = generatePhoneChoices(phone);
      break;
      
    case "price":
      const priceRange = q.priceRange || [100, 50000];
      const price = randomPrice(priceRange[0], priceRange[1]);
      generated.generatedPrice = price;
      generated.displayValue = formatPriceDisplay(price);
      generated.correctAnswer = numberToJapanese(price) + " en";
      generated.choices = generatePriceChoices(price);
      break;
      
    case "image_location":
      // ใช้ค่าจาก JSON โดยตรง
      generated.displayValue = q.image;
      break;
      
    default:
      // คำถามแบบปกติ ใช้ choices จาก JSON
      break;
  }
  
  return generated;
}

// ===== Generate Choices =====
function generateTimeChoices(correctTime) {
  const correct = timeToJapaneseWithPeriod(correctTime.hour, correctTime.minute).full;
  const choices = [correct];
  
  // สร้าง 3 ตัวเลือกผิด
  while (choices.length < 4) {
    const wrongTime = randomTime();
    const wrongAnswer = timeToJapaneseWithPeriod(wrongTime.hour, wrongTime.minute).full;
    if (!choices.includes(wrongAnswer)) {
      choices.push(wrongAnswer);
    }
  }
  
  return shuffle(choices);
}

function generateTimeRangeChoices(correctRange) {
  const startJp = timeToJapaneseWithPeriod(correctRange.start.hour, correctRange.start.minute).full;
  const endJp = timeToJapaneseWithPeriod(correctRange.end.hour, correctRange.end.minute).full;
  const correct = `${startJp} kara ${endJp} made`;
  const choices = [correct];
  
  while (choices.length < 4) {
    const wrongRange = randomTimeRange();
    const wStartJp = timeToJapaneseWithPeriod(wrongRange.start.hour, wrongRange.start.minute).full;
    const wEndJp = timeToJapaneseWithPeriod(wrongRange.end.hour, wrongRange.end.minute).full;
    const wrongAnswer = `${wStartJp} kara ${wEndJp} made`;
    if (!choices.includes(wrongAnswer)) {
      choices.push(wrongAnswer);
    }
  }
  
  return shuffle(choices);
}

function generatePhoneChoices(correctPhone) {
  const correct = phoneDigitsToJapanese(correctPhone.replace(/-/g, ""));
  const choices = [correct];
  
  while (choices.length < 4) {
    const wrongPhone = randomPhoneNumber();
    const wrongAnswer = phoneDigitsToJapanese(wrongPhone.replace(/-/g, ""));
    if (!choices.includes(wrongAnswer)) {
      choices.push(wrongAnswer);
    }
  }
  
  return shuffle(choices);
}

function generatePriceChoices(correctPrice) {
  const correct = numberToJapanese(correctPrice) + " en";
  const choices = [correct];
  
  // สร้างราคาใกล้เคียงเป็นตัวเลือก
  const variations = [0.5, 0.75, 1.25, 1.5, 2];
  
  while (choices.length < 4) {
    const variation = variations[Math.floor(Math.random() * variations.length)];
    let wrongPrice = Math.round(correctPrice * variation / 100) * 100;
    if (wrongPrice < 100) wrongPrice = 100;
    const wrongAnswer = numberToJapanese(wrongPrice) + " en";
    if (!choices.includes(wrongAnswer) && wrongPrice !== correctPrice) {
      choices.push(wrongAnswer);
    }
  }
  
  return shuffle(choices);
}

// ===== Shuffle =====
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Render =====
function render() {
  elTotal.textContent = currentQuestions.length;
  elScore.textContent = score;
  
  if (currentQuestions.length === 0) {
    elIdx.textContent = "0";
    elQuestion.textContent = "ไม่มีคำถาม";
    elHint.textContent = "ตรวจสอบไฟล์ quiz";
    elChoices.innerHTML = "";
    elDisplayArea.innerHTML = "";
    return;
  }
  
  if (current >= currentQuestions.length) {
    elIdx.textContent = currentQuestions.length;
    elQuestion.textContent = "จบแล้ว 🎉";
    elQuestionTh.textContent = "";
    elHint.textContent = `คะแนนรวม: ${score}/${currentQuestions.length}`;
    elChoices.innerHTML = "";
    elDisplayArea.innerHTML = "";
    elAnswerPattern.textContent = "";
    return;
  }
  
  elIdx.textContent = current + 1;
  
  const q = currentQuestions[current];
  
  // แสดงคำถาม
  elQuestion.textContent = q.question;
  elQuestionTh.textContent = q.questionTh || "";
  elHint.textContent = q.hint || "เลือกคำตอบที่ถูกต้อง";
  elAnswerPattern.textContent = q.answerPattern || "";
  
  // แสดงพื้นที่แสดงผล (เวลา/เบอร์/ราคา/รูป)
  renderDisplayArea(q);
  
  // อ่านคำถามเป็นญี่ปุ่น
  speakJapanese(q.question);
  
  // แสดง choices
  elChoices.innerHTML = "";
  answered = false;
  
  const choices = q.choices || [];
  choices.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    
    // แสดงทั้งญี่ปุ่นและไทย (ถ้ามี)
    if (q.choicesTh && q.choicesTh[idx]) {
      btn.innerHTML = `<span class="choice-jp">${opt}</span><span class="choice-th">${q.choicesTh[idx]}</span>`;
    } else {
      btn.textContent = opt;
    }
    
    btn.addEventListener("click", () => onChoose(btn, opt, q.correctAnswer));
    elChoices.appendChild(btn);
  });
}

function renderDisplayArea(q) {
  elDisplayArea.innerHTML = "";
  
  switch (q.type) {
    case "time":
    case "time_range":
      elDisplayArea.innerHTML = `
        <div class="display-time">
          <span class="time-icon">🕐</span>
          <span class="time-value">${q.displayValue}</span>
        </div>
      `;
      break;
      
    case "phone":
      elDisplayArea.innerHTML = `
        <div class="display-phone">
          <span class="phone-icon">📞</span>
          <span class="phone-value">${q.displayValue}</span>
        </div>
      `;
      break;
      
    case "price":
      elDisplayArea.innerHTML = `
        <div class="display-price">
          <span class="price-icon">💰</span>
          <span class="price-value">${q.displayValue}</span>
        </div>
      `;
      break;
      
    case "image_location":
      if (q.image) {
        elDisplayArea.innerHTML = `
          <div class="display-image">
            <img src="${q.image}" alt="Question image" onerror="this.src='images/placeholder.jpg'">
          </div>
        `;
      }
      break;
  }
}

// ===== Choose Answer =====
function onChoose(btn, chosen, correct) {
  if (answered) return;
  answered = true;
  
  const buttons = [...document.querySelectorAll(".choice")];
  buttons.forEach(b => b.disabled = true);
  
  // ไฮไลต์เฉลย
  buttons.forEach(b => {
    const btnText = b.querySelector(".choice-jp")?.textContent || b.textContent;
    if (btnText === correct) b.classList.add("ok");
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
  
  setTimeout(() => {
    current++;
    render();
  }, AUTO_NEXT_DELAY);
}

// ===== Controls =====
function restart() {
  // สร้างคำถามใหม่พร้อมสุ่มค่า
  currentQuestions = shuffle(questions.map(q => generateQuestion(q)));
  current = 0;
  score = 0;
  answered = false;
  render();
}

nextBtn?.addEventListener("click", () => {
  if (currentQuestions.length === 0) return;
  current++;
  render();
});

shuffleBtn?.addEventListener("click", () => restart());
resetBtn?.addEventListener("click", () => restart());

speakBtn?.addEventListener("click", () => {
  const q = currentQuestions[current];
  if (q) {
    speakJapanese(q.question);
  }
});

// ===== TTS =====
function isResponsiveVoiceReady() {
  return typeof responsiveVoice !== "undefined" && responsiveVoice.voiceSupport();
}

function speakJapanese(text) {
  if (!text) return;
  
  if (isResponsiveVoiceReady()) {
    responsiveVoice.cancel();
    responsiveVoice.speak(text, "Japanese Female", {
      pitch: 1,
      rate: 0.9,
      volume: 1
    });
  } else if ("speechSynthesis" in window) {
    const synth = speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.9;
    setTimeout(() => synth.speak(u), 60);
  }
}

// ===== Init =====
loadQuizData();

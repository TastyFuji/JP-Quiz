// ===== Japanese Number Conversion =====

// ตัวเลข 0-10
const DIGITS = {
  0: "zero", 1: "ichi", 2: "ni", 3: "san", 4: "yon", 5: "go",
  6: "roku", 7: "nana", 8: "hachi", 9: "kyū", 10: "jū"
};

// ตัวเลข 0-10 (สำหรับนับชั่วโมง - มีข้อยกเว้น)
const HOUR_DIGITS = {
  0: "zero", 1: "ichi", 2: "ni", 3: "san", 4: "yo", 5: "go",
  6: "roku", 7: "shichi", 8: "hachi", 9: "ku", 10: "jū",
  11: "jūichi", 12: "jūni"
};

// นาที (มีข้อยกเว้นบางตัว)
const MINUTE_SPECIAL = {
  1: "ippun", 3: "sanpun", 4: "yonpun", 6: "roppun", 
  8: "happun", 10: "juppun", 30: "sanjuppun"
};

// ===== แปลงตัวเลข 0-9 เป็นญี่ปุ่น =====
function digitToJapanese(n) {
  return DIGITS[n] || "";
}

// ===== แปลงตัวเลขหลายหลัก (สำหรับเบอร์โทร) =====
function phoneDigitsToJapanese(numStr) {
  return numStr.split("").map(d => DIGITS[parseInt(d)]).join(" ");
}

// ===== แปลงเวลาเป็นภาษาญี่ปุ่น =====
function timeToJapanese(hour, minute) {
  let result = "";
  
  // ชั่วโมง
  if (hour === 0) {
    result = "zero-ji";
  } else if (hour <= 12) {
    result = HOUR_DIGITS[hour] + "-ji";
  } else {
    // 13-23
    const h = hour > 12 ? hour - 12 : hour;
    result = HOUR_DIGITS[h] + "-ji";
  }
  
  // นาที
  if (minute === 0) {
    // ไม่ต้องเพิ่มอะไร หรือเพิ่ม "chōdo"
  } else if (minute === 30) {
    result += " han"; // ครึ่ง
  } else if (MINUTE_SPECIAL[minute]) {
    result += " " + MINUTE_SPECIAL[minute];
  } else if (minute < 10) {
    result += " " + DIGITS[minute] + "-fun";
  } else {
    const tens = Math.floor(minute / 10);
    const ones = minute % 10;
    if (ones === 0) {
      result += " " + DIGITS[tens] + "juppun";
    } else {
      result += " " + DIGITS[tens] + "jū " + DIGITS[ones] + "-fun";
    }
  }
  
  return result;
}

// ===== แปลงเวลาเป็นญี่ปุ่นแบบละเอียด (gozen/gogo) =====
function timeToJapaneseWithPeriod(hour, minute) {
  const period = hour < 12 ? "gozen" : "gogo";
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  
  let hourText = HOUR_DIGITS[displayHour] + "-ji";
  let minuteText = "";
  
  if (minute === 30) {
    minuteText = "han";
  } else if (minute > 0) {
    if (MINUTE_SPECIAL[minute]) {
      minuteText = MINUTE_SPECIAL[minute];
    } else {
      const tens = Math.floor(minute / 10);
      const ones = minute % 10;
      if (ones === 0 && tens > 0) {
        minuteText = DIGITS[tens] + "juppun";
      } else {
        minuteText = DIGITS[tens] + "jū" + (ones > 0 ? DIGITS[ones] + "-fun" : "");
      }
    }
  }
  
  return {
    period,
    hourText,
    minuteText,
    full: `${period} ${hourText}${minuteText ? " " + minuteText : ""}`
  };
}

// ===== แปลงตัวเลขเป็นญี่ปุ่น (สำหรับราคา) =====
function numberToJapanese(num) {
  if (num === 0) return "zero";
  
  let result = [];
  
  // หมื่น (man)
  const man = Math.floor(num / 10000);
  if (man > 0) {
    if (man === 1) {
      result.push("ichiman");
    } else {
      result.push(DIGITS[man] + "man");
    }
    num = num % 10000;
  }
  
  // พัน (sen)
  const sen = Math.floor(num / 1000);
  if (sen > 0) {
    if (sen === 1) {
      result.push("sen");
    } else if (sen === 3) {
      result.push("sanzen");
    } else if (sen === 8) {
      result.push("hassen");
    } else {
      result.push(DIGITS[sen] + "sen");
    }
    num = num % 1000;
  }
  
  // ร้อย (hyaku)
  const hyaku = Math.floor(num / 100);
  if (hyaku > 0) {
    if (hyaku === 1) {
      result.push("hyaku");
    } else if (hyaku === 3) {
      result.push("sanbyaku");
    } else if (hyaku === 6) {
      result.push("roppyaku");
    } else if (hyaku === 8) {
      result.push("happyaku");
    } else {
      result.push(DIGITS[hyaku] + "hyaku");
    }
    num = num % 100;
  }
  
  // สิบ (jū)
  const juu = Math.floor(num / 10);
  if (juu > 0) {
    if (juu === 1) {
      result.push("jū");
    } else {
      result.push(DIGITS[juu] + "jū");
    }
    num = num % 10;
  }
  
  // หน่วย
  if (num > 0) {
    result.push(DIGITS[num]);
  }
  
  return result.join("-");
}

// ===== สุ่มเวลา (ลงท้ายด้วย 0 หรือ 5 เท่านั้น) =====
function randomTime() {
  const hour = Math.floor(Math.random() * 24); // 0-23
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const minute = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];
  return { hour, minute };
}

// ===== สุ่มช่วงเวลา (เริ่ม-สิ้นสุด) =====
function randomTimeRange() {
  const start = randomTime();
  // สิ้นสุดต้องมากกว่าเริ่มอย่างน้อย 1 ชั่วโมง
  let endHour = start.hour + Math.floor(Math.random() * 10) + 1;
  if (endHour > 23) endHour = 23;
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const endMinute = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];
  return {
    start,
    end: { hour: endHour, minute: endMinute }
  };
}

// ===== สุ่มเบอร์โทรศัพท์ (รูปแบบญี่ปุ่น) =====
function randomPhoneNumber() {
  // รูปแบบ: 0X0-XXXX-XXXX หรือ 0XX-XXX-XXXX
  const prefix = ["090", "080", "070"][Math.floor(Math.random() * 3)];
  const mid = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  const end = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${mid}-${end}`;
}

// ===== สุ่มราคา =====
function randomPrice(min = 100, max = 50000) {
  // สุ่มให้เป็นตัวเลขกลมๆ (หาร 10 ลงตัว)
  const price = Math.floor(Math.random() * ((max - min) / 10 + 1)) * 10 + min;
  return Math.min(price, max);
}

// ===== Format เวลาแสดงผล =====
function formatTimeDisplay(hour, minute) {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m}`;
}

// ===== Format ราคาแสดงผล =====
function formatPriceDisplay(price) {
  return price.toLocaleString() + " ¥";
}

// Export functions
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    digitToJapanese,
    phoneDigitsToJapanese,
    timeToJapanese,
    timeToJapaneseWithPeriod,
    numberToJapanese,
    randomTime,
    randomTimeRange,
    randomPhoneNumber,
    randomPrice,
    formatTimeDisplay,
    formatPriceDisplay
  };
}

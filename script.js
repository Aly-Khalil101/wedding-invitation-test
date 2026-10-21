/* =========================================================
   تفاعلات دعوة الزفاف
   لا توجد مكتبات خارجية أو حاجة إلى خادم.
   عدّل بيانات المناسبة في EVENT أسفل هذا الملف.
   ========================================================= */

const EVENT = {
  couple: "ميار ومحمد",
  start: "2027-08-28T19:00:00+03:00",
  end: "2027-08-28T23:00:00+03:00",
  venue: "Villa Le Marriage",
  address: "١٤ شارع النيل، الزمالك، القاهرة",
  mapUrl: "https://maps.google.com/?q=Villa+Le+Marriage+Cairo",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const openingScreen = $("#openingScreen");
const openButton = $("#openInvitation");
const invitation = $("#invitation");
const continueButton = $("#continueInvitation");
const openingStatus = $("#openingStatus");
const openingHint = $("#openHint");
const invitationPaper = $("#invitationPaper");
const toast = $("#toast");
const weddingAudio = $("#weddingAudio");
const audioToggle = $("#audioToggle");
let toastTimer;

// عرض رسالة صغيرة أسفل الشاشة.
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

// مراحل الفتح منفصلة: كسر الختم، فتح الغطاء، ثم إخراج الورقة ببطء.
// يبدأ وقت القراءة بعد استقرار الورقة بالكامل، ولا تنتقل الصفحة وحدها.
let openingStarted = false;
let readingReady = false;
let invitationIsLeaving = false;
let readTimer;
let paperLiftTimer;
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// الموسيقى تبدأ مباشرة من ضغطة الختم، بصوت منخفض يرتفع تدريجيًا.
// ملف الصوت لا يُضمّن في المشروع بسبب حقوق الأغنية؛ أضف الملف المصرّح لك باستخدامه إلى assets.
const MUSIC_TARGET_VOLUME = 0.24;
let musicIsOn = false;
let musicFadeFrame = 0;
let musicErrorWasShown = false;

function setMusicButtonState(isOn) {
  musicIsOn = isOn;
  audioToggle.classList.toggle("is-playing", isOn);
  audioToggle.setAttribute("aria-pressed", String(isOn));
  const label = isOn ? "إيقاف الموسيقى" : "تشغيل الموسيقى";
  audioToggle.setAttribute("aria-label", label);
  audioToggle.title = label;
}

function cancelMusicFade() {
  if (musicFadeFrame) {
    window.cancelAnimationFrame(musicFadeFrame);
    musicFadeFrame = 0;
  }
}

function fadeMusicTo(targetVolume, duration, onComplete) {
  cancelMusicFade();
  const startVolume = weddingAudio.volume;
  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    // تسارع وتباطؤ خفيفان لتجنّب تغيّر الصوت بصورة حادة.
    const eased = progress * progress * (3 - 2 * progress);
    weddingAudio.volume = startVolume + (targetVolume - startVolume) * eased;

    if (progress < 1) {
      musicFadeFrame = window.requestAnimationFrame(step);
    } else {
      musicFadeFrame = 0;
      if (onComplete) onComplete();
    }
  };

  musicFadeFrame = window.requestAnimationFrame(step);
}

function reportMissingMusic() {
  setMusicButtonState(false);
  if (musicErrorWasShown) return;
  musicErrorWasShown = true;
  showToast(
    "ملف الموسيقى غير موجود. أضف الأغنية داخل مجلد assets بالاسم الموضح في تعليمات المشروع.",
  );
}

async function startWeddingMusic({ restart = false } = {}) {
  audioToggle.hidden = false;
  cancelMusicFade();

  if (restart) {
    try {
      weddingAudio.currentTime = 0;
    } catch (_) {
      /* يتجاهل المتصفح تغيير الوقت قبل تحميل الملف */
    }
    weddingAudio.volume = 0;
  } else if (weddingAudio.paused && weddingAudio.volume > MUSIC_TARGET_VOLUME) {
    weddingAudio.volume = 0;
  }

  try {
    // play() يُستدعى من داخل تفاعل المستخدم على ختم الشمع/زر الصوت.
    await weddingAudio.play();
    setMusicButtonState(true);
    fadeMusicTo(MUSIC_TARGET_VOLUME, 2200);
  } catch (error) {
    reportMissingMusic();
  }
}

function stopWeddingMusic() {
  if (weddingAudio.paused) {
    setMusicButtonState(false);
    return;
  }

  setMusicButtonState(false);
  fadeMusicTo(0, 260, () => weddingAudio.pause());
}

audioToggle.addEventListener("click", () => {
  if (musicIsOn) {
    stopWeddingMusic();
  } else {
    startWeddingMusic();
  }
});

weddingAudio.addEventListener("error", reportMissingMusic);
weddingAudio.addEventListener("ended", () => {
  // احتياطي فقط؛ الملف مضبوط على التكرار، ولذلك لا يُتوقع وصوله للنهاية.
  if (musicIsOn) startWeddingMusic({ restart: true });
});

function revealMainInvitation() {
  if (!readingReady || invitationIsLeaving) return;
  invitationIsLeaving = true;
  continueButton.disabled = true;
  openingScreen.classList.add("is-opening");

  const fadeDuration = reducedMotion ? 0 : 800;
  window.setTimeout(() => {
    openingScreen.hidden = true;
    document.body.classList.remove("is-locked");
    invitation.removeAttribute("inert");
    invitation.setAttribute("aria-hidden", "false");
    $("#top").setAttribute("tabindex", "-1");
    $("#top").focus({ preventScroll: true });
  }, fadeDuration);
}

function showContinuePrompt() {
  readingReady = true;
  openingScreen.classList.add("is-reading");
  openingStatus.textContent = "خد وقتك في قراءة الرسالة";
  openingHint.innerHTML =
    '<span class="opening-screen__hint-dot" aria-hidden="true"></span> اسحب لأسفل أو اضغط على الرسالة للمتابعة';
  continueButton.hidden = false;
  // يفصل إزالة hidden عن إضافة الصنف حتى يظهر الانتقال التدريجي.
  window.requestAnimationFrame(() => continueButton.classList.add("is-ready"));
}

openButton.addEventListener("click", () => {
  if (openingStarted || openButton.disabled) return;

  openingStarted = true;
  openButton.disabled = true;
  // ختم الشمع هو بداية التجربة الصوتية والبصرية كلها.
  void startWeddingMusic({ restart: true });
  openingScreen.classList.add("is-seal-breaking");
  openingScreen.setAttribute("aria-label", "جارٍ فتح ظرف دعوة الزفاف");
  openingStatus.textContent = "لحظة صغيرة… يُفتح الظرف برفق";
  openingHint.innerHTML =
    '<span class="opening-screen__hint-dot" aria-hidden="true"></span> ينفتح الغطاء أولًا، ثم تظهر الرسالة';

  const sealBreakDuration = 580;
  const flapOpenDuration = 1400;
  const pauseAfterFlap = 120;
  const paperLiftDelay = 1050;
  const paperLiftDuration = 1650;
  const paperTravelTime = paperLiftDelay + paperLiftDuration;
  const readingDuration = 2000;

  if (reducedMotion) {
    openingScreen.classList.add(
      "is-flap-opening",
      "is-paper-revealing",
      "is-paper-lifted",
    );
    openingStatus.textContent = "وصلتكم رسالة من ميار ومحمد";
    openingHint.innerHTML =
      '<span class="opening-screen__hint-dot" aria-hidden="true"></span> خذ لحظتك في قراءة الآية والرسالة';
    readTimer = window.setTimeout(showContinuePrompt, readingDuration);
    return;
  }

  // ندي الختم وقتًا كافيًا ليتشقق قبل بداية حركة الغطاء.
  window.setTimeout(() => {
    openingScreen.classList.add("is-flap-opening");
  }, sealBreakDuration);

  // لا تبدأ الورقة في الحركة إلا بعد فتح الغطاء تقريبًا بالكامل.
  window.setTimeout(
    () => {
      openingScreen.classList.add("is-paper-revealing");
      openingStatus.textContent = "وصلتكم رسالة من ميار ومحمد";
      openingHint.innerHTML =
        '<span class="opening-screen__hint-dot" aria-hidden="true"></span> خذ لحظتك في قراءة الآية والرسالة';

      // تظهر حافة الورقة من خلف الظرف أولًا ثم تنتقل للأمام بسلاسة.
      paperLiftTimer = window.setTimeout(() => {
        openingScreen.classList.add("is-paper-lifted");
      }, paperLiftDelay);

      // زر المتابعة يظهر بعد انتهاء حركة الورقة ثم مهلة قراءة مدتها ثانيتان.
      readTimer = window.setTimeout(
        showContinuePrompt,
        paperTravelTime + readingDuration,
      );
    },
    sealBreakDuration + flapOpenDuration + pauseAfterFlap,
  );
});

continueButton.addEventListener("click", revealMainInvitation);

// السحب لأسفل على الورقة يفتح باقي الدعوة، بعد انتهاء وقت القراءة فقط.
let paperPointerStartY = null;
invitationPaper.addEventListener("pointerdown", (event) => {
  if (!readingReady || event.isPrimary === false) return;
  paperPointerStartY = event.clientY;
});
invitationPaper.addEventListener("pointerup", (event) => {
  if (paperPointerStartY === null) return;
  const deltaY = event.clientY - paperPointerStartY;
  paperPointerStartY = null;
  if (readingReady && deltaY > 55) revealMainInvitation();
});
invitationPaper.addEventListener("pointercancel", () => {
  paperPointerStartY = null;
});
invitationPaper.addEventListener("click", () => {
  // لمس/ضغط الرسالة بعد انتهاء مهلة القراءة اختصار بديل للزر.
  if (readingReady) revealMainInvitation();
});

// العد التنازلي: يعتمد على تاريخ المناسبة الموجود في EVENT.
const eventTime = new Date(EVENT.start).getTime();
const countdownFields = {
  days: $("#days"),
  hours: $("#hours"),
  minutes: $("#minutes"),
  seconds: $("#seconds"),
};
const countdownFinished = $("#countdownFinished");
const arabicDigits = new Intl.NumberFormat("ar-EG", {
  maximumFractionDigits: 0,
});

let countdownTimer;

function updateCountdown() {
  const remaining = eventTime - Date.now();

  if (remaining <= 0) {
    Object.values(countdownFields).forEach((field) => {
      field.textContent = "٠";
    });
    countdownFinished.hidden = false;
    window.clearInterval(countdownTimer);
    return;
  }

  const secondsTotal = Math.floor(remaining / 1000);
  const days = Math.floor(secondsTotal / 86400);
  const hours = Math.floor((secondsTotal % 86400) / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  countdownFields.days.textContent = arabicDigits.format(days);
  countdownFields.hours.textContent = arabicDigits.format(hours);
  countdownFields.minutes.textContent = arabicDigits.format(minutes);
  countdownFields.seconds.textContent = arabicDigits.format(seconds);
}

updateCountdown();
countdownTimer = window.setInterval(updateCountdown, 1000);

// تنزيل ملف تقويم .ics ببيانات المناسبة الحالية.
function toCalendarDate(dateString) {
  return new Date(dateString)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function downloadCalendarFile() {
  const start = toCalendarDate(EVENT.start);
  const end = toCalendarDate(EVENT.end);
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mawadda Wedding Invitation//AR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:wedding-${start}@mawadda.local`,
    `DTSTAMP:${toCalendarDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:حفل زفاف ${EVENT.couple}`,
    `LOCATION:${EVENT.venue} - ${EVENT.address}`,
    `DESCRIPTION:يسعدنا حضوركم ومشاركتنا فرحتنا. ${EVENT.mapUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", icsContent], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "wedding-invitation.ics";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("تم تجهيز ملف الموعد للتقويم.");
}

$("#calendarButton").addEventListener("click", downloadCalendarFile);

// مشاركة الدعوة: تستخدم المشاركة الأصلية في الهاتف أو تنسخ الرابط عند عدم توفرها.
async function shareInvitation() {
  const shareData = {
    title: `دعوة زفاف ${EVENT.couple}`,
    text: `يسعدنا دعوتكم لحضور حفل زفاف ${EVENT.couple}.`,
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareData.url);
      showToast("تم نسخ رابط الدعوة.");
    } else {
      showToast("انسخ رابط الصفحة من شريط العنوان لمشاركتها.");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      showToast("لم نتمكن من المشاركة تلقائيًا. انسخ رابط الصفحة يدويًا.");
    }
  }
}

$("#shareButton").addEventListener("click", shareInvitation);
$("#shareButtonFooter").addEventListener("click", shareInvitation);

// معرض اللوحات: السابق والتالي يغيّران اللوحة المعروضة.
const galleryCards = $$("[data-gallery-card]");
const galleryPrev = $("#galleryPrev");
const galleryNext = $("#galleryNext");
const galleryCounter = $("#galleryCounter");
let currentGalleryIndex = 0;

function showGalleryCard(index) {
  currentGalleryIndex = Math.max(0, Math.min(index, galleryCards.length - 1));

  galleryCards.forEach((card, cardIndex) => {
    const isCurrent = cardIndex === currentGalleryIndex;
    card.hidden = !isCurrent;
    card.classList.toggle("is-active", isCurrent);
  });

  galleryPrev.disabled = currentGalleryIndex === 0;
  galleryNext.disabled = currentGalleryIndex === galleryCards.length - 1;
  galleryCounter.textContent = `${arabicDigits.format(currentGalleryIndex + 1)} / ${arabicDigits.format(galleryCards.length)}`;
}

galleryPrev.addEventListener("click", () =>
  showGalleryCard(currentGalleryIndex - 1),
);
galleryNext.addEventListener("click", () =>
  showGalleryCard(currentGalleryIndex + 1),
);
showGalleryCard(0);

// عدد المرافقين: من صفر إلى أربعة.
const guestCountInput = $("#guestCount");
const guestCountOutput = $("#guestCountOutput");
const guestMinus = $("#guestMinus");
const guestPlus = $("#guestPlus");
const companionsField = $("#companionsField");
let companionCount = 0;
const maxCompanions = 4;

function updateCompanionCount() {
  guestCountInput.value = String(companionCount);
  guestCountOutput.textContent = arabicDigits.format(companionCount);
  guestMinus.disabled = companionCount === 0;
  guestPlus.disabled = companionCount === maxCompanions;
}

guestMinus.addEventListener("click", () => {
  companionCount = Math.max(0, companionCount - 1);
  updateCompanionCount();
});

guestPlus.addEventListener("click", () => {
  companionCount = Math.min(maxCompanions, companionCount + 1);
  updateCompanionCount();
});

// إخفاء عدد المرافقين عند عدم تأكيد الحضور.
$$('input[name="attendance"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const attendanceConfirmed =
      $('input[name="attendance"]:checked').value === "yes";
    companionsField.hidden = !attendanceConfirmed;
    if (!attendanceConfirmed) {
      companionCount = 0;
      updateCompanionCount();
    }
  });
});

// النموذج تجريبي فقط: لا يرسل البيانات لأي جهة ولا يحفظها.
$("#rsvpForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = $("#formFeedback");
  const guestName = $("#guestName").value.trim();
  const attendance = $('input[name="attendance"]:checked').value;
  const message = $("#guestMessage").value.trim();

  feedback.classList.remove("is-error");

  if (guestName.length < 2) {
    feedback.textContent = "من فضلك اكتب اسمك بشكل صحيح.";
    feedback.classList.add("is-error");
    feedback.hidden = false;
    $("#guestName").focus();
    return;
  }

  const replies = {
    yes: `شكرًا يا ${guestName}، سعداء إنك هتشاركنا الفرحة${companionCount ? ` ومعاك ${arabicDigits.format(companionCount)} مرافق` : ""}.`,
    no: `شكرًا يا ${guestName} إنك بلغتنا. هتوحشنا، وإن شاء الله نتقابل على خير.`,
    maybe: `شكرًا يا ${guestName}. نتمنى تقدر تكون معانا ونشوفك على خير.`,
  };

  feedback.textContent = `${replies[attendance]}${message ? " وصلتنا كلمتك الجميلة ضمن هذه المعاينة." : ""} ملحوظة: هذا رد تجريبي ولم يُرسل أو يُحفظ.`;
  feedback.hidden = false;
  feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.querySelector('button[type="submit"]').textContent = "تمت المعاينة";
});

// إظهار الأقسام تدريجيًا أثناء النزول في الصفحة، مع دعم المتصفحات القديمة.
const revealSections = $$(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  revealSections.forEach((section) => revealObserver.observe(section));
} else {
  revealSections.forEach((section) => section.classList.add("is-visible"));
}

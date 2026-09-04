export const T = {
  ar: {
    tagline:
      'جري لا نهائي بطفل كوني متحوّل. غيّر شكل جسدك لتعبر الحمم، تكسر الكريستال، وتذوب في الظلال عبر خمسة عوالم.',
    start: 'ابدأ الرحلة',
    retry: 'أعد المحاولة',
    menu: 'القائمة الرئيسية',
    gameover: 'انتهت الرحلة',
    score: 'النقاط',
    distance: 'المسافة',
    combo: 'سلسلة ×',
    dna_collected: 'شظايا الحمض النووي',
    final_score: 'النتيجة النهائية:',
    final_distance: 'المسافة:',
    lane_move: 'الانتقال بين المسارات',
    jump: 'القفز',
    slide: 'الانزلاق',
    forms: 'تبديل الشكل (بلازما/كريستال/ظل)',
    form_plasma: 'بلازما',
    form_crystal: 'كريستال',
    form_shadow: 'ظل',
    near_miss: 'مرور خطير!',
    form_toast: 'الشكل:',
    levelup: 'بيئة جديدة',
    hit: 'اصطدمت!',
    gravity: 'جاذبية مدارية!',
  },
  en: {
    tagline:
      'An infinite run with a shape-shifting cosmic child. Morph your body to cross lava, shatter crystal, and melt into shadows across five worlds.',
    start: 'Start the run',
    retry: 'Retry',
    menu: 'Main menu',
    gameover: 'Run over',
    score: 'Score',
    distance: 'Distance',
    combo: 'Chain ×',
    dna_collected: 'DNA shards',
    final_score: 'Final score:',
    final_distance: 'Distance:',
    lane_move: 'Switch lanes',
    jump: 'Jump',
    slide: 'Slide',
    forms: 'Shift form (Plasma/Crystal/Shadow)',
    form_plasma: 'Plasma',
    form_crystal: 'Crystal',
    form_shadow: 'Shadow',
    near_miss: 'Near miss!',
    form_toast: 'Form:',
    levelup: 'New world',
    hit: 'Collision!',
    gravity: 'Orbital gravity!',
  },
};

let lang = localStorage.getItem('nexus-lang') || 'ar';

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'ar';
  localStorage.setItem('nexus-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  applyTranslations();
}

export function t(key) {
  return T[lang][key] ?? T.ar[key] ?? key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

export function toggleLang() {
  setLang(lang === 'ar' ? 'en' : 'ar');
  return lang;
}

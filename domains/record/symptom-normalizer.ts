// Japanese symptom text → canonical English key
const SYNONYM_MAP: Record<string, string> = {
  // Headache
  "頭痛": "headache",
  "頭が痛い": "headache",
  "頭が重い": "headache",
  "偏頭痛": "migraine",
  "片頭痛": "migraine",

  // Abdominal
  "腹痛": "abdominal_pain",
  "お腹が痛い": "abdominal_pain",
  "腹部痛": "abdominal_pain",
  "胃痛": "stomach_pain",
  "胃が痛い": "stomach_pain",

  // Fatigue
  "疲労": "fatigue",
  "疲れ": "fatigue",
  "だるい": "fatigue",
  "倦怠感": "fatigue",

  // Nausea
  "吐き気": "nausea",
  "むかつき": "nausea",
  "悪心": "nausea",

  // Bloating / cramps
  "腹部膨満感": "bloating",
  "お腹の張り": "bloating",
  "生理痛": "menstrual_cramp",
  "月経痛": "menstrual_cramp",
  "下腹部痛": "lower_abdominal_pain",

  // Back pain
  "腰痛": "back_pain",
  "腰が痛い": "back_pain",

  // Dizziness
  "めまい": "dizziness",
  "立ちくらみ": "orthostatic_dizziness",

  // Fever / chills
  "発熱": "fever",
  "熱がある": "fever",
  "悪寒": "chills",

  // Skin
  "かゆみ": "itching",
  "湿疹": "eczema",
  "発疹": "rash",

  // Other
  "不眠": "insomnia",
  "眠れない": "insomnia",
  "食欲不振": "loss_of_appetite",
  "便秘": "constipation",
  "下痢": "diarrhea",
  "肩こり": "shoulder_stiffness",
  "むくみ": "edema",
  "動悸": "palpitation",
  "息切れ": "shortness_of_breath",
};

export const UNKNOWN_SYMPTOM = "unknown_symptom";

export function normalizeSymptom(raw: string): string {
  if (!raw || raw.trim() === "") return UNKNOWN_SYMPTOM;

  const trimmed = raw.trim();

  // Direct lookup
  if (SYNONYM_MAP[trimmed]) return SYNONYM_MAP[trimmed];

  // Partial match — find longest key that is contained in input
  let best: string | null = null;
  let bestLen = 0;
  for (const [jp, en] of Object.entries(SYNONYM_MAP)) {
    if (trimmed.includes(jp) && jp.length > bestLen) {
      best = en;
      bestLen = jp.length;
    }
  }
  if (best) return best;

  // ASCII / already-English passthrough
  if (/^[a-zA-Z_\s]+$/.test(trimmed)) {
    return trimmed.toLowerCase().replace(/\s+/g, "_");
  }

  return UNKNOWN_SYMPTOM;
}

export function normalizeSymptoms(raws: string[]): string[] {
  return raws.map(normalizeSymptom);
}

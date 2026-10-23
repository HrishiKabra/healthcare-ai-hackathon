import type { PatientLang } from "../schemas";

// Canned translations for common free-form EMT questions in demo mode.
// A real provider translates anything; demo mode only knows these.

export const MOCK_FREEFORM: { english: string; translations: Record<PatientLang, string> }[] = [
  {
    english: "Are you having trouble breathing?",
    translations: { es: "¿Tiene dificultad para respirar?", vi: "Bạn có bị khó thở không?", zh: "您呼吸困难吗？", ar: "هل تجد صعوبة في التنفس؟", hi: "क्या आपको साँस लेने में तकलीफ़ हो रही है?" },
  },
  {
    english: "Is anyone with you?",
    translations: { es: "¿Hay alguien con usted?", vi: "Có ai đi cùng bạn không?", zh: "有人和您在一起吗？", ar: "هل معك أحد؟", hi: "क्या आपके साथ कोई है?" },
  },
  {
    english: "Do you take any blood thinners?",
    translations: { es: "¿Toma algún anticoagulante?", vi: "Bạn có dùng thuốc chống đông máu không?", zh: "您在服用抗凝血药吗？", ar: "هل تتناول أي دواء مميع للدم؟", hi: "क्या आप खून पतला करने की कोई दवा लेते हैं?" },
  },
  {
    english: "Is the pain getting worse?",
    translations: { es: "¿El dolor está empeorando?", vi: "Cơn đau có đang nặng hơn không?", zh: "疼痛在加重吗？", ar: "هل الألم يزداد سوءاً؟", hi: "क्या दर्द बढ़ रहा है?" },
  },
  {
    english: "We are going to give you oxygen.",
    translations: { es: "Le vamos a dar oxígeno.", vi: "Chúng tôi sẽ cho bạn thở oxy.", zh: "我们要给您吸氧。", ar: "سنعطيك الأكسجين.", hi: "हम आपको ऑक्सीजन देने जा रहे हैं।" },
  },
  {
    english: "We are taking you to the hospital now.",
    translations: { es: "Ahora lo llevamos al hospital.", vi: "Bây giờ chúng tôi sẽ đưa bạn đến bệnh viện.", zh: "我们现在送您去医院。", ar: "سننقلك إلى المستشفى الآن.", hi: "हम अभी आपको अस्पताल ले जा रहे हैं।" },
  },
];

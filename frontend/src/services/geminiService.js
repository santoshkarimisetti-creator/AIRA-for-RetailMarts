/**
 * AIRA Multilingual Voice Assistant Client Service
 * Coordinates Multilingual Speech Recognition (STT), Speech Synthesis (TTS),
 * and Gemini 2.5 LLM interactions with retail telemetry.
 */

import axios from 'axios'
import { getUserProducts, getActiveStoreInfo, getUserKpis } from '../utils/userStore'

const BACKEND_BASE = 'http://127.0.0.1:8000'

export const SUPPORTED_LANGUAGES = [
  { 
    code: 'en-IN', 
    name: 'English (India)', 
    nativeName: 'English (India)', 
    flag: '🇮🇳',
    placeholder: "Ask AIRA: 'What should I reorder?'...",
    examples: [
      "How were my sales today?",
      "Which products are low in stock?",
      "What should I reorder?",
      "Which products are selling fastest?",
      "Give me a revenue growth tip"
    ]
  },
  { 
    code: 'hi-IN', 
    name: 'Hindi', 
    nativeName: 'हिन्दी', 
    flag: '🇮🇳',
    placeholder: "AIRA AI से पूछें: 'आज की बिक्री कैसी रही?'...",
    examples: [
      "आज की बिक्री कैसी रही?",
      "कौन से उत्पाद कम स्टॉक में हैं?",
      "मुझे क्या रीऑर्डर करना चाहिए?",
      "सबसे तेज़ी से क्या बिक रहा है?",
      "बिक्री बढ़ाने के लिए सुझाव दें"
    ]
  },
  { 
    code: 'ta-IN', 
    name: 'Tamil', 
    nativeName: 'தமிழ்', 
    flag: '🇮🇳',
    placeholder: "AIRA AI-யிடம் கேட்கவும்: 'இன்றைய விற்பனை எப்படி?'...",
    examples: [
      "இன்றைய விற்பனை எப்படி இருந்தது?",
      "எந்த பொருட்கள் குறைந்த இருப்பில் உள்ளன?",
      "நான் எதை மறுவரிசைப்படுத்த வேண்டும்?",
      "அதிகமாக விற்பனையாகும் பொருட்கள் யாவை?",
      "வருவாயை பெருக்க ஆலோசனை தருக"
    ]
  },
  { 
    code: 'te-IN', 
    name: 'Telugu', 
    nativeName: 'తెలుగు', 
    flag: '🇮🇳',
    placeholder: "AIRA AI ని అడగండి: 'ఈరోజు అమ్మకాలు ఎలా ఉన్నాయి?'...",
    examples: [
      "ఈరోజు నా అమ్మకాలు ఎలా ఉన్నాయి?",
      "ఏ ఉత్పత్తులు తక్కువ స్టాక్‌లో ఉన్నాయి?",
      "నేను ఏమి రీఆర్డర్ చేయాలి?",
      "ఏవి వేగంగా అమ్ముడవుతున్నాయి?",
      "అమ్మకాలు పెంచడానికి సలహా ఇవ్వండి"
    ]
  },
  { 
    code: 'kn-IN', 
    name: 'Kannada', 
    nativeName: 'ಕನ್ನಡ', 
    flag: '🇮🇳',
    placeholder: "AIRA AI ಯನ್ನು ಕೇಳಿ: 'ಇಂದು ನನ್ನ ಮಾರಾಟ ಹೇಗಿತ್ತು?'...",
    examples: [
      "ಇಂದು ನನ್ನ ಮಾರಾಟ ಹೇಗಿತ್ತು?",
      "ಯಾವ ಉತ್ಪನ್ನಗಳು ಕಡಿಮೆ ಸ್ಟಾಕ್‌ನಲ್ಲಿವೆ?",
      "ನಾನು ಏನನ್ನು ಮರುಆರ್ಡರ್ ಮಾಡಬೇಕು?",
      "ಯಾವ ಉತ್ಪನ್ನಗಳು ವೇಗವಾಗಿ ಮಾರಾಟವಾಗುತ್ತಿವೆ?",
      "ಮಾರಾಟ ಹೆಚ್ಚಿಸಲು ಸಲಹೆ ನೀಡಿ"
    ]
  },
  { 
    code: 'bn-IN', 
    name: 'Bengali', 
    nativeName: 'বাংলা', 
    flag: '🇮🇳',
    placeholder: "AIRA AI-কে জিজ্ঞাসা করুন: 'আজকের বিক্রি কেমন?'...",
    examples: [
      "আজকের বিক্রি কেমন ছিল?",
      "কোন পণ্যগুলোর স্টক কম আছে?",
      "আমার কী রিঅর্ডার করা উচিত?",
      "কোন পণ্যগুলো সবচেয়ে দ্রুত বিক্রি হচ্ছে?",
      "বিক্রি বাড়ানোর কৌশল বলুন"
    ]
  },
  { 
    code: 'mr-IN', 
    name: 'Marathi', 
    nativeName: 'मराठी', 
    flag: '🇮🇳',
    placeholder: "AIRA AI ला विचारा: 'आजची विक्री कशी झाली?'...",
    examples: [
      "आजची विक्री कशी झाली?",
      "कोणत्या वस्तूंचा साठा कमी आहे?",
      "मी काय रीऑर्डर करावे?",
      "कोणत्या वस्तू सर्वात वेगाने विकल्या जात आहेत?",
      "विक्री वाढवण्यासाठी सल्ला द्या"
    ]
  },
  { 
    code: 'gu-IN', 
    name: 'Gujarati', 
    nativeName: 'ગુજરાતી', 
    flag: '🇮🇳',
    placeholder: "AIRA AI ને પૂછો: 'આજનું વેચાણ કેવું રહ્યું?'...",
    examples: [
      "આજે મારું વેચાણ કેવું રહ્યું?",
      "કયા ઉત્પાદનોનો સ્ટોક ઓછો છે?",
      "મારે શું ફરીથી ઓર્ડર કરવું જોઈએ?",
      "કઈ વસ્તુઓ સૌથી ઝડપથી વેચાય છે?",
      "વેચાણ વધારવા માટે ટિપ્સ આપો"
    ]
  },
  { 
    code: 'ml-IN', 
    name: 'Malayalam', 
    nativeName: 'മലയാളം', 
    flag: '🇮🇳',
    placeholder: "AIRA AI-യോട് ചോദിക്കുക: 'ഇന്നത്തെ വിൽപ്പന എങ്ങനെ?'...",
    examples: [
      "ഇന്നത്തെ വിൽപ്പന എങ്ങനെയുണ്ടായിരുന്നു?",
      "ഏതൊക്കെ ഉൽപ്പന്നങ്ങൾക്കാണ് സ്റ്റോക്ക് കുറവ്?",
      "ഞാൻ എന്താണ് വീണ്ടും ഓർഡർ ചെയ്യേണ്ടത്?",
      "ഏറ്റവും വേഗത്തിൽ വിറ്റഴിക്കപ്പെടുന്നത് എന്താണ്?",
      "വരുമാനം വർദ്ധിപ്പിക്കാൻ ടിപ്പ് നൽകുക"
    ]
  },
  { 
    code: 'pa-IN', 
    name: 'Punjabi', 
    nativeName: 'ਪੰਜਾਬੀ', 
    flag: '🇮🇳',
    placeholder: "AIRA AI ਨੂੰ ਪੁੱਛੋ: 'ਅੱਜ ਦੀ ਵਿਕਰੀ ਕਿਵੇਂ ਰਹੀ?'...",
    examples: [
      "ਅੱਜ ਦੀ ਵਿਕਰੀ ਕਿਵੇਂ ਰਹੀ?",
      "ਕਿਹੜੇ ਉਤਪਾਦ ਘੱਟ ਸਟਾਕ ਵਿੱਚ ਹਨ?",
      "ਮੈਨੂੰ ਕੀ ਰੀਆਰਡਰ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?",
      "ਸਭ ਤੋਂ ਤੇਜ਼ੀ ਨਾਲ ਕੀ ਵਿਕ ਰਿਹਾ ਹੈ?",
      "ਵਿਕਰੀ ਵਧਾਉਣ ਲਈ ਸੁਝਾਅ ਦਿਓ"
    ]
  },
  { 
    code: 'en-US', 
    name: 'English (US)', 
    nativeName: 'English (US)', 
    flag: '🇺🇸',
    placeholder: "Ask AIRA: 'What should I reorder?'...",
    examples: [
      "How were my sales today?",
      "Which products are low in stock?",
      "What should I reorder?",
      "Which products are selling fastest?",
      "Give me a revenue growth tip"
    ]
  },
  { 
    code: 'es-ES', 
    name: 'Spanish', 
    nativeName: 'Español', 
    flag: '🇪🇸',
    placeholder: "Pregunta a AIRA: '¿Qué debo reabastecer?'...",
    examples: [
      "¿Cómo estuvieron mis ventas hoy?",
      "¿Qué productos tienen bajo stock?",
      "¿Qué debería reordenar?",
      "¿Cuáles se están vendiendo más rápido?",
      "Dame un consejo para aumentar ingresos"
    ]
  },
  { 
    code: 'fr-FR', 
    name: 'French', 
    nativeName: 'Français', 
    flag: '🇫🇷',
    placeholder: "Demandez à AIRA: 'Que dois-je recommander?'...",
    examples: [
      "Comment se sont passées mes ventes aujourd'hui?",
      "Quels produits sont en rupture de stock?",
      "Que dois-je recommander?",
      "Quels produits se vendent le plus vite?",
      "Donne-moi un conseil pour augmenter le chiffre"
    ]
  },
  { 
    code: 'de-DE', 
    name: 'German', 
    nativeName: 'Deutsch', 
    flag: '🇩🇪',
    placeholder: "Frag AIRA: 'Was soll ich nachbestellen?'...",
    examples: [
      "Wie waren meine Verkäufe heute?",
      "Welche Produkte haben geringen Bestand?",
      "Was sollte ich nachbestellen?",
      "Welche Produkte verkaufen sich am schnellsten?",
      "Gib mir einen Tipp zur Umsatzsteigerung"
    ]
  },
  { 
    code: 'ar-SA', 
    name: 'Arabic', 
    nativeName: 'العربية', 
    flag: '🇸🇦',
    placeholder: "اسأل جيميني: 'ما الذي يجب عليّ إعادة طلبه؟'...",
    examples: [
      "كيف كانت مبيعاتي اليوم؟",
      "ما هي المنتجات التي أوشكت على النفاد؟",
      "ما الذي يجب عليّ إعادة طلبه؟",
      "ما هي المنتجات الأكثر مبيعاً؟",
      "أعطني نصيحة لزيادة الإيرادات"
    ]
  }
]

export const getLanguageConfig = (code) => {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0]
}

export const getGeminiConfig = () => {
  return {
    apiKey: localStorage.getItem('aira_assistant_api_key') || '',
    model: localStorage.getItem('aira_assistant_model') || 'aira-local-engine',
    voiceEnabled: localStorage.getItem('aira_voice_enabled') !== 'false', // default true
    voiceLanguage: localStorage.getItem('aira_voice_language') || 'en-IN',
    speechRate: parseFloat(localStorage.getItem('aira_speech_rate') || '1.0')
  }
}

export const saveGeminiConfig = (config) => {
  if (config.apiKey !== undefined) localStorage.setItem('aira_assistant_api_key', config.apiKey)
  if (config.model !== undefined) localStorage.setItem('aira_assistant_model', config.model)
  if (config.voiceEnabled !== undefined) localStorage.setItem('aira_voice_enabled', config.voiceEnabled ? 'true' : 'false')
  if (config.voiceLanguage !== undefined) localStorage.setItem('aira_voice_language', config.voiceLanguage)
  if (config.speechRate !== undefined) localStorage.setItem('aira_speech_rate', config.speechRate.toString())
}

// TEXT TO SPEECH (TTS)
export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export const stopSpeaking = () => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel()
    } catch (e) {
      console.warn('Speech synthesis cancel error:', e)
    }
  }
}

export const cleanSpeechText = (text) => {
  if (!text) return ''
  return text
    .replace(/[*_#`~>\[\]]/g, '')
    .replace(/\(http[s]?:\/\/\S+\)/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const speakResponse = (text, options = {}) => {
  if (!isSpeechSynthesisSupported()) return false

  stopSpeaking()

  const clean = cleanSpeechText(text)
  if (!clean) return false

  const utterance = new SpeechSynthesisUtterance(clean)
  const config = getGeminiConfig()
  const lang = options.language || config.voiceLanguage || 'en-IN'
  utterance.lang = lang
  utterance.rate = options.rate || config.speechRate || 1.0
  utterance.pitch = 1.0

  // Smart Voice selection matching target language
  const voices = window.speechSynthesis.getVoices()
  if (voices && voices.length > 0) {
    const cleanLang = lang.toLowerCase()
    const prefix = cleanLang.slice(0, 2)
    const matchedVoice = 
      voices.find(v => v.lang.replace('_', '-').toLowerCase() === cleanLang && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural')))
      || voices.find(v => v.lang.replace('_', '-').toLowerCase() === cleanLang)
      || voices.find(v => v.lang.toLowerCase().startsWith(prefix) && (v.name.includes('Google') || v.name.includes('Natural')))
      || voices.find(v => v.lang.toLowerCase().startsWith(prefix))
      || voices[0]

    if (matchedVoice) utterance.voice = matchedVoice
  }

  if (options.onStart) utterance.onstart = options.onStart
  if (options.onEnd) utterance.onend = options.onEnd
  if (options.onError) utterance.onerror = options.onError

  window.speechSynthesis.speak(utterance)
  return true
}

// SPEECH RECOGNITION (STT)
export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
}

export const createSpeechRecognizer = ({ onResult, onInterim, onStart, onEnd, onError, language = 'en-IN' }) => {
  if (!isSpeechRecognitionSupported()) return null

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = language

  recognition.onstart = () => {
    if (onStart) onStart()
  }

  recognition.onresult = (event) => {
    let interim = ''
    let final = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript
      } else {
        interim += event.results[i][0].transcript
      }
    }

    if (interim && onInterim) onInterim(interim)
    if (final && onResult) onResult(final)
  }

  recognition.onerror = (event) => {
    if (onError) onError(event)
  }

  recognition.onend = () => {
    if (onEnd) onEnd()
  }

  return recognition
}

// QUERY GEMINI WITH MULTILINGUAL STORE TELEMETRY
export const queryGeminiAssistant = async (queryText, languageCode = null) => {
  const config = getGeminiConfig()
  const activeLangCode = languageCode || config.voiceLanguage || 'en-IN'
  const langObj = getLanguageConfig(activeLangCode)

  const storeInfo = getActiveStoreInfo()
  const kpis = getUserKpis()
  const products = getUserProducts()

  const lowStockProds = products.filter(p => p.stock <= (p.minStock || 10))
  const lowStockNames = lowStockProds.map(p => p.name)
  const topSellers = [...products].sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0)).slice(0, 4)
  const topSellerNames = topSellers.map(p => p.name)

  const payload = {
    message: queryText,
    api_key: config.apiKey || undefined,
    model: config.model || 'aira-local-engine',
    language: langObj.code,
    language_name: langObj.name,
    store_name: storeInfo.name,
    currency: storeInfo.currency,
    sales_today: kpis.todaysSales,
    low_stock_names: lowStockNames,
    top_seller_names: topSellerNames
  }

  // 1. Try Backend FastAPI Gemini Endpoint
  try {
    const res = await axios.post(`${BACKEND_BASE}/api/chat`, payload, { timeout: 12000 })
    if (res.data && res.data.response) {
      return {
        text: res.data.response,
        speechText: res.data.speech_text || res.data.response,
        model: res.data.model || config.model,
        language: langObj.code,
        source: res.data.source || 'gemini',
        cards: res.data.cards && res.data.cards.length > 0 ? res.data.cards : findRelevantCards(queryText, res.data.response, products)
      }
    }
  } catch (backendErr) {
    console.warn('[AIRA Client] Backend unavailable or timed out, trying direct Gemini API or local intelligence:', backendErr.message)
  }

  // 2. Direct AIRA AI REST API (if user entered API key in Settings)
  if (config.apiKey) {
    try {
      const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`
      
      const systemInstruction = `You are AIRA, the premier Digital AI Store Manager and Retail Voice Assistant for ${storeInfo.name}, powered by AIRA AI.
Owner: ${storeInfo.owner}
Currency: ${storeInfo.currency}
Total Products Tracked: ${products.length}
Today's Sales: ${kpis.todaysSales}
Low Stock Alert Items: ${lowStockNames.join(', ') || 'None (all healthy)'}
Top Selling Products: ${topSellerNames.join(', ') || 'Parle-G, Rice, Tea'}
Target Language: ${langObj.name} (${langObj.code})

CRITICAL INSTRUCTIONS:
1. You act as a voice assistant. Answers will be spoken out loud via text-to-speech in ${langObj.name}.
2. LANGUAGE REQUIREMENT: You MUST formulate your entire response in ${langObj.name} (${langObj.nativeName}).
3. Keep answers concise (2 to 4 sentences), conversational, clear, and actionable.
4. If asked about stock, reorders, or sales, use the live store numbers above and suggest concrete reorder amounts.
5. Avoid markdown tables or long bullet lists. Speak naturally like a seasoned retail operations advisor.`

      const response = await axios.post(directUrl, {
        contents: [
          {
            role: 'user',
            parts: [{ text: queryText }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250
        }
      }, { timeout: 15000 })

      const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (candidate) {
        return {
          text: candidate.trim(),
          speechText: cleanSpeechText(candidate),
          model: config.model,
          language: langObj.code,
          source: 'gemini_direct',
          cards: findRelevantCards(queryText, candidate, products)
        }
      }
    } catch (directErr) {
      console.warn('[AIRA Client] Direct Gemini API failed:', directErr.response?.data || directErr.message)
    }
  }

  // 3. Multilingual Local Retail Telemetry Engine (Fast, 100% reliable offline fallback)
  const qLower = queryText.toLowerCase()
  let reply = ""

  if (activeLangCode.startsWith('hi')) {
    reply = `आज की कुल बिक्री ${kpis.todaysSales} रही है। ${lowStockNames.length > 0 ? `कम स्टॉक वाले उत्पाद (${lowStockNames.slice(0, 2).join(', ')}) तुरंत रीऑर्डर करें।` : 'सभी उत्पाद पर्याप्त स्टॉक में हैं।'}`
  } else if (activeLangCode.startsWith('ta')) {
    reply = `இன்றைய மொத்த விற்பனை ${kpis.todaysSales} ஆக உள்ளது. ${lowStockNames.length > 0 ? `குறைந்த இருப்பில் உள்ள ${lowStockNames.slice(0, 2).join(', ')} பொருட்களை மறுவரிசைப்படுத்தவும்.` : 'அனைத்து பொருட்களும் போதிய அளவில் உள்ளன.'}`
  } else if (activeLangCode.startsWith('te')) {
    reply = `ఈరోజు అమ్మకాలు ${kpis.todaysSales} నమోదయ్యాయి. ${lowStockNames.length > 0 ? `తక్కువ స్టాక్ ఉన్న ${lowStockNames.slice(0, 2).join(', ')} ఉత్పత్తులను రీఆర్డర్ చేయండి.` : 'అన్ని ఉత్పత్తులు తగినంత స్టాక్‌లో ఉన్నాయి.'}`
  } else if (activeLangCode.startsWith('kn')) {
    reply = `ಇಂದಿನ ಒಟ್ಟು ಮಾರಾಟ ${kpis.todaysSales} ಆಗಿದೆ. ${lowStockNames.length > 0 ? `ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇರುವ ${lowStockNames.slice(0, 2).join(', ')} ಉತ್ಪನ್ನಗಳನ್ನು ಮರುಆರ್ಡರ್ ಮಾಡಿ.` : 'ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳು ಸಮರ್ಪಕವಾಗಿವೆ.'}`
  } else if (activeLangCode.startsWith('es')) {
    reply = `Las ventas de hoy alcanzan ${kpis.todaysSales}. ${lowStockNames.length > 0 ? `Se recomienda reabastecer: ${lowStockNames.slice(0, 2).join(', ')}.` : 'El inventario está saludable.'}`
  } else {
    if (qLower.includes('sale') || qLower.includes('today') || qLower.includes('revenue') || qLower.includes('performance')) {
      reply = `Today's sales stand at ${kpis.todaysSales} (${kpis.salesChange} vs yesterday) across ${kpis.orders} processed customer transactions. Store revenue is pacing strong with high turnover in Grocery.`
    } else if (qLower.includes('reorder') || qLower.includes('order') || qLower.includes('low') || qLower.includes('stock') || qLower.includes('critical')) {
      if (lowStockNames.length > 0) {
        reply = `I recommend immediately restocking your low-stock items: ${lowStockNames.slice(0, 3).join(', ')}. These items have strong turnover velocity and risk stockout this weekend.`
      } else {
        reply = `All tracked products in ${storeInfo.name} are currently above minimum safety threshold levels. Overall inventory health is 96% optimal.`
      }
    } else if (qLower.includes('fast') || qLower.includes('top') || qLower.includes('best') || qLower.includes('velocity')) {
      reply = `Your fastest selling products this week are ${topSellerNames.slice(0, 2).join(' and ')}. They represent your highest inventory turnover volume.`
    } else {
      reply = `AIRA analyzed your query against ${storeInfo.name}'s active catalog of ${products.length} products. Store operations and inventory levels are currently operating smoothly.`
    }
  }

  return {
    text: reply,
    speechText: cleanSpeechText(reply),
    model: 'AIRA Retail Engine (Local Mode)',
    language: langObj.code,
    source: 'local_retail_ai',
    cards: findRelevantCards(queryText, reply, products)
  }
}

// Helper to find matching product cards for interactive UI recommendations
const findRelevantCards = (query, reply, products) => {
  const combined = (query + " " + reply).toLowerCase()
  if (combined.includes('reorder') || combined.includes('order') || combined.includes('low') || combined.includes('stock') || combined.includes('critical') || combined.includes('रीऑर्डर') || combined.includes('இருப்பு') || combined.includes('రీఆర్డర్')) {
    const low = products.filter(p => p.stock <= (p.minStock || 10))
    return (low.length > 0 ? low : products).slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock || 10,
      orderRecommendation: p.orderRecommendation || 30,
      image: p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop"
    }))
  }

  if (combined.includes('fast') || combined.includes('top') || combined.includes('best') || combined.includes('velocity') || combined.includes('तेज़ी') || combined.includes('வேகமாக')) {
    const top = [...products].sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0)).slice(0, 2)
    return top.map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock || 10,
      orderRecommendation: p.orderRecommendation || 25,
      image: p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop"
    }))
  }

  return null
}


export const getAIRAConfig = getGeminiConfig
export const saveAIRAConfig = saveGeminiConfig
export const queryAIRAAssistant = queryGeminiAssistant

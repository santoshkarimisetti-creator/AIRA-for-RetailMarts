import ProductImage from './common/ProductImage'
import { useState, useRef, useEffect } from 'react'
import { 
  MessageSquare, X, Send, Mic, MicOff, Sparkles, Volume2, VolumeX, 
  Square, Settings, Key, ArrowRight, BrainCircuit, RotateCcw, 
  ExternalLink, CheckCircle2, ChevronDown, Globe, Languages, Check
} from 'lucide-react'
import { 
  speakResponse, stopSpeaking, 
  getAIRAConfig, saveAIRAConfig,
  isSpeechRecognitionSupported, createSpeechRecognizer
} from '../services/geminiService'

const ASSISTANT_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', bcp: 'en-IN', flag: '🇬🇧' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', bcp: 'te-IN', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', bcp: 'hi-IN', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', bcp: 'ta-IN', flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', bcp: 'ml-IN', flag: '🇮🇳' }
]

const LANGUAGE_SUGGESTIONS = {
  en: [
    "What are today's sales?",
    "Which items sales are very low in our Store",
    "Which product gives highest profit?",
    "Which items are top selling?",
    "Price of ghee?",
    "Which items are low in stock?",
    "Total sales of the store",
    "How much stock of milk is left?",
    "Which items have the lowest profit?",
    "Highest margin items",
    "Most expensive product",
    "Cheapest product in store",
    "Which items are out of stock?",
    "Items with plenty of stock",
    "Restock 20 units of ghee"
  ],
  te: [
    "ఈ రోజు అమ్మకాలు ఎంత?",
    "స్టోర్‌లో తక్కువగా అమ్ముడైన వస్తువులు ఏవి?",
    "ఏ వస్తువు ఎక్కువ లాభం ఇస్తుంది?",
    "ఎక్కువగా అమ్ముడవుతున్న వస్తువులు ఏవి?",
    "నెయ్యి ధర ఎంత?",
    "ఏ వస్తువుల స్టాక్ తక్కువగా ఉంది?",
    "స్టోర్ మొత్తం అమ్మకాలు ఎంత?",
    "పాలు ఎంత స్టాక్ ఉంది?",
    "తక్కువ లాభం ఇచ్చే వస్తువులు ఏవి?",
    "అత్యధిక మార్జిన్ ఉన్న వస్తువులు ఏవి?",
    "అత్యంత ఖరీదైన వస్తువు ఏది?",
    "అతి తక్కువ ధర గల వస్తువు ఏది?",
    "స్టాక్ పూర్తిగా అయిపోయిన వస్తువులు ఏవి?",
    "ఎక్కువ స్టాక్ ఉన్న వస్తువులు ఏవి?",
    "20 యూనిట్ల నెయ్యి యాడ్ చేయండి"
  ],
  hi: [
    "आज की कुल बिक्री कितनी हुई?",
    "दुकान में सबसे कम बिक्री वाला सामान कौन सा है?",
    "सबसे ज्यादा मुनाफा किसमें है?",
    "सबसे ज्यादा बिकने वाला सामान कौन सा है?",
    "घी की कीमत क्या है?",
    "किन सामानों का स्टॉक कम है?",
    "दुकान की कुल बिक्री कितनी है?",
    "दूध कितना बचा है?",
    "सबसे कम मुनाफा किसमें है?",
    "हाई मार्जिन प्रोडक्ट्स कौन से हैं?",
    "सबसे महंगा सामान कौन सा है?",
    "सबसे सस्ता सामान कौन सा है?",
    "कौन से सामान आउट ऑफ स्टॉक हैं?",
    "सबसे ज्यादा स्टॉक किसका है?",
    "20 यूनिट घी जोड़ें"
  ],
  ta: [
    "இன்றைய விற்பனை எவ்வளவு?",
    "குறைந்த விற்பனையான பொருட்கள் எவை?",
    "அதிக லாபம் தரும் பொருள் எது?",
    "அதிகம் விற்பனையான பொருட்கள் எவை?",
    "நெய் விலை என்ன?",
    "குறைந்த இருப்பு பொருட்கள் எவை?",
    "கடையின் மொத்த விற்பனை எவ்வளவு?",
    "பால் இருப்பு எவ்வளவு உள்ளது?",
    "குறைந்த லாபம் தரும் பொருட்கள் எவை?",
    "அதிக மார்ஜின் உள்ள பொருட்கள் எவை?",
    "அதிக விலையுள்ள பொருள் எது?",
    "குறைந்த விலையுள்ள பொருள் எது?",
    "முற்றிலும் தீர்ந்துபோன பொருட்கள் எவை?",
    "அதிக இருப்பு உள்ள பொருட்கள் எவை?",
    "20 அலகுகள் நெய் சேர்க்கவும்"
  ],
  ml: [
    "ഇന്നത്തെ വിൽപ്പന എത്രയാണ്?",
    "ഏറ്റവും കുറഞ്ഞ വിൽപ്പനയുള്ള ഉൽപ്പന്നങ്ങൾ ഏവ?",
    "ഏറ്റവും കൂടുതൽ ലാഭം നൽകുന്ന ഉൽപ്പന്നം ഏതാണ്?",
    "ഏറ്റവും കൂടുതൽ വിറ്റഴിഞ്ഞ ഉൽപ്പന്നങ്ങൾ ഏവ?",
    "നെയ്യ് വില എത്രയാണ്?",
    "സ്റ്റോക്ക് കുറഞ്ഞ സാധനങ്ങൾ ഏവ?",
    "കടയുടെ ആകെ വിൽപ്പന എത്രയാണ്?",
    "പാൽ സ്റ്റോക്ക് എത്രയുണ്ട്?",
    "ഏറ്റവും കുറഞ്ഞ ലാഭം നൽകുന്ന സാധനങ്ങൾ ഏവ?",
    "കൂടുതൽ മാർജിൻ ഉള്ള ഉൽപ്പന്നങ്ങൾ ഏവ?",
    "ഏറ്റവും വിലകൂടിയ സാധനം ഏതാണ്?",
    "ഏറ്റവും വിലകുറഞ്ഞ സാധനം ഏതാണ്?",
    "തീർന്നുപോയ സാധനങ്ങൾ ഏവ?",
    "കൂടുതൽ സ്റ്റോക്ക് ഉള്ള സാധനങ്ങൾ ഏവ?",
    "20 യൂണിറ്റ് നെയ്യ് ചേർക്കുക"
  ]
}

const LANGUAGE_PLACEHOLDERS = {
  en: "Ask AIRA: 'What are today's sales?', 'How much rice stock is left?'...",
  te: "అడగండి: 'ఈ రోజు sales ఎంత?', 'నూనె stock ఎంత ఉంది?'...",
  hi: "पूछें: 'आज की sales कितनी हुई?', 'चावल का स्टॉक कितना है?'...",
  ta: "கேளுங்கள்: 'இன்று sales எவ்வளவு?', 'அரிசி இருப்பு எவ்வளவு?'...",
  ml: "ചോദിക്കൂ: 'ഇന്നത്തെ sales എത്രയാണ്?', 'എണ്ണ സ്റ്റോക്ക് എത്രയുണ്ട്?'..."
}

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceStatusText, setVoiceStatusText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  
  // Active regional language (English, Telugu, Hindi, Tamil, Malayalam)
  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem('aira_assistant_lang') || 'en'
  })

  // AIRA settings
  const [config, setConfig] = useState(getAIRAConfig())

  const activeLangObj = ASSISTANT_LANGUAGES.find(l => l.code === selectedLang) || ASSISTANT_LANGUAGES[0]

  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'ai',
      text: "Hello! I'm AIRA, your Digital AI Store Manager connected directly to your PostgreSQL database. You can speak or type in English, Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), or Malayalam (മലയാളം) with everyday English retail words!",
      model: 'AIRA Multilingual Assistant',
      cards: null
    }
  ])

  const messagesEndRef = useRef(null)
  const speechRecognizerRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Stop speaking when closed
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking()
      setIsSpeaking(false)
    }
  }, [isOpen])

  // Handle Speech Output (TTS)
  const handleSpeak = (text) => {
    if (!config.voiceEnabled || !text) return

    stopSpeaking()
    setIsSpeaking(true)

    speakResponse(text, {
      language: activeLangObj.bcp,
      rate: config.speechRate,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    })
  }

  const handleStopSpeaking = () => {
    stopSpeaking()
    setIsSpeaking(false)
  }

  // Handle Sending a Question (Strictly Local Offline Assistant)
  const handleSendQuestion = async (questionText = inputValue) => {
    const query = questionText.trim()
    if (!query) return

    handleStopSpeaking()

    const userMsg = { id: Date.now(), sender: 'user', text: query }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    if (!isOpen) setIsOpen(true)
    setIsLoading(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          language: selectedLang,
          mode: 'ollama'
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`)
      }
      const result = await response.json()
      
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: result.reply || result.response,
        model: result.model || 'AIRA Local AI',
        cards: result.cards || null,
        language: result.language || activeLangObj.bcp
      }

      setMessages(prev => [...prev, aiMsg])
      setIsLoading(false)

      if (config.voiceEnabled && (result.speech_text || result.reply)) {
        handleSpeak(result.speech_text || result.reply)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Error querying AIRA:', err)
      setIsLoading(false)
      const isTimeout = err.name === 'AbortError'
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: isTimeout 
          ? "Request timed out after 45 seconds. Please ensure Ollama is active on port 11434."
          : "Could not reach local AIRA assistant. Please ensure the backend is running on port 8000.",
        model: 'AIRA Assistant',
        cards: null
      }
      setMessages(prev => [...prev, errorMsg])
    }
  }

  // Live Multilingual Browser Recognition with Local Faster-Whisper Fallback
  const startVoiceRecording = async () => {
    handleStopSpeaking()

    // 1. High-Accuracy Browser Native Speech Recognition (Google/Edge Engine: te-IN, hi-IN, en-IN, ta-IN, ml-IN)
    if (isSpeechRecognitionSupported()) {
      try {
        const recognizer = createSpeechRecognizer({
          language: activeLangObj.bcp,
          onStart: () => {
            setIsListening(true)
            setVoiceStatusText(`Listening (${activeLangObj.label})... Speak now`)
          },
          onInterim: (interim) => {
            setVoiceStatusText(`Heard: "${interim}"`)
            setInputValue(interim)
          },
          onResult: (finalText) => {
            setIsListening(false)
            setVoiceStatusText('')
            setInputValue('')
            if (finalText && finalText.trim()) {
              handleSendQuestion(finalText.trim())
            }
          },
          onError: (event) => {
            console.warn('Speech recognition notice:', event)
            setIsListening(false)
            setVoiceStatusText('')
            if (event?.error === 'not-allowed') {
              setVoiceStatusText('Microphone permission denied.')
              setTimeout(() => setVoiceStatusText(''), 3000)
            }
          },
          onEnd: () => {
            setIsListening(false)
          }
        })

        if (recognizer) {
          speechRecognizerRef.current = recognizer
          recognizer.start()
          return
        }
      } catch (err) {
        console.warn('Web Speech API fallback to backend:', err)
      }
    }

    // 2. Fallback to Local Faster-Whisper Backend if Web Speech API is not available
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())

        if (audioBlob.size < 500) {
          setVoiceStatusText('')
          setIsListening(false)
          return
        }

        setIsListening(false)
        setIsLoading(true)
        setVoiceStatusText(`Transcribing ${activeLangObj.label} speech...`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
          const formData = new FormData()
          formData.append('file', audioBlob, 'audio_recording.webm')
          formData.append('language', selectedLang)

          // Step 1: Fast dedicated Whisper Speech-to-Text (~0.8s on GPU)
          const response = await fetch('http://127.0.0.1:8000/api/ai/transcribe', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          })
          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`)
          }
          const data = await response.json()
          setIsLoading(false)
          setVoiceStatusText('')

          if (data.transcript && data.transcript.trim()) {
            handleSendQuestion(data.transcript.trim())
          } else {
            const errorNotice = {
              id: Date.now(),
              sender: 'ai',
              text: "Could not detect clear speech. Please hold the microphone closer and try asking again.",
              model: 'AIRA Assistant'
            }
            setMessages(prev => [...prev, errorNotice])
          }
        } catch (err) {
          clearTimeout(timeoutId)
          console.error('Voice transcription error:', err)
          setIsLoading(false)
          setVoiceStatusText('')
          const isTimeout = err.name === 'AbortError'
          const errorMsg = {
            id: Date.now(),
            sender: 'ai',
            text: isTimeout
              ? "Voice transcription timed out after 15 seconds. Please try again."
              : "Failed to connect to local transcription endpoint. Please ensure the backend is running on port 8000.",
            model: 'AIRA Assistant'
          }
          setMessages(prev => [...prev, errorMsg])
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsListening(true)
      setVoiceStatusText(`Listening (${activeLangObj.label})... Click mic to stop`)
    } catch (err) {
      console.warn('Microphone permission / capture error:', err)
      setVoiceStatusText('Microphone access denied or unavailable.')
      setTimeout(() => setVoiceStatusText(''), 3000)
    }
  }

  const stopVoiceRecording = () => {
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop()
      } catch (e) {}
      speechRecognizerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsListening(false)
  }

  // Handle Microphone click
  const handleMicClick = () => {
    if (!isOpen) setIsOpen(true)
    if (isSpeaking) handleStopSpeaking()

    if (isListening) {
      stopVoiceRecording()
    } else {
      startVoiceRecording()
    }
  }

  // Toggle Voice Output (TTS)
  const toggleVoiceOutput = () => {
    const updated = !config.voiceEnabled
    const newConfig = { ...config, voiceEnabled: updated }
    setConfig(newConfig)
    saveAIRAConfig(newConfig)
    if (!updated) {
      handleStopSpeaking()
    }
  }

  const currentSuggestions = LANGUAGE_SUGGESTIONS[selectedLang] || LANGUAGE_SUGGESTIONS.en
  const currentPlaceholder = LANGUAGE_PLACEHOLDERS[selectedLang] || LANGUAGE_PLACEHOLDERS.en

  return (
    <>
      {/* Floating Action Button (FAB) Trigger */}
      {!isOpen && (
        <button
          id="aira-fab-trigger"
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 p-0.5 rounded-2xl shadow-xl hover:scale-105 transition-all group"
          title="Open AIRA Digital Store Manager"
          aria-label="Open AIRA Assistant"
        >
          <div className="bg-[#07111f] rounded-[14px] p-3.5 flex items-center space-x-2 text-white">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold font-mono tracking-wider">AIRA</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </button>
      )}

      {/* Floating Assistant Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[440px] h-[640px] max-h-[90vh] bg-[#07111f] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up backdrop-blur-md">
          
          {/* Header */}
          <div className="bg-[#050c17] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 p-0.5 shadow-md shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-[10px] bg-[#07111f] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5 truncate">
                  <span className="truncate">AIRA Multilingual Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                </h3>
                <p className="text-[10px] text-cyan-400 font-mono truncate flex items-center space-x-1">
                  <span>PostgreSQL Grounded</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-indigo-300 font-semibold">{activeLangObj.native}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center space-x-1 shrink-0">
              {/* Voice Mute / Speak Toggle */}
              <button 
                onClick={toggleVoiceOutput}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  config.voiceEnabled 
                    ? 'text-cyan-400 hover:bg-cyan-500/10' 
                    : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
                }`}
                title={config.voiceEnabled ? "Voice Output Active (Click to Mute)" : "Voice Output Muted (Click to Enable)"}
              >
                {config.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick 5-Language Switcher Strip */}
          <div className="px-3 py-1.5 bg-[#06101c] border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 shrink-0">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Lang:</span>
            </span>
            <div className="flex items-center space-x-1">
              {ASSISTANT_LANGUAGES.map((l) => {
                const isSel = selectedLang === l.code
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(l.code)
                      localStorage.setItem('aira_assistant_lang', l.code)
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      isSel
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs'
                        : 'bg-[#091524] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {l.flag} {l.native}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Voice Listening Banner */}
          {isListening && (
            <div className="bg-gradient-to-r from-rose-500/20 via-cyan-500/20 to-purple-500/20 px-4 py-2 text-center text-xs font-mono text-cyan-300 border-b border-cyan-500/30 animate-pulse flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <Mic className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
                <span className="truncate">{voiceStatusText || `Listening (${activeLangObj.label})...`}</span>
              </div>
              <button 
                onClick={handleMicClick}
                className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 text-[10px] hover:bg-rose-500/50 shrink-0 ml-2"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Voice Speaking Banner */}
          {isSpeaking && (
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-1.5 border-b border-cyan-500/30 flex items-center justify-between text-[11px] font-mono text-cyan-200">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                <span className="flex items-center space-x-1">
                  <span>AIRA speaking ({activeLangObj.native})...</span>
                  <span className="flex space-x-0.5">
                    <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </span>
                </span>
              </div>
              <button 
                onClick={handleStopSpeaking}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center space-x-1"
                title="Stop Speaking"
              >
                <Square className="w-2.5 h-2.5 fill-slate-300" />
                <span>Stop</span>
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs font-sans">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%] space-y-2">
                  <div className={`p-3.5 rounded-2xl relative group ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-tr-xs shadow-md' 
                      : 'bg-[#0f1d30] border border-slate-700/80 text-slate-200 rounded-tl-xs shadow-md'
                  }`}>
                    {msg.sender === 'ai' && (
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/50 text-[10px] text-cyan-400 font-mono">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{msg.model || 'AIRA'}</span>
                        </span>
                        {/* Read Aloud Button */}
                        <button 
                          onClick={() => handleSpeak(msg.text)} 
                          className="text-slate-400 hover:text-cyan-300 p-0.5 rounded"
                          title="Listen to this message"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Interactive Product Reorder Cards */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Recommended Actions:</span>
                      </div>
                      {msg.cards.map((prod) => (
                        <div key={prod.id} className="p-2 rounded-lg bg-[#091524] border border-cyan-500/20 flex items-center justify-between text-xs text-white shadow-2xs hover:border-cyan-400/50 transition-colors">
                          <div className="flex items-center space-x-2 min-w-0">
                            <ProductImage src={prod.image} alt={prod.name} category={prod.category} className="w-7 h-7 rounded-md shrink-0 border border-slate-700" />
                            <div className="min-w-0">
                              <h5 className="font-semibold text-[11px] truncate">{prod.name}</h5>
                              <span className="text-[10px] text-rose-400 font-mono">
                                Stock: {prod.stock} (Min: {prod.minStock})
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              window.location.href = `/app/inventory?highlight=${prod.id}`
                            }} 
                            className="px-2 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[9px] font-bold text-white rounded-md shrink-0 shadow-2xs flex items-center space-x-1 transition-all ml-2 cursor-pointer"
                          >
                            <span>Reorder ({prod.orderRecommendation || 30})</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading / Thinking Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#0f1d30] border border-cyan-500/40 p-3.5 rounded-2xl rounded-tl-xs shadow-md space-y-2 max-w-[85%]">
                  <div className="flex items-center space-x-2 text-xs text-cyan-300 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>AIRA analyzing PostgreSQL telemetry in {activeLangObj.label}...</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Example Suggestion Pills for Selected Language */}
          <div className="px-3.5 py-2 bg-[#050c17]/90 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            {currentSuggestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuestion(q)}
                className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-[10px] text-cyan-300 whitespace-nowrap transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box & Voice Button */}
          <div className="p-3 bg-[#050c17] border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendQuestion()}
                  placeholder={currentPlaceholder}
                  className="w-full pl-3 pr-10 py-2.5 bg-[#0b1626] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                />
                
                {/* Voice Mic Button inside input */}
                <button 
                  type="button"
                  onClick={handleMicClick}
                  className={`absolute right-2 top-2 p-1 rounded-lg transition-all ${
                    isListening 
                      ? 'bg-rose-500/30 text-rose-400 animate-pulse ring-2 ring-rose-500/40' 
                      : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
                  }`}
                  title={isListening ? "Listening... (Click to Cancel)" : `Speak in ${activeLangObj.label}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>

              {/* Send Button */}
              <button 
                onClick={() => handleSendQuestion()}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center disabled:opacity-40 transition-all shadow-md shrink-0"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  )
}

import ProductImage from './common/ProductImage'
import { useState, useRef, useEffect } from 'react'
import { 
  MessageSquare, X, Send, Mic, MicOff, Sparkles, Volume2, VolumeX, 
  Square, Settings, Key, ArrowRight, BrainCircuit, RotateCcw, 
  ExternalLink, CheckCircle2, ChevronDown, Globe, Languages, Check
} from 'lucide-react'
import { 
  queryAIRAAssistant, speakResponse, stopSpeaking, 
  createSpeechRecognizer, isSpeechRecognitionSupported, 
  getAIRAConfig, saveAIRAConfig, SUPPORTED_LANGUAGES, getLanguageConfig 
} from '../services/geminiService'

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceStatusText, setVoiceStatusText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  
  // AIRA settings
  const [config, setConfig] = useState(getAIRAConfig())
  const [tempApiKey, setTempApiKey] = useState(config.apiKey)
  const [keySaved, setKeySaved] = useState(false)

  const activeLang = getLanguageConfig(config.voiceLanguage)

  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'ai',
      text: "Hello! I'm AIRA, your Digital AI Store Manager connected directly to your PostgreSQL database. Ask me anything about current stock, sales, prices, profit margins, or tell me to restock or record a sale directly!",
      model: 'AIRA 2.5 Flash',
      cards: null
    }
  ])

  const messagesEndRef = useRef(null)
  const recognizerRef = useRef(null)
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
      setShowLangMenu(false)
    }
  }, [isOpen])

  // Listen for global app language changes
  useEffect(() => {
    const handleGlobalLang = (e) => {
      const voiceCode = e.detail?.voiceCode
      if (voiceCode && voiceCode !== config.voiceLanguage) {
        setConfig(prev => ({ ...prev, voiceLanguage: voiceCode }))
      }
    }
    window.addEventListener('aira_language_changed', handleGlobalLang)
    return () => window.removeEventListener('aira_language_changed', handleGlobalLang)
  }, [config.voiceLanguage])

  // Initialize Speech Recognition for active language
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const recognizer = createSpeechRecognizer({
        language: config.voiceLanguage || 'en-IN',
        onStart: () => {
          setIsListening(true)
          setVoiceStatusText(`Listening (${activeLang.name})...`)
        },
        onInterim: (text) => {
          setInputValue(text)
          setVoiceStatusText(`Transcribing: "${text}"`)
        },
        onResult: (finalText) => {
          setInputValue(finalText)
          setIsListening(false)
          setVoiceStatusText('')
          handleSendQuestion(finalText)
        },
        onError: (err) => {
          console.warn('Speech recognition error:', err)
          setIsListening(false)
          setVoiceStatusText('Voice error. Switching to fallback...')
          setTimeout(() => setVoiceStatusText(''), 1500)
        },
        onEnd: () => {
          setIsListening(false)
          setVoiceStatusText('')
        }
      })
      recognizerRef.current = recognizer
    }
  }, [config.voiceLanguage])

  // Handle Speech Output
  const handleSpeak = (text) => {
    if (!config.voiceEnabled) return

    stopSpeaking()
    setIsSpeaking(true)

    speakResponse(text, {
      language: config.voiceLanguage,
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

  // Handle Language Change
  const handleSelectLanguage = (langCode) => {
    const newConfig = { ...config, voiceLanguage: langCode }
    setConfig(newConfig)
    saveAIRAConfig(newConfig)
    setShowLangMenu(false)

    // Stop ongoing speech
    handleStopSpeaking()

    const chosen = getLanguageConfig(langCode)
    const switchNotice = {
      id: Date.now(),
      sender: 'ai',
      text: `🌐 Language switched to ${chosen.name} (${chosen.nativeName}). You can now speak or type in ${chosen.name}.`,
      model: 'AIRA Language Engine',
      cards: null
    }
    setMessages(prev => [...prev, switchNotice])
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

    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          language: config.voiceLanguage || 'en-IN'
        })
      })
      const result = await response.json()
      
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: result.reply || result.response,
        model: result.model || 'AIRA Local AI',
        cards: result.cards || null
      }

      setMessages(prev => [...prev, aiMsg])
      setIsLoading(false)

      if (config.voiceEnabled && (result.speech_text || result.reply)) {
        handleSpeak(result.speech_text || result.reply)
      }
    } catch (err) {
      console.error('Error querying AIRA:', err)
      setIsLoading(false)
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "Could not reach local AIRA assistant. Ensure backend is running on port 8000.",
        model: 'AIRA Assistant',
        cards: null
      }
      setMessages(prev => [...prev, errorMsg])
    }
  }

  // Real Local Audio Recording & faster-whisper Speech Recognition
  const startVoiceRecording = async () => {
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
        setVoiceStatusText('AIRA faster-whisper transcribing speech...')

        try {
          const formData = new FormData()
          formData.append('file', audioBlob, 'audio_recording.webm')

          const response = await fetch('http://127.0.0.1:8000/api/ai/voice', {
            method: 'POST',
            body: formData
          })
          const data = await response.json()
          setIsLoading(false)
          setVoiceStatusText('')

          if (data.transcript) {
            const userMsg = { id: Date.now(), sender: 'user', text: data.transcript }
            const aiMsg = {
              id: Date.now() + 1,
              sender: 'ai',
              text: data.reply,
              model: data.model || 'faster-whisper + Local LLM',
              cards: data.cards || null,
              language: data.language
            }
            setMessages(prev => [...prev, userMsg, aiMsg])

            if (config.voiceEnabled && (data.speech_text || data.reply)) {
              handleSpeak(data.speech_text || data.reply)
            }
          } else {
            const errorNotice = {
              id: Date.now(),
              sender: 'ai',
              text: data.reply || "Could not detect clear speech. Please try speaking again.",
              model: 'AIRA Assistant'
            }
            setMessages(prev => [...prev, errorNotice])
          }
        } catch (err) {
          console.error('Voice processing error:', err)
          setIsLoading(false)
          setVoiceStatusText('')
          const errorMsg = {
            id: Date.now(),
            sender: 'ai',
            text: "Failed to connect to local voice endpoint at http://127.0.0.1:8000/api/ai/voice.",
            model: 'AIRA Assistant'
          }
          setMessages(prev => [...prev, errorMsg])
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsListening(true)
      setVoiceStatusText(`Listening (Telugu / English)... Tap mic to send`)
    } catch (err) {
      console.warn('Microphone permission / capture error:', err)
      setVoiceStatusText('Microphone access denied or unavailable.')
      setTimeout(() => setVoiceStatusText(''), 3000)
    }
  }

  const stopVoiceRecording = () => {
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

  // Save in-drawer AIRA API Key
  const handleSaveApiKey = (e) => {
    e.preventDefault()
    const newConfig = { ...config, apiKey: tempApiKey.trim() }
    setConfig(newConfig)
    saveAIRAConfig(newConfig)
    setKeySaved(true)
    setTimeout(() => {
      setKeySaved(false)
      setShowConfig(false)
    }, 1500)
  }

  return (
    <>
      <button id="aira-fab-trigger" onClick={() => setIsOpen(!isOpen)} className="hidden" />

      {/* Floating Glowing FAB */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 z-50 shadow-2xl ${
          isOpen 
            ? 'bg-[#07111f] border-2 border-cyan-400 text-white rotate-90 shadow-cyan-500/20' 
            : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:scale-110 shadow-indigo-500/30 ring-2 ring-cyan-400/50'
        }`}
        title="Open AIRA Store Voice Assistant"
      >
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Pulsing Aura */}
            <span className="absolute -inset-1 rounded-full bg-cyan-400/30 animate-ping opacity-75" />
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-18 sm:bottom-24 right-2 left-2 sm:left-auto sm:right-6 sm:w-[460px] h-[520px] sm:h-[580px] max-h-[82vh] sm:max-h-[85vh] bg-[#091322]/95 border border-cyan-500/30 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden z-40 animate-slide-up text-slate-100">
          
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
                  <span className="truncate">AIRA Store Voice Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                </h3>
                <p className="text-[10px] text-cyan-400 font-mono truncate flex items-center space-x-1">
                  <span>Connected to PostgreSQL</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-indigo-300 font-semibold">{config.model}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center space-x-1 shrink-0">
              {/* Quick Language Selector Pill */}
              <button 
                onClick={() => {
                  setShowLangMenu(!showLangMenu)
                  if (showConfig) setShowConfig(false)
                }}
                className="px-2 py-1 rounded-lg bg-[#0d1e34] hover:bg-[#122846] border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                title="Change Language"
              >
                <span>{activeLang.flag}</span>
                <span className="hidden sm:inline font-sans">{activeLang.nativeName}</span>
                <ChevronDown className="w-3 h-3 text-cyan-400" />
              </button>

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

              {/* AIRA Settings Cog */}
              <button 
                onClick={() => {
                  setShowConfig(!showConfig)
                  if (showLangMenu) setShowLangMenu(false)
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  showConfig ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="AIRA Assistant Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Language Selector Dropdown Popover */}
          {showLangMenu && (
            <div className="bg-[#0b1728] border-b border-slate-800 p-3 animate-fade-in text-xs max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Voice & Response Language</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">16 Languages Supported</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === config.voiceLanguage
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`p-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400 text-white font-bold' 
                          : 'bg-[#060e1a] hover:bg-[#0d1e34] border border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-base shrink-0">{lang.flag}</span>
                        <div className="truncate">
                          <div className="truncate text-xs font-semibold">{lang.nativeName}</div>
                          <div className="text-[9px] text-slate-400 truncate">{lang.name}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* In-Drawer AIRA Assistant Configuration Panel */}
          {showConfig && (
            <div className="bg-[#0b1728] border-b border-slate-800 p-4 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AIRA Assistant Configuration</span>
                </span>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1 font-mono"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">AIRA AI API Key</label>
                  <input 
                    type="password" 
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy... (configured in .env)"
                    className="w-full px-3 py-1.5 bg-[#050c17] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">AIRA AI Model</label>
                    <select 
                      value={config.model}
                      onChange={(e) => {
                        const updated = { ...config, model: e.target.value }
                        setConfig(updated)
                        saveAIRAConfig(updated)
                      }}
                      className="w-full px-2 py-1.5 bg-[#050c17] border border-slate-700 rounded-lg text-[11px] text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="aira-local-engine">AIRA Database Engine (Local & Real-Time)</option>
                      <option value="aira-local-engine-lite">AIRA Lightweight Model</option>
                      <option value="aira-pro-engine">AIRA Pro Engine</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Voice Language</label>
                    <select 
                      value={config.voiceLanguage}
                      onChange={(e) => handleSelectLanguage(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#050c17] border border-slate-700 rounded-lg text-[11px] text-white focus:outline-none focus:border-cyan-400"
                    >
                      {SUPPORTED_LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.nativeName} ({l.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    {keySaved ? (
                      <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved successfully!</span>
                      </span>
                    ) : (
                      <span>Takes effect immediately</span>
                    )}
                  </span>
                  <button 
                    type="submit"
                    className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg text-[11px] shadow-sm hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Voice Listening Banner */}
          {isListening && (
            <div className="bg-gradient-to-r from-rose-500/20 via-cyan-500/20 to-purple-500/20 px-4 py-2 text-center text-xs font-mono text-cyan-300 border-b border-cyan-500/30 animate-pulse flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <Mic className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
                <span className="truncate">{voiceStatusText || `Listening to your voice (${activeLang.name})...`}</span>
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
                  <span>AIRA speaking ({activeLang.nativeName})...</span>
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
                        <div key={prod.id} className="p-3 rounded-xl bg-[#091524] border border-cyan-500/30 flex items-center justify-between text-xs text-white shadow-sm hover:border-cyan-400/60 transition-colors">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <ProductImage src={prod.image} alt={prod.name} category={prod.category} className="w-9 h-9 rounded-lg shrink-0 border border-slate-700" />
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs truncate">{prod.name}</h5>
                              <span className="text-[10px] text-rose-400 font-mono">
                                Stock: {prod.stock} (Min: {prod.minStock})
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => window.location.href = '/app/inventory'} 
                            className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[10px] font-bold text-white rounded-lg shrink-0 shadow-xs flex items-center space-x-1 transition-all"
                          >
                            <span>Reorder ({prod.orderRecommendation || 30})</span>
                            <ArrowRight className="w-3 h-3" />
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
                    <span>AIRA is analyzing database telemetry in {activeLang.name}...</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Example Suggestion Pills Translated to Current Language */}
          <div className="px-3.5 py-2 bg-[#050c17]/90 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            {activeLang.examples.map((q, idx) => (
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
                  placeholder={activeLang.placeholder}
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
                  title={isListening ? "Listening... (Click to Cancel)" : `Speak in ${activeLang.name}`}
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

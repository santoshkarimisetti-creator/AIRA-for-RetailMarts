/**
 * AIRA Retail OS - Language Context & State Provider
 * Provides reactive translation hook (useLanguage), language switching,
 * and seamless synchronization with AIRA Voice Assistant.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { INDIAN_LANGUAGES, translations } from '../utils/translations'

const LanguageContext = createContext()

// Map short code to BCP-47 voice language code for speech recognition & TTS
const VOICE_LANG_MAP = {
  'en-IN': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'bn': 'bn-IN',
  'mr': 'mr-IN',
  'gu': 'gu-IN',
  'ml': 'ml-IN',
  'pa': 'pa-IN'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('aira_app_language') || 'en-IN'
  })

  // Synchronize language change with localStorage and AIRA Voice Assistant
  const changeLanguage = (newCode) => {
    const valid = INDIAN_LANGUAGES.find(l => l.code === newCode) ? newCode : 'en-IN'
    setLanguageState(valid)
    localStorage.setItem('aira_app_language', valid)

    // Sync with Voice Assistant language
    const voiceCode = VOICE_LANG_MAP[valid] || 'en-IN'
    localStorage.setItem('aira_voice_language', voiceCode)

    // Trigger custom event so any active listeners or floating assistants sync immediately
    window.dispatchEvent(new CustomEvent('aira_language_changed', { detail: { language: valid, voiceCode } }))
  }

  // Translation helper function
  const t = (key, fallback = '') => {
    if (!key) return ''
    const currentDict = translations[language] || translations['en-IN']
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key]
    }
    // Fallback to English
    const enDict = translations['en-IN']
    if (enDict && enDict[key] !== undefined) {
      return enDict[key]
    }
    return fallback || key
  }

  const currentLanguageInfo = INDIAN_LANGUAGES.find(l => l.code === language) || INDIAN_LANGUAGES[0]

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      t,
      currentLanguageInfo,
      languages: INDIAN_LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    // Graceful fallback if called outside provider
    return {
      language: 'en-IN',
      setLanguage: () => {},
      t: (k, fb) => fb || k,
      currentLanguageInfo: INDIAN_LANGUAGES[0],
      languages: INDIAN_LANGUAGES
    }
  }
  return context
}

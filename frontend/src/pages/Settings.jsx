import React, { useState } from 'react'
import { storeInfo } from '../utils/demoData'
import { 
  Settings as SettingsIcon, User, Store, Shield, Bell, Cpu, 
  Database, Save, CheckCircle2, Sparkles, ExternalLink, Key, Volume2,
  Languages, Check
} from 'lucide-react'
import { getAIRAConfig, saveAIRAConfig, SUPPORTED_LANGUAGES } from '../services/geminiService'
import { useLanguage } from '../context/LanguageContext'

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('language')
  const { language, setLanguage, languages, t } = useLanguage()

  const initialAIRA = getAIRAConfig()

  const [settings, setSettings] = useState({
    storeName: storeInfo.name,
    ownerName: storeInfo.owner,
    city: storeInfo.city,
    currency: storeInfo.currency,
    lowStockThreshold: 15,
    role: 'Store Manager (Admin)',
    // Language & Voice
    appLanguage: language,
    assistantApiKey: initialAIRA.apiKey,
    assistantModel: initialAIRA.model || 'aira-database-engine',
    voiceEnabled: initialAIRA.voiceEnabled,
    voiceLanguage: initialAIRA.voiceLanguage || 'en-IN',
    speechRate: initialAIRA.speechRate || 1.0
  })

  const handleSave = (e) => {
    e.preventDefault()

    // Save global language
    if (settings.appLanguage !== language) {
      setLanguage(settings.appLanguage)
    }

    // Save AIRA Config
    saveAIRAConfig({
      apiKey: settings.assistantApiKey.trim(),
      model: settings.assistantModel,
      voiceEnabled: settings.voiceEnabled,
      voiceLanguage: settings.voiceLanguage,
      speechRate: settings.speechRate
    })

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>{t('nav.settings', 'System Settings & Configuration')}</span>
          </h1>
          <p className="text-xs text-slate-500">Manage Indian language preferences, store profiles, Google AIRA Voice Assistant, and stock alert thresholds.</p>
        </div>

        {saved && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Tabs */}
        <div className="lg:col-span-4 flex flex-row overflow-x-auto pb-2 lg:pb-0 lg:flex-col lg:space-y-1 gap-1.5 scrollbar-thin">
          {[
            { id: 'language', label: 'Indian Languages (भाषा)', icon: Languages },
            { id: 'store', label: 'Store Information', icon: Store },
            { id: 'inventory', label: 'Inventory & Alerts', icon: Database },
            { id: 'ai', label: 'AIRA AI & Voice', icon: Sparkles },
            { id: 'security', label: 'Security & Roles', icon: Shield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 sm:p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 sm:space-x-3 transition-colors shrink-0 lg:w-full whitespace-nowrap ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'card-light hover:bg-slate-50 text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-8 p-4 sm:p-6 rounded-2xl card-light">
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            
            {/* TAB: INDIAN LANGUAGES */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Languages className="w-4 h-4 text-blue-600" />
                    <span>Select Application Language (भारतीय भाषाएं)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose your regional Indian language for the entire AIRA dashboard, POS counter, inventory, and reports.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {languages.map((lang) => {
                    const isSelected = settings.appLanguage === lang.code
                    return (
                      <button
                        type="button"
                        key={lang.code}
                        onClick={() => {
                          setSettings({ ...settings, appLanguage: lang.code })
                          setLanguage(lang.code)
                        }}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{lang.flag}</span>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{lang.nativeName}</div>
                            <div className="text-[11px] text-slate-500">{lang.name}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'store' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Store Profile</h3>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Store Name</label>
                  <input type="text" value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Owner Name</label>
                  <input type="text" value={settings.ownerName} onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">City</label>
                    <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Currency</label>
                    <input type="text" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Inventory Alert Preferences</h3>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Low-Stock Alert Threshold (Units)</label>
                  <input 
                    type="number" 
                    value={settings.lowStockThreshold} 
                    onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })} 
                    onBlur={(e) => {
                      if (!e.target.value || Number(e.target.value) < 1) {
                        setSettings({ ...settings, lowStockThreshold: 15 })
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" 
                  />
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      <span>Google AIRA Voice Assistant Configuration</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Configure cloud AIRA intelligence, speech synthesis, and voice recognition.</p>
                  </div>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center space-x-1 font-semibold text-xs"
                  >
                    <span>Get Free AIRA Key</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* AIRA API Key */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Open-Source LLM Endpoint / Key
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={settings.assistantApiKey} 
                      onChange={(e) => setSettings({ ...settings, assistantApiKey: e.target.value })} 
                      placeholder="AIzaSy... (leave blank to run in local offline intelligence mode)" 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs placeholder:font-sans" 
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Your key is stored securely in your browser/backend environment and used exclusively to communicate with AIRA AI.
                  </p>
                </div>

                {/* Model Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Active AI Assistant Engine</label>
                    <select 
                      value={settings.assistantModel} 
                      onChange={(e) => setSettings({ ...settings, assistantModel: e.target.value })} 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="aira-database-engine">AIRA 2.5 Flash (Recommended - Fastest)</option>
                      <option value="aira-database-engine-lite">AIRA 2.5 Flash-Lite</option>
                      <option value="aira-pro">AIRA 2.5 Pro (Deep Reasoning)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Voice Recognition & TTS Language</label>
                    <select 
                      value={settings.voiceLanguage} 
                      onChange={(e) => setSettings({ ...settings, voiceLanguage: e.target.value })} 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Voice Output Toggle */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Voice Output (Text-to-Speech)</h4>
                      <p className="text-[11px] text-slate-500">Automatically read aloud AIRA assistant responses through your speakers.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.voiceEnabled} 
                      onChange={(e) => setSettings({ ...settings, voiceEnabled: e.target.checked })} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Speech Rate Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-medium">Voice Speech Speed</label>
                    <span className="text-[11px] font-mono text-slate-500">{settings.speechRate}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.75" 
                    max="1.5" 
                    step="0.05" 
                    value={settings.speechRate} 
                    onChange={(e) => setSettings({ ...settings, speechRate: parseFloat(e.target.value) })} 
                    className="w-full accent-blue-600 cursor-pointer" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Slower (0.75x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Faster (1.5x)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">User Access & Role</h3>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">User Role</label>
                  <input type="text" value={settings.role} disabled className="w-full p-2.5 bg-slate-200 border border-slate-300 rounded-xl font-mono text-slate-600" />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button type="submit" className="aira-gradient-btn px-6 py-2.5 font-bold text-xs flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{t('btn.save', 'Save All Changes')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

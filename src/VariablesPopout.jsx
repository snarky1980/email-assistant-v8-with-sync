import React, { useState, useEffect, useRef } from 'react'
import { Edit3, X, RefreshCw } from 'lucide-react'

/**
 * Standalone Variables Editor Popout Window
 * 
 * This component renders in a separate browser window (popout) and allows
 * editing of template variables. Changes are synced back to the main window
 * via BroadcastChannel.
 */
export default function VariablesPopout({ 
  selectedTemplate, 
  templatesData, 
  initialVariables, 
  interfaceLanguage 
}) {
  const [variables, setVariables] = useState(initialVariables || {})
  const [focusedVar, setFocusedVar] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const channelRef = useRef(null)
  const varInputRefs = useRef({})

  // Initialize BroadcastChannel for syncing with main window
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('email-assistant-sync')
      channelRef.current = channel

      // Listen for messages from main window
      channel.onmessage = (event) => {
        if (event.data.type === 'variablesUpdated') {
          setVariables(event.data.variables)
        }
        
        // Handle sync completion
        if (event.data.type === 'syncComplete') {
          setIsSyncing(false)
          if (event.data.success) {
            setVariables(event.data.variables)
            setSyncStatus('success')
            setTimeout(() => setSyncStatus(null), 2000)
          } else {
            setSyncStatus('no-changes')
            setTimeout(() => setSyncStatus(null), 2000)
          }
        }
      }

      return () => {
        channel.close()
      }
    } catch (e) {
      console.error('BroadcastChannel not available:', e)
    }
  }, [])

  // Request one-time sync from main window on mount so popout reflects current editor content
  useEffect(() => {
    if (!channelRef.current) return
    try {
      channelRef.current.postMessage({ type: 'syncFromText' })
    } catch (e) {
      console.error('Failed to request initial syncFromText:', e)
    }
  }, [])

  // Sync variable changes to main window
  const updateVariable = (varName, value) => {
    const newVariables = { ...variables, [varName]: value }
    setVariables(newVariables)

    // Send update to main window
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type: 'variableChanged',
          varName,
          value,
          allVariables: newVariables
        })
      } catch (e) {
        console.error('Failed to send variable update:', e)
      }
    }
  }
  
  // Request sync from text areas in main window
  const handleSyncFromText = () => {
    if (!channelRef.current) return
    
    setIsSyncing(true)
    setSyncStatus(null)
    
    try {
      channelRef.current.postMessage({
        type: 'syncFromText'
      })
    } catch (e) {
      console.error('Failed to request sync:', e)
      setIsSyncing(false)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus(null), 2000)
    }
  }

  // Auto-focus first empty variable on mount
  useEffect(() => {
    if (!selectedTemplate?.variables) return
    
    const firstEmpty = selectedTemplate.variables.find(
      vn => !(variables[vn] || '').trim()
    ) || selectedTemplate.variables[0]
    
    const el = varInputRefs.current[firstEmpty]
    if (el && el.focus) {
      setTimeout(() => {
        el.focus()
        el.select?.()
      }, 100)
    }
  }, [])

  if (!selectedTemplate || !templatesData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const t = interfaceLanguage === 'fr' ? {
    title: 'Modifier les variables',
    resetExample: 'Remettre l\'exemple',
    clear: 'Effacer',
    close: 'Fermer',
    syncFromText: 'Synchroniser depuis le texte',
    syncing: 'Synchronisation...',
    syncSuccess: 'Synchronis\u00e9 !',
    syncNoChanges: 'Aucun changement',
    syncError: 'Erreur'
  } : {
    title: 'Edit Variables',
    resetExample: 'Reset to example',
    clear: 'Clear',
    close: 'Close',
    syncFromText: 'Sync from text',
    syncing: 'Syncing...',
    syncSuccess: 'Synced!',
    syncNoChanges: 'No changes',
    syncError: 'Error'
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{ 
          background: 'linear-gradient(135deg, #145a64 0%, #1a7a87 100%)',
          borderBottom: '3px solid rgba(139, 195, 74, 0.3)'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Edit3 className="h-5 w-5 mr-2 text-white" />
            <h1 className="text-lg font-bold text-white">{t.title}</h1>
          </div>
          
          {/* Sync from text button */}
          <button
            onClick={handleSyncFromText}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t.syncFromText}
          >
            <RefreshCw className={`h-4 w-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-semibold text-white">
              {isSyncing ? t.syncing : syncStatus === 'success' ? t.syncSuccess : syncStatus === 'no-changes' ? t.syncNoChanges : syncStatus === 'error' ? t.syncError : t.syncFromText}
            </span>
          </button>
        </div>
        
        <button
          onClick={() => window.close()}
          className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          title={t.close}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Variables Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {selectedTemplate.variables.map((varName) => {
            const varInfo = templatesData.variables?.[varName]
            if (!varInfo) return null

            const currentValue = variables[varName] || ''
            const isFocused = focusedVar === varName

            return (
              <div
                key={varName}
                className="rounded-lg p-3 transition-all duration-200"
                style={{
                  background: isFocused
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(200, 215, 150, 0.4)',
                  border: isFocused
                    ? '2px solid rgba(59, 130, 246, 0.4)'
                    : '1px solid rgba(190, 210, 140, 0.6)',
                  boxShadow: isFocused
                    ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    : 'none'
                }}
              >
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  {/* Label and buttons */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <label className="text-sm font-semibold text-gray-900 flex-1 leading-tight">
                      {varInfo.description?.[interfaceLanguage] || varName}
                    </label>
                    <div className="shrink-0 flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-teal-700 hover:bg-teal-50"
                        title={t.resetExample}
                        onClick={() => updateVariable(varName, varInfo.example || '')}
                      >
                        Ex.
                      </button>
                      <button
                        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-red-700 hover:bg-red-50"
                        title={t.clear}
                        onClick={() => updateVariable(varName, '')}
                      >
                        X
                      </button>
                    </div>
                  </div>

                  {/* Input field */}
                  <textarea
                    ref={el => { if (el) varInputRefs.current[varName] = el }}
                    value={currentValue}
                    onChange={(e) => updateVariable(varName, e.target.value)}
                    onFocus={() => setFocusedVar(varName)}
                    onBlur={() => setFocusedVar(prev => prev === varName ? null : prev)}
                    onKeyDown={(e) => {
                      // Tab or Enter to next field
                      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                        e.preventDefault()
                        const list = selectedTemplate.variables
                        const currentIdx = list.indexOf(varName)
                        
                        let nextIdx
                        if (e.shiftKey && e.key === 'Tab') {
                          // Shift+Tab = previous
                          nextIdx = (currentIdx - 1 + list.length) % list.length
                        } else {
                          // Tab or Enter = next
                          nextIdx = (currentIdx + 1) % list.length
                        }
                        
                        const nextVar = list[nextIdx]
                        const el = varInputRefs.current[nextVar]
                        if (el && el.focus) {
                          el.focus()
                          el.select?.()
                        }
                      }
                    }}
                    placeholder={varInfo.example || ''}
                    className="w-full min-h-[32px] border-2 border-gray-200 rounded-md resize-none transition-all duration-200 text-sm px-2 py-1 leading-5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    style={{
                      height: (() => {
                        const lines = (currentValue.match(/\n/g) || []).length + 1
                        return lines <= 2 ? (lines === 1 ? '32px' : '52px') : '52px'
                      })()
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

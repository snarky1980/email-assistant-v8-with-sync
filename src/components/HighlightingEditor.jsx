/* eslint-disable no-console, no-unused-vars */
import React, { useRef, useEffect, useState } from 'react'

const HighlightingEditor = ({
  value,
  onChange,
  variables = {},
  placeholder = '',
  minHeight = '150px',
  templateOriginal = '',
  showHighlights = true
}) => {
  const textareaRef = useRef(null)
  const overlayRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  // Simple function to highlight variables in text for overlay
  const createHighlightedHTML = (text) => {
    if (!text || !showHighlights) return ''
    
    // Escape HTML first to prevent XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
    
    // Find and highlight variable placeholders <<VarName>>
    html = html.replace(/&lt;&lt;([^&]+)&gt;&gt;/g, (match, varName) => {
      const varValue = variables[varName] || ''
      const filled = varValue.trim().length > 0
      const className = filled ? 'var-highlight filled' : 'var-highlight empty'
      // For the display text, use the actual variable value if filled, otherwise show placeholder
      const displayText = filled ? varValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : `&lt;&lt;${varName}&gt;&gt;`
      return `<mark class="${className}" data-var="${varName}">${displayText}</mark>`
    })
    
    // Replace line breaks with <br> tags AFTER variable processing
    html = html.replace(/\n/g, '<br>')
    
    return html
  }

  // Handle text changes
  const handleChange = (e) => {
    onChange(e)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  // Update overlay when value or variables change
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.innerHTML = createHighlightedHTML(value || '')
    }
  }, [value, variables, showHighlights])

  return (
    <div className="relative">
      {/* Background overlay for highlighting */}
      {showHighlights && (
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none z-10 px-4 py-4 text-[16px] leading-[1.7] tracking-[0.01em] overflow-hidden rounded-[12px] bg-[#f9fdfd]"
          style={{ 
            minHeight,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            color: 'transparent',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Main textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`
          relative z-20 w-full border-2 transition-all duration-200 rounded-[12px] px-4 py-4 
          text-[16px] leading-[1.7] tracking-[0.01em] resize-none overflow-auto
          ${isFocused 
            ? 'border-[#7bd1ca] outline-none ring-2 ring-[#7bd1ca]/30' 
            : 'border-[#bfe7e3]'
          }
          ${showHighlights ? 'bg-transparent' : 'bg-[#f9fdfd]'}
        `}
        style={{ 
          minHeight,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        }}
      />
    </div>
  )
}

export default HighlightingEditor

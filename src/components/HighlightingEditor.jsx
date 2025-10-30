/* eslint-disable no-console, no-unused-vars */
import React, { useRef, useEffect, useState } from 'react'

const HighlightingEditor = ({
  value,
  onChange,
  onFocus,
  onBlur,
  variables = {},
  placeholder = '',
  minHeight = '150px',
  templateOriginal = '',
  showHighlights = true
}) => {
  const textareaRef = useRef(null)
  const overlayRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  // Utility: HTML escape
  const escapeHtml = (s) => (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Parse template into parts: [{type:'text', value}, {type:'var', name}]
  const parseTemplate = (tpl) => {
    const parts = []
    if (!tpl) return parts
    const re = /<<([^>]+)>>/g
    let lastIndex = 0
    let m
    while ((m = re.exec(tpl)) !== null) {
      if (m.index > lastIndex) {
        parts.push({ type: 'text', value: tpl.slice(lastIndex, m.index) })
      }
      parts.push({ type: 'var', name: m[1] })
      lastIndex = re.lastIndex
    }
    if (lastIndex < tpl.length) {
      parts.push({ type: 'text', value: tpl.slice(lastIndex) })
    }
    return parts
  }

  // Compute variable ranges in the current text by aligning template parts
  const computeVarRanges = (text, tpl, vars) => {
    if (!text || !tpl) return []
    const parts = parseTemplate(tpl)
    if (parts.length === 0) return []
    let cursor = 0
    const ranges = []
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part.type === 'text') {
        if (!part.value) continue
        const idx = text.indexOf(part.value, cursor)
        if (idx === -1) return [] // cannot align, give up gracefully
        cursor = idx + part.value.length
      } else if (part.type === 'var') {
        const nextText = (() => {
          // find next literal text to bound the var
          for (let j = i + 1; j < parts.length; j++) {
            if (parts[j].type === 'text' && parts[j].value) return parts[j].value
          }
          return null
        })()
        const start = cursor
        let end
        if (nextText) {
          const nextIdx = text.indexOf(nextText, start)
          end = nextIdx === -1 ? text.length : nextIdx
        } else {
          end = text.length
        }
        if (end >= start) {
          ranges.push({ start, end, name: part.name, value: text.slice(start, end) })
          cursor = end
        }
      }
    }
    return ranges
  }

  // Create highlighted HTML for overlay: supports both placeholders and filled values mapping
  const createHighlightedHTML = (text) => {
    if (!text || !showHighlights) return ''

    // Case 1: placeholders present -> replace directly
    if (text.includes('<<')) {
      let html = escapeHtml(text)
      html = html.replace(/&lt;&lt;([^&]+)&gt;&gt;/g, (match, varName) => {
        // IMPORTANT: keep the placeholder text length for perfect alignment
        const varValue = variables[varName] || ''
        const filled = varValue.trim().length > 0
        const className = filled ? 'var-highlight filled' : 'var-highlight empty'
        const displayText = `&lt;&lt;${varName}&gt;&gt;`
        return `<mark class=\"${className}\" data-var=\"${varName}\">${displayText}</mark>`
      })
      return html.replace(/\n/g, '<br>')
    }

    // Case 2: no placeholders -> try to map against templateOriginal to find variable regions
    if (templateOriginal && templateOriginal.includes('<<')) {
      const ranges = computeVarRanges(text, templateOriginal, variables)
      if (ranges.length) {
        // Build HTML with marks on ranges
        let out = ''
        let last = 0
        for (const r of ranges) {
          if (r.start > last) out += escapeHtml(text.slice(last, r.start))
          const valEsc = escapeHtml(text.slice(r.start, r.end))
          const varVal = variables[r.name] || ''
          const filled = (varVal || '').trim().length > 0
          const className = filled ? 'var-highlight filled' : 'var-highlight empty'
          out += `<mark class="${className}" data-var="${r.name}">${valEsc}</mark>`
          last = r.end
        }
        if (last < text.length) out += escapeHtml(text.slice(last))
        return out.replace(/\n/g, '<br>')
      }
    }

    // Fallback: just escaped text
    return escapeHtml(text).replace(/\n/g, '<br>')
  }

  // Handle text changes
  const handleChange = (e) => {
    onChange(e)
  }

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  // Update overlay when value or variables change
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.innerHTML = createHighlightedHTML(value || '')
    }
  }, [value, variables, showHighlights])

  // Keep overlay scroll aligned with textarea scroll
  useEffect(() => {
    const ta = textareaRef.current
    const ov = overlayRef.current
    if (!ta || !ov) return
    const syncScroll = () => {
      ov.scrollTop = ta.scrollTop
      ov.scrollLeft = ta.scrollLeft
    }
    ta.addEventListener('scroll', syncScroll)
    // initial sync
    syncScroll()
    return () => ta.removeEventListener('scroll', syncScroll)
  }, [])

  return (
    <div className="relative">
      {/* Background overlay for highlighting */}
      {showHighlights && (
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none z-10 px-4 py-4 text-[16px] leading-[1.7] tracking-[0.01em] overflow-auto rounded-[12px]"
          style={{ 
            minHeight,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            background: 'transparent',
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

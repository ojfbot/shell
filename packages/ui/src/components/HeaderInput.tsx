import React, { useRef, useCallback, useImperativeHandle } from 'react'
import { TextArea } from '@carbon/react'
import { tokens } from '../tokens.js'

export interface HeaderInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onEscape: () => void
  onFocus: () => void
  onBlur: () => void
  placeholder: string
  disabled: boolean
  isStreaming: boolean
}

export const HeaderInput = React.forwardRef<HTMLTextAreaElement, HeaderInputProps>(
  function HeaderInput(
    { value, onChange, onSubmit, onEscape, onFocus, onBlur, placeholder, disabled, isStreaming },
    ref,
  ) {
    const internalRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => internalRef.current!, [])

    const autoResize = useCallback(() => {
      const el = internalRef.current
      if (!el) return
      el.style.height = tokens.headerInputMinHeight
      el.style.height = `${Math.min(el.scrollHeight, parseInt(tokens.headerInputMaxHeight))}px`
    }, [])

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      onChange(e.target.value)
      autoResize()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape()
        internalRef.current?.blur()
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSubmit()
      }
    }

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      onSubmit()
    }

    return (
      <form className="shell-header__input-form" onSubmit={handleSubmit}>
        <TextArea
          ref={internalRef}
          id="frame-command"
          labelText="Frame command"
          hideLabel
          aria-label="Frame command"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          className="shell-header__submit"
          disabled={isStreaming || !value.trim() || disabled}
          aria-label="Send"
        >
          {isStreaming ? '…' : '↑'}
        </button>
      </form>
    )
  },
)

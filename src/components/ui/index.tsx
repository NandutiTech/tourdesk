'use client'
import { useState, useRef, useEffect } from 'react'

// ── Button ──────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', style, children, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    border: 'none', borderRadius: '10px', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 700, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', gap: '6px',
    transition: 'opacity .15s', WebkitAppearance: 'none' as any
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: '#C9A84C', color: '#0A0A0F' },
    secondary: { background: 'none', border: '1px solid #1F1F2E', color: '#E8E0F0' },
    danger: { background: 'rgba(232,69,60,.1)', border: '1px solid rgba(232,69,60,.3)', color: '#E8453C' },
    ghost: { background: 'none', color: '#5A5570' }
  }
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 10px', fontSize: '12px' },
    md: { padding: '10px 16px', fontSize: '13px' },
    lg: { padding: '14px 24px', fontSize: '15px', fontWeight: 900 }
  }
  return (
    <button style={{ ...base, ...variants[variant], ...sizes[size], ...style }} {...props}>
      {children}
    </button>
  )
}

// ── Card ────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#17171F', border: '1px solid #1F1F2E', borderRadius: '14px',
      padding: '16px', ...style
    }}>
      {children}
    </div>
  )
}

// ── Input ───────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, style, ...props }: InputProps) {
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#12121A', border: '1px solid #1F1F2E',
    color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px',
    fontFamily: 'inherit', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', WebkitAppearance: 'none' as any, ...style
  }
  if (label) return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input style={inputStyle} {...props} />
    </div>
  )
  return <input style={inputStyle} {...props} />
}

// ── Select ──────────────────────────────────────────────────
export function Select({ label, style, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const selectStyle: React.CSSProperties = {
    width: '100%', background: '#12121A', border: '1px solid #1F1F2E',
    color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px',
    fontFamily: 'inherit', fontSize: '14px', outline: 'none', ...style
  }
  if (label) return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '4px' }}>{label}</label>
      <select style={selectStyle} {...props}>{children}</select>
    </div>
  )
  return <select style={selectStyle} {...props}>{children}</select>
}

// ── Textarea ────────────────────────────────────────────────
export function Textarea({ label, style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const s: React.CSSProperties = {
    width: '100%', background: '#12121A', border: '1px solid #1F1F2E',
    color: '#E8E0F0', borderRadius: '8px', padding: '10px 12px',
    fontFamily: 'inherit', fontSize: '14px', outline: 'none',
    resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', ...style
  }
  if (label) return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#5A5570', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '4px' }}>{label}</label>
      <textarea style={s} {...props} />
    </div>
  )
  return <textarea style={s} {...props} />
}

// ── Modal ───────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,5,10,.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#17171F', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontWeight: 900, fontSize: '16px' }}>{title}</div>
          <button onClick={onClose} style={{ background: '#12121A', border: '1px solid #1F1F2E', color: '#5A5570', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Toast ───────────────────────────────────────────────────
let toastTimeout: ReturnType<typeof setTimeout>

export function showToast(msg: string, success = true) {
  const existing = document.getElementById('td-toast')
  if (existing) existing.remove()
  clearTimeout(toastTimeout)

  const el = document.createElement('div')
  el.id = 'td-toast'
  el.textContent = msg
  el.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:${success ? 'rgba(93,201,160,.9)' : 'rgba(232,69,60,.9)'};
    color:${success ? '#0A0A0F' : 'white'};
    border-radius:20px;padding:8px 16px;font-size:13px;font-weight:800;
    z-index:9999;pointer-events:none;font-family:-apple-system,Inter,system-ui,sans-serif;
    white-space:nowrap;
  `
  document.body.appendChild(el)
  toastTimeout = setTimeout(() => el.remove(), 2500)
}

// ── Empty State ─────────────────────────────────────────────
export function EmptyState({ icon, title, sub }: { icon: string, title: string, sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5570' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '16px', color: '#E8E0F0', marginBottom: '6px' }}>{title}</div>
      {sub && <div style={{ fontSize: '13px', lineHeight: 1.6 }}>{sub}</div>}
    </div>
  )
}

// ── Section Header ──────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5A5570', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

// ── Toolbar ─────────────────────────────────────────────────
export function Toolbar({ title, actions }: { title: string, actions?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 16px 0', marginBottom: '16px'
    }}>
      <div style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.03em' }}>{title}</div>
      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  )
}

// ── Color Dot ───────────────────────────────────────────────
export function ColorDot({ color, size = 10 }: { color: string, size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '3px', background: color, flexShrink: 0 }} />
  )
}

import { LayoutDashboard, Compass, Plus, FileText, Settings, Sparkles } from 'lucide-react'
import { c, s, r, t, tokens } from './tokens'

interface SidebarProps {
  page: 'dashboard' | 'explore'
  setPage: (p: 'dashboard' | 'explore') => void
  mode: 'select' | 'ai' | 'custom'
  setMode: (m: 'select' | 'ai' | 'custom') => void
  file: File | null
  onUpload: () => void
  onChatToggle: () => void
  showChat: boolean
}

export default function Sidebar({ page, setPage, mode, setMode, file, onUpload, onChatToggle, showChat }: SidebarProps) {

  const navItem = (
    active: boolean,
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    accent: string = c.accent.mirai
  ) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: s.md,
        background: active ? `${accent}15` : 'transparent',
        border: 'none',
        borderRadius: r.md,
        padding: `${s.sm} ${s.md}`,
        color: active ? accent : c.text.tertiary,
        fontFamily: tokens.font.sans,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left' as const,
        transition: tokens.transition.fast,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = c.bg.raised
          e.currentTarget.style.color = c.text.secondary
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = c.text.tertiary
        }
      }}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div style={{
      width: 240,
      height: '100vh',
      background: c.bg.surface,
      borderRight: `0.5px solid ${c.border.default}`,
      display: 'flex',
      flexDirection: 'column',
      padding: s.lg,
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 10,
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.xl, paddingBottom: s.lg, borderBottom: `0.5px solid ${c.border.subtle}` }}>
        <div style={{ ...t.display, color: c.text.primary }}>
          mirai<span style={{ color: c.accent.mirai }}>bi</span>
        </div>
      </div>

      {/* File context */}
      {file ? (
        <div style={{
          background: c.bg.raised,
          border: `0.5px solid ${c.border.subtle}`,
          borderRadius: r.md,
          padding: `${s.sm} ${s.md}`,
          marginBottom: s.lg,
          display: 'flex',
          alignItems: 'center',
          gap: s.sm,
        }}>
          <FileText size={12} color={c.accent.mirai} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...t.caption, color: c.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {file.name}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={onUpload}
          style={{
            background: 'transparent',
            border: `0.5px dashed ${c.border.default}`,
            borderRadius: r.md,
            padding: s.md,
            marginBottom: s.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: s.sm,
            color: c.text.tertiary,
            fontFamily: tokens.font.sans,
            fontSize: 12,
            cursor: 'pointer',
            transition: tokens.transition.fast,
          }}
        >
          <Plus size={12} />
          Upload CSV
        </button>
      )}

      {/* Navigation */}
      <div style={{ ...t.label, color: c.text.muted, marginBottom: s.sm, paddingLeft: s.md }}>
        Workspace
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: s.xs, marginBottom: s.xl }}>
        {navItem(
          page === 'dashboard',
          <LayoutDashboard size={14} />,
          'Dashboard',
          () => setPage('dashboard'),
          c.accent.mirai
        )}
        {navItem(
          page === 'explore',
          <Compass size={14} />,
          'Explore',
          () => setPage('explore'),
          c.accent.blue
        )}
      </div>

      {/* Modes (only shown when on dashboard with file) */}
      {file && page === 'dashboard' && (
        <>
          <div style={{ ...t.label, color: c.text.muted, marginBottom: s.sm, paddingLeft: s.md }}>
            View
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: s.xs, marginBottom: s.xl }}>
            {navItem(
              mode === 'select',
              <Plus size={14} />,
              'Choose mode',
              () => setMode('select'),
              c.accent.mirai
            )}
            {navItem(
              mode === 'ai',
              <Sparkles size={14} />,
              'AI insights',
              () => setMode('ai'),
              c.accent.mirai
            )}
            {navItem(
              mode === 'custom',
              <LayoutDashboard size={14} />,
              'Build from scratch',
              () => setMode('custom'),
              c.accent.blue
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Chat AI button */}
      {file && (
        <button
          onClick={onChatToggle}
          style={{
            background: showChat ? c.accent.blueSoft : 'transparent',
            border: `0.5px solid ${showChat ? c.accent.blue : c.border.default}`,
            borderRadius: r.md,
            padding: `${s.sm} ${s.md}`,
            color: showChat ? c.accent.blue : c.text.secondary,
            fontFamily: tokens.font.sans,
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: s.sm,
            marginBottom: s.sm,
            transition: tokens.transition.fast,
          }}
        >
          <Sparkles size={13} />
          Chat AI
        </button>
      )}

      {/* Settings (placeholder for future) */}
      <button
        style={{
          background: 'transparent',
          border: 'none',
          padding: `${s.sm} ${s.md}`,
          color: c.text.muted,
          fontFamily: tokens.font.sans,
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: s.sm,
          transition: tokens.transition.fast,
        }}
      >
        <Settings size={13} />
        Settings
      </button>
    </div>
  )
}
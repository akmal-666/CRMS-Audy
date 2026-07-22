'use client'

import { Menu, PanelLeftClose, PanelLeft, Bell, Search, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/auth-context'
import { getInitials, cn } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'
import { CommandPalette } from '../command-palette'

interface HeaderProps {
  onMenuClick: () => void
  onCollapseToggle: () => void
  sidebarCollapsed: boolean
}

export function Header({ onMenuClick, onCollapseToggle, sidebarCollapsed }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <header className="h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 sticky top-0 z-10">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Menu size={18} />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onCollapseToggle}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Search */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground text-sm flex-1 max-w-sm"
        >
          <Search size={14} />
          <span>Quick search...</span>
          <kbd className="ml-auto text-xs bg-background border border-border rounded px-1.5 py-0.5 hidden sm:block">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
          <Link href="/notifications" className="relative p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bell size={16} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger rounded-full border border-card" />
          </Link>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs font-semibold hover:bg-primary transition-colors"
            >
              {user ? getInitials(user.name) : 'U'}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-soft-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/profile" className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors" onClick={() => setProfileOpen(false)}>Profile</Link>
                    <button onClick={() => { logout(); setProfileOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5 transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}

'use client'

import { useAuth } from '@/context/auth-context'
import { getInitials } from '@/lib/utils'
import { LogOut, User, Shield, Mail, Key } from 'lucide-react'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground animate-pulse">
        Loading Profile...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-6 pb-6 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold ring-4 ring-background shadow-soft">
            {getInitials(user.name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Shield size={12} />
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Account Information</h3>
          
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Full Name</p>
                  <p className="text-xs text-muted-foreground">{user.name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email Address</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Key size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="text-xs text-muted-foreground">••••••••</p>
                </div>
              </div>
              <button className="text-sm font-medium text-primary hover:underline">Change</button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 text-danger font-medium hover:text-danger/80 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Kanban, ListChecks, Users, Building2,
  GitBranch, Package, Settings, ChevronDown, ChevronRight,
  Sparkles, Bell, FileText, BarChart3, Shield, X, Calendar
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { useState } from 'react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  badge?: number
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Kanban Board', href: '/kanban', icon: <Kanban size={16} /> },
  { label: 'Calendar', href: '/requests/calendar', icon: <Calendar size={16} /> },
  { label: 'All Requests', href: '/requests', icon: <ListChecks size={16} /> },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={16} /> },
  { label: 'Notifications', href: '/notifications', icon: <Bell size={16} /> },
]

const adminItems: NavItem[] = [
  { label: 'Users', href: '/admin/users', icon: <Users size={16} /> },
  { label: 'Departments', href: '/admin/departments', icon: <Building2 size={16} /> },
  { label: 'Branches', href: '/admin/branches', icon: <GitBranch size={16} /> },
  { label: 'Vendors', href: '/admin/vendors', icon: <Package size={16} /> },
  { label: 'Audit Trail', href: '/admin/audit', icon: <Shield size={16} /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} /> },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [adminExpanded, setAdminExpanded] = useState(false)
  const isAdmin = user?.role === 'administrator' || user?.role === 'manager'

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col',
        'bg-[#0F0F23] border-r border-white/5',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          adminExpanded={adminExpanded}
          setAdminExpanded={setAdminExpanded}
          isAdmin={isAdmin}
        />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-30 flex flex-col w-72 bg-[#0F0F23] border-r border-white/5 lg:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <Logo collapsed={false} />
              <button onClick={onMobileClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              collapsed={false}
              pathname={pathname}
              user={user}
              adminExpanded={adminExpanded}
              setAdminExpanded={setAdminExpanded}
              isAdmin={isAdmin}
              onItemClick={onMobileClose}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
        <Sparkles size={16} className="text-white" />
      </div>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-white text-sm tracking-tight"
        >
          CRMS
        </motion.span>
      )}
    </div>
  )
}

function SidebarContent({
  collapsed, pathname, user, adminExpanded, setAdminExpanded, isAdmin, onItemClick
}: {
  collapsed: boolean
  pathname: string
  user: { name: string; email: string; role: string; avatarUrl?: string } | null
  adminExpanded: boolean
  setAdminExpanded: (v: boolean) => void
  isAdmin: boolean
  onItemClick?: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <Logo collapsed={collapsed} />

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))} onClick={onItemClick} />
          ))}
        </div>

        {isAdmin && (
          <div className="mt-4">
            {!collapsed && (
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
              >
                <span>Administration</span>
                {adminExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            <AnimatePresence>
              {(adminExpanded || collapsed) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-0.5 mt-1"
                >
                  {adminItems.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} isActive={pathname === item.href} onClick={onItemClick} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-white/5">
        <Link href="/profile" className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer',
          collapsed ? 'justify-center' : ''
        )}>
          <div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user ? getInitials(user.name) : 'U'}
          </div>
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/40 truncate capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}

function NavLink({ item, collapsed, isActive, onClick }: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href!}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        collapsed ? 'justify-center px-2' : '',
        isActive
          ? 'bg-primary text-white shadow-sm shadow-primary/30'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto bg-white/10 text-white/70 text-xs px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

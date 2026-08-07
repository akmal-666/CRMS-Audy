'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Kanban, ListChecks, Users, Building2,
  GitBranch, Package, Settings, ChevronDown, ChevronRight,
  Bell, FileText, BarChart3, Shield, X, Calendar,
  PlusCircle, CalendarRange, ArrowUpFromLine,
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

// All nav items with optional role restrictions
const allNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Kanban Board', href: '/kanban', icon: <Kanban size={16} /> },
  { label: 'Timeline', href: '/timeline', icon: <CalendarRange size={16} /> },
  { label: 'Calendar', href: '/requests/calendar', icon: <Calendar size={16} /> },
  { label: 'All Requests', href: '/requests', icon: <ListChecks size={16} /> },
  // New Request is visible to business_user and administrator
  { label: 'New Request', href: '/requests/new', icon: <PlusCircle size={16} />, roles: ['business_user', 'administrator', 'business_analyst'] },
  { label: 'Notifications', href: '/notifications', icon: <Bell size={16} /> },
]

const reportsItems: NavItem[] = [
  { label: 'Executive Overview', href: '/reports/executive-overview', icon: <BarChart3 size={16} /> },
  { label: 'Project Health', href: '/reports/project-health', icon: <BarChart3 size={16} /> },
  { label: 'Mandays Report', href: '/reports/mandays', icon: <BarChart3 size={16} /> },
  // Coming soon modules
  // { label: 'Cycle Time & SLA', href: '/reports/cycle-time-sla', icon: <BarChart3 size={16} /> },
  // { label: 'Workload Team', href: '/reports/workload-team', icon: <BarChart3 size={16} /> },
]

const adminItems: NavItem[] = [
  { label: 'Users', href: '/admin/users', icon: <Users size={16} /> },
  { label: 'Departments', href: '/admin/departments', icon: <Building2 size={16} /> },
  { label: 'Branches', href: '/admin/branches', icon: <GitBranch size={16} /> },
  { label: 'Vendors', href: '/admin/vendors', icon: <Package size={16} /> },
  { label: 'Audit Trail', href: '/admin/audit', icon: <Shield size={16} /> },
  { label: 'Migration', href: '/admin/migration', icon: <ArrowUpFromLine size={16} /> },
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
  const [reportsExpanded, setReportsExpanded] = useState(false)
  const isAdmin = user?.role === 'administrator' || user?.role === 'manager'
  const canViewReports = user?.role === 'administrator' || user?.role === 'manager' || user?.role === 'business_analyst'
  const isBusinessUser = user?.role === 'business_user'

  // Filter nav items based on role
  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true // visible to all
    if (!user) return false
    return item.roles.includes(user.role)
  })

  // For business_user, only show: Kanban, Calendar, All Requests, New Request, Notifications
  const filteredNavItems = isBusinessUser
    ? navItems.filter(item => ['/kanban', '/timeline', '/requests/calendar', '/requests', '/requests/new', '/notifications'].includes(item.href ?? ''))
    : navItems

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col',
        'bg-card border-r border-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          adminExpanded={adminExpanded}
          setAdminExpanded={setAdminExpanded}
          reportsExpanded={reportsExpanded}
          setReportsExpanded={setReportsExpanded}
          isAdmin={isAdmin}
          canViewReports={canViewReports}
          isBusinessUser={isBusinessUser}
          navItems={filteredNavItems}
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
            className="fixed inset-y-0 left-0 z-30 flex flex-col w-72 bg-card border-r border-border lg:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Logo collapsed={false} />
              <button onClick={onMobileClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              collapsed={false}
              pathname={pathname}
              user={user}
              adminExpanded={adminExpanded}
              setAdminExpanded={setAdminExpanded}
              reportsExpanded={reportsExpanded}
              setReportsExpanded={setReportsExpanded}
              isAdmin={isAdmin}
              canViewReports={canViewReports}
              isBusinessUser={isBusinessUser}
              navItems={filteredNavItems}
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
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
        <img 
          src="/audy-logo.svg" 
          alt="Audy Dental" 
          className="w-full h-full object-contain"
        />
      </div>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-foreground text-sm tracking-tight"
        >
          IT Workflow
        </motion.span>
      )}
    </div>
  )
}

function SidebarContent({
  collapsed, pathname, user, adminExpanded, setAdminExpanded, reportsExpanded, setReportsExpanded, isAdmin, canViewReports, isBusinessUser, navItems, onItemClick
}: {
  collapsed: boolean
  pathname: string
  user: { name: string; email: string; role: string; avatarUrl?: string } | null
  adminExpanded: boolean
  setAdminExpanded: (v: boolean) => void
  reportsExpanded: boolean
  setReportsExpanded: (v: boolean) => void
  isAdmin: boolean
  canViewReports: boolean
  isBusinessUser: boolean
  navItems: NavItem[]
  onItemClick?: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <Logo collapsed={collapsed} />

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isReqDetail = item.href === '/requests' && pathname.startsWith('/requests/') && pathname !== '/requests/calendar' && pathname !== '/requests/new'
            const isTimelineActive = item.href === '/timeline' && (pathname === '/timeline' || pathname.startsWith('/timeline/'))
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/requests' && item.href !== '/requests/new' && pathname.startsWith(item.href!)) || isReqDetail || isTimelineActive
            return (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isActive}
                onClick={onItemClick}
                highlight={item.href === '/requests/new'}
              />
            )
          })}
        </div>

        {canViewReports && (
          <div className="mt-4">
            {!collapsed && (
              <button
                onClick={() => setReportsExpanded(!reportsExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>Reports</span>
                {reportsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            <AnimatePresence>
              {(reportsExpanded || collapsed) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-0.5 mt-1"
                >
                  {reportsItems.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} isActive={pathname === item.href} onClick={onItemClick} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isAdmin && (
          <div className="mt-4">
            {!collapsed && (
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
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
      <div className="p-2 border-t border-border">
        <Link href="/profile" className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer',
          collapsed ? 'justify-center' : ''
        )}>
          <div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user ? getInitials(user.name) : 'U'
            )}
          </div>
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role.replace(/_/g, ' ')}</p>
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}

function NavLink({ item, collapsed, isActive, onClick, highlight }: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
  onClick?: () => void
  highlight?: boolean
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
          : highlight
            ? 'text-primary hover:text-white hover:bg-primary/20 border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  )
}


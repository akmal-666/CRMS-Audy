'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/auth-context'
import { getInitials } from '@/lib/utils'
import { LogOut, User, Shield, Mail, Key, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const res = await fetch(`/api/users/${user?.id}/avatar`, {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Upload failed')
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['work-items'], exact: false })
      toast.success('Profile photo updated successfully')
      setUploading(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload photo')
      setUploading(false)
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    setUploading(true)
    uploadAvatarMutation.mutate(file)
  }

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
          <div className="relative group">
            {user.avatarUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-background shadow-soft">
                <Image 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  width={80} 
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold ring-4 ring-background shadow-soft">
                {getInitials(user.name)}
              </div>
            )}
            
            {/* Upload button overlay */}
            <label 
              htmlFor="avatar-upload" 
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Shield size={12} />
              <span className="capitalize">{user.role}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click photo to change</p>
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

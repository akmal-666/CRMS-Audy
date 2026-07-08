'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { timeAgo, getInitials, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'

interface Comment {
  id: string
  content: string
  userId?: string
  guestName?: string
  user?: { id: string; name: string; avatarUrl?: string; role?: string }
  createdAt: string
  isEdited: boolean
}

interface CommentSectionProps {
  workItemId: string
  comments: Comment[]
}

export function CommentSection({ workItemId, comments }: CommentSectionProps) {
  const [content, setContent] = useState('')
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const addComment = useMutation({
    mutationFn: () => apiPost(`/api/work-items/${workItemId}/comments`, { content }),
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      toast.success('Comment added')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <MessageSquare size={14} />
        Comments ({comments.length})
      </h4>

      {/* Existing comments */}
      <div className="space-y-3 mb-4">
        {comments.map((comment) => {
          const name = comment.user?.name || comment.guestName || 'Unknown'
          return (
            <div key={comment.id} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0 mt-0.5">
                {getInitials(name)[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                  {comment.isEdited && <span className="text-xs text-muted-foreground/50">(edited)</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{comment.content}</p>
              </div>
            </div>
          )
        })}
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-3">No comments yet</p>
        )}
      </div>

      {/* New comment */}
      {user && (
        <div className="flex gap-2 items-end">
          <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs flex-shrink-0">
            {getInitials(user.name)[0]}
          </div>
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && content.trim()) {
                  e.preventDefault()
                  addComment.mutate()
                }
              }}
              placeholder="Write a comment..."
              rows={2}
              className="input resize-none text-sm pr-10"
            />
            <button
              disabled={!content.trim() || addComment.isPending}
              onClick={() => addComment.mutate()}
              className="absolute right-2 bottom-2 p-1 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

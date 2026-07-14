'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { BarChart3, Calendar, Clock, AlertTriangle, Zap, Activity, Edit2, Loader2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { apiPut } from '@/lib/api'
import { toast } from 'sonner'

interface Assessment {
  estimatedManDays?: number
  estimatedHours?: number
  targetGoLive?: string
  complexity?: string
  risk?: string
  impact?: string
  technicalNotes?: string
}

const LEVEL_COLORS: Record<string, string> = {
  low:      'text-green-600 bg-green-100',
  medium:   'text-amber-600 bg-amber-100',
  high:     'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100',
}

interface AssessmentPanelProps {
  assessment?: Assessment
  workItemId?: string
  canEdit?: boolean
}

export function AssessmentPanel({ assessment, workItemId, canEdit }: AssessmentPanelProps) {
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Assessment>({
    defaultValues: assessment ?? {},
  })

  const save = useMutation({
    mutationFn: (data: Assessment) => apiPut(`/api/work-items/${workItemId}/assessment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      toast.success('Assessment saved')
      setEditing(false)
    },
    onError: () => toast.error('Failed to save assessment'),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <BarChart3 size={14} />
          Assessment
        </h4>
        {canEdit && workItemId && !editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost text-xs flex items-center gap-1 py-1">
            <Edit2 size={12} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Man Days</label>
              <input {...register('estimatedManDays', { valueAsNumber: true })} type="number" step="0.5" className="input text-sm" placeholder="0" />
            </div>
            <div>
              <label className="label text-xs">Est. Hours</label>
              <input {...register('estimatedHours', { valueAsNumber: true })} type="number" step="0.5" className="input text-sm" placeholder="0" />
            </div>
            <div>
              <label className="label text-xs">Target Go Live</label>
              <input {...register('targetGoLive')} type="date" className="input text-sm" />
            </div>
            <div>
              <label className="label text-xs">Complexity</label>
              <select {...register('complexity')} className="input text-sm">
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Risk</label>
              <select {...register('risk')} className="input text-sm">
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Impact</label>
              <select {...register('impact')} className="input text-sm">
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">Technical Notes</label>
            <textarea {...register('technicalNotes')} rows={3} className="input text-sm" placeholder="Technical notes..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={save.isPending} className="btn-primary text-xs flex items-center gap-1.5 py-1.5">
              {save.isPending && <Loader2 size={12} className="animate-spin" />}
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5">Cancel</button>
          </div>
        </form>
      ) : assessment ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {assessment.estimatedManDays != null && (
            <Metric icon={<Clock size={14} />} label="Man Days" value={String(assessment.estimatedManDays)} />
          )}
          {assessment.estimatedHours != null && (
            <Metric icon={<Activity size={14} />} label="Est. Hours" value={`${assessment.estimatedHours}h`} />
          )}
          {assessment.targetGoLive && (
            <Metric icon={<Calendar size={14} />} label="Target Go Live" value={formatDate(assessment.targetGoLive)} />
          )}
          {assessment.complexity && (
            <MetricBadge icon={<Zap size={14} />} label="Complexity" value={assessment.complexity} />
          )}
          {assessment.risk && (
            <MetricBadge icon={<AlertTriangle size={14} />} label="Risk" value={assessment.risk} />
          )}
          {assessment.impact && (
            <MetricBadge icon={<Activity size={14} />} label="Impact" value={assessment.impact} />
          )}
          {assessment.technicalNotes && (
            <div className="col-span-2 mt-1 p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Technical Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{assessment.technicalNotes}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/60 py-2">No assessment yet.{canEdit ? ' Click Edit to add.' : ''}</p>
      )}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function MetricBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', LEVEL_COLORS[value] ?? 'bg-muted text-muted-foreground')}>
          {value}
        </span>
      </div>
    </div>
  )
}

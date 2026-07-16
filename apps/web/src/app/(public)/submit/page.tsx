import { Metadata } from 'next'
import { PublicRequestForm } from '@/features/public/request-form'
import Link from 'next/link'
import { Search } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Submit IT Request | CRMS',
  description: 'Submit an IT change request to our team',
}

export default function SubmitPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-soft-lg">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Submit IT Request</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
            Fill in the form below to submit your IT request. You will receive a confirmation email with your ticket number.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/track" className="btn-ghost flex items-center gap-2 text-primary border border-primary/20 hover:border-primary/50">
              <Search size={16} /> Track My Request
            </Link>
          </div>
        </div>

        <PublicRequestForm />
      </div>
    </div>
  )
}

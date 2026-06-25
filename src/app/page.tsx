'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster, toast } from 'sonner'

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
}

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')
  const [viewParams, setViewParams] = useState<Record<string, string>>({})

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handleLogin = (userData: SessionUser) => {
    setUser(userData)
    toast.success(`Welcome back, ${userData.name}`)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setUser(null)
    setCurrentView('dashboard')
    setViewParams({})
  }

  const navigate = (view: string, params: Record<string, string> = {}) => {
    setCurrentView(view)
    setViewParams(params)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <>
      <AppShell
        user={user}
        currentView={currentView}
        viewParams={viewParams}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <Toaster position="top-right" />
    </>
  )
}
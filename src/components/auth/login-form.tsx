'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { Logo } from '../ui/logo'

interface LoginFormProps {
  onLogin: (user: { id: string; name: string; email: string; role: string }) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول')
        return
      }

      onLogin(data.user)
    } catch {
      setError('خطأ في الشبكة. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo sizeParam="sm"/>
          </div>
          <CardTitle className="text-2xl font-bold">نظام إدارة الفندق</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">قم بتسجيل الدخول إلى حسابك</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم أو البريد الإلكتروني</Label>
              <Input
                id="username"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              تسجيل الدخول
            </Button>
          </form>
{/* 
          <div className="mt-6 pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/70">بيانات تجريبية:</p>
            <p>المدير: <span className="font-mono">admin</span> / <span className="font-mono">admin123</span></p>
            <p>الاستقبال: <span className="font-mono">reception</span> / <span className="font-mono">reception123</span></p>
            <p>المحاسب: <span className="font-mono">accounts</span> / <span className="font-mono">account123</span></p>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )
}
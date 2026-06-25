import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyCredentials } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
    }

    const user = await verifyCredentials(username, password)

    if (!user) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 401 })
    }

    const sessionData = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64')

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })

    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('session-token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
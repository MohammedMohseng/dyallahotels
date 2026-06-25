import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'غير مصادق عليه' }, { status: 401 })
    }

    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString())

    if (sessionData.exp && Date.now() > sessionData.exp) {
      const response = NextResponse.json({ error: 'انتهت صلاحية الجلسة' }, { status: 401 })
      response.cookies.set('session-token', '', { maxAge: 0, path: '/' })
      return response
    }

    return NextResponse.json({
      user: {
        id: sessionData.userId,
        name: sessionData.name,
        email: sessionData.email,
        role: sessionData.role,
      },
    })
  } catch {
    return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 })
  }
}
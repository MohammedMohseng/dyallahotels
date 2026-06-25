import { db } from '@/lib/db'

const NEXTAUTH_SECRET = 'hotel-management-system-secret-key-2024'

export async function verifyCredentials(username: string, password: string) {
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username },
        { email: username },
      ],
      isActive: true,
    },
  })

  if (!user) return null

  // Dynamic import to avoid ESM/CJS issues with bcryptjs
  const bcrypt = await import('bcryptjs')
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 10)
}

export { NEXTAUTH_SECRET }
'use server'

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod/v4'
import {
  guestSchema, roomSchema, checkInSchema, reservationSchema,
  companySchema, paymentSchema, userSchema
} from '@/validations/schemas'
import type { Prisma } from '@prisma/client'

// ============ GUEST ACTIONS ============

export async function getGuests(search?: string) {
  const where: Prisma.GuestWhereInput = search
    ? {
        OR: [
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { passportNumber: { contains: search } },
        ],
      }
    : {}

  return db.guest.findMany({
    where,
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getGuestById(id: string) {
  return db.guest.findUnique({
    where: { id },
    include: {
      company: true,
      stays: {
        orderBy: { createdAt: 'desc' },
        include: { room: { select: { roomNumber: true, type: true } }, payments: true },
      },
      reservations: {
        orderBy: { createdAt: 'desc' },
        include: { room: { select: { roomNumber: true, type: true } } },
      },
    },
  })
}

export async function createGuest(data: unknown) {
  const parsed = guestSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const guest = await db.guest.create({ data: parsed.data })
  return { data: guest }
}

export async function updateGuest(id: string, data: unknown) {
  const parsed = guestSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const guest = await db.guest.update({ where: { id }, data: parsed.data })
  return { data: guest }
}

// ============ ROOM ACTIONS ============

export async function getRooms(filters?: { status?: string; type?: string; floor?: number; search?: string }) {
  const where: Prisma.RoomWhereInput = {}
  if (filters?.status) where.status = filters.status as any
  if (filters?.type) where.type = filters.type as any
  if (filters?.floor) where.floor = filters.floor
  if (filters?.search) where.roomNumber = { contains: filters.search }


  return db.room.findMany({
    where,
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
     include: {
      stays: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { guest: { select: { fullName: true, phone: true } } },
      },
    },
  })

}

export async function getRoomById(id: string) {
  return db.room.findUnique({
    where: { id },
    include: {
      stays: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { guest: { select: { fullName: true, phone: true } } },
      },
    },
  })
}

export async function getRoomsWithStatus() {
  const rooms = await db.room.findMany({
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    include: {
      stays: {
        where: { status: 'ACTIVE' },
        include: { guest: { select: { id: true, fullName: true } } },
        take: 1,
      },
      reservations: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        include: { guest: { select: { id: true, fullName: true } } },
        take: 1,
      },
    },
  })

  return rooms.map((room) => ({
    ...room,
    currentStay: room.stays[0] || null,
    currentReservation: room.reservations[0] || null,
    stays: undefined,
    reservations: undefined,
  }))
}

export async function createRoom(data: unknown) {
  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const room = await db.room.create({ data: parsed.data })
    return { data: room }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Room number already exists' }
    return { error: 'Failed to create room' }
  }
}

export async function updateRoom(id: string, data: unknown) {
  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const room = await db.room.update({ where: { id }, data: parsed.data })
    return { data: room }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Room number already exists' }
    return { error: 'Failed to update room' }
  }
}

export async function updateRoomStatus(id: string, status: string) {
  const room = await db.room.update({ where: { id }, data: { status: status as any } })
  return { data: room }
}

// ============ CHECK-IN / CHECK-OUT ACTIONS ============

export async function performCheckIn(data: unknown, userId: string) {
  const parsed = checkInSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { guestId, roomId, checkIn, expectedCheckOut, numberOfGuests, notes, amountPaid, paymentMethod } = parsed.data

  // Check room is available
  const room = await db.room.findUnique({ where: { id: roomId } })
  if (!room) return { error: 'Room not found' }
  if (room.status !== 'AVAILABLE' && room.status !== 'RESERVED') {
    return { error: 'Room is not available for check-in' }
  }

  // Check for overlapping active stays
  const activeStay = await db.stay.findFirst({
    where: { roomId, status: 'ACTIVE' },
  })
  if (activeStay) return { error: 'Room already has an active stay' }

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(expectedCheckOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  const totalPrice = nights * room.pricePerNight

  // Use a transaction to ensure consistency
  const result = await db.$transaction(async (tx) => {
    // Create stay
    const stay = await tx.stay.create({
      data: {
        guestId,
        roomId,
        checkIn: checkInDate,
        expectedCheckOut: checkOutDate,
        numberOfGuests,
        totalPrice,
        amountPaid,
        paymentStatus: amountPaid >= totalPrice ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID',
        status: 'ACTIVE',
        notes,
      },
    })

    // Record payment if any
    if (amountPaid > 0) {
      await tx.payment.create({
        data: {
          stayId: stay.id,
          amount: amountPaid,
          paymentMethod,
          receivedBy: userId,
        },
      })
    }

    // Update room status
    await tx.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED' },
    })

    // Update reservation if exists
    await tx.reservation.updateMany({
      where: { guestId, roomId, status: 'CONFIRMED' },
      data: { status: 'CHECKED_IN' },
    })

    return stay
  })

  return { data: result }
}

export async function performCheckOut(stayId: string, extraCharges: number, paymentData: { amount: number; paymentMethod: string }, userId: string) {
  const stay = await db.stay.findUnique({
    where: { id: stayId },
    include: { room: true },
  })

  if (!stay) return { error: 'Stay not found' }
  if (stay.status !== 'ACTIVE') return { error: 'Stay is not active' }

  const totalWithExtras = stay.totalPrice + extraCharges
  const newAmountPaid = stay.amountPaid + paymentData.amount
  const newPaymentStatus = newAmountPaid >= totalWithExtras ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : 'UNPAID'

  const result = await db.$transaction(async (tx) => {
    // Record payment
    if (paymentData.amount > 0) {
      await tx.payment.create({
        data: {
          stayId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod as any,
          receivedBy: userId,
        },
      })
    }

    // Update stay
    const updated = await tx.stay.update({
      where: { id: stayId },
      data: {
        totalPrice: totalWithExtras,
        amountPaid: newAmountPaid,
        paymentStatus: newPaymentStatus,
        status: 'COMPLETED',
        actualCheckOut: new Date(),
      },
    })

    // Update room status
    await tx.room.update({
      where: { id: stay.roomId },
      data: { status: 'AVAILABLE' },
    })

    return updated
  })

  return { data: result }
}

export async function extendStay(stayId: string, newCheckOut: string) {
  const stay = await db.stay.findUnique({
    where: { id: stayId },
    include: { room: true },
  })

  if (!stay) return { error: 'Stay not found' }
  if (stay.status !== 'ACTIVE') return { error: 'Stay is not active' }

  const newDate = new Date(newCheckOut)
  if (newDate <= stay.expectedCheckOut) return { error: 'New check-out must be after current check-out' }

  const originalNights = Math.ceil(
    (stay.expectedCheckOut.getTime() - stay.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  )
  const newNights = Math.ceil(
    (newDate.getTime() - stay.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  )
  const additionalNights = newNights - originalNights
  const additionalCost = additionalNights * stay.room.pricePerNight

  const updated = await db.stay.update({
    where: { id: stayId },
    data: {
      expectedCheckOut: newDate,
      totalPrice: stay.totalPrice + additionalCost,
    },
  })

  return { data: updated }
}

// ============ RESERVATION ACTIONS ============

export async function getReservations(filters?: { status?: string }) {
  const where: Prisma.ReservationWhereInput = {}
  if (filters?.status) where.status = filters.status as any

  return db.reservation.findMany({
    where,
    include: {
      guest: { select: { fullName: true, phone: true } },
      room: { select: { roomNumber: true, type: true, floor: true } },
    },
    orderBy: { startDate: 'asc' },
  })
}

export async function createReservation(data: unknown) {
  const parsed = reservationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { guestId, roomId, startDate, endDate, deposit, notes } = parsed.data

  // Check for overlapping reservations
  const start = new Date(startDate)
  const end = new Date(endDate)

  const overlapping = await db.reservation.findFirst({
    where: {
      roomId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { startDate: { lt: end }, endDate: { gt: start } },
      ],
    },
  })

  if (overlapping) return { error: 'Room already reserved for these dates' }

  // Check for overlapping active stays
  const overlappingStay = await db.stay.findFirst({
    where: {
      roomId,
      status: 'ACTIVE',
      checkIn: { lt: end },
      expectedCheckOut: { gt: start },
    },
  })

  if (overlappingStay) return { error: 'Room has an active stay for these dates' }

  const reservation = await db.reservation.create({
    data: {
      guestId,
      roomId,
      startDate: start,
      endDate: end,
      deposit,
      notes,
      status: deposit > 0 ? 'CONFIRMED' : 'PENDING',
    },
  })

  return { data: reservation }
}

export async function updateReservationStatus(id: string, status: string) {
  const reservation = await db.reservation.update({
    where: { id },
    data: { status: status as any },
  })
  return { data: reservation }
}

// ============ COMPANY ACTIONS ============

export async function getCompanies(search?: string) {
  const where: Prisma.CompanyWhereInput = search
    ? { name: { contains: search } }
    : {}

  return db.company.findMany({
    where,
    include: {
      _count: { select: { guests: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getCompanyById(id: string) {
  return db.company.findUnique({
    where: { id },
    include: {
      guests: {
        orderBy: { fullName: 'asc' },
        include: {
          stays: {
            where: { status: 'ACTIVE' },
            select: { id: true, room: { select: { roomNumber: true } } },
          },
        },
      },
    },
  })
}

export async function createCompany(data: unknown) {
  const parsed = companySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const company = await db.company.create({ data: parsed.data })
  return { data: company }
}

export async function updateCompany(id: string, data: unknown) {
  const parsed = companySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const company = await db.company.update({ where: { id }, data: parsed.data })
  return { data: company }
}

// ============ DASHBOARD ACTIONS ============

export async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    totalRooms,
    occupiedRooms,
    availableRooms,
    cleaningRooms,
    maintenanceRooms,
    reservedRooms,
    todayCheckins,
    todayCheckouts,
    todayPayments,
  ] = await Promise.all([
    db.room.count(),
    db.room.count({ where: { status: 'OCCUPIED' } }),
    db.room.count({ where: { status: 'AVAILABLE' } }),
    db.room.count({ where: { status: 'CLEANING' } }),
    db.room.count({ where: { status: 'MAINTENANCE' } }),
    db.room.count({ where: { status: 'RESERVED' } }),
    db.stay.count({ where: { checkIn: { gte: today, lt: tomorrow }, status: 'ACTIVE' } }),
    db.stay.count({ where: { actualCheckOut: { gte: today, lt: tomorrow } } }),
    db.payment.aggregate({ where: { createdAt: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
  ])

  const dailyRevenue = todayPayments._sum.amount || 0
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  return {
    totalRooms,
    occupiedRooms,
    availableRooms,
    cleaningRooms,
    maintenanceRooms,
    reservedRooms,
    todayCheckins,
    todayCheckouts,
    dailyRevenue,
    occupancyRate,
  }
}

// ============ REPORTS ACTIONS ============

export async function getRevenueReport(days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const payments = await db.payment.findMany({
    where: { createdAt: { gte: startDate } },
    include: {
      stay: {
        include: {
          guest: { select: { fullName: true } },
          room: { select: { roomNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

  return { payments, totalRevenue }
}

export async function getOccupancyReport(days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const stays = await db.stay.findMany({
    where: { checkIn: { gte: startDate } },
    include: { room: { select: { roomNumber: true, type: true, pricePerNight: true } } },
    orderBy: { checkIn: 'desc' },
  })

  return stays
}

// ============ USER / SETTINGS ACTIONS ============

export async function getUsers() {
  return db.user.findMany({
    select: { id: true, username: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createUser(data: unknown) {
  const parsed = userSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { password, ...rest } = parsed.data
  const passwordHash = await hashPassword(password)

  try {
    const user = await db.user.create({
      data: { ...rest, passwordHash },
      select: { id: true, username: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    })
    return { data: user }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Username or email already exists' }
    return { error: 'Failed to create user' }
  }
}

export async function toggleUserActive(id: string) {
  const user = await db.user.findUnique({ where: { id } })
  if (!user) return { error: 'User not found' }

  const updated = await db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, username: true, email: true, name: true, role: true, isActive: true },
  })
  return { data: updated }
}

// ============ STAY ACTIONS ============

export async function getActiveStays() {
  return db.stay.findMany({
    where: { status: 'ACTIVE' },
    include: {
      guest: { select: { fullName: true, phone: true } },
      room: { select: { roomNumber: true, type: true, floor: true } },
    },
    orderBy: { checkIn: 'desc' },
  })
}

export async function getStayById(id: string) {
  return db.stay.findUnique({
    where: { id },
    include: {
      guest: true,
      room: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function getAvailableRooms() {
  return db.room.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  })
}
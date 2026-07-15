import { z } from 'zod/v4'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const guestSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(5, 'Phone number is required'),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  nationalId: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  companyId: z.string().optional(),
  notes: z.string().optional(),
})

export const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.number().min(1, 'Floor is required'),
  type: z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'DELUXE', 'FAMILY']),
  capacity: z.number().min(1, 'Capacity is required'),
  pricePerNight: z.number().min(0, 'Price is required'),
  notes: z.string().optional(),
})

export const checkInSchema = z.object({
  guestId: z.string().min(1, 'Guest is required'),
  roomId: z.string().min(1, 'Room is required'),
  checkIn: z.string().min(1, 'Check-in date is required'),
  expectedCheckOut: z.string().min(1, 'Check-out date is required'),
  numberOfGuests: z.number().min(1, 'Number of guests is required'),
  notes: z.string().optional(),
  amountPaid: z.number().min(0, 'Amount is required'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CARD']),
})

export const reservationSchema = z.object({
  guestId: z.string().min(1, 'Guest is required'),
  roomId: z.string().min(1, 'Room is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  deposit: z.number().min(0, 'Deposit must be >= 0'),
  notes: z.string().optional(),
})

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CARD']),
  notes: z.string().optional(),
})

export const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.email('Invalid email address'),
  name: z.string().min(2, 'Name is required'),
  role: z.enum(['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type GuestInput = z.infer<typeof guestSchema>
export type RoomInput = z.infer<typeof roomSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type ReservationInput = z.infer<typeof reservationSchema>
export type CompanyInput = z.infer<typeof companySchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type UserInput = z.infer<typeof userSchema>
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const hashedReceptionist = await bcrypt.hash('reception123', 10)
  const hashedAccountant = await bcrypt.hash('account123', 10)

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hotel.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@hotel.com',
      name: 'System Administrator',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  })

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@hotel.com' },
    update: {},
    create: {
      username: 'reception',
      email: 'reception@hotel.com',
      name: 'Mary Johnson',
      passwordHash: hashedReceptionist,
      role: 'RECEPTIONIST',
    },
  })

  const accountant = await prisma.user.upsert({
    where: { email: 'accounts@hotel.com' },
    update: {},
    create: {
      username: 'accounts',
      email: 'accounts@hotel.com',
      name: 'John Smith',
      passwordHash: hashedAccountant,
      role: 'ACCOUNTANT',
    },
  })

  // Create companies
  const company1 = await prisma.company.create({
    data: { name: 'Acme Corp', contactPerson: 'Tom Wilson', phone: '+1-555-0101', address: '123 Business Ave' },
  })
  const company2 = await prisma.company.create({
    data: { name: 'Global Travel Ltd', contactPerson: 'Sarah Lee', phone: '+1-555-0202', address: '456 Travel St' },
  })

  // Create rooms - 3 floors, various types
  const roomData = [
    // Floor 1
    { roomNumber: '101', floor: 1, type: 'SINGLE' as const, capacity: 1, pricePerNight: 50 },
    { roomNumber: '102', floor: 1, type: 'SINGLE' as const, capacity: 1, pricePerNight: 50 },
    { roomNumber: '103', floor: 1, type: 'DOUBLE' as const, capacity: 2, pricePerNight: 80 },
    { roomNumber: '104', floor: 1, type: 'DOUBLE' as const, capacity: 2, pricePerNight: 80 },
    { roomNumber: '105', floor: 1, type: 'TWIN' as const, capacity: 2, pricePerNight: 75 },
    // Floor 2
    { roomNumber: '201', floor: 2, type: 'SINGLE' as const, capacity: 1, pricePerNight: 55 },
    { roomNumber: '202', floor: 2, type: 'DOUBLE' as const, capacity: 2, pricePerNight: 85 },
    { roomNumber: '203', floor: 2, type: 'DELUXE' as const, capacity: 2, pricePerNight: 120 },
    { roomNumber: '204', floor: 2, type: 'SUITE' as const, capacity: 3, pricePerNight: 200 },
    { roomNumber: '205', floor: 2, type: 'TWIN' as const, capacity: 2, pricePerNight: 80 },
    // Floor 3
    { roomNumber: '301', floor: 3, type: 'SUITE' as const, capacity: 4, pricePerNight: 250 },
    { roomNumber: '302', floor: 3, type: 'FAMILY' as const, capacity: 4, pricePerNight: 150 },
    { roomNumber: '303', floor: 3, type: 'DELUXE' as const, capacity: 2, pricePerNight: 130 },
    { roomNumber: '304', floor: 3, type: 'DOUBLE' as const, capacity: 2, pricePerNight: 90 },
    { roomNumber: '305', floor: 3, type: 'SINGLE' as const, capacity: 1, pricePerNight: 60 },
  ]

  const rooms = []
  for (const r of roomData) {
    rooms.push(await prisma.room.create({ data: r }))
  }

  // Create guests
  const guests = [
    { fullName: 'James Brown', phone: '+1-555-1001', nationality: 'American', passportNumber: 'US12345678', gender: 'MALE' as const, companyId: company1.id },
    { fullName: 'Maria Garcia', phone: '+1-555-1002', nationality: 'Spanish', passportNumber: 'ES98765432', gender: 'FEMALE' as const },
    { fullName: 'Chen Wei', phone: '+86-138-0001-0001', nationality: 'Chinese', passportNumber: 'CN E12345678', gender: 'MALE' as const, companyId: company2.id },
    { fullName: 'Aisha Mohammed', phone: '+971-50-123-4567', nationality: 'Emirati', passportNumber: 'AE11112222', gender: 'FEMALE' as const },
    { fullName: 'David Kim', phone: '+82-10-1234-5678', nationality: 'Korean', passportNumber: 'KR12345678', gender: 'MALE' as const, companyId: company1.id },
    { fullName: 'Sophie Laurent', phone: '+33-6-12-34-56-78', nationality: 'French', passportNumber: 'FR99887766', gender: 'FEMALE' as const },
    { fullName: 'Yuki Tanaka', phone: '+81-90-1234-5678', nationality: 'Japanese', passportNumber: 'JP12345678', gender: 'FEMALE' as const },
    { fullName: 'Robert Taylor', phone: '+1-555-1008', nationality: 'British', passportNumber: 'GB55667788', gender: 'MALE' as const, companyId: company2.id },
  ]

  const createdGuests = []
  for (const g of guests) {
    createdGuests.push(await prisma.guest.create({ data: g }))
  }

  // Create active stays (some rooms occupied)
  const today = new Date()
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(today.getDate() - 3)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(today.getDate() - 2)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const in3Days = new Date(today)
  in3Days.setDate(today.getDate() + 3)
  const in5Days = new Date(today)
  in5Days.setDate(today.getDate() + 5)
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  // Active stays
  const stay1 = await prisma.stay.create({
    data: {
      guestId: createdGuests[0].id,
      roomId: rooms[0].id,
      checkIn: threeDaysAgo,
      expectedCheckOut: tomorrow,
      numberOfGuests: 1,
      totalPrice: 250,
      amountPaid: 250,
      paymentStatus: 'PAID',
      status: 'ACTIVE',
    },
  })
  await prisma.room.update({ where: { id: rooms[0].id }, data: { status: 'OCCUPIED' } })

  const stay2 = await prisma.stay.create({
    data: {
      guestId: createdGuests[1].id,
      roomId: rooms[2].id,
      checkIn: yesterday,
      expectedCheckOut: in3Days,
      numberOfGuests: 2,
      totalPrice: 320,
      amountPaid: 200,
      paymentStatus: 'PARTIAL',
      status: 'ACTIVE',
    },
  })
  await prisma.room.update({ where: { id: rooms[2].id }, data: { status: 'OCCUPIED' } })

  const stay3 = await prisma.stay.create({
    data: {
      guestId: createdGuests[2].id,
      roomId: rooms[7].id,
      checkIn: twoDaysAgo,
      expectedCheckOut: in5Days,
      numberOfGuests: 1,
      totalPrice: 1000,
      amountPaid: 500,
      paymentStatus: 'PARTIAL',
      status: 'ACTIVE',
    },
  })
  await prisma.room.update({ where: { id: rooms[7].id }, data: { status: 'OCCUPIED' } })

  const stay4 = await prisma.stay.create({
    data: {
      guestId: createdGuests[4].id,
      roomId: rooms[4].id,
      checkIn: yesterday,
      expectedCheckOut: in7Days,
      numberOfGuests: 2,
      totalPrice: 600,
      amountPaid: 600,
      paymentStatus: 'PAID',
      status: 'ACTIVE',
    },
  })
  await prisma.room.update({ where: { id: rooms[4].id }, data: { status: 'OCCUPIED' } })

  // Payments for stays
  await prisma.payment.create({ data: { stayId: stay1.id, amount: 250, paymentMethod: 'CASH', receivedBy: admin.id } })
  await prisma.payment.create({ data: { stayId: stay2.id, amount: 200, paymentMethod: 'CARD', receivedBy: receptionist.id } })
  await prisma.payment.create({ data: { stayId: stay3.id, amount: 500, paymentMethod: 'BANK_TRANSFER', receivedBy: receptionist.id } })
  await prisma.payment.create({ data: { stayId: stay4.id, amount: 600, paymentMethod: 'MOBILE_PAYMENT', receivedBy: admin.id } })

  // Set some rooms to cleaning/maintenance
  await prisma.room.update({ where: { id: rooms[1].id }, data: { status: 'CLEANING' } })
  await prisma.room.update({ where: { id: rooms[9].id }, data: { status: 'MAINTENANCE' } })

  // Create reservations
  await prisma.reservation.create({
    data: {
      guestId: createdGuests[3].id,
      roomId: rooms[6].id,
      startDate: tomorrow,
      endDate: in5Days,
      deposit: 240,
      status: 'CONFIRMED',
    },
  })
  await prisma.room.update({ where: { id: rooms[6].id }, data: { status: 'RESERVED' } })

  await prisma.reservation.create({
    data: {
      guestId: createdGuests[5].id,
      roomId: rooms[12].id,
      startDate: in3Days,
      endDate: in7Days,
      deposit: 0,
      status: 'PENDING',
    },
  })

  // Create a completed stay for history
  const completedStay = await prisma.stay.create({
    data: {
      guestId: createdGuests[6].id,
      roomId: rooms[3].id,
      checkIn: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      expectedCheckOut: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      actualCheckOut: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      numberOfGuests: 2,
      totalPrice: 240,
      amountPaid: 240,
      paymentStatus: 'PAID',
      status: 'COMPLETED',
    },
  })
  await prisma.payment.create({
    data: { stayId: completedStay.id, amount: 240, paymentMethod: 'CASH', receivedBy: admin.id },
  })

  console.log('Seed completed successfully!')
  console.log(`Created ${3} users, ${15} rooms, ${8} guests, ${5} stays, ${2} reservations, ${2} companies`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
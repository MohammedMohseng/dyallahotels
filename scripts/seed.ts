import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("جاري تهيئة قاعدة البيانات (Seeding)...");

  const hashedPassword = await bcrypt.hash("admin123", 10);
  const hashedPasswordReceptionist = await bcrypt.hash("reception123", 10);
  const hashedPasswordAccountant = await bcrypt.hash("account123", 10);

  // إنشاء المستخدمين (Users)
  const admin = await prisma.user.upsert({
    where: { email: "admin@hotel.com" },
    update: {},
    create: {
      username: "admin",
      email: "admin@hotel.com",
      name: "مدير النظام",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: "reception@hotel.com" },
    update: {},
    create: {
      username: "reception",
      email: "reception@hotel.com",
      name: "مريم جونسون",
      passwordHash: hashedPasswordReceptionist,
      role: "RECEPTIONIST",
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: "accounts@hotel.com" },
    update: {},
    create: {
      username: "accounts",
      email: "accounts@hotel.com",
      name: "جون سميث",
      passwordHash: hashedPasswordAccountant,
      role: "ACCOUNTANT",
    },
  });

  // إنشاء الشركات (Companies)
  const company1 = await prisma.company.create({
    data: {
      name: "شركة أكمي العالمية",
      contactPerson: "توم ويلسون",
      phone: "+1-555-0101",
      address: "123 شارع الأعمال",
    },
  });
  const company2 = await prisma.company.create({
    data: {
      name: "شركة العالمية للسياحة المحدودة",
      contactPerson: "سارة لي",
      phone: "+1-555-0202",
      address: "456 طريق السفر",
    },
  });

  // إنشاء الغرف (Rooms) - 3 طوابق، أنواع مختلفة
  const roomData = [
    // الطابق 1
    {
      roomNumber: "101",
      floor: 1,
      type: "SINGLE" as const,
      capacity: 1,
      pricePerNight: 50,
    },
    {
      roomNumber: "102",
      floor: 1,
      type: "SINGLE" as const,
      capacity: 1,
      pricePerNight: 50,
    },
    {
      roomNumber: "103",
      floor: 1,
      type: "DOUBLE" as const,
      capacity: 2,
      pricePerNight: 80,
    },
    {
      roomNumber: "104",
      floor: 1,
      type: "DOUBLE" as const,
      capacity: 2,
      pricePerNight: 80,
    },
    {
      roomNumber: "105",
      floor: 1,
      type: "TWIN" as const,
      capacity: 2,
      pricePerNight: 75,
    },
    // الطابق 2
    {
      roomNumber: "201",
      floor: 2,
      type: "SINGLE" as const,
      capacity: 1,
      pricePerNight: 55,
    },
    {
      roomNumber: "202",
      floor: 2,
      type: "DOUBLE" as const,
      capacity: 2,
      pricePerNight: 85,
    },
    {
      roomNumber: "203",
      floor: 2,
      type: "DELUXE" as const,
      capacity: 2,
      pricePerNight: 120,
    },
    {
      roomNumber: "204",
      floor: 2,
      type: "SUITE" as const,
      capacity: 3,
      pricePerNight: 200,
    },
    {
      roomNumber: "205",
      floor: 2,
      type: "TWIN" as const,
      capacity: 2,
      pricePerNight: 80,
    },
    // الطابق 3
    {
      roomNumber: "301",
      floor: 3,
      type: "SUITE" as const,
      capacity: 4,
      pricePerNight: 250,
    },
    {
      roomNumber: "302",
      floor: 3,
      type: "FAMILY" as const,
      capacity: 4,
      pricePerNight: 150,
    },
    {
      roomNumber: "303",
      floor: 3,
      type: "DELUXE" as const,
      capacity: 2,
      pricePerNight: 130,
    },
    {
      roomNumber: "304",
      floor: 3,
      type: "DOUBLE" as const,
      capacity: 2,
      pricePerNight: 90,
    },
    {
      roomNumber: "305",
      floor: 3,
      type: "SINGLE" as const,
      capacity: 1,
      pricePerNight: 60,
    },
  ];

  const rooms = [];
  for (const r of roomData) {
    rooms.push(await prisma.room.create({ data: r }));
  }

  // إنشاء النزلاء (Guests)
  const guests = [
    {
      fullName: "جيمس براون",
      phone: "+1-555-1001",
      nationality: "أمريكي",
      passportNumber: "US12345678",
      gender: "MALE" as const,
      companyId: company1.id,
    },
    {
      fullName: "ماريا غارسيا",
      phone: "+1-555-1002",
      nationality: "إسبانية",
      passportNumber: "ES98765432",
      gender: "FEMALE" as const,
    },
    {
      fullName: "تشن وي",
      phone: "+86-138-0001-0001",
      nationality: "صيني",
      passportNumber: "CN E12345678",
      gender: "MALE" as const,
      companyId: company2.id,
    },
    {
      fullName: "عائشة محمد",
      phone: "+971-50-123-4567",
      nationality: "إماراتية",
      passportNumber: "AE11112222",
      gender: "FEMALE" as const,
    },
    {
      fullName: "ديفيد كيم",
      phone: "+82-10-1234-5678",
      nationality: "كوري",
      passportNumber: "KR12345678",
      gender: "MALE" as const,
      companyId: company1.id,
    },
    {
      fullName: "صوفي لوران",
      phone: "+33-6-12-34-56-78",
      nationality: "فرنسية",
      passportNumber: "FR99887766",
      gender: "FEMALE" as const,
    },
    {
      fullName: "يوكي تاناكا",
      phone: "+81-90-1234-5678",
      nationality: "يابانية",
      passportNumber: "JP12345678",
      gender: "FEMALE" as const,
    },
    {
      fullName: "روبرت تايلور",
      phone: "+1-555-1008",
      nationality: "بريطاني",
      passportNumber: "GB55667788",
      gender: "MALE" as const,
      companyId: company2.id,
    },
  ];

  const createdGuests = [];
  for (const g of guests) {
    createdGuests.push(await prisma.guest.create({ data: g }));
  }

  // إنشاء الإقامات النشطة (Active Stays)
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);
  const in5Days = new Date(today);
  in5Days.setDate(today.getDate() + 5);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  // إقامات نشطة
  const stay1 = await prisma.stay.create({
    data: {
      guestId: createdGuests[0].id,
      roomId: rooms[0].id,
      checkIn: threeDaysAgo,
      expectedCheckOut: tomorrow,
      numberOfGuests: 1,
      totalPrice: 250,
      amountPaid: 250,
      paymentStatus: "PAID",
      status: "ACTIVE",
    },
  });
  await prisma.room.update({
    where: { id: rooms[0].id },
    data: { status: "OCCUPIED" },
  });

  const stay2 = await prisma.stay.create({
    data: {
      guestId: createdGuests[1].id,
      roomId: rooms[2].id,
      checkIn: yesterday,
      expectedCheckOut: in3Days,
      numberOfGuests: 2,
      totalPrice: 320,
      amountPaid: 200,
      paymentStatus: "PARTIAL",
      status: "ACTIVE",
    },
  });
  await prisma.room.update({
    where: { id: rooms[2].id },
    data: { status: "OCCUPIED" },
  });

  const stay3 = await prisma.stay.create({
    data: {
      guestId: createdGuests[2].id,
      roomId: rooms[7].id,
      checkIn: twoDaysAgo,
      expectedCheckOut: in5Days,
      numberOfGuests: 1,
      totalPrice: 1000,
      amountPaid: 500,
      paymentStatus: "PARTIAL",
      status: "ACTIVE",
    },
  });
  await prisma.room.update({
    where: { id: rooms[7].id },
    data: { status: "OCCUPIED" },
  });

  const stay4 = await prisma.stay.create({
    data: {
      guestId: createdGuests[4].id,
      roomId: rooms[4].id,
      checkIn: yesterday,
      expectedCheckOut: in7Days,
      numberOfGuests: 2,
      totalPrice: 600,
      amountPaid: 600,
      paymentStatus: "PAID",
      status: "ACTIVE",
    },
  });
  await prisma.room.update({
    where: { id: rooms[4].id },
    data: { status: "OCCUPIED" },
  });

  // المدفوعات للإقامات (Payments)
  await prisma.payment.create({
    data: {
      stayId: stay1.id,
      amount: 250,
      paymentMethod: "CASH",
      receivedBy: admin.id,
    },
  });
  await prisma.payment.create({
    data: {
      stayId: stay2.id,
      amount: 200,
      paymentMethod: "CARD",
      receivedBy: receptionist.id,
    },
  });
  await prisma.payment.create({
    data: {
      stayId: stay3.id,
      amount: 500,
      paymentMethod: "BANK_TRANSFER",
      receivedBy: receptionist.id,
    },
  });
  await prisma.payment.create({
    data: {
      stayId: stay4.id,
      amount: 600,
      paymentMethod: "MOBILE_PAYMENT",
      receivedBy: admin.id,
    },
  });

  // تحديث بعض الغرف إلى حالة التنظيف أو الصيانة
  await prisma.room.update({
    where: { id: rooms[1].id },
    data: { status: "CLEANING" },
  });
  await prisma.room.update({
    where: { id: rooms[9].id },
    data: { status: "MAINTENANCE" },
  });

  // إنشاء الحجوزات (Reservations)
  await prisma.reservation.create({
    data: {
      guestId: createdGuests[3].id,
      roomId: rooms[6].id,
      startDate: tomorrow,
      endDate: in5Days,
      deposit: 240,
      status: "CONFIRMED",
    },
  });
  await prisma.room.update({
    where: { id: rooms[6].id },
    data: { status: "RESERVED" },
  });

  await prisma.reservation.create({
    data: {
      guestId: createdGuests[5].id,
      roomId: rooms[12].id,
      startDate: in3Days,
      endDate: in7Days,
      deposit: 0,
      status: "PENDING",
    },
  });

  // إنشاء إقامة مكتملة للسجلات التاريخية
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
      paymentStatus: "PAID",
      status: "COMPLETED",
    },
  });
  await prisma.payment.create({
    data: {
      stayId: completedStay.id,
      amount: 240,
      paymentMethod: "CASH",
      receivedBy: admin.id,
    },
  });

  console.log("تمت تهيئة قاعدة البيانات بنجاح!");
  console.log(
    `تم إنشاء: ${3} مستخدمين، ${15} غرفة، ${8} نزلاء، ${5} إقامات، ${2} حجوزات، و ${2} شركات.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
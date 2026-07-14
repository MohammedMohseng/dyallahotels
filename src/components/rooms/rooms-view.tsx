/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, ArrowLeft, Edit, BedDouble } from "lucide-react";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateRoomStatus,
} from "@/actions";
import type { Room, Stay, RoomType, RoomStatus } from "@prisma/client";
import * as XLSX from "xlsx"


interface RoomsViewProps {
  roomId?: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

const ROOM_TYPES: RoomType[] = [
  "SINGLE",
  "DOUBLE",
  "TWIN",
  "SUITE",
  "DELUXE",
  "FAMILY",
];
const ROOM_STATUSES: RoomStatus[] = [
  "AVAILABLE",
  "OCCUPIED",
  "CLEANING",
  "MAINTENANCE",
  "RESERVED",
];
const STATUS_CHANGE_OPTIONS: RoomStatus[] = [
  "AVAILABLE",
  "CLEANING",
  "MAINTENANCE",
];

interface RoomFormData {
  roomNumber: string;
  floor: string;
  type: string;
  capacity: string;
  pricePerNight: string;
  notes: string;
}

const EMPTY_FORM: RoomFormData = {
  roomNumber: "",
  floor: "",
  type: "",
  capacity: "",
  pricePerNight: "",
  notes: "",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "SDG",
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getRoomTypeLabel(type: RoomType): string {
  const map: Record<RoomType, string> = {
    SINGLE: "فردي",
    DOUBLE: "مزدوج",
    TWIN: "توأم",
    SUITE: "جناح",
    DELUXE: "ديلوكس",
    FAMILY: "عائلي",
  };
  return map[type] || type;
}

function getRoomStatusLabel(status: RoomStatus): string {
  const map: Record<RoomStatus, string> = {
    AVAILABLE: "متاحة",
    OCCUPIED: "مشغولة",
    CLEANING: "تنظيف",
    MAINTENANCE: "صيانة",
    RESERVED: "محجوزة",
  };
  return map[status] || status;
}

function getPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PAID: "مدفوع",
    PARTIAL: "جزئي",
    UNPAID: "غير مدفوع",
    OVERDUE: "متأخر",
  };
  return map[status] || status;
}

function getStayStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "نشط",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
  };
  return map[status] || status;
}

function StatusBadge({ status }: { status: RoomStatus }) {
  switch (status) {
    case "AVAILABLE":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          متاحة
        </Badge>
      );
    case "OCCUPIED":
      return <Badge variant="destructive">مشغولة</Badge>;
    case "CLEANING":
      return <Badge variant="secondary">تنظيف</Badge>;
    case "MAINTENANCE":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          صيانة
        </Badge>
      );
    case "RESERVED":
      return (
        <Badge
          variant="outline"
          className="text-sky-600 border-sky-300 bg-sky-50"
        >
          محجوزة
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ============ LIST VIEW ============

function RoomListView({
  onNavigate,
}: {
  onNavigate: RoomsViewProps["onNavigate"];
}) {
  const [rooms, setRooms] = useState<(Room & { currentGuest?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RoomFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof RoomFormData, string>>
  >({});

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const filters: {
        status?: string;
        type?: string;
        floor?: number;
        search?: string;
      } = {};
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (typeFilter !== "ALL") filters.type = typeFilter;
      if (floorFilter !== "ALL") filters.floor = Number(floorFilter);
      if (search.trim()) filters.search = search.trim();

      const data = await getRooms(filters);
      setRooms(data as (Room & { currentGuest?: string })[]);
    } catch {
      toast.error("فشل تحميل الغرف");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, floorFilter, search]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Derive unique floors from loaded rooms
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort(
    (a, b) => a - b,
  );

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RoomFormData, string>> = {};

    if (!form.roomNumber.trim()) {
      errors.roomNumber = "رقم الغرفة مطلوب";
    }
    if (!form.floor) {
      errors.floor = "الطابق مطلوب";
    } else if (isNaN(Number(form.floor)) || Number(form.floor) < 0) {
      errors.floor = "يجب أن يكون الطابق رقماً صحيحاً غير سالب";
    }
    if (!form.type) {
      errors.type = "نوع الغرفة مطلوب";
    }
    if (!form.capacity) {
      errors.capacity = "السعة مطلوبة";
    } else if (isNaN(Number(form.capacity)) || Number(form.capacity) < 1) {
      errors.capacity = "يجب أن تكون السعة على الأقل 1";
    }
    if (!form.pricePerNight) {
      errors.pricePerNight = "السعر لليلة مطلوب";
    } else if (
      isNaN(Number(form.pricePerNight)) ||
      Number(form.pricePerNight) <= 0
    ) {
      errors.pricePerNight = "يجب أن يكون السعر أكبر من 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRoom = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await createRoom({
        roomNumber: form.roomNumber.trim(),
        floor: Number(form.floor),
        type: form.type as RoomType,
        capacity: Number(form.capacity),
        pricePerNight: Number(form.pricePerNight),
        notes: form.notes.trim() || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`تم إنشاء غرفة ${form.roomNumber} بنجاح`);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setDialogOpen(false);
        fetchRooms();
      }
    } catch {
      toast.error("فشل إنشاء الغرفة");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof RoomFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleExport = () => {
    if (!rooms || rooms.length === 0) return;

    // 1. توليد تاريخ اليوم لتسمية الملفات
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // تحضير البيانات لملف Excel (عناوين الأعمدة متناسقة)
    const excelData = rooms.map((r, index) => ({
      "الرقم": index + 1,
      "رقم الغرفة": r.roomNumber || "-",
      "النوع": r.type || "-",
      "الطابق": r.floor || "-",
      "السعر/ليلة":r.pricePerNight,
      "السعة": r.capacity || "-",
      "الحالة": r.status || "-",
      "الضيف الحالي": r.currentGuest || "-",
      "تاريخ الإنشاء": r.createdAt
        ? new Date(r.createdAt).toLocaleDateString("ar-EG")
        : "-",
    }));

    // إنشاء ورقة العمل (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // ضبط اتجاه ورقة العمل ليكون من اليمين إلى اليسار (RTL)
    worksheet["!dir"] = "ltr";

    // إنشاء كتاب العمل (Workbook) وإضافة الورقة إليه
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الضيوف");

    // تحميل ملف الـ Excel فوراً
    XLSX.writeFile(workbook, `Rooms_Report_${formattedDate}.xlsx`);

    const tableRows = rooms
      .map(
        (room, index) => `
      <tr>
        <td>${index + 1}</td>
        <td style="font-weight: 500;">${room.roomNumber || "-"}</td>
        <td dir="ltr">${room.type || "-"}</td>
        <td dir="ltr">${room.floor || "-"}</td>
        <td>${room.pricePerNight || "_"}</td>
        <td dir="ltr">${room.capacity || "-"}</td>
        <td>${room.status || "—"}</td>
        <td>${room.currentGuest || "-"}</td>
        
      </tr>
    `,
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>Rooms Report - ${formattedDate}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap');
          
          body {
            font-family: 'Cairo', sans-serif;
            margin: 20mm 15mm;
            color: #333;
            background-color: #fff;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
          }
          
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1e3a8a;
          }
          
          .header .meta {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 13px;
          }
          
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            padding: 12px 10px;
            border: 1px solid #cbd5e1;
            text-align: center;
          }
          
          td {
            padding: 10px;
            border: 1px solid #e2e8f0;
            text-align: center;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .footer-summary {
            float: left;
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            color: #1e40af;
            font-size: 15px;
          }
  
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير ضيوف الفندق</h1>
          <div class="meta">تاريخ التقرير: ${formattedDate} | إجمالي المدخلات: ${rooms.length}</div>
        </div>
        
        <table>
          <thead>
            <tr>
                <th class="width:5%">رقم الغرفة</th>
                <th class="width:10%">رقم الغرفة</th>
                <th class="width:15%">النوع</th>
                <th class="width:15%">الطابق</th>
                <th class="width:15%">السعر/ليلة</th>
                <th class="width:5%">السعة</th>
                <th class="width:15%">الحالة</th>
                <th class="width:20%">الضيف الحالي</th>
            </tr>

          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer-summary">
          إجمالي الغرف: ${rooms.length}غرفة
        </div>
      </body>
      </html>
    `;

    // فتح نافذة الطباعة وضخ التصميم الأنيق بها
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();

      // الانتظار قليلاً لضمان تحميل الخطوط (Cairo Font) ثم فتح أمر الطباعة/الحفظ كـ PDF
      printWindow.setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الغرف</h2>
          <p className="text-muted-foreground">إدارة غرف الفندق وحالاتها</p>
        </div>
        <div className="flex justiffy-center items-center gap-2">
          <Button variant="default" className="!mx-0" onClick={handleExport}>
            تصدير للإكسيل
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setForm(EMPTY_FORM);
                setFormErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                إضافة غرفة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة غرفة جديدة</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-roomNumber">رقم الغرفة</Label>
                  <Input
                    id="create-roomNumber"
                    placeholder="مثال: 101"
                    value={form.roomNumber}
                    onChange={(e) => updateField("roomNumber", e.target.value)}
                  />
                  {formErrors.roomNumber && (
                    <p className="text-sm text-destructive">
                      {formErrors.roomNumber}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-floor">الطابق</Label>
                  <Input
                    id="create-floor"
                    type="number"
                    placeholder="مثال: 1"
                    min={0}
                    value={form.floor}
                    onChange={(e) => updateField("floor", e.target.value)}
                  />
                  {formErrors.floor && (
                    <p className="text-sm text-destructive">
                      {formErrors.floor}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-type">نوع الغرفة</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => updateField("type", v)}
                  >
                    <SelectTrigger id="create-type">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getRoomTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.type && (
                    <p className="text-sm text-destructive">
                      {formErrors.type}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-capacity">السعة</Label>
                  <Input
                    id="create-capacity"
                    type="number"
                    placeholder="مثال: 2"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => updateField("capacity", e.target.value)}
                  />
                  {formErrors.capacity && (
                    <p className="text-sm text-destructive">
                      {formErrors.capacity}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-price">السعر لليلة ($)</Label>
                  <Input
                    id="create-price"
                    type="number"
                    placeholder="مثال: 99.99"
                    min={0}
                    step="0.01"
                    value={form.pricePerNight}
                    onChange={(e) =>
                      updateField("pricePerNight", e.target.value)
                    }
                  />
                  {formErrors.pricePerNight && (
                    <p className="text-sm text-destructive">
                      {formErrors.pricePerNight}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-notes">ملاحظات</Label>
                  <Textarea
                    id="create-notes"
                    placeholder="ملاحظات اختيارية حول هذه الغرفة"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  إلغاء
                </Button>
                <Button onClick={handleCreateRoom} disabled={submitting}>
                  {submitting ? "جارٍ الإنشاء..." : "إنشاء غرفة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الغرفة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الحالات</SelectItem>
                  {ROOM_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getRoomStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الأنواع</SelectItem>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getRoomTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="الطابق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الطوابق</SelectItem>
                  {floors.map((floor) => (
                    <SelectItem key={floor} value={String(floor)}>
                      طابق {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">رقم الغرفة</TableHead>
                  <TableHead className="w-[100px]">النوع</TableHead>
                  <TableHead className="w-[80px]">الطابق</TableHead>
                  <TableHead className="w-[120px]">السعر/ليلة</TableHead>
                  <TableHead className="w-[90px]">السعة</TableHead>
                  <TableHead className="w-[120px]">الحالة</TableHead>
                  <TableHead className="min-w-[150px]">الضيف الحالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4  w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4  w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4  w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4  w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4  w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4  w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4  w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BedDouble className="h-8 w-8" />
                        <p>لا توجد غرف</p>
                        <p className="text-sm">
                          حاول تعديل الفلاتر أو أضف غرفة جديدة
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow
                      key={room.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onNavigate("rooms", { roomId: room.id })}
                    >
                      <TableCell className="font-medium">
                        {room.roomNumber}
                      </TableCell>
                      <TableCell>{getRoomTypeLabel(room.type)}</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell>
                        {formatCurrency(room.pricePerNight)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {room.capacity} ضيف
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={room.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {room.currentGuest || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ DETAIL VIEW ============

function RoomDetailView({
  roomId,
  onNavigate,
}: {
  roomId: string;
  onNavigate: RoomsViewProps["onNavigate"];
}) {
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<RoomFormData>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<
    Partial<Record<keyof RoomFormData, string>>
  >({});

  const fetchRoom = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoomById(roomId);
      if (!data) {
        toast.error("الغرفة غير موجودة");
        onNavigate("rooms");
        return;
      }
      setRoom(data);
    } catch {
      toast.error("فشل تحميل تفاصيل الغرفة");
      onNavigate("rooms");
    } finally {
      setLoading(false);
    }
  }, [roomId, onNavigate]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const handleStatusChange = async (newStatus: RoomStatus) => {
    if (!room || room.status === newStatus) return;
    setStatusLoading(newStatus);
    try {
      const result = await updateRoomStatus(roomId, newStatus);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `تم تحديث حالة الغرفة إلى ${getRoomStatusLabel(newStatus)}`,
        );
        fetchRoom();
      }
    } catch {
      toast.error("فشل تحديث حالة الغرفة");
    } finally {
      setStatusLoading(null);
    }
  };

  const openEditDialog = () => {
    if (!room) return;
    setEditForm({
      roomNumber: room.roomNumber,
      floor: String(room.floor),
      type: room.type,
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      notes: room.notes || "",
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof RoomFormData, string>> = {};

    if (!editForm.roomNumber.trim()) {
      errors.roomNumber = "رقم الغرفة مطلوب";
    }
    if (!editForm.floor) {
      errors.floor = "الطابق مطلوب";
    } else if (isNaN(Number(editForm.floor)) || Number(editForm.floor) < 0) {
      errors.floor = "يجب أن يكون الطابق رقماً صحيحاً غير سالب";
    }
    if (!editForm.type) {
      errors.type = "نوع الغرفة مطلوب";
    }
    if (!editForm.capacity) {
      errors.capacity = "السعة مطلوبة";
    } else if (
      isNaN(Number(editForm.capacity)) ||
      Number(editForm.capacity) < 1
    ) {
      errors.capacity = "يجب أن تكون السعة على الأقل 1";
    }
    if (!editForm.pricePerNight) {
      errors.pricePerNight = "السعر لليلة مطلوب";
    } else if (
      isNaN(Number(editForm.pricePerNight)) ||
      Number(editForm.pricePerNight) <= 0
    ) {
      errors.pricePerNight = "يجب أن يكون السعر أكبر من 0";
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateRoom = async () => {
    if (!validateEditForm()) return;

    setEditSubmitting(true);
    try {
      const result = await updateRoom(roomId, {
        roomNumber: editForm.roomNumber.trim(),
        floor: Number(editForm.floor),
        type: editForm.type as RoomType,
        capacity: Number(editForm.capacity),
        pricePerNight: Number(editForm.pricePerNight),
        notes: editForm.notes.trim() || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم تحديث الغرفة بنجاح");
        setEditOpen(false);
        fetchRoom();
      }
    } catch {
      toast.error("فشل تحديث الغرفة");
    } finally {
      setEditSubmitting(false);
    }
  };

  const updateEditField = (field: keyof RoomFormData, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room) return null;

  const stayHistory: (Stay & { guest: { fullName: string; phone: string } })[] =
    room.stays || [];

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("rooms")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">الرجوع إلى الغرف</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              غرفة {room.roomNumber}
            </h2>
            <p className="text-muted-foreground">
              {getRoomTypeLabel(room.type)} · طابق {room.floor}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={room.status} />
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) {
                setEditErrors({});
              }
            }}
          >
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="mr-2 h-4 w-4" />
              تعديل الغرفة
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>تعديل الغرفة {room.roomNumber}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-roomNumber">رقم الغرفة</Label>
                  <Input
                    id="edit-roomNumber"
                    placeholder="مثال: 101"
                    value={editForm.roomNumber}
                    onChange={(e) =>
                      updateEditField("roomNumber", e.target.value)
                    }
                  />
                  {editErrors.roomNumber && (
                    <p className="text-sm text-destructive">
                      {editErrors.roomNumber}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-floor">الطابق</Label>
                  <Input
                    id="edit-floor"
                    type="number"
                    placeholder="مثال: 1"
                    min={0}
                    value={editForm.floor}
                    onChange={(e) => updateEditField("floor", e.target.value)}
                  />
                  {editErrors.floor && (
                    <p className="text-sm text-destructive">
                      {editErrors.floor}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">نوع الغرفة</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(v) => updateEditField("type", v)}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getRoomTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editErrors.type && (
                    <p className="text-sm text-destructive">
                      {editErrors.type}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-capacity">السعة</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    placeholder="مثال: 2"
                    min={1}
                    value={editForm.capacity}
                    onChange={(e) =>
                      updateEditField("capacity", e.target.value)
                    }
                  />
                  {editErrors.capacity && (
                    <p className="text-sm text-destructive">
                      {editErrors.capacity}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">السعر لليلة ($)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    placeholder="مثال: 99.99"
                    min={0}
                    step="0.01"
                    value={editForm.pricePerNight}
                    onChange={(e) =>
                      updateEditField("pricePerNight", e.target.value)
                    }
                  />
                  {editErrors.pricePerNight && (
                    <p className="text-sm text-destructive">
                      {editErrors.pricePerNight}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">ملاحظات</Label>
                  <Textarea
                    id="edit-notes"
                    placeholder="ملاحظات اختيارية حول هذه الغرفة"
                    value={editForm.notes}
                    onChange={(e) => updateEditField("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editSubmitting}
                >
                  إلغاء
                </Button>
                <Button onClick={handleUpdateRoom} disabled={editSubmitting}>
                  {editSubmitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Room info grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">رقم الغرفة</p>
            <p className="text-xl font-semibold">{room.roomNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">النوع</p>
            <p className="text-xl font-semibold">
              {getRoomTypeLabel(room.type)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">الطابق</p>
            <p className="text-xl font-semibold">{room.floor}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">السعر / ليلة</p>
            <p className="text-xl font-semibold">
              {formatCurrency(room.pricePerNight)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">السعة</p>
            <p className="text-xl font-semibold">{room.capacity} ضيف</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">الحالة</p>
            <div className="mt-1">
              <StatusBadge status={room.status} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status change & notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تغيير الحالة</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {STATUS_CHANGE_OPTIONS.map((status) => {
                const isCurrent = room.status === status;
                const isLoading = statusLoading === status;
                const label = getRoomStatusLabel(status);
                return (
                  <Button
                    key={status}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    disabled={isCurrent || isLoading}
                    onClick={() => handleStatusChange(status)}
                  >
                    {isLoading
                      ? "جارٍ التحديث..."
                      : isCurrent
                        ? `✓ ${label}`
                        : label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        {room.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ملاحظات</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {room.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stay history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">سجل الإقامات</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {stayHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا يوجد سجل إقامات لهذه الغرفة
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>الضيف</TableHead>
                    <TableHead>تسجيل الدخول</TableHead>
                    <TableHead>تسجيل الخروج</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>المدفوعات</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stayHistory.map((stay) => (
                    <TableRow key={stay.id}>
                      <TableCell className="font-medium">
                        {stay.guest.fullName}
                      </TableCell>
                      <TableCell>{formatDate(stay.checkIn)}</TableCell>
                      <TableCell>
                        {stay.actualCheckOut
                          ? formatDate(stay.actualCheckOut)
                          : formatDate(stay.expectedCheckOut)}
                      </TableCell>
                      <TableCell>{formatCurrency(stay.totalPrice)}</TableCell>
                      <TableCell>
                        {getPaymentStatusLabel(stay.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            stay.status === "ACTIVE" ? "destructive" : "outline"
                          }
                        >
                          {getStayStatusLabel(stay.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ MAIN VIEW ============

export default function RoomsView({ roomId, onNavigate }: RoomsViewProps) {
  if (roomId) {
    return <RoomDetailView roomId={roomId} onNavigate={onNavigate} />;
  }

  return <RoomListView onNavigate={onNavigate} />;
}

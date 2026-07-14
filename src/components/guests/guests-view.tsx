"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ArrowLeft,
  Edit,
  User,
  Phone,
  Globe,
  CreditCard,
} from "lucide-react";
import {
  getGuests,
  getGuestById,
  createGuest,
  updateGuest,
  getCompanies,
} from "@/actions";
import type {
  Guest,
  Stay,
  Payment,
  Company,
  PaymentStatus,
  StayStatus,
  RoomType,
} from "@prisma/client";
import * as XLSX from 'xlsx';


interface GuestsViewProps {
  guestId?: string;
  search?: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

// ─── Badge helpers ───────────────────────────────────────────────────────────

const stayStatusVariant: Record<
  StayStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const paymentStatusVariant: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PAID: "default",
  PARTIAL: "secondary",
  UNPAID: "outline",
  OVERDUE: "destructive",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "SDG" }).format(
    amount,
  );

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ─── Label helpers ───────────────────────────────────────────────────────────

function getStayStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "نشط",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
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

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    CASH: "نقدي",
    BANK_TRANSFER: "تحويل بنكي",
    MOBILE_PAYMENT: "دفع موبايل",
    CARD: "بطاقة",
  };
  return map[method] || method.replace(/_/g, " ");
}

function getGenderLabel(gender: string): string {
  const map: Record<string, string> = {
    MALE: "ذكر",
    FEMALE: "أنثى",
    OTHER: "آخر",
  };
  return map[gender] || gender;
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

// ─── Form state type ─────────────────────────────────────────────────────────

interface GuestFormState {
  fullName: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  nationalId: string;
  gender: string;
  companyId: string;
  notes: string;
}

const emptyForm: GuestFormState = {
  fullName: "",
  phone: "",
  nationality: "",
  passportNumber: "",
  nationalId: "",
  gender: "",
  companyId: "",
  notes: "",
};

// ─── List View Skeleton ──────────────────────────────────────────────────────

function GuestListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-28" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Profile Skeleton ────────────────────────────────────────────────────────

function GuestProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// ─── Guest List View ─────────────────────────────────────────────────────────

function GuestListView({
  initialSearch,
  onNavigate,
}: {
  initialSearch?: string;
  onNavigate: GuestsViewProps["onNavigate"];
}) {
  const [guests, setGuests] = useState<
    (Guest & { company?: { name: string } | null; currentRoom?: string })[]
  >([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<GuestFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [counter, setCounter] = useState(1);

  // Fetch guests
  const fetchGuests = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = await getGuests(query || undefined);
      // Enrich with current room info by looking for active stays
      const enriched = await Promise.all(
        data.map(async (g: Guest & { company?: { name: string } | null }) => {
          const fullGuest = await getGuestById(g.id);
          const activeStay = fullGuest?.stays?.find(
            (s: Stay) => s.status === "ACTIVE",
          );
          return {
            ...g,
            currentRoom: activeStay
              ? `${activeStay.room.roomNumber} (${getRoomTypeLabel(activeStay.room.type)})`
              : undefined,
          };
        }),
      );
      setGuests(enriched);
    } catch {
      toast.error("فشل تحميل الضيوف");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch companies for dialog
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGuests(searchQuery);
  }, [searchQuery, fetchGuests]);

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Open create dialog
  const handleOpenDialog = () => {
    setForm(emptyForm);
    fetchCompanies();
    setDialogOpen(true);
  };

  // Submit create
  const handleCreate = async () => {
    if (!form.fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("الهاتف مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createGuest({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nationality: form.nationality.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
        nationalId: form.nationalId.trim() || undefined,
        gender: (form.gender as "MALE" | "FEMALE" | "OTHER") || undefined,
        companyId: form.companyId || undefined,
        notes: form.notes.trim() || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم إنشاء الضيف بنجاح");
        setDialogOpen(false);
        fetchGuests(searchQuery);
      }
    } catch {
      toast.error("فشل إنشاء الضيف");
    } finally {
      setSubmitting(false);
    }
  };

const handleExport = () => {
  if (!guests || guests.length === 0) return;

  // 1. توليد تاريخ اليوم لتسمية الملفات
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  
  // تحضير البيانات لملف Excel (عناوين الأعمدة متناسقة)
  const excelData = guests.map((r, index) => ({
    "م": index + 1,
    "الاسم الكامل": r.fullName || "-",
    "رقم الهاتف": r.phone || "-",
    "الجنسية": r.nationality || "-",
    "الشركة": r.company?.name || "-",
    "رقم جواز السفر": r.passportNumber || "-",
    "الجنس": r.gender || "-",
    "تاريخ الإنشاء": r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : "-",
  }));

  // إنشاء ورقة العمل (Worksheet)
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // ضبط اتجاه ورقة العمل ليكون من اليمين إلى اليسار (RTL)
  worksheet['!dir'] = 'rtl';

  // إنشاء كتاب العمل (Workbook) وإضافة الورقة إليه
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الضيوف");

  // تحميل ملف الـ Excel فوراً
  XLSX.writeFile(workbook, `تقرير_الضيوف_${formattedDate}.xlsx`);


  
  const tableRows = guests.map((guest, index) => `
    <tr>
      <td>${index + 1}</td>
      <td style="font-weight: 500;">${guest.fullName || "-"}</td>
      <td dir="ltr">${guest.phone || "-"}</td>
      <td>${guest.nationality || "-"}</td>
      <td>${guest.company?.name || "—"}</td>
      <td>${guest.currentRoom || "_"}</td>
    </tr>
  `).join("");

  const printHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الضيوف - ${formattedDate}</title>
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
        <div class="meta">تاريخ التقرير: ${formattedDate} | إجمالي المدخلات: ${guests.length}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 25%;">الاسم الكامل</th>
            <th style="width: 20%;">رقم الهاتف</th>
            <th style="width: 15%;">الجنسية</th>
            <th style="width: 20%;">الشركة</th>
            <th style="width: 15%;">الغرفة الحالية</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="footer-summary">
        إجمالي الضيوف: ${guests.length} ضيف
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
    <div className="space-y-4">
      {/* Header with search + add button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، الهاتف، أو جواز السفر..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex justiffy-center items-center gap-2">
          <Button variant="default" className="!mx-0" onClick={handleExport}>
            تصدير للإكسيل
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild className="!mx-0">
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-0" />
                إضافة ضيف
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إنشاء ضيف جديد</DialogTitle>
              </DialogHeader>
              <GuestForm form={form} setForm={setForm} companies={companies} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={submitting || isPending}
                >
                  {submitting ? "جارٍ الإنشاء..." : "إنشاء ضيف"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <GuestListSkeleton />
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">لا يوجد ضيوف</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? "حاول تعديل كلمات البحث"
                : 'اضغط "إضافة ضيف" لتسجيل ضيف جديد'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div
              id="table"
              className="rounded-md overflow-hidden max-h-[70vh] overflow-y-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead className="hidden md:table-cell">
                      الجنسية
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      الشركة
                    </TableHead>
                    <TableHead>الغرفة الحالية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.map((guest) => (
                    <TableRow
                      key={guest.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        onNavigate("guests", { guestId: guest.id })
                      }
                    >
                      <TableCell className="font-medium">
                        {guest.fullName}
                      </TableCell>
                      <TableCell>{guest.phone}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {guest.nationality || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {guest.company?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {guest.currentRoom ? (
                          <Badge variant="default">{guest.currentRoom}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Guest Form (shared between create & edit) ───────────────────────────────

function GuestForm({
  form,
  setForm,
  companies,
}: {
  form: GuestFormState;
  setForm: React.Dispatch<React.SetStateAction<GuestFormState>>;
  companies: Company[];
}) {
  const update = (field: keyof GuestFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">
            الاسم الكامل <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fullName"
            placeholder="محمد أحمد"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">
            الهاتف <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            placeholder="+1 234 567 890"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nationality">الجنسية</Label>
          <Input
            id="nationality"
            placeholder="مصري"
            value={form.nationality}
            onChange={(e) => update("nationality", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">الجنس</Label>
          <Select
            value={form.gender}
            onValueChange={(v) => update("gender", v)}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="اختر الجنس" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">ذكر</SelectItem>
              <SelectItem value="FEMALE">أنثى</SelectItem>
              <SelectItem value="OTHER">آخر</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="passportNumber">رقم جواز السفر</Label>
          <Input
            id="passportNumber"
            placeholder="AB1234567"
            value={form.passportNumber}
            onChange={(e) => update("passportNumber", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationalId">رقم الهوية</Label>
          <Input
            id="nationalId"
            placeholder="رقم الهوية"
            value={form.nationalId}
            onChange={(e) => update("nationalId", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">الشركة</Label>
        <Select
          value={form.companyId}
          onValueChange={(v) => update("companyId", v)}
        >
          <SelectTrigger id="company">
            <SelectValue placeholder="اختر الشركة (اختياري)" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          placeholder="ملاحظات إضافية عن الضيف..."
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}

// ─── Guest Profile View ──────────────────────────────────────────────────────

function GuestProfileView({
  guestId,
  onNavigate,
}: {
  guestId: string;
  onNavigate: GuestsViewProps["onNavigate"];
}) {
  const [guest, setGuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<GuestFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchGuest = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGuestById(guestId);
      if (!data) {
        toast.error("الضيف غير موجود");
        onNavigate("guests");
        return;
      }
      setGuest(data);
    } catch {
      toast.error("فشل تحميل بيانات الضيف");
      onNavigate("guests");
    } finally {
      setLoading(false);
    }
  }, [guestId, onNavigate]);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGuest();
  }, [fetchGuest]);

  // Open edit dialog
  const handleOpenEdit = () => {
    if (!guest) return;
    setForm({
      fullName: guest.fullName ?? "",
      phone: guest.phone ?? "",
      nationality: guest.nationality ?? "",
      passportNumber: guest.passportNumber ?? "",
      nationalId: guest.nationalId ?? "",
      gender: guest.gender ?? "",
      companyId: guest.companyId ?? "",
      notes: guest.notes ?? "",
    });
    fetchCompanies();
    setEditDialogOpen(true);
  };

  // Submit edit
  const handleUpdate = async () => {
    if (!form.fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("الهاتف مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateGuest(guestId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nationality: form.nationality.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
        nationalId: form.nationalId.trim() || undefined,
        gender: (form.gender as "MALE" | "FEMALE" | "OTHER") || undefined,
        companyId: form.companyId || undefined,
        notes: form.notes.trim() || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم تحديث بيانات الضيف بنجاح");
        setEditDialogOpen(false);
        fetchGuest();
      }
    } catch {
      toast.error("فشل تحديث بيانات الضيف");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <GuestProfileSkeleton />;
  }

  if (!guest) return null;

  // Flatten all payments from stays
  const allPayments = (guest.stays ?? []).flatMap(
    (
      stay: Stay & {
        payments: Payment[];
        room: { roomNumber: string; type: RoomType };
      },
    ) =>
      (stay.payments ?? []).map((p: Payment) => ({
        ...p,
        roomNumber: stay.room.roomNumber,
        stayCheckIn: stay.checkIn,
      })),
  );

  return (
    <div className="space-y-6">
      {/* Back button + Edit button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => onNavigate("guests")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          الرجوع إلى الضيوف
        </Button>
        <Button variant="outline" size="sm" onClick={handleOpenEdit}>
          <Edit className="h-4 w-4 mr-2" />
          تعديل
        </Button>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{guest.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                ضيف منذ {formatDate(guest.createdAt)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الهاتف:</span>
              <span className="font-medium">{guest.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الجنسية:</span>
              <span className="font-medium">{guest.nationality || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الجنس:</span>
              <span className="font-medium">
                {guest.gender ? getGenderLabel(guest.gender) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">جواز السفر:</span>
              <span className="font-medium">{guest.passportNumber || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">رقم الهوية:</span>
              <span className="font-medium">{guest.nationalId || "—"}</span>
            </div>
            {guest.company && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">الشركة:</span>
                <span className="font-medium">{guest.company.name}</span>
              </div>
            )}
          </div>
          {guest.notes && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
              <p className="text-sm whitespace-pre-wrap">{guest.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Stay History & Payment History */}
      <Tabs defaultValue="stays">
        <TabsList>
          <TabsTrigger value="stays">
            سجل الإقامات ({(guest.stays ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            سجل المدفوعات ({allPayments.length})
          </TabsTrigger>
        </TabsList>

        {/* Stay History */}
        <TabsContent value="stays">
          <Card>
            <CardContent className="p-0">
              {(guest.stays ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">لا يوجد سجل إقامات لهذا الضيف.</p>
                </div>
              ) : (
                <div className="rounded-md overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الغرفة</TableHead>
                        <TableHead>تسجيل الدخول</TableHead>
                        <TableHead>تسجيل الخروج</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>المدفوعات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(guest.stays ?? []).map(
                        (
                          stay: Stay & {
                            room: { roomNumber: string; type: RoomType };
                            payments: Payment[];
                          },
                        ) => (
                          <TableRow key={stay.id}>
                            <TableCell className="font-medium">
                              {stay.room.roomNumber}
                              <span className="text-muted-foreground text-xs ml-1">
                                ({getRoomTypeLabel(stay.room.type)})
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(stay.checkIn)}</TableCell>
                            <TableCell>
                              {stay.actualCheckOut
                                ? formatDate(stay.actualCheckOut)
                                : stay.status === "ACTIVE"
                                  ? "—"
                                  : formatDate(stay.expectedCheckOut)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(stay.totalPrice)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  stayStatusVariant[stay.status as StayStatus]
                                }
                              >
                                {getStayStatusLabel(stay.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  paymentStatusVariant[
                                    stay.paymentStatus as PaymentStatus
                                  ]
                                }
                              >
                                {getPaymentStatusLabel(stay.paymentStatus)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {allPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">لا يوجد سجل مدفوعات لهذا الضيف.</p>
                </div>
              ) : (
                <div className="rounded-md overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الغرفة</TableHead>
                        <TableHead>الطريقة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead>ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayments.map(
                        (
                          payment: Payment & {
                            roomNumber: string;
                            stayCheckIn: Date;
                          },
                        ) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {formatDate(payment.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.roomNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getPaymentMethodLabel(payment.paymentMethod)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.notes || "—"}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الضيف</DialogTitle>
          </DialogHeader>
          <GuestForm form={form} setForm={setForm} companies={companies} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate} disabled={submitting || isPending}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function GuestsView({
  guestId,
  search,
  onNavigate,
}: GuestsViewProps) {
  if (guestId) {
    return <GuestProfileView guestId={guestId} onNavigate={onNavigate} />;
  }

  return <GuestListView initialSearch={search} onNavigate={onNavigate} />;
}

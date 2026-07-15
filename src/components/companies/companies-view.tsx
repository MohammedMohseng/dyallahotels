"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  getGuests,
} from "@/actions";
import { Plus, ArrowLeft, Building2, Phone, Users, Pencil } from "lucide-react";

interface CompaniesViewProps {
  companyId?: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

interface CompanyListItem {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  _count: { guests: number };
}

interface CompanyDetail {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  guests: Array<{
    id: string;
    fullName: string;
    phone: string;
    stays: Array<{
      id: string;
      room: { roomNumber: string } | null;
    }>;
  }>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "SDG" }).format(
    amount,
  );

export default function CompaniesView({
  companyId,
  onNavigate,
}: CompaniesViewProps) {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail view state
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompanies(searchQuery || undefined);
      setCompanies(data as CompanyListItem[]);
    } catch {
      toast.error("فشل في تحميل الشركات");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const loadData = async ()=>{
      if (!companyId) {
      await  fetchCompanies();
      }
    }
    loadData()
  }, [fetchCompanies, companyId]);



  const fetchCompanyDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const data = await getCompanyById(id);
        if (!data) {
          toast.error("الشركة غير موجودة");
          onNavigate("companies");
          return;
        }
        setCompanyDetail(data as CompanyDetail);
      } catch {
        toast.error("فشل في تحميل تفاصيل الشركة");
      } finally {
        setDetailLoading(false);
      }
    },
    [onNavigate],
  );

  useEffect(() => {
    const loadData = async () => {
      if (companyId) {
        await fetchCompanyDetail(companyId);
      }
    };
    loadData();
  }, [companyId, fetchCompanyDetail]);


  const resetForm = () => {
    setFormData({
      name: "",
      contactPerson: "",
      phone: "",
      address: "",
      notes: "",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = () => {
    if (!companyDetail) return;
    setFormData({
      name: companyDetail.name,
      contactPerson: companyDetail.contactPerson || "",
      phone: companyDetail.phone || "",
      address: companyDetail.address || "",
      notes: companyDetail.notes || "",
    });
    setIsEditing(true);
    setEditId(companyDetail.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("اسم الشركة مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        contactPerson: formData.contactPerson || null,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
      };

      const result =
        isEditing && editId
          ? await updateCompany(editId, payload)
          : await createCompany(payload);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isEditing ? "تم تحديث الشركة بنجاح" : "تم إنشاء الشركة بنجاح",
        );
        setDialogOpen(false);
        resetForm();
        if (companyId) {
          fetchCompanyDetail(companyId);
        } else {
          fetchCompanies();
        }
      }
    } catch {
      toast.error(isEditing ? "فشل في تحديث الشركة" : "فشل في إنشاء الشركة");
    } finally {
      setSubmitting(false);
    }
  };

  // Detail View
  if (companyId) {
    if (detailLoading) {
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => onNavigate("companies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة إلى الشركات
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      );
    }

    if (!companyDetail) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate("companies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            رجوع
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {companyDetail.name}
              </h2>
              <p className="text-muted-foreground">تفاصيل الشركة</p>
            </div>
          </div>
          <Button onClick={handleOpenEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            تعديل الشركة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الشركة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  جهة الاتصال
                </p>
                <p className="text-sm">{companyDetail.contactPerson || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  الهاتف
                </p>
                <p className="text-sm">{companyDetail.phone || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  العنوان
                </p>
                <p className="text-sm">{companyDetail.address || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  ملاحظات
                </p>
                <p className="text-sm">{companyDetail.notes || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>الضيوف المرتبطون</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("guests")}
            >
              <Plus className="mr-2 h-4 w-4" />
              إضافة ضيف إلى الشركة
            </Button>
          </CardHeader>
          <CardContent>
            {companyDetail.guests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا يوجد ضيوف مرتبطون بهذه الشركة
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>الغرفة الحالية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyDetail.guests.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell className="font-medium">
                          {guest.fullName}
                        </TableCell>
                        <TableCell>{guest.phone}</TableCell>
                        <TableCell>
                          {guest.stays.length > 0 && guest.stays[0].room ? (
                            <Badge variant="outline">
                              {guest.stays[0].room.roomNumber}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog (reused for detail view) */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل الشركة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>الاسم *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="اسم الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label>جهة الاتصال</Label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="اسم جهة الاتصال"
                />
              </div>
              <div className="space-y-2">
                <Label>الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="رقم الهاتف"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="عنوان الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الشركات</h2>
          <p className="text-muted-foreground">إدارة الحسابات المؤسسية</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              إضافة شركة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء شركة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>الاسم *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="اسم الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label>جهة الاتصال</Label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="اسم جهة الاتصال"
                />
              </div>
              <div className="space-y-2">
                <Label>الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="رقم الهاتف"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="عنوان الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "جاري الإنشاء..." : "إنشاء شركة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="بحث في الشركات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {searchQuery ? "لا توجد شركات تطابق بحثك" : "لا توجد شركات بعد"}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => onNavigate("companies", { companyId: company.id })}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{company.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {company.contactPerson && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{company.contactPerson}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{company.phone}</span>
                  </div>
                )}
                <div className="pt-1">
                  <Badge variant="secondary">
                    {company._count.guests}{" "}
                    {company._count.guests === 1 ? "ضيف" : "ضيوف"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

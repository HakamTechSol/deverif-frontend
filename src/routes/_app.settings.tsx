import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authService } from "@/services";
import { authStore, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Dvarif" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => (user?.role === "admin" ? authService.adminMe() : authService.me()),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const src = me.data ?? user;
    if (src) {
      setFullName(src.full_name ?? "");
      setPhone(src.phone ?? "");
      setPreview(src.profile_image ?? null);
    }
  }, [me.data, user]);

  const save = useMutation({
    mutationFn: async () => {
      if (user?.role === "admin") {
        return authService.updateAdminProfile({ full_name: fullName, phone });
      }
      const form = new FormData();
      form.append("full_name", fullName);
      form.append("phone", phone);
      if (image) form.append("profile_image", image);
      return authService.updateProfile(form);
    },
    onSuccess: (u) => {
      toast.success("Profile updated");
      if (u && user) authStore.updateUser({ ...user, ...u });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const initials = (fullName || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile and account preferences."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground">Profile</h2>
            <p className="text-xs text-muted-foreground">
              This is how others in the network will see you.
            </p>

            <div className="mt-6 flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={preview ?? undefined} alt={fullName} />
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {user?.role !== "admin" ? (
                  <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground">
                    <Camera className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setImage(f);
                        if (f) setPreview(URL.createObjectURL(f));
                      }}
                    />
                  </label>
                ) : null}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{fullName || "—"}</div>
                <div className="text-xs text-muted-foreground">{me.data?.email ?? user?.email}</div>
                <div className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                  {user?.role}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={me.data?.email ?? user?.email ?? ""} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground">Security</h2>
            <p className="text-xs text-muted-foreground">
              Update your password. You'll be signed out on other devices.
            </p>
            <div className="mt-5 space-y-3">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button variant="outline" className="w-full">
                Update password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

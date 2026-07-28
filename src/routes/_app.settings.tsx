import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Save, Lock } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authService } from "@/services";
import { PasswordInput } from "@/components/common/PasswordInput";
import { authStore, useAuth } from "@/lib/auth";
import { resolveAssetUrl } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Dvarif" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  type ProfileData = { full_name?: string; phone?: string | null; profile_image?: string | null; email?: string; organization_uuid?: string | null; organization_name?: string | null; organization_logo?: string | null };

  const me = useQuery({
    queryKey: ["me"],
    queryFn: (): Promise<ProfileData> =>
      user?.role === "admin" ? authService.adminMe() : authService.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const src = me.data;
    if (src) {
      setFullName(src.full_name ?? "");
      setPhone(src.phone ?? "");
      setPreview(src.profile_image ?? null);
    }
  }, [me.data]);

  const save = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("full_name", fullName);
      form.append("phone", phone);
      if (image) form.append("profile_image", image);
      if (user?.role === "admin") {
        return authService.updateAdminProfile(form);
      }
      return authService.updateProfile(form);
    },
    onSuccess: (u) => {
      toast.success("Profile updated");
      if (u && user) {
        authStore.updateUser({
          ...user,
          full_name: (u as any).full_name ?? fullName,
          phone: (u as any).phone ?? phone,
          profile_image: (u as any).profile_image ?? user.profile_image,
        });
      }
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

            {user?.role !== "admin" && me.data?.organization_name && (
              <div className="mt-4 flex items-center gap-2">
                {me.data.organization_logo ? (
                  <img
                    src={resolveAssetUrl(me.data.organization_logo) ?? undefined}
                    alt={me.data.organization_name}
                    className="h-5 w-5 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                    {me.data.organization_name[0].toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-foreground">{me.data.organization_name}</span>
              </div>
            )}

            <div className="mt-6 flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={resolveAssetUrl(preview) ?? undefined} alt={fullName} />
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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

        {user?.role !== "admin" ? (
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground">Security</h2>
              <p className="text-xs text-muted-foreground">
                Request a password reset link sent to your email.
              </p>
              <div className="mt-5">
                <PasswordChangeCard />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/70 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground">Security</h2>
              <p className="text-xs text-muted-foreground">
                Update your admin password.
              </p>
              <div className="mt-5">
                <AdminPasswordChangeCard />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PasswordChangeCard() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const sendReset = async () => {
    setLoading(true);
    try {
      await authService.forgotPassword(user?.email ?? "");
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        A password reset link has been sent to your email. Check your inbox.
      </div>
    );
  }

  return (
    <Button variant="outline" className="w-full" onClick={sendReset} disabled={loading}>
      <Lock className="mr-2 h-4 w-4" />
      {loading ? "Sending..." : "Send password reset link"}
    </Button>
  );
}

function AdminPasswordChangeCard() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const pwValidations = [
    { label: "At least 8 characters", ok: newPassword.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(newPassword) },
    { label: "One lowercase letter", ok: /[a-z]/.test(newPassword) },
    { label: "One number", ok: /[0-9]/.test(newPassword) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const changePw = useMutation({
    mutationFn: () => {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
      if (!/[A-Z]/.test(newPassword)) throw new Error("Password must contain at least one uppercase letter");
      if (!/[a-z]/.test(newPassword)) throw new Error("Password must contain at least one lowercase letter");
      if (!/[0-9]/.test(newPassword)) throw new Error("Password must contain at least one number");
      if (!/[^A-Za-z0-9]/.test(newPassword)) throw new Error("Password must contain at least one special character");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      return authService.updateAdminProfile({
        password: newPassword,
        old_password: oldPassword,
      });
    },
    onSuccess: () => {
      toast.success("Password updated");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Failed to update password");
    },
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Current password</Label>
        <PasswordInput
          placeholder="••••••••"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>New password</Label>
        <PasswordInput
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      {newPassword.length > 0 && (
        <ul className="space-y-1 text-[11px]">
          {pwValidations.map((v) => (
            <li key={v.label} className={v.ok ? "text-emerald-600" : "text-muted-foreground"}>
              {v.ok ? "\u2713" : "\u2022"} {v.label}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <Label>Confirm new password</Label>
        <PasswordInput
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {confirmPassword.length > 0 && (
        <p className={`text-[11px] ${passwordsMatch ? "text-emerald-600" : "text-destructive"}`}>
          {passwordsMatch ? "\u2713 Passwords match" : "Passwords do not match"}
        </p>
      )}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => changePw.mutate()}
        disabled={changePw.isPending || !oldPassword || !newPassword || !passwordsMatch}
      >
        <Lock className="mr-2 h-4 w-4" />
        {changePw.isPending ? "Updating..." : "Update password"}
      </Button>
    </div>
  );
}

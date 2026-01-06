"use client";

import { z } from "zod";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  Field,
  FieldSet,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

type SettingsTab = "profile" | "api-tokens";

const profileFormSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(64, "Display name can not be more than 64 characters")
    .optional(),
  email: z.email("Invalid email address").optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const createTokenSchema = z.object({
  name: z.string().min(1, "Token name is required"),
  expires_at: z.date().optional(),
});

type CreateTokenFormValues = z.infer<typeof createTokenSchema>;

interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  expires_at: Date | null;
}

const ProfileSettingsSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
};

const ApiTokensSkeleton = () => {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProfileSettings = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const loadUser = async () => {
      setUserLoading(true);

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setUser(authUser);
      } catch (error) {
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const {
    data: profileData,
    error: profileError,
    isLoading: profileLoading,
  } = useSWR(user ? `/api/v1/users/${user.id}` : null, fetcher);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: "",
      email: "",
    },
    values: {
      display_name: profileData?.user.display_name || "",
      email: profileData?.user.email || "",
    },
  });

  const handleDeleteAccount = async () => {
    if (!user) return;

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      toast.error("You must be logged in to delete your account.");
      return;
    }

    const token = sessionData.session.access_token;

    const response = await fetch(`/api/v1/users/${user.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      toast.success("Account deleted successfully.");
      await supabase.auth.signOut();
      router.push("/");
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to delete account.");
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    const token = sessionData.session.access_token;

    const response = await fetch(`/api/v1/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      toast.success("Profile updated successfully.");
      mutate(`/api/v1/users/${user.id}`);
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to update profile.");
    }
  };

  if (userLoading || profileLoading) {
    return <ProfileSettingsSkeleton />;
  }

  if (profileError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your display name and email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup className="flex items-end gap-2">
                <Field data-invalid={!!errors.display_name}>
                  <FieldLabel htmlFor="display_name">Display Name</FieldLabel>
                  <Input
                    id="display_name"
                    {...register("display_name")}
                    aria-invalid={!!errors.display_name}
                  />
                  {errors.display_name && (
                    <FieldError>{errors.display_name.message}</FieldError>
                  )}
                </Field>

                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <FieldError>{errors.email.message}</FieldError>
                  )}
                </Field>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            These actions are irreversible. Please be certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};



const ApiTokenSettings = () => {
  const [expiration, setExpiration] = useState("7");
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const loadUser = async () => {
      setUserLoading(true);

      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
      } catch (error) {
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const { data: tokens, error } = useSWR<{ tokens: ApiToken[] }>(
    user ? `/api/v1/users/${user.id}/api_tokens` : null,
    fetcher,
  );

  const [newToken, setNewToken] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    reset,
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTokenFormValues>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      expires_at: undefined,
    },
  });

  const onSubmit = async (data: CreateTokenFormValues) => {
    if (!user) return;

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      toast.error("You must be logged in to create a token.");
      return;
    }

    const token = sessionData.session.access_token;

    let expiresAtDate: Date | undefined = undefined;

    if (expiration !== "never") {
      if (expiration === "custom") {
        expiresAtDate = data.expires_at;
      } else {
        expiresAtDate = addDays(new Date(), parseInt(expiration, 10));
      }
    }

    const response = await fetch(`/api/v1/users/${user.id}/api_tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: data.name,
        expires_at: expiresAtDate ? expiresAtDate.toISOString() : undefined,
      }),
    });

    if (response.ok) {
      const newTokenData = await response.json();
      toast.success("Token created successfully.");
      mutate(`/api/v1/users/${user.id}/api_tokens`);
      setNewToken(newTokenData.token);
      setIsDialogOpen(true);
      reset();
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to create token.");
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!user) return;

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      toast.error("You must be logged in to delete a token.");
      return;
    }

    const token = sessionData.session.access_token;

    const response = await fetch(
      `/api/v1/users/${user.id}/api_tokens/${tokenId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.ok) {
      toast.success("Token deleted successfully.");
      mutate(`/api/v1/users/${user.id}/api_tokens`);
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to delete token.");
    }
  };

  if (userLoading || !tokens) {
    return <ApiTokensSkeleton />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create API Token</CardTitle>
          <CardDescription>
            Create a new API token to access the registry API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup className="flex items-end gap-2">
              <Field className="flex-1" data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Token Name</FieldLabel>
                <Input
                  id="name"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field className="flex-1">
                <FieldLabel htmlFor="expiration">Expires In</FieldLabel>
                <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger id="expiration">
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">365 days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {expiration === "custom" && (
                <Controller
                  control={control}
                  name="expires_at"
                  render={({ field, fieldState }) => (
                    <Field
                      className="flex-1"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="expires_at">Custom Date</FieldLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="expires_at"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            aria-invalid={fieldState.invalid}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      {fieldState.error && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </Field>
                  )}
                />
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Token"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API Token</DialogTitle>
            <DialogDescription>
              Please save this token somewhere safe. You will not be able to
              see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md break-all">
            <code>{newToken}</code>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Existing API Tokens</CardTitle>
          <CardDescription>
            Manage your existing API tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive">
              Failed to load tokens. Please try again.
            </p>
          )}
          {tokens && tokens.tokens.length > 0 ? (
            <ul className="space-y-4">
              {tokens.tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{token.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created:{" "}
                      {new Date(token.created_at).toLocaleDateString()}
                    </p>
                    {token.expires_at && (
                      <p className="text-sm text-muted-foreground">
                        Expires:{" "}
                        {new Date(token.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the token "{token.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteToken(token.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              No API tokens found. Create one to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1">
          <h2 className="text-xl font-bold mb-4">Settings</h2>
          <nav className="flex flex-col gap-2" aria-label="Settings navigation">
            <Button
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("profile")}
              className="justify-start"
              aria-current={activeTab === "profile" ? "page" : undefined}
            >
              Profile
            </Button>
            <Button
              variant={activeTab === "api-tokens" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("api-tokens")}
              className="justify-start"
              aria-current={activeTab === "api-tokens" ? "page" : undefined}
            >
              API Tokens
            </Button>
          </nav>
        </div>
        <div className="col-span-1 md:col-span-3">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "api-tokens" && <ApiTokenSettings />}
        </div>
      </div>
    </div>
  );
}

"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel, FieldError, } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
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

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const profileFormSchema = z.object({
  display_name: z.string()
    .min(1, "Display name is required")
    .max(64, "Display name can not be more that 64 characters").optional(),
  email: z.email("Invalid email address").optional(),
});

const ProfileSettings = () => {
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
        console.error("Error loading user:", error);
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
  const { data: profileData, error: profileError, isLoading: profileLoading } = useSWR(
    user ? `/api/v1/users/${user.id}` : null,
    fetcher
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: profileData?.display_name || "",
      email: user?.email || "",
    },
    values: {
      display_name: profileData?.display_name || "",
      email: user?.email || "",
    }
  });

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
    return <p>Loading...</p>;
  }

  if (profileError) {
    return <p className="text-destructive">Failed to load profile.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your display name and email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="display_name">Display Name</FieldLabel>
              <Input id="display_name" {...form.register("display_name")} />
              {form.formState.errors.display_name && (
                <FieldError>{form.formState.errors.display_name.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" {...form.register("email")} type="email" disabled />
              {form.formState.errors.email && (
                <FieldError>{form.formState.errors.email.message}</FieldError>
              )}
            </Field>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </form>
        </Field>
      </CardContent>
    </Card>
  );
}

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

function ApiTokenSettings() {
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
  const { data: tokens, error } = useSWR<{ tokens: ApiToken[] }>(
    user ? `/api/v1/users/${user.id}/api_tokens` : null,
    fetcher
  );
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const form = useForm<CreateTokenFormValues>({
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

    const response = await fetch(`/api/v1/users/${user.id}/api_tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...data,
        expires_at: data.expires_at ? data.expires_at.toISOString() : undefined,
      }),
    });

    if (response.ok) {
      const newTokeData = await response.json();
      toast.success("Token created successfully.");
      mutate(`/api/v1/users/${user.id}/api_tokens`);
      setNewToken(newTokeData.token);
      setIsDialogOpen(true);
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

    const response = await fetch(`/api/v1/users/${user.id}/api_tokens/${tokenId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      toast.success("Token deleted successfully.");
      mutate(`/api/v1/users/${user.id}/api_tokens`);
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to delete token.");
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create API Token</CardTitle>
          <CardDescription>Create a new API token to access the registry API.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
              <Field>
                <FieldLabel htmlFor="name">Token Name</FieldLabel>
                <Input id="name" {...form.register("name")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="expires_at">Expires At</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("justify-start", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        setDate(selectedDate);
                        form.setValue("expires_at", selectedDate);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Token"}
              </Button>
            </form>
            {form.formState.errors.name && (
              <FieldError>{form.formState.errors.name.message}</FieldError>
            )}
            {form.formState.errors.expires_at && (
              <FieldError>{form.formState.errors.expires_at.message}</FieldError>
            )}
          </Field>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API Token</DialogTitle>
            <DialogDescription>
              Please save this token somewhere safe. You will not be able to see it again.
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
          <CardDescription>Manage your existing API tokens.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive">Failed to load tokens.</p>}
          {tokens && tokens.tokens.length > 0 ? (
            <ul className="space-y-4">
              {tokens.tokens.map((token) => (
                <li key={token.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{token.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(token.created_at).toLocaleDateString()}
                    </p>
                    {token.expires_at && (
                      <p className="text-sm text-muted-foreground">
                        Expires: {token.expires_at.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the token.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteToken(token.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p>No API tokens found.</p>
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
          <div className="flex flex-col gap-2">
            <Button
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("profile")}
              className="justify-start"
            >
              Profile
            </Button>
            <Button
              variant={activeTab === "api-tokens" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("api-tokens")}
              className="justify-start"
            >
              API Tokens
            </Button>
          </div>
        </div>
        <div className="col-span-3">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "api-tokens" && <ApiTokenSettings />}
        </div>
      </div>
    </div>
  );
}

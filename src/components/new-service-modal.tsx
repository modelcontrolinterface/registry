"use client"
// use drizzle-zod

import { z } from "zod"
import { useForm } from "react-hook-form"
import { useState, useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select"
import { Toaster, toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"

const SERVICE_TYPES = ["interceptors", "server", "sandbox"]

const NewServiceSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  id: z
    .string()
    .min(2, "ID must be at least 2 characters")
    .max(100, "ID must be 100 characters or fewer")
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase with hyphens only"),
  type: z.enum(SERVICE_TYPES, {
    message: "Please select a valid service type",
  }),
  keywords: z.string().optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer")
    .optional(),
  homepage: z
    .string()
    .url("Homepage must be a valid URL")
    .optional()
    .or(z.literal("")),
  repository: z
    .string()
    .url("Repository must be a valid URL")
    .optional()
    .or(z.literal("")),
})

type NewServiceFormData = z.infer<typeof NewServiceSchema>

interface IdCheckState {
  status: "idle" | "checking" | "available" | "taken" | "error"
  message: string
}

const generateIdFromName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

const NewServiceModal = () => {
  const [open, setOpen] = useState(false)
  const [idCheck, setIdCheck] = useState<IdCheckState>({
    status: "idle",
    message: "",
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<NewServiceFormData>({
    resolver: zodResolver(NewServiceSchema),
    defaultValues: {
      id: "",
      name: "",
      keywords: "",
      type: "server",
      repository: "",
      description: "",
    },
  })

  const watchedId = watch("id")
  const watchedName = watch("name")
  const selectedType = watch("type")

  useEffect(() => {
    if (watchedName) {
      const generatedId = generateIdFromName(watchedName)
      setValue("id", generatedId, { shouldValidate: true })
    } else {
      setValue("id", "", { shouldValidate: false })
    }
  }, [watchedName, setValue])

  useEffect(() => {
    if (!watchedId || watchedId.length < 2) {
      setIdCheck({ status: "idle", message: "" })
      return
    }

    if (!/^[a-z0-9-]+$/.test(watchedId)) {
      setIdCheck({
        status: "error",
        message: "ID must be lowercase letters, numbers, and hyphens only",
      })
      return
    }

    setIdCheck({ status: "checking", message: "Checking availability..." })

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/services/${encodeURIComponent(watchedId)}`)

        if (res.status === 404) {
          setIdCheck({
            status: "available",
            message: "Service ID is available",
          })
        } else if (res.status === 200) {
          setIdCheck({
            status: "taken",
            message: "This service ID is already taken",
          })
        } else {
          throw new Error("Failed to check availability")
        }
      } catch (err) {
        console.error("Error checking service ID:", err)
        setIdCheck({
          status: "error",
          message: "Could not verify availability",
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedId])

  const onSubmit = async (values: NewServiceFormData) => {
    if (idCheck.status === "taken") {
      toast.error("Service ID is already taken. Please choose a different name.")
      return
    }

    try {
      const keywordsArray = values.keywords
        ? values.keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : []

      const payload = {
        id: values.id,
        name: values.name,
        type: values.type,
        keywords: keywordsArray,
        description: values.description || null,
        homepage: values.homepage || null,
        repository: values.repository || null,
      }

      const res = await fetch("/api/v1/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = `Failed to create service (${res.status})`
        try {
          const data = await res.json()
          msg = data?.message || data?.error || msg
        } catch {}
        throw new Error(msg)
      }

      toast.success("Service created successfully!")

      reset()
      setIdCheck({ status: "idle", message: "" })
      setOpen(false)
    } catch (err: any) {
      console.error("Error creating service:", err)
      toast.error(err?.message || "Failed to create service")
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    idCheck.status === "checking" ||
    idCheck.status === "taken" ||
    !watchedId ||
    !!errors.id

  return (
    <>
      <Toaster richColors position="top-right" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full pl-2 justify-start">
            New Service
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Service</DialogTitle>
            <DialogDescription>
              Register a new service to the registry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Service Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="My Awesome Service"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}

              {watchedId ? (
                <div className="flex items-center gap-2">
                  {idCheck.status === "checking" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Service ID: <code className="font-mono">{watchedId}</code> - {idCheck.message}
                      </span>
                    </>
                  )}

                  {idCheck.status === "available" && (
                    <>
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="text-xs text-green-500 font-medium">
                        Service ID: <code className="font-mono">{watchedId}</code> - {idCheck.message}
                      </span>
                    </>
                  )}

                  {idCheck.status === "taken" && (
                    <>
                      <X className="h-3 w-3 text-destructive shrink-0" />
                      <span className="text-xs text-destructive font-medium">
                        Service ID: <code className="font-mono">{watchedId}</code> - {idCheck.message}
                      </span>
                    </>
                  )}

                  {idCheck.status === "error" && (
                    <>
                      <X className="h-3 w-3 text-destructive shrink-0" />
                      <span className="text-xs text-destructive">
                        Service ID: <code className="font-mono">{watchedId}</code> - {idCheck.message}
                      </span>
                    </>
                  )}

                  {idCheck.status === "idle" && (
                    <span className="text-xs text-muted-foreground">
                      Service ID: <code className="font-mono">{watchedId}</code>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Service ID will be auto-generated from name
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Service Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedType}
                onValueChange={(v) =>
                  setValue("type", v as any, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  className={`w-full ${errors.type ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="capitalize">{type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="A short description of your service..."
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input placeholder="rust, web, auth" {...register("keywords")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Homepage</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  {...register("homepage")}
                  className={errors.homepage ? "border-destructive" : ""}
                />
                {errors.homepage && (
                  <p className="text-xs text-destructive">
                    {errors.homepage.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Repository</Label>
                <Input
                  type="url"
                  placeholder="https://github.com/user/repo"
                  {...register("repository")}
                  className={errors.repository ? "border-destructive" : ""}
                />
                {errors.repository && (
                  <p className="text-xs text-destructive">
                    {errors.repository.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setOpen(false)
                  reset()
                  setIdCheck({ status: "idle", message: "" })
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitDisabled}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Service"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default NewServiceModal

"use client";

import { packageNameRegex } from "@/lib/regex"
import { useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";

const reportFormSchema = z.object({
  packageId: z
    .string()
    .min(1, "Package ID is required")
    .regex(packageNameRegex, "Invalid Package ID format. Use lowercase alphanumeric and hyphens."),
  reasons: z
    .array(z.string())
    .optional(),
  details: z
    .string()
    .min(10, "Details must be at least 10 characters")
    .max(1000, "Details must not exceed 1000 characters")
    .optional(),
}).refine(
  (data) => {
    return (data.reasons && data.reasons.length > 0) || (data.details && data.details.length >= 10);
  },
  {
    message: "Either select at least one reason or provide details (min 10 characters).",
    path: ["reasons"],
  }
);

type ReportFormValues = z.infer<typeof reportFormSchema>;

const reasonsOptions = [
  { id: "spam", label: "It contains spam" },
  { id: "name-squatting", label: "It is name-squatting (reserving a crate name without content)" },
  { id: "abusive", label: "It is abusive or otherwise harmful" },
  { id: "malicious-code", label: "It contains malicious code" },
  { id: "vulnerability", label: "It contains a vulnerability" },
  { id: "other", label: "It is violating the usage policy in some other way (please specify below)" },
];

export default function SupportPage() {
  const searchParams = useSearchParams();
  const urlInquire = searchParams.get("inquire");
  const urlPackageId = searchParams.get("package") || "";

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      packageId: urlPackageId,
      reasons: urlInquire ? [urlInquire] : [],
      details: "",
    },
  });

  async function onSubmit(values: ReportFormValues) {
    const subject = `Package Violation Report for ${values.packageId}`;
    let body = `Package ID: ${values.packageId}\n\n`;

    if (values.reasons && values.reasons.length > 0) {
      body += "Reasons for Reporting:\n";
      values.reasons.forEach((reasonId) => {
        const reasonLabel = reasonsOptions.find(opt => opt.id === reasonId)?.label || reasonId;
        body += `- ${reasonLabel}\n`;
      });
      body += "\n";
    }

    if (values.details) {
      body += `Details:\n${values.details}\n`;
    }

    const mailtoLink = `mailto:15ba88+mcir+support@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoLink, "_blank");

    toast.success("Mail client opened with report details.", {
      description: "Please review and send the email.",
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Support</h1>

      <p className="text-lg text-muted-foreground mb-8">
        If you believe a package violates our policies, please fill out the form below.
        For other inquiries, you can email us directly at{" "}
        <Link href="mailto:15ba88+mcir+support@proton.me" className="text-primary hover:underline">
          15ba88+mcir+support@proton.me
        </Link>.
      </p>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Report a Package Violation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Field>
              <FieldLabel htmlFor="packageId">Package ID</FieldLabel>
              <Input
                id="packageId"
                {...form.register("packageId")}
                placeholder="e.g., my-awesome-package"
              />
              {form.formState.errors.packageId && (
                <FieldError>{form.formState.errors.packageId.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel>Reasons for Reporting</FieldLabel>
              <div className="space-y-2">
                {reasonsOptions.map((reason) => (
                  <Controller
                    key={reason.id}
                    name="reasons"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={reason.id}
                          checked={field.value?.includes(reason.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), reason.id])
                              : field.onChange(
                                  field.value?.filter(
                                    (value) => value !== reason.id
                                  )
                                );
                          }}
                        />
                        <label
                          htmlFor={reason.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {reason.label}
                        </label>
                      </div>
                    )}
                  />
                ))}
              </div>
              {form.formState.errors.reasons && (
                <FieldError>{form.formState.errors.reasons.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="details">Details</FieldLabel>
              <Textarea
                id="details"
                {...form.register("details")}
                placeholder="Please provide detailed information about the violation (min 10, max 1000 characters)."
                rows={6}
              />
              {form.formState.errors.details && (
                <FieldError>{form.formState.errors.details.message}</FieldError>
              )}
            </Field>

            <Button type="submit" className="w-full">
              Submit Report
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

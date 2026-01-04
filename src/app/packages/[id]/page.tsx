"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { formatDownloads } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

import Link from "next/link";
import { format } from "date-fns";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import {
  Copy,
  Scale,
  Users,
  Check,
  Globe,
  Weight,
  Github,
  Package,
  Download,
  Calendar,
  BadgeCheck,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PackageVersion {
  id: string;
  package_id: string;
  version: string;
  is_stable: boolean;
  size: bigint;
  publisher_id: string;
  license: string | null;
  yanked: boolean;
  yanked_message: string | null;
  yanked_at: Date | null;
  yanked_by_user_id: string | null;
  downloads: bigint;
  readme: string;
  changelog: string | null;
  abi_version: string | null;
  digest: string;
  tarball: string;
  created_at: Date;
  updated_at: Date;
  publisher?: User;
  authors?: { name: string; email?: string; url?: string }[];
}

interface Package {
  id: string;
  name: string;
  categories: ("hook" | "server" | "sandbox" | "interceptor")[];
  primary_owner: User;
  default_version: string | null;
  keywords: string[] | null;
  description: string | null;
  homepage: string | null;
  repository: string | null;
  is_verified: boolean;
  is_deprecated: boolean;
  deprecation_message: string | null;
  created_at: Date;
  updated_at: Date;
  downloads: number;
}

interface Stats {
  total_versions: number;
  total_downloads: number;
  max_version: string | null;
  newest_version: string | null;
  max_stable_version: string | null;
  yanked_versions: number;
  total_owners: number;
  total_audits: number;
}

interface GetPackageResultExplicit {
  package: Package;
  owners: User[];
  versions: Record<string, PackageVersion>;
  stats: Stats;
}

const PackagePage = () => {
  const params = useParams();
  const fullId = params.id as string;

  const [packageId, versionFromUrl] = fullId.includes("%40")
    ? fullId.split("%40")
    : [fullId, undefined];

  const [copied, setCopied] = useState(false);

  const { data, error, isLoading } = useSWR<GetPackageResultExplicit>(
    packageId ? `/api/v1/packages/${packageId}` : null,
    fetcher
  );

  const targetVersion = versionFromUrl || data?.package?.default_version;
  const currentDisplayVersion =
    data && targetVersion ? data.versions[targetVersion] : null;

  const readmeContent = currentDisplayVersion?.readme;
  const readmeLoading = false;
  const changelogContent = currentDisplayVersion?.changelog;
  const changelogLoading = false;

  const formatBytes = (bytes: number) => {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)}MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)}KB`;
    return `${bytes}B`;
  };

  const handleCopy = () => {
    if (!data) return;
    const versionSuffix = versionFromUrl ? `@${versionFromUrl}` : "";
    const installCmd = `mci install ${data.package.id}${versionSuffix}`;

    try {
      navigator.clipboard.writeText(installCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  // Removed getAuditIcon and formatAuditAction functions here.

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex gap-6">
              <Skeleton className="h-24 w-24 rounded-3xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Card>
              <CardContent className="space-y-2 p-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
          <Skeleton className="h-96 lg:w-96" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="mb-4 text-2xl font-bold">Package Not Found</h1>
        <p className="text-muted-foreground">
          The package with ID {packageId} could not be found.
        </p>
      </div>
    );
  }

  const { package: pkg, owners, versions, stats } = data;

  return (
    <div className="container mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-3xl bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">{pkg.name}</h1>
                {pkg.is_verified && (
                  <BadgeCheck className="text-blue-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {pkg.categories.map((category) => (
                  <Badge key={category}>{category}</Badge>
                ))}
              </div>
              <p className="mt-1 text-muted-foreground">
                {pkg.description || "No description available"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {pkg.keywords && pkg.keywords.map((k) => (
                  <Badge
                    variant="secondary"
                    key={k}
                    className="uppercase tracking-wide"
                  >
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Tabs defaultValue="readme" className="flex-1">
            <TabsList>
              <TabsTrigger value="readme">Readme</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
              <TabsTrigger value="versions">
                Versions ({stats.total_versions})
              </TabsTrigger>
              <TabsTrigger value="contributors">
                Authors ({currentDisplayVersion?.authors?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="readme">
              <Card>
                <CardContent className="min-w-full prose prose-sm p-6 dark:prose-invert">
                  {readmeLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {readmeContent || "# No README available"}
                    </ReactMarkdown>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="changelog">
              <Card>
                <CardContent className="min-w-full prose prose-sm p-6 dark:prose-invert">
                  {changelogLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {changelogContent || "# No changelog available"}
                    </ReactMarkdown>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="space-y-2">
              {Object.values(versions).map((v: PackageVersion) => (
                <Card key={v.version}>
                  <CardContent className="space-y-4">
                    <div className={v.yanked ? "opacity-60 pointer-none" : ""}>
                      <Link href={`/packages/${packageId}@${v.version}`} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold">
                              v{v.version}
                            </span>
                            {v.version === pkg.default_version && (
                              <Badge variant="default">Default</Badge>
                            )}
                            {v.yanked && (
                              <Badge variant="destructive">Yanked</Badge>
                            )}
                            {v.version === stats.max_version && (
                              <Badge variant="secondary">Max Version</Badge>
                            )}
                            {v.version === stats.newest_version && (
                              <Badge variant="secondary">Newest</Badge>
                            )}
                            {v.version === stats.max_stable_version && (
                              <Badge variant="secondary">Max Stable</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(v.created_at), "MMM d, yyyy")}
                          </div>
                        </div>

                        {v.yanked && v.yanked_message && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {v.yanked_message}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Scale className="h-4 w-4" />
                            <span className="text-foreground">
                              {v.license || "Unknown"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Weight className="h-4 w-4" />
                            <span className="text-foreground">
                              {formatBytes(Number(v.size))}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Download className="h-4 w-4" />
                            <span className="text-foreground">
                              {formatDownloads(Number(v.downloads))}
                            </span>
                          </div>

                          {v.publisher && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span className="text-foreground">
                                Published by{" "}
                                  {v.publisher.display_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(Object.keys(versions)?.length === 0) && (
                <Card>
                  <CardContent className="space-y-2">
                    <div className="text-center text-muted-foreground py-12">
                      No versions found.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="contributors" className="space-y-2">
              {currentDisplayVersion?.authors?.map((author, index) => (
                <Card key={index}>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{author.name}</span>
                          </div>
                          <div className="mt-1 flex gap-3 text-sm text-muted-foreground">
                            {author.email && <span>{author.email}</span>}
                            {author.url && (
                              <Link
                                href={author.url}
                                className="text-primary hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {author.url}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!currentDisplayVersion || currentDisplayVersion.authors?.length === 0) && (
                <Card>
                  <CardContent className="space-y-4">
                    <div className="text-center text-muted-foreground py-12">
                      No authors found for this version.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Card className="h-max lg:w-96">
          <CardContent className="space-y-4">
            {pkg.is_deprecated && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>This package is deprecated.</strong>{" "}
                  {pkg.deprecation_message ||
                    "Please consider using an alternative."}
                </AlertDescription>
              </Alert>
            )}

            {currentDisplayVersion ? (
              <>
                <div className="rounded-lg bg-background p-1 flex items-center justify-between">
                  <code className="truncate px-2 text-sm">
                    mcim install {pkg.id}{versionFromUrl ? `@${versionFromUrl}` : ""}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Version</span>
                  </span>
                  <span>v{pkg.default_version}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Updated</span>
                  </span>
                  <span>{format(new Date(pkg.updated_at), "MMM d, yyyy")}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    <span>License</span>
                  </span>
                  <span>{currentDisplayVersion.license || "Unknown"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Downloads</span>
                  </span>
                  <span>{formatDownloads(Number(pkg.downloads))}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Weight className="h-4 w-4" />
                    <span>Size</span>
                  </span>
                  <span>{formatBytes(Number(currentDisplayVersion.size))}</span>
                </div>


              </>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No default version set. Version-specific information not
                  available.
                </AlertDescription>
              </Alert>
            )}

            {pkg.repository && (
              <div className="flex flex-col gap-3">
                <span className="text-lg font-bold">Repository</span>
                <span className="flex items-center gap-2 break-all">
                  <Github className="h-4 w-4 flex-shrink-0" />
                  <Link
                    href={pkg.repository}
                    className="text-primary hover:underline truncate"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {pkg.repository}
                  </Link>
                </span>
              </div>
            )}

            {pkg.homepage && (
              <div className="flex flex-col gap-3">
                <span className="text-lg font-bold">Homepage</span>
                <span className="flex items-center gap-2 break-all">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <Link
                    href={pkg.homepage}
                    className="text-primary hover:underline truncate"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {pkg.homepage}
                  </Link>
                </span>
              </div>
            )}

            {owners.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-lg font-bold">Owner(s)</span>
                <div className="flex flex-col gap-1">
                  {owners.map((o: User) => (
                    <Link
                      key={o.id}
                      href={`/users/${o.id}`}
                      className="text-primary hover:underline"
                    >
                      {o.display_name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <Button variant="destructive" className="w-full py-6 text-md" asChild>
              <Link href={`/support?package=${pkg.id}&inquire=violation`}>Report Package</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PackagePage;

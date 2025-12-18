"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

import { format } from "date-fns";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PackageBadge from "@/components/package-badge";
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

interface PackageOwner {
  package_id: string;
  user_id: string;
  created_at: Date;
  user: User;
}

interface Audit {
  id: number;
  action: string;
  user_id: string;
  package_id: string;
  package_version_id: string | null;
  timestamp: Date;
  user?: User;
}

interface Package {
  id: string;
  name: string;
  categories: ("server" | "sandbox" | "interceptor")[];
  primary_owner: string;
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
  default_version_data: PackageVersion | null;
  primaryOwner?: User;
}

interface Stats {
  total_versions: number;
  total_downloads: number;
  latest_version: string | null;
  yanked_versions: number;
  total_owners: number;
  total_audits: number;
}

interface GetPackageResultExplicit {
  package: Package;
  owners: PackageOwner[];
  versions: PackageVersion[];
  audits: Audit[];
  stats: Stats;
}

const PackagePage = () => {
  const params = useParams();
  const { id } = params;

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [data, setData] = useState<GetPackageResultExplicit | null>(null);

  useEffect(() => {
    const loadPackageData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/packages/${id}`);

        if (!res.ok) {
          console.warn(`Package ${id} not found. Status: ${res.status}`);
          setData(null);
          return;
        }

        const packageData: GetPackageResultExplicit = await res.json();
        setData(packageData);

        if (packageData.package.default_version_data?.readme) {
          setReadmeLoading(true);
          try {
            const readmeRes = await fetch(
              packageData.package.default_version_data.readme,
            );
            if (readmeRes.ok) {
              const text = await readmeRes.text();
              setReadmeContent(text);
            } else {
              setReadmeContent(
                "# README not available\\n\\nNo README found for this version.",
              );
            }
          } catch (err) {
            console.error("Error fetching README:", err);
            setReadmeContent(
              "# Error loading README\\n\\nCould not load README content.",
            );
          } finally {
            setReadmeLoading(false);
          }
        } else {
          setReadmeContent(
            "# No README available\\n\\nThis package does not have a default version set yet.",
          );
        }
      } catch (error) {
        console.error("Error fetching package data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadPackageData();
  }, [id]);

  const formatDownloads = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : String(n);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleCopy = () => {
    if (!data) return;
    const installCmd = `mci install ${data.package.id}`;
    try {
      navigator.clipboard.writeText(installCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  const getAuditIcon = (action: string) => {
    if (action.includes("security"))
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    if (action.includes("yanked"))
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (action.includes("published"))
      return <Package className="h-4 w-4 text-blue-500" />;
    return <ShieldCheck className="h-4 w-4" />;
  };

  const formatAuditAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
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

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="mb-4 text-2xl font-bold">Package Not Found</h1>
        <p className="text-muted-foreground">
          The package with ID {id} could not be found.
        </p>
      </div>
    );
  }

  const { package: pkg, owners, versions, audits, stats } = data;
  const defaultVersion = pkg.default_version_data;

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
              <PackageBadge type={pkg.categories[0]} />
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
                Authors ({defaultVersion?.authors?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="audits">
                Audits ({stats.total_audits})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="readme">
              <Card>
                <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
                  {readmeLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <pre className="font-sans whitespace-pre-wrap">
                      {readmeContent}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="changelog">
              <Card>
                <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
                  {defaultVersion?.changelog ? (
                    <pre className="font-sans whitespace-pre-wrap">
                      {defaultVersion.changelog}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">No changelog available.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="space-y-4">
              <Card>
                <CardContent className="space-y-4">
                  {versions.map((v: PackageVersion) => (
                    <div
                      key={v.version}
                      className={v.yanked ? "opacity-60" : "hover:bg-accent"}
                    >
                      <div className="space-y-2">
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
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(v.created_at, "MMM d, yyyy")}
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
                                <Link
                                  href={`/users/${v.publisher.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {v.publisher.display_name}
                                </Link>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributors" className="space-y-4">
              <Card>
                <CardContent className="space-y-4">
                  {defaultVersion?.authors?.map((author, index) => (
                    <div key={index} className="hover:bg-accent">
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
                  ))}
                  {(!defaultVersion || defaultVersion.authors?.length === 0) && (
                    <div className="text-center text-muted-foreground py-12">
                      No authors found for this version.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audits" className="space-y-4">
              <Card>
                <CardContent className="space-y-4">
                  {audits.map((audit: Audit) => (
                    <div key={audit.id} className="hover:bg-accent">
                      <div className="flex items-start gap-3">
                        {getAuditIcon(audit.action)}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              {formatAuditAction(audit.action)}
                            </span>
                            <Badge variant="outline">
                              v{audit.package_version_id}
                            </Badge>
                          </div>
                          <div className="mt-1 flex gap-3 text-sm text-muted-foreground">
                            {audit.user && (
                              <span>
                                by{" "}
                                <Link
                                  href={`/users/${audit.user.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {audit.user.display_name}
                                </Link>
                              </span>
                            )}
                            <span>{format(audit.timestamp, "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
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

            {defaultVersion ? (
              <>
                <div className="rounded-lg bg-muted p-1 flex items-center justify-between">
                  <code className="truncate px-2 text-sm">
                    mci install {pkg.id}
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
                  <span>{format(pkg.updated_at, "MMM d, yyyy")}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    <span>License</span>
                  </span>
                  <span>{defaultVersion.license || "Unknown"}</span>
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
                  <span>{formatBytes(Number(defaultVersion.size))}</span>
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
                  {owners.map((o: PackageOwner) => (
                    <Link
                      key={o.user.id}
                      href={`/users/${o.user.id}`}
                      className="text-primary hover:underline"
                    >
                      {o.user.display_name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <Button variant="destructive" className="w-full py-6 text-md" asChild>
              <Link href={`/report/${pkg.id}`}>Report Package</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PackagePage;

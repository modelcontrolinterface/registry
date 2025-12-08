"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

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
  GitBranch,
  BadgeCheck,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import ServiceBadge from "@/components/service-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ServiceVersion {
  id: string;
  service_id: string;
  version: string;
  is_stable: boolean;
  size: bigint;
  publisher_id: string;
  license: string[] | null;
  yanked: boolean;
  yanked_message: string | null;
  yanked_at: Date | null;
  yanked_by_user_id: string | null;
  downloads: bigint;
  readme_url: string;
  integrity: string;
  tarball: string;
  created_at: Date;
  updated_at: Date;
  publisher?: User;
  contributors?: ServiceVersionContributor[];
}

interface ServiceOwner {
  service_id: string;
  user_id: string;
  created_at: Date;
  user: User;
}

interface Audit {
  id: number;
  action: string;
  user_id: string;
  service_id: string;
  service_version_id: string | null;
  timestamp: Date;
  user?: User;
}

interface Service {
  id: string;
  name: string;
  type: "server" | "sandbox" | "interceptor";
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
  default_version_data: ServiceVersion | null;
  primaryOwner?: User;
}

interface Stats {
  total_versions: number;
  total_downloads: number;
  latest_version: string | null;
  yanked_versions: number;
  total_owners: number;
  total_contributors: number;
  total_audits: number;
}

interface ServiceVersionContributor {
  service_id: string;
  service_version_id: string;
  user_id: string;
  created_at: Date;
  user: User;
}

interface GetServiceResultExplicit {
  service: Service;
  owners: ServiceOwner[];
  contributors: ServiceVersionContributor[];
  versions: ServiceVersion[];
  audits: Audit[];
  stats: Stats;
}

const ServicePage = () => {
  const params = useParams();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GetServiceResultExplicit | null>(null);
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const uniqueContributors = useMemo(() => {
    if (!data) return [];
    const contributorMap = new Map<string, { user: User; versionCount: number; firstContributionDate: Date }>();

    data.contributors.forEach((c) => {
      const userId = c.user.id;
      if (!contributorMap.has(userId)) {
        contributorMap.set(userId, { user: c.user, versionCount: 0, firstContributionDate: c.created_at });
      }
      const contributorEntry = contributorMap.get(userId)!;
      contributorEntry.versionCount++;
      // Keep the earliest created_at
      if (c.created_at < contributorEntry.firstContributionDate) {
        contributorEntry.firstContributionDate = c.created_at;
      }
    });

    return Array.from(contributorMap.values());
  }, [data]);

  useEffect(() => {
    const loadServiceData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/services/${id}`);

        if (!res.ok) {
          console.warn(`Service ${id} not found. Status: ${res.status}`);
          setData(null);
          return;
        }

        const serviceData: GetServiceResultExplicit = await res.json();
        setData(serviceData);

        if (serviceData.service.default_version_data?.readme_url) {
          setReadmeLoading(true);
          try {
            const readmeRes = await fetch(
              serviceData.service.default_version_data.readme_url,
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
            "# No README available\\n\\nThis service does not have a default version set yet.",
          );
        }
      } catch (error) {
        console.error("Error fetching service data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadServiceData();
  }, [id]);

  const formatDownloads = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : String(n);

  const formatDate = (s: string | Date) =>
    new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatBytes = (bytes: number) => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleCopy = () => {
    if (!data) return;
    const installCmd = `mci install ${data.service.id}`;
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
            <Card>
              <CardContent className="flex gap-4">
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
              </CardContent>
            </Card>
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-96 lg:w-96" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="mb-4 text-2xl font-bold">Service Not Found</h1>
        <p className="text-muted-foreground">
          The service with ID {id} could not be found.
        </p>
      </div>
    );
  }

  const { service, owners, contributors, versions, audits, stats } = data;
  const defaultVersion = service.default_version_data;

  return (
    <div className="container mx-auto flex flex-col gap-8 px-4 py-8">
      {service.is_deprecated && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>This service is deprecated.</strong>{" "}
            {service.deprecation_message ||
              "Please consider using an alternative."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardContent className="flex gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-3xl bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold">{service.name}</h1>
                  {service.is_verified && (
                    <BadgeCheck className="text-blue-500" />
                  )}
                  <ServiceBadge type={service.type} />
                </div>
                <p className="mt-1 text-muted-foreground">
                  {service.description || "No description available"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {service.keywords && service.keywords.map((k) => (
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
            </CardContent>
          </Card>

          <Tabs defaultValue="readme" className="flex-1">
            <TabsList>
              <TabsTrigger value="readme">Readme</TabsTrigger>
              <TabsTrigger value="versions">
                Versions ({stats.total_versions})
              </TabsTrigger>
              <TabsTrigger value="contributors">
                Contributors ({stats.total_contributors})
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

            <TabsContent value="versions" className="space-y-4">
              {versions.map((v: ServiceVersion) => (
                <Card
                  key={v.version}
                  className={v.yanked ? "opacity-60" : "hover:bg-accent"}
                >
                  <CardContent className="cursor-pointer">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-semibold">
                            v{v.version}
                          </span>
                          {v.version === service.default_version && (
                            <Badge variant="default">Default</Badge>
                          )}
                          {v.yanked && (
                            <Badge variant="destructive">Yanked</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(v.created_at.toString())}
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
                            {v.license?.join(", ") || "Unknown"}
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
                                href={`/user/${v.publisher.username}`}
                                className="text-primary hover:underline"
                              >
                                @{v.publisher.username}
                              </Link>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="contributors" className="space-y-4">
              {uniqueContributors.map((contributor) => (
                <Card key={contributor.user.id} className="hover:bg-accent">
                  <CardContent className="flex items-center gap-4">
                    <img
                      src={
                        contributor.user.avatar_url ||
                        "https://i.pravatar.cc/150?img=5"
                      }
                      alt={contributor.user.display_name}
                      className="h-12 w-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/user/${contributor.user.username}`}
                          className="font-semibold hover:underline"
                        >
                          {contributor.user.display_name}
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          @{contributor.user.username}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {contributor.versionCount} version
                          {contributor.versionCount !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Since{" "}
                          {formatDate(contributor.firstContributionDate.toString())}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="audits" className="space-y-4">
              {audits.map((audit: Audit) => (
                <Card key={audit.id} className="hover:bg-accent">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      {getAuditIcon(audit.action)}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {formatAuditAction(audit.action)}
                          </span>
                          <Badge variant="outline">
                            v{audit.service_version_id}
                          </Badge>
                        </div>
                        <div className="mt-1 flex gap-3 text-sm text-muted-foreground">
                          {audit.user && (
                            <span>
                              by{" "}
                              <Link
                                href={`/user/${audit.user.username}`}
                                className="text-primary hover:underline"
                              >
                                @{audit.user.username}
                              </Link>
                            </span>
                          )}
                          <span>{formatDate(audit.timestamp.toString())}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <Card className="h-max lg:w-96">
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-1 flex items-center justify-between">
              <code className="truncate px-2 text-sm">
                mci install {service.id}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {defaultVersion ? (
              <>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Version</span>
                  </span>
                  <span>v{service.default_version}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Updated</span>
                  </span>
                  <span>{formatDate(service.updated_at.toString())}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    <span>License</span>
                  </span>
                  <span>
                    {defaultVersion.license?.join(", ") || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Downloads</span>
                  </span>
                  <span>{formatDownloads(Number(service.downloads))}</span>
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

            <Separator />

            {service.repository && (
              <div className="flex flex-col gap-3">
                <span className="text-lg font-bold">Repository</span>
                <span className="flex items-center gap-2 break-all">
                  <Github className="h-4 w-4 flex-shrink-0" />
                  <Link
                    href={service.repository}
                    className="text-primary hover:underline truncate"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {service.repository}
                  </Link>
                </span>
              </div>
            )}

            {service.homepage && (
              <div className="flex flex-col gap-3">
                <span className="text-lg font-bold">Homepage</span>
                <span className="flex items-center gap-2 break-all">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <Link
                    href={service.homepage}
                    className="text-primary hover:underline truncate"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {service.homepage}
                  </Link>
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="text-lg font-bold">Owner(s)</span>
              <div className="flex flex-col gap-1">
                {owners.map((o: ServiceOwner) => (
                  <Link
                    key={o.user.id}
                    href={`/user/${o.user.username}`}
                    className="text-primary hover:underline"
                  >
                    {o.user.display_name} (@{o.user.username})
                  </Link>
                ))}
              </div>
            </div>

            <Separator />

            <Button variant="destructive" className="w-full py-6 text-md" asChild>
              <Link href={`/report/${service.id}`}>Report Service</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServicePage;

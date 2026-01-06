"use client";

import useSWR from "swr";
import { useParams } from "next/navigation";
import { GetPackageResult } from "@/app/api/v1/packages/[id]/route";
import {
  fetcher,
  formatBytes,
  textFetcher,
  formatDownloads,
  parseAuthorString
} from "@/lib/utils";

import Link from "next/link";
import { format } from "date-fns";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/copy-button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale,
  Weight,
  Package as PackageIcon,
  Download,
  Calendar,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";

type PackageResult = NonNullable<GetPackageResult>;
type PackageVersion = PackageResult["versions"][string];

const PackagePage = () => {
  const params = useParams();
  const fullId = decodeURIComponent(params.id as string);

  const [packageId, versionFromUrl] = fullId.includes("@")
    ? [fullId.substring(0, fullId.lastIndexOf("@")), fullId.substring(fullId.lastIndexOf("@") + 1)]
    : [fullId, undefined];

  const { data, error, isLoading } = useSWR<GetPackageResult>(
    packageId ? `/api/v1/packages/${packageId}` : null,
    fetcher
  );

  const pkgData = data ?? null;
  const targetVersion = versionFromUrl || pkgData?.package?.default_version;
  const currentDisplayVersion = (pkgData && targetVersion)
    ? pkgData.versions[targetVersion]
    : null;

  const { data: readmeData, isLoading: readmeLoading } = useSWR(
    currentDisplayVersion && packageId
      ? `/api/v1/packages/${packageId}/versions/${currentDisplayVersion.version}/readme_url`
      : null,
    textFetcher
  );

  const { data: changelogData, isLoading: changelogLoading } = useSWR(
    currentDisplayVersion && packageId
      ? `/api/v1/packages/${packageId}/versions/${currentDisplayVersion.version}/changelog_url`
      : null,
    textFetcher
  );

  if (isLoading) return <PackageSkeleton />;

  if (error || !pkgData || !pkgData.package) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="mb-4 text-2xl font-bold">Package Not Found</h1>
        <p className="text-muted-foreground">
          The package with ID "{packageId}" could not be found.
        </p>
      </div>
    );
  }

  const { package: pkg, owners, versions, meta } = pkgData;

  return (
    <div className="container mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{pkg.name}</h1>
              {pkg.is_verified && <BadgeCheck className="text-blue-500" />}
            </div>

            <div className="flex flex-wrap gap-2">
              {pkg.categories.map((cat) => (
                <Badge key={cat} variant="outline">{cat}</Badge>
              ))}
            </div>

            <p className="text-lg text-muted-foreground">
              {pkg.description || "No description available"}
            </p>

            {pkg.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pkg.keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="uppercase text-[10px]">
                    {k}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          <Tabs defaultValue="readme" className="w-full">
            <TabsList className="justify-start overflow-x-auto">
              <TabsTrigger value="readme">Readme</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
              <TabsTrigger value="versions">Versions ({meta.total_versions})</TabsTrigger>
              <TabsTrigger value="authors">Authors ({currentDisplayVersion?.authors?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="readme" className="mt-4">
              <MarkdownCard content={readmeData} loading={readmeLoading} fallback="# No README available" />
            </TabsContent>

            <TabsContent value="changelog" className="mt-4">
              <MarkdownCard content={changelogData} loading={changelogLoading} fallback="# No changelog available" />
            </TabsContent>

            <TabsContent value="versions" className="space-y-3 mt-4">
              {Object.values(versions).length > 0 ? (
                Object.values(versions).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((v) => (
                  <VersionCard key={v.version} v={v} packageId={packageId} defaultVersion={pkg.default_version || "0.0.0"} meta={meta} />
                ))
              ) : (
                <EmptyState message="No versions found." />
              )}
            </TabsContent>

            <TabsContent value="authors" className="space-y-3 mt-4">
              {currentDisplayVersion?.authors?.map((authorStr, i) => (
                <AuthorCard key={i} authorStr={authorStr} />
              )) || <EmptyState message="No authors found for this version." />}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="lg:w-[400px] flex flex-col">
          <Card>
            <CardContent className="space-y-4">
              {pkg.is_deprecated && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Deprecated:</strong> {pkg.deprecation_message || "Use an alternative."}
                  </AlertDescription>
                </Alert>
              )}

              {currentDisplayVersion ? (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 rounded-md border bg-background pl-4 p-2">
                    <code className="flex-1 truncate text-xs">
                      mcim install {pkg.id}{versionFromUrl ? `@${versionFromUrl}` : ""}
                    </code>
                    <CopyButton textToCopy={`mcim install ${pkg.id}${versionFromUrl ? `@${versionFromUrl}` : ""}`} />
                  </div>

                  <SidebarStat icon={<PackageIcon size={16}/>} label="Version" value={`v${currentDisplayVersion.version}`} />
                  <SidebarStat icon={<Calendar size={16}/>} label="Updated" value={format(new Date(pkg.updated_at), "MMM d, yyyy")} />
                  <SidebarStat icon={<Scale size={16}/>} label="License" value={currentDisplayVersion.license || "Unknown"} />
                  <SidebarStat icon={<Download size={16}/>} label="Downloads" value={formatDownloads(Number(currentDisplayVersion.downloads))} />
                  <SidebarStat icon={<Weight size={16}/>} label="Size" value={formatBytes(Number(currentDisplayVersion.size))} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Version details unavailable.</p>
              )}

              <Separator />

              <div className="space-y-4">
                <SidebarLinkSection title="Repository" href={pkg.repository_url} />
                <SidebarLinkSection title="Homepage" href={pkg.homepage_url} />

                <div className="space-y-2">
                  <span className="text-sm font-bold">Owners</span>
                  <div className="flex flex-col gap-1">
                    {owners.map(o => (
                      <Link key={o.id} href={`/users/${o.id}`} className="text-sm text-primary hover:underline">
                        {o.display_name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Button variant="destructive" className="w-full" asChild>
                <Link href={`/support?package=${pkg.id}&inquire=violation`}>Report Package</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

const SidebarStat = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const SidebarLinkSection = ({ title, href }: { title: string, href: string | null }) => {
  if (!href) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-bold">{title}</span>
      <Link href={href} className="text-sm text-primary hover:underline truncate" target="_blank" rel="noreferrer">
        {href}
      </Link>
    </div>
  );
};

const MarkdownCard = ({ content, loading, fallback }: { content?: string, loading: boolean, fallback: string }) => (
  <Card>
    <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || fallback}</ReactMarkdown>
      )}
    </CardContent>
  </Card>
);

const VersionCard = ({ v, packageId, defaultVersion }: { v: PackageVersion, packageId: string, defaultVersion: string, meta: PackageResult['meta'] }) => (
  <Card className={v.is_yanked ? "opacity-60" : ""}>
    <CardContent>
      <Link href={`/packages/${packageId}@${v.version}`} className="block space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">v{v.version}</span>
            {v.version === defaultVersion && <Badge>Default</Badge>}
            {v.is_yanked && <Badge variant="destructive">Yanked</Badge>}
          </div>
          <span className="text-sm text-muted-foreground">{format(new Date(v.created_at), "MMM d, yyyy")}</span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Scale size={12}/> {v.license || "N/A"}</span>
          <span className="flex items-center gap-1"><Weight size={12}/> {formatBytes(Number(v.size))}</span>
          <span className="flex items-center gap-1"><Download size={12}/> {formatDownloads(Number(v.downloads))}</span>
        </div>
      </Link>
    </CardContent>
  </Card>
);

const AuthorCard = ({ authorStr }: { authorStr: string }) => {
  const author = parseAuthorString(authorStr);
  return (
    <Card>
      <CardContent>
        <div className="font-semibold">{author.name}</div>
        <div className="text-sm text-muted-foreground flex gap-3">
          {author.email && <span>{author.email}</span>}
          {author.url && <a href={author.url} className="text-primary hover:underline">{author.url}</a>}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <Card><CardContent className="p-12 text-center text-muted-foreground">{message}</CardContent></Card>
);

const PackageSkeleton = () => (
  <div className="container mx-auto px-4 py-8 space-y-8">
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <Skeleton className="lg:w-[400px] h-[500px]" />
    </div>
  </div>
);

export default PackagePage;

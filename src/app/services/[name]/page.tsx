"use client"

import { useState } from "react"
import rehypeHighlight from "rehype-highlight"

import Link from "next/link"
import ReactMarkdown from "react-markdown"
import {
  Copy,
  Scale,
  Check,
  Globe,
  Weight,
  Github,
  Package,
  Download,
  Calendar,
  BadgeCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ServiceBadge } from "@/components/serviceBadge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PackageCategory = "interceptor" | "service" | "sandbox"

interface VersionData {
  date: string
  size: number
  version: string
  license: string
  downloads: number
  publishedBy: string
  changelog?: string
}

interface ServiceData {
  name: string
  displayName: string
  description: string
  keywords: string[]
  version: string
  author: {
    displayName: string
    username: string
  }
  owners: Array<{
    displayName?: string
    username: string
    profileURL?: string
  }>
  category: PackageCategory
  verified: boolean
  icon?: string
  downloads: number
  size: number
  repositoryURL: string
  homepageURL: string
  updated: string
  license: string
  readme: string
  versions: VersionData[]
}

export default function ServicePage() {
  const [copied, setCopied] = useState(false)

  const service: ServiceData = {
    name: "gg",
    displayName: "GG",
    description: "A powerful service for doing amazing things",
    keywords: ["ai", "ml", "gg", "productivity", "sdk"],
    version: "1.2.3",
    author: {
      displayName: "Leftium",
      username: "leftium",
    },
    owners: [
      { displayName: "Leftium", username: "leftium", profileURL: "https://github.com/leftium" },
      { displayName: "CoOwner", username: "coowner", profileURL: "https://github.com/coowner" },
    ],
    category: "service",
    repositoryURL: "https://github.com/leftium/gg",
    homepageURL: "https://gg.leftium.dev",
    verified: true,
    downloads: 125000,
    size: 42000,
    updated: "2024-11-28",
    license: "MIT",
    readme: `
# GG
A powerful service for doing amazing things.

## Installation
\`\`\`bash
mci install @leftium/gg
\`\`\`

## Usage
\`\`\`javascript
import { gg } from '@leftium/gg'
gg.doSomething()
\`\`\`
    `,
    versions: [
      {
        version: "1.2.3",
        date: "2024-11-28",
        size: 42000,
        downloads: 50000,
        license: "MIT",
        publishedBy: "leftium",
        changelog: "Bug fixes and performance improvements",
      },
      {
        version: "1.2.2",
        date: "2024-10-10",
        size: 41000,
        downloads: 30000,
        license: "MIT",
        publishedBy: "leftium",
        changelog: "Added new API surface for X",
      },
      {
        version: "1.2.1",
        date: "2024-09-02",
        size: 40000,
        downloads: 20000,
        license: "MIT",
        publishedBy: "coowner",
        changelog: "Performance improvements",
      },
    ],
  }

  const formatDownloads = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n)

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const formatBytes = (bytes: number) => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`
    return `${bytes} B`
  }

  const handleCopy = () => {
    const installCmd = `mci install @${service.author.username}/${service.name}`
    try {
      navigator.clipboard.writeText(installCmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error("copy failed", e)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardContent className="flex gap-4">
              <div className="w-24 h-24 rounded-3xl bg-background flex items-center justify-center overflow-hidden">
                {service.icon
                  ? <img src={service.icon} alt={service.displayName} className="w-full h-full object-cover" />
                  : <Package className="w-12 h-12 text-muted-foreground" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{service.displayName}</h1>
                  {service.verified && <BadgeCheck className="text-blue-500" />}
                  <ServiceBadge category={service.category} />
                </div>
                <p className="text-muted-foreground mt-1">{service.description}</p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {service.keywords.map((k) => (
                    <Badge variant="secondary" key={k} className="uppercase tracking-wide">{k}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="readme" className="flex-1">
            <TabsList>
              <TabsTrigger value="readme">Readme</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
            </TabsList>

            <TabsContent value="readme">
              <Card>
                <CardContent className="prose prose-md dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {service.readme}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="space-y-4">
              {service.versions.map((v) => (
              <Card className="hover:bg-accent">
                <CardContent>
                    <Link
                      key={v.version}
                      href={`/services/${service.name}/${v.version}`}
                      className="space-y-2 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                          <span className="font-semibold text-lg">v{v.version}</span>
                          {v.version === service.version && <Badge>Latest</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(v.date)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm items-center mt-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Scale className="w-4 h-4" />
                          <span className="text-foreground">{v.license}</span>
                        </div>

                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Weight className="w-4 h-4" />
                          <span className="text-foreground">{formatBytes(v.size)}</span>
                        </div>

                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Download className="w-4 h-4" />
                          <span className="text-foreground">{formatDownloads(v.downloads)}</span>
                        </div>
                      </div>
                    </Link>

                </CardContent>
              </Card>
                  ))}
            </TabsContent>
          </Tabs>
        </div>
        <Card className="lg:w-96 h-max">
          <CardContent className="space-y-4">
            <div className="p-1 flex items-center justify-between bg-background rounded-lg">
              <code className="px-2 text-sm truncate">
                mci install @{service.author.username}/{service.name}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex justify-between">
              <span className="flex gap-2 items-center">
                <Package className="w-4 h-4" />
                <span>Version</span>
              </span>
              <span>v{service.version}</span>
            </div>

            <div className="flex justify-between">
              <span className="flex gap-2 items-center">
                <Calendar className="w-4 h-4" />
                <span>Updated</span>
              </span>
              <span>{formatDate(service.updated)}</span>
            </div>

            <div className="flex justify-between">
              <span className="flex gap-2 items-center">
                <Scale className="w-4 h-4" />
                <span>License</span>
              </span>
              <span>{service.license}</span>
            </div>

            <div className="flex justify-between">
              <span className="flex gap-2 items-center">
                <Download className="w-4 h-4" />
                <span>Downloads</span>
              </span>
              <span>{formatDownloads(service.downloads)}</span>
            </div>

            <div className="flex justify-between">
              <span className="flex gap-2 items-center">
                <Weight className="w-4 h-4" />
                <span>Size</span>
              </span>
              <span>{formatBytes(service.size)}</span>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <span className="text-lg font-bold">Repository</span>
              <span className="flex gap-2 items-center text-lg break-all">
                <Github/>
                <Link href={service.repositoryURL} className="text-primary truncate hover:underline" target="_blank" rel="noreferrer">
                  {service.repositoryURL}
                </Link>
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-lg font-bold">Homepage</span>
              <span className="flex gap-2 items-center text-lg break-all">
                <Globe/>
                <Link href={service.homepageURL} className="text-primary truncate hover:underline" target="_blank" rel="noreferrer">
                  {service.homepageURL}
                </Link>
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-lg font-bold">Owner(s)</span>
              <div className="flex flex-col gap-1">
                {service.owners.map((o) => (
                  <Link key={o.username} href={o.profileURL ?? `/user/${o.username}`} className="text-primary hover:underline">
                    {o.displayName ? `${o.displayName} (@${o.username})` : `@${o.username}`}
                  </Link>
                ))}
              </div>
            </div>

            <Separator />

            <Button variant="destructive" className="w-full py-6 text-md">
              <Link href={service.repositoryURL}>Report Service</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { formatDistanceToNowStrict } from "date-fns"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import PackageBadge from "@/components/package-badge"
import { Download, Calendar, Server, BadgeCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface PackageCardProps {
  id: string
  name: string
  updated_at: Date
  downloads: number
  categories: string[]
  is_verified: boolean
  is_deprecated: boolean
  description: string | null
  default_version: string | null
}

const PackageCard = ({
  id,
  name,
  downloads,
  categories,
  updated_at,
  is_verified,
  description,
  is_deprecated,
  default_version,
}: PackageCardProps) => {
  const formatDownloads = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    return count.toString()
  }

  return (
    <Link href={`/packages/${id}`} className="block group">
      <Card className="w-full h-full flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:border-primary">
        <CardHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden">
              <div className="h-full w-auto aspect-square rounded bg-background flex items-center justify-center">
                <Server className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                  {name}
                </CardTitle>
                {is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
              </div>
              <div className="flex gap-2">
                {categories.map((category) => (
                  <PackageBadge key={category} type={category} />
                ))}
                {is_deprecated && <Badge variant="destructive">Deprecated</Badge>}
              </div>
            </div>
          </div>
          <CardDescription className="line-clamp-2">{description? description : "No description yet :("}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">v{default_version? default_version : "0.0.0"}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="w-3.5 h-3.5" />
              <span>{formatDownloads(downloads)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDistanceToNowStrict(updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default PackageCard

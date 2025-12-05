import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Download, Calendar, Scale, Package, Server, Box, Container, CheckCircle } from "lucide-react"

type PackageCategory = "interceptor" | "service" | "sandbox"

interface PackageCardProps {
  name: string
  displayName: string
  description: string
  version: string
  author: {
    displayName: string
    username: string
  }
  category: PackageCategory
  verified: boolean
  icon?: string
  downloads: number
  updated: string
  licenses: string[]
}

export function PackageCard({
  name,
  displayName,
  description,
  version,
  author,
  category,
  verified,
  icon,
  downloads,
  updated,
  licenses
}: PackageCardProps) {
  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "today"
    if (diffDays === 1) return "yesterday"
    if (diffDays < 30) return `${diffDays}d ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const getCategoryIcon = (cat: PackageCategory) => {
    switch (cat) {
      case "interceptor":
        return <Box className="w-3 h-3" />
      case "service":
        return <Server className="w-3 h-3" />
      case "sandbox":
        return <Container className="w-3 h-3" />
    }
  }

  return (
    <Link href={`/services/${name}`} className="block group">
      <Card className="w-full h-full flex flex-col justify-between border-2 transition-all duration-200 hover:shadow-lg hover:border-primary">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            {icon ? (
              <img src={icon} alt={displayName} className="w-12 h-12 rounded" />
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                  {displayName}
                </CardTitle>
                {verified && <CheckCircle className="w-3 h-3 text-destructive" />}
                <Badge variant="outline" className="gap-1">
                  {getCategoryIcon(category)}
                  {category}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">{author.displayName}</p>
              </div>
            </div>
          </div>
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">v{version}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="w-3.5 h-3.5" />
              <span>{formatDownloads(downloads)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(updated)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" />
              {licenses.map((license, idx) => (
                <span key={idx}>{license}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

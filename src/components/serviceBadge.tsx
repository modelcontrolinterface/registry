import { Badge } from "@/components/ui/badge"
import { Server, Box, Container } from "lucide-react"

interface ServiceBadgeProps { category: string; }

export function ServiceBadge({ category }: ServiceBadgeProps) {
  return (
    <Badge>
    {
      category == "interceptor" ? <Box className="w-4 h-4" />
      : category == "interceptor" ? <Server className="w-4 h-4" />
      : <Container className="w-4 h-4" />
    }
    {category}
    </Badge>
  )
}

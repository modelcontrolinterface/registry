import { Badge } from "@/components/ui/badge"
import { Server, Box, Container } from "lucide-react"

interface ServiceBadgeProps { type: string; }

const ServiceBadge = ({ type }: ServiceBadgeProps) => {
  return (
    <Badge className="flex items-center gap-1">
      {
        type === "interceptor" ? <Box className="w-4 h-4" />
        : type === "server" ? <Server className="w-4 h-4" />
        : type === "sandbox" ? <Container className="w-4 h-4" />
        : <Box className="w-4 h-4" />
      }
      {type}
    </Badge>
  )
}
export default ServiceBadge

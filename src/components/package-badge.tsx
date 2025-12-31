import { Badge } from "@/components/ui/badge"

interface PackageBadgeProps { category: string; }

const PackageBadge = ({ category }: PackageBadgeProps) => {
  return <Badge>{category}</Badge>
}

export default PackageBadge

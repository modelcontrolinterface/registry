import { Suspense } from "react"
import SearchPageGuts from "./search-page-guts"

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageGuts />
    </Suspense>
  )
}
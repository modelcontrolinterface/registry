"use client"

import { Suspense } from "react"
import { useSWRConfig } from "swr"
import { useUser } from "@/hooks/use-user"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import Link from "next/link"
import Logo from "@/components/logo"
import SearchInput from "@/components/search"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

const Navbar = () => {
  const pathname = usePathname()
  const supabase = createClient()
  const { mutate } = useSWRConfig()
  const { user, isLoading } = useUser()

  const handleSignInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    mutate(null, undefined, false)
  }

  return (
    <nav className="relative z-50 w-full px-4 border-b border-border bg-background">
      <div className="container h-16 mx-auto flex items-center justify-between">
        <Link href="/">
          <Logo className="h-8 w-auto" />
        </Link>

        {pathname !== "/" && (
          <div className="hidden md:flex flex-1 mx-2 md:mx-4 md:max-w-md">
            <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted rounded-md" />}>
              <SearchInput />
            </Suspense>
          </div>
        )}

        <div className="flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : !user ? (
            <Button onClick={handleSignInWithGithub} variant="outline">
              Signin with Github
            </Button>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                    <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href={`/users/${user.id}`}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {pathname !== "/" && (
        <div className="block md:hidden w-full py-2">
          <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted rounded-md" />}>
            <SearchInput />
          </Suspense>
        </div>
      )}
    </nav>
  )
}

export default Navbar

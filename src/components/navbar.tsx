"use client"

import { User } from "@supabase/supabase-js"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Suspense, useEffect, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { fetcher } from "@/lib/fetcher"

import Link from "next/link"
import Logo from "@/components/logo"
import { Github } from "lucide-react"
import SearchInput from "@/components/search"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

interface UserProfile {
  id: string
  avatar_url?: string
  display_name: string
}

const Navbar = () => {
  const pathname = usePathname()
  const supabase = createClient()
  const { mutate } = useSWRConfig()

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      setLoadingUser(true)
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)
      } catch (error) {
        console.error("Error loading user:", error)
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [supabase.auth])

  const { data: userProfileData, isLoading: isLoadingProfile } = useSWR(user ? `/api/v1/users/${user.id}` : null, fetcher)
  const userProfile: UserProfile | undefined = userProfileData?.user

  const loading = loadingUser || (!!user && isLoadingProfile)

  const handleSignInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  const handleSignOut = async () => {
    const key = user ? `/api/v1/users/${user.id}` : null
    await supabase.auth.signOut()
    setUser(null)
    if (key) {
      mutate(key, undefined, false)
    }
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
          {loading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : !user || !userProfile ? (
            <Button onClick={handleSignInWithGithub} variant="outline">
              <Github />
              Signin with github
            </Button>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={userProfile.avatar_url || ""} />
                    <AvatarFallback>{userProfile.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href={`/users/${userProfile.id}`}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild disabled>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild disabled>
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

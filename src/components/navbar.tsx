"use client"

import { User } from "@supabase/supabase-js"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Suspense, useEffect, useState } from "react"

import Link from "next/link"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import SearchInput from "@/components/search"
import { Skeleton } from "@/components/ui/skeleton"

interface UserProfile {
  id: string
  avatar_url?: string
  display_name: string
}

const Navbar = () => {
  const pathname = usePathname()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true)
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          setUser(null)
          setUserProfile(null)
          return
        }

        setUser(user)

        const response = await fetch(`/api/v1/users/${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserProfile(data.user)
        }
      } catch (error) {
        console.error("Error loading user:", error)
        setUser(null)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

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
    setUser(null)
    setUserProfile(null)
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
              Sign in with GitHub
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

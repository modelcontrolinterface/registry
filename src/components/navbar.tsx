"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"

import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { SearchInput } from "@/components/search"

export function Navbar() {
  const pathname = usePathname()
  const [isSignedIn, setIsSignedIn] = useState(true)

  const user = {
    name: "0x15BA88FF",
    avatar: "https://avatars.githubusercontent.com/u/86390213?v=4",
  }

  const handleSignIn = () => setIsSignedIn(true)
  const handleSignOut = () => setIsSignedIn(false)

  return (
    <nav className="relative z-50 w-full px-4 border-b border-border bg-background">
      <div className="container h-16 mx-auto flex items-center justify-between">
        <Link href="/">
          <img src="/logo.svg" alt="Logo" className="h-8 w-auto" />
        </Link>

        {pathname !== "/" && (
          <div className="flex-1 max-w-md mx-4">
            <SearchInput />
          </div>
        )}

        <div>
          {!isSignedIn ? (
            <Button onClick={handleSignIn} variant="outline">
              Sign in with GitHub
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}

"use client"

import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="py-10 px-10 bg-background border-t border-border">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 max-w-6xl mx-auto">
        <div className="space-y-2">
          <Link
            href="/"
            className="space-y-2 text-muted-foreground hover:text-foreground"
          >
            <img src="/logo.svg" alt="MCI Logo" className="h-10 w-auto" />
            <span>Model Control Interface Registry</span>
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Model Control Interface</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/usage-policy" className="hover:text-foreground">Docs</Link></li>
            <li><Link href="/usage-policy" className="hover:text-foreground">Registry</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Policies</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/usage-policy" className="hover:text-foreground">Usage Policy</Link></li>
            <li><Link href="/security" className="hover:text-foreground">Security</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link href="/code-of-conduct" className="hover:text-foreground">Code of Conduct</Link></li>
            <li><Link href="/data-access" className="hover:text-foreground">Data Access</Link></li>
          </ul>
        </div>

        <div className="flex sm:justify-end items-start">
          <Button variant="outline" size="icon" asChild>
            <Link href="https://github.com/modelcontrolinterface" target="_blank">
              <Github />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 text-center text-xs text-muted-foreground">
        Made with ❤️ by the MCI team
      </div>
    </footer>
  )
}

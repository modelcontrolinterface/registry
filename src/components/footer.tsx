"use client"

import Link from "next/link"
import Logo from "@/components/logo"

const Footer = () => {
  return (
    <footer className="py-10 px-10 bg-background border-t border-border">
      <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 gap-10 max-w-6xl mx-auto">
        <div className="space-y-2">
          <Link
            href="/"
            className="space-y-2"
          >
            <Logo className="h-10 w-auto"/>
            <span className="text-sm text-muted-foreground hover:text-foreground">MCI Registry</span>
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">MCI</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Docs</Link></li>
            <li><Link href="/" className="hover:text-foreground">Registry</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Get Help</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/support" className="hover:text-foreground">Support</Link></li>
            <li><Link href="https://modelcontrolinterfaceregistry.statuspage.io/" className="hover:text-foreground">Status Page</Link></li>
            <li><Link href="https://github.com/modelcontrolinterface/registry/issues/new" className="hover:text-foreground">Report a Bug</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Policies</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/policies/usage-policy" className="hover:text-foreground">Usage Policy</Link></li>
            <li><Link href="/policies/security" className="hover:text-foreground">Security</Link></li>
            <li><Link href="/policies/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link href="/policies/code-of-conduct" className="hover:text-foreground">Code of Conduct</Link></li>
            <li><Link href="/policies/data-access" className="hover:text-foreground">Data Access</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Social</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>
            <Link href="https://github.com/modelcontrolinterface" target="_blank">Github</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default Footer

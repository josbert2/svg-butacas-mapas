"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

const SidebarContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}>({
  open: true,
  setOpen: () => undefined,
})

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr]">{children}</div>
    </SidebarContext.Provider>
  )
}

export function Sidebar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = React.useContext(SidebarContext)

  return (
    <aside
      data-state={open ? "open" : "closed"}
      className={cn(
        "border-r bg-background transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-12",
        className,
      )}
      {...props}
    >
      <div className={cn("flex h-full flex-col gap-2", open ? "items-stretch" : "items-center")}>{children}</div>
    </aside>
  )
}

export function SidebarHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <header className={cn("flex items-center px-4 py-2", className)} {...props}>
      {children}
    </header>
  )
}

export function SidebarContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <nav className={cn("flex-1 overflow-auto", className)} {...props}>
      {children}
    </nav>
  )
}

export function SidebarFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <footer className={cn("px-4 py-2", className)} {...props}>
      {children}
    </footer>
  )
}

export function SidebarMenu({ className, children, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("grid gap-1", className)} {...props}>
      {children}
    </ul>
  )
}

export function SidebarMenuItem({ className, children, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("px-2", className)} {...props}>
      {children}
    </li>
  )
}

export function SidebarMenuButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open } = React.useContext(SidebarContext)

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        open ? "" : "justify-center",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-2 my-2 h-px bg-sidebar-border", className)} {...props} />
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(SidebarContext)

  return (
    <button
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <path d="M9 3v18" />
      </svg>
      <span className="sr-only">Toggle sidebar</span>
    </button>
  )
}

export function SidebarInset({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-1 flex-col", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarRail({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = React.useContext(SidebarContext)

  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent transition-colors hover:bg-accent",
        className,
      )}
      onDoubleClick={() => setOpen(!open)}
      {...props}
    />
  )
}


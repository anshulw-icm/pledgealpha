'use client'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-[pa-slide-up_0.3s_ease-out]">
      {children}
    </div>
  )
}

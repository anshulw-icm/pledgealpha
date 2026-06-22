'use client'
import { useState, useEffect, useRef } from 'react'

export function ProblemCounter() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="mb-6">
      <p
        className="text-[clamp(80px,14vw,140px)] font-semibold text-pa-loss leading-none tracking-[-0.04em] num"
        style={{ transition: visible ? 'opacity 0.6s ease-out' : 'none', opacity: visible ? 1 : 0 }}
      >
        ₹0
      </p>
    </div>
  )
}

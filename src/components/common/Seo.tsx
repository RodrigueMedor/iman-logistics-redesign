import { useEffect } from 'react'

export function Seo({ title, canonical }: { title: string; canonical: string }) {
  useEffect(() => {
    document.title = title
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = `https://imanlogistics.com${canonical}`
  }, [canonical, title])
  return null
}

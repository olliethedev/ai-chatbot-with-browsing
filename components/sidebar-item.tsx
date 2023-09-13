'use client'

import { usePathname, useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'


interface SidebarChatItemProps {
  id?: string
  path?: string
  sharePath?: string
  onClick?: () => void
  title: string
  children: React.ReactNode
}

export function SidebarChatItem({ id, path, title, onClick, children }: SidebarChatItemProps) {

  const router = useRouter()

  const pathname = usePathname()
  const isActive = pathname === path


  if (!id) return null

  return (
    <div className="relative">
      
      <Button
        // href={path}
        onClick={() => {
          if (path) {
            router.push(path)
          }else{
            onClick && onClick()
          }
        }}
        variant={isActive ? 'ghost' : 'ghost'}
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'group w-full pl-8 pr-16',
          isActive && 'bg-accent'
        )}
      >
        <div
          className="relative max-h-5 flex-1 select-none overflow-hidden text-ellipsis break-all"
          title={title}
        >
          <span className="whitespace-nowrap">{title}</span>
        </div>
      </Button>
      {isActive && <div className="absolute right-2 top-1">{children}</div>}
    </div>
  )
}

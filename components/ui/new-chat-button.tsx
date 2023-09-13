"use client"

import React from 'react'

import { useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'

export const NewChatButton = () => {

  const router = useRouter()
  return (
    <>
    <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={e => {
              e.preventDefault()
              router.refresh()
              router.push('/')
            }}
            className={cn(
              buttonVariants({ size: 'sm', variant:'outline'}),
              'h-8 bg-background pl-8 pr-16 w-full'
            )}
          >
            <IconPlus />
            <div className='ml-4'>Start New Chat</div>
            <span className="sr-only">New Chat</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>New Chat</TooltipContent>
      </Tooltip></>
  )
}

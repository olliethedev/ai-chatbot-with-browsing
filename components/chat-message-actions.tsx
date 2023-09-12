'use client'

import { type Message } from 'ai'

import { Button } from '@/components/ui/button'
import { nanoid } from '@/lib/utils'
import { IconCheck, IconCopy, IconSave } from '@/components/ui/icons'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'
import { savePrompt } from '@/app/actions'

interface ChatMessageActionsProps extends React.ComponentProps<'div'> {
  message: Message
}

export function ChatMessageActions({
  message,
  className,
  ...props
}: ChatMessageActionsProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(message.content)
  }

  const onSavePrompt = () => {
    console.log('save prompt')
    const call = async () => {
      await savePrompt(nanoid(), [message.content])
    }
    call()
  }

  return (
    <div
      className={cn(
        'flex items-center justify-end transition-opacity group-hover:opacity-100 md:absolute md:-right-10 md:-top-2 md:opacity-0',
        className
      )}
      {...props}
    >
      <Button variant="ghost" size="icon" onClick={onCopy}>
        {isCopied ? <IconCheck /> : <IconCopy />}
        <span className="sr-only">Copy message</span>
      </Button>
      <Button
              variant="ghost" size="icon"
              // disabled={isRemovePending}
              onClick={onSavePrompt}
            >
              <IconSave />
              <span className="sr-only">Save</span>
            </Button>
    </div>
  )
}

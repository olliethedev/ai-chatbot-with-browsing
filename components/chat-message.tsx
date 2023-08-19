// Inspired by Chatbot-UI and modified to fit the needs of this project
// @see https://github.com/mckaywrigley/chatbot-ui/blob/main/components/Chat/ChatMessage.tsx

import { Message } from 'ai'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import {
  IconChevronUpDown
} from '@/components/ui/icons'

import { cn } from '@/lib/utils'
import * as Accordion from '@radix-ui/react-accordion'
import { CodeBlock } from '@/components/ui/codeblock'
import { MemoizedReactMarkdown } from '@/components/markdown'
import { IconOpenAI, IconUser } from '@/components/ui/icons'
import { ChatMessageActions } from '@/components/chat-message-actions'

export interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message, ...props }: ChatMessageProps) {
  return (
    <div
      className={cn('group relative mb-4 flex items-start md:-ml-12')}
      {...props}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow',
          message.role === 'user'
            ? 'bg-background'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {message.role === 'user' ? <IconUser /> : <IconOpenAI />}
      </div>
      <div className="flex-1 px-1 ml-4 space-y-2 overflow-hidden">
        <MemoizedReactMarkdown
          className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
          remarkPlugins={[remarkGfm, remarkMath]}
          components={{
            p({ children }) {
              return <p className="mb-2 last:mb-0">{children}</p>
            },
            code({ node, inline, className, children, ...props }) {
              if (children.length) {
                if (children[0] == '▍') {
                  return (
                    <span className="mt-1 cursor-default animate-pulse">▍</span>
                  )
                }

                children[0] = (children[0] as string).replace('`▍`', '▍')
              }
              // if language is language-ai-tool-start or language-ai-tool-end, use @radix-ui/react-accordion, else use codeblock

              const matchAIStart = /language-ai-tool-start/.exec(
                className || ''
              )
              

              if (matchAIStart) {
                const toolStartData = JSON.parse(children[0] as string) as {
                tool: string
                toolInput: {
                  input: string
                }
                log: string
                messageLog?: any[]
              }
              delete toolStartData.messageLog
                return (
                  <Accordion.Root type="single" collapsible>
                    <Accordion.Item value="item-1">
                      <Accordion.Trigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75">
                        <span>AI Tool Started</span>
                        <IconChevronUpDown className="opacity-50" />
                      </Accordion.Trigger>
                      <Accordion.Content className="px-4 py-2 text-sm text-gray-500">
                        <div className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
                          {JSON.stringify(toolStartData, null, 2)}
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  </Accordion.Root>
                )
              }

              const matchAIEnd = /language-ai-tool-end/.exec(className || '')

              if (matchAIEnd) {

              const toolEndData = JSON.parse(children[0] as string) as any[]
                return (
                  <Accordion.Root type="single" collapsible>
                    <Accordion.Item value="item-1">
                      <Accordion.Trigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75">
                        <span>AI Tool Result</span>
                        <IconChevronUpDown className="opacity-50" />
                      </Accordion.Trigger>
                      <Accordion.Content className="px-4 py-2 text-sm text-gray-500">
                        <div className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
                          {JSON.stringify(toolEndData, null, 2)}
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  </Accordion.Root>
                )
              }

              const match = /language-(\w+)/.exec(className || '')

              if (inline) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }

              return (
                <CodeBlock
                  key={Math.random()}
                  language={(match && match[1]) || ''}
                  value={String(children).replace(/\n$/, '')}
                  {...props}
                />
              )
            }
          }}
        >
          {message.content}
        </MemoizedReactMarkdown>
        <ChatMessageActions message={message} />
      </div>
    </div>
  )
}

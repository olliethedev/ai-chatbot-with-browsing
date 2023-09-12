"use client"
import { getPrompts, removePrompt, shareChat } from '@/app/actions'
import { SidebarActions } from '@/components/sidebar-actions'
import { SidebarChatItem } from '@/components/sidebar-item'
import { Prompt } from '@/lib/types'
import { useContext } from 'react'
import { InputContext, InputContextType } from './context/input'
// import { InputContext, InputContextType } from './context/input';
// import { useContext } from 'react';

export interface PromptsListProps {
  userId?: string
  prompts?: Prompt[]
}

export function PromptsList({ userId, prompts }: PromptsListProps) {
  const { setInput : setInputState, } = useContext(
    InputContext
  ) as InputContextType;
  

  return (
    <div className="flex-1 overflow-auto">
      {prompts?.length ? (
        <div className="space-y-2 px-2">
          {prompts.map(
            prompt =>
              prompt && (
                <SidebarChatItem key={prompt?.id}
                  id={prompt?.id}
                  title={prompt.text.join(' ')}
                  onClick={()=>{
                    setInputState(prompt.text.join(' '))
                  }}
                >
                  <SidebarActions
                    id = {prompt.id}
                    path = {prompt.path}
                    removeItem={removePrompt}
                  />
                </SidebarChatItem>
              )
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No saved prompts</p>
        </div>
      )}
    </div>
  )
}

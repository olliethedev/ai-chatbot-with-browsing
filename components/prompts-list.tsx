import { getChats, getPrompts, removeChat, shareChat } from '@/app/actions'
import { SidebarActions } from '@/components/sidebar-actions'
import { SidebarChatItem } from '@/components/sidebar-item'

export interface PromptsListProps {
  userId?: string
}

export async function PromptsList({ userId }: PromptsListProps) {
  const prompts = await getPrompts(userId)

  return (
    <div className="flex-1 overflow-auto">
      {prompts?.length ? (
        <div className="space-y-2 px-2">
          {prompts.map(
            prompt =>
              prompt && (
                <div key={prompt?.id}/>
                // <SidebarChatItem key={prompt?.id} chat={prompt}>
                //   {/* <SidebarActions
                //     chat={prompt}
                //     removeChat={removeChat}
                //     shareChat={shareChat}
                //   /> */}
                // </SidebarChatItem>
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

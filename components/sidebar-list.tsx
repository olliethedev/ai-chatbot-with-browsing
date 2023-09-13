import { getChats, removeChat, shareChat } from '@/app/actions'
import { SidebarActions } from '@/components/sidebar-actions'
import { SidebarChatItem } from '@/components/sidebar-item'
import { NewChatButton } from './ui/new-chat-button'

export interface SidebarListProps {
  userId?: string
}

export async function SidebarList({ userId }: SidebarListProps) {
  const chats = await getChats(userId)

  return (
    <div className="flex-1 overflow-auto">
      <NewChatButton/>
      {chats?.length ? (
        <div className="space-y-2 px-2">
          {chats.map(
            chat =>
              chat && (
                <SidebarChatItem key={chat?.id}
                  id={chat?.id}
                  path={chat.path}
                  title={chat.title}
                  sharePath={chat.sharePath}
                >
                  <SidebarActions
                    id = {chat.id}
                    path = {chat.path}
                    removeItem={removeChat}
                  />
                </SidebarChatItem>
              )
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No chat history</p>
        </div>
      )}
    </div>
  )
}

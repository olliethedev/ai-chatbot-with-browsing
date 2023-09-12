
import { getPrompts} from '@/app/actions'
import { PromptsList } from './prompts-list'

export interface PromptsListProps {
  userId?: string
}

export async function PromptsListWrapper({ userId }: PromptsListProps) {
  

 const prompts = await getPrompts(userId);
  

  return (
    <PromptsList prompts={prompts}  userId={userId}/>
  )
}

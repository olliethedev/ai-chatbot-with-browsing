'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { kv } from '@vercel/kv'

import { auth } from '@/auth'
import { Prompt, type Chat } from '@/lib/types'

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const pipeline = kv.pipeline()
    const chats: string[] = await kv.zrange(`user:chat:${userId}`, 0, -1, {
      rev: true
    })

    for (const chat of chats) {
      pipeline.hgetall(chat)
    }

    const results = await pipeline.exec()

    return results as Chat[]
  } catch (error) {
    return []
  }
}

export async function getPrompts(userId?: string | null){
  if (!userId) {
    return []
  }

  try {
    const pipeline = kv.pipeline()
    const prompts: string[] = await kv.zrange(`user:prompt:${userId}`, 0, -1, {
      rev: true
    })

    for (const prompt of prompts) {
      pipeline.hgetall(prompt)
    }

    const results = await pipeline.exec()

    return results as Prompt[]
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || (userId && chat.userId !== userId)) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  const uid = await kv.hget<string>(`chat:${id}`, 'userId')

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await kv.del(`chat:${id}`)
  await kv.zrem(`user:chat:${session.user.id}`, `chat:${id}`)

  revalidatePath('/')
  return revalidatePath(path)
}

export async function removePrompt({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  const uid = await kv.hget<string>(`prompt:${id}`, 'userId')

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await kv.del(`prompt:${id}`)
  await kv.zrem(`user:prompt:${session.user.id}`, `prompt:${id}`)
  return revalidatePath(path)
}

export const saveChats = async (title: string, id: string, userId: string, messages: any[], completion: string) => {

  const createdAt = Date.now()
  const path = `/chat/${ id }`
  const payload = {
    id,
    title,
    userId,
    createdAt,
    path,
    messages: [
      ...messages,
      {
        content: completion,
        role: 'assistant'
      }
    ]
  }
  await kv.hmset(`chat:${ id }`, payload)
  await kv.zadd(`user:chat:${ userId }`, {
    score: createdAt,
    member: `chat:${ id }`
  })
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats: string[] = await kv.zrange(`user:chat:${session.user.id}`, 0, -1)
  if (!chats.length) {
  return redirect('/')
  }
  const pipeline = kv.pipeline()

  for (const chat of chats) {
    pipeline.del(chat)
    pipeline.zrem(`user:chat:${session.user.id}`, chat)
  }

  await pipeline.exec()

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(chat: Chat) {
  const session = await auth()

  if (!session?.user?.id || session.user.id !== chat.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  await kv.hmset(`chat:${chat.id}`, payload)

  return payload
}

export async function savePrompt(id: string, text: string[]){

  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const userId = session.user.id
  const createdAt = Date.now()
  const payload = {
    id,
    text,
    userId,
    createdAt
  }
  await kv.hmset(`prompt:${ id }`, payload)
  await kv.zadd(`user:prompt:${ userId }`, {
    score: createdAt,
    member: `prompt:${ id }`
  })
  console.log("saved prompt")
}

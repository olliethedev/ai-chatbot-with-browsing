
import { NextRequest } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse, LangChainStream } from "ai";
import { auth } from '@/auth'
import { getAgentExecutorStream } from "@/lib/ai/executor";

// export const runtime = 'edge';

export async function POST(req: NextRequest) {

  const userId = (await auth())?.user.id;

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const body = await req.json()

  const messages = (body.messages ?? []).filter(
    (message: VercelChatMessage) =>
      message.role === "user" || message.role === "assistant",
  );

  const stream = await getAgentExecutorStream({ id: body.id, userId, messages });

  console.log("returning stream")
  return new StreamingTextResponse(stream);
}



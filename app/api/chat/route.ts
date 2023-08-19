import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse, LangChainStream } from "ai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Calculator } from "langchain/tools/calculator";
import { GoogleCustomSearch } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { AIMessage, ChainValues, ChatMessage, HumanMessage } from "langchain/schema";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { Configuration, OpenAIApi } from 'openai-edge'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { BaseCallbackHandler } from "langchain/callbacks";
import { Serialized } from "langchain/load/serializable";
import { AgentAction } from "langchain/schema";

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
  if (message.role === "user") {
    return new HumanMessage(message.content);
  } else if (message.role === "assistant") {
    return new AIMessage(message.content);
  } else {
    return new ChatMessage(message.content, message.role);
  }
};

export const runtime = 'edge';


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
  const previousMessages = messages
    .slice(0, -1)
    .map(convertVercelMessageToLangChainMessage);
  const currentMessageContent = messages[messages.length - 1].content;

  const tools = getTools();
  const chat = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.4,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  const executor = await initializeAgentExecutorWithOptions(tools, chat, {
    agentType: "openai-functions",
    verbose: true,
    returnIntermediateSteps: true,
    memory: new BufferMemory({
      memoryKey: "chat_history",
      chatHistory: new ChatMessageHistory(previousMessages),
      returnMessages: true,
      outputKey: "output",
    }),
    agentArgs: {
      prefix: 'You are a software developer called Ollie the dev. If you dont know something, you can search internet and read webpages.'
    },
  });

  const { stream, handlers } = LangChainStream();
  let tempTokens = "";

  //Result will is a ReadableStream<Uint8Array> stream
  executor.call({
    input: currentMessageContent,
  },
    {
      callbacks: [
        getCustomAgentHandler(stream,
          async (text: string) => {
            tempTokens += text;
            return handlers.handleLLMNewToken(text);
          },
          async (text: string) => {
            tempTokens += text;
            return handlers.handleLLMNewToken(text);
          },
          async (result: ChainValues) => {
            console.log("handleChainEnd")
            const tokens = result.llmOutput?.tokenUsage?.totalTokens ?? 0;
            const title = body.messages[0].content.substring(0, 100);
            const id = body.id ?? nanoid();
            console.log(JSON.stringify(result, null, 2));
            await saveToHistory(`${ title } (${ tokens } tokens)`, id, userId, messages, tempTokens);
            return handlers.handleChainEnd()
          },
          handlers.handleLLMError
        )
      ]
    }
  );

  console.log("returning stream")
  return new StreamingTextResponse(stream);
}

const getCustomAgentHandler = (
  stream: ReadableStream<Uint8Array>,
  handleLLMNewToken: (text: string) => Promise<void>,
  onStreamAdd: (text: string) => void,
  handleChainEnd: (outputs: ChainValues) => Promise<void>,
  handleLLMError: (e: any) => Promise<void>,
) => {
  return BaseCallbackHandler.fromMethods({
    handleAgentAction(action: AgentAction) {
      console.log({ agentAction: action })
      onStreamAdd(
        `\n\`\`\`ai-tool-start\n${ JSON.stringify(action) }\n\`\`\`\`\n`
      )
    },
    handleLLMNewToken,
    handleChainEnd,
    handleLLMError,
    handleToolEnd(output) {
      console.log({ toolEnd: output })
      onStreamAdd(
        `\n\`\`\`ai-tool-end\n${ JSON.stringify(output) }\n\`\`\`\`\n`
      )
    },
  });
}

const saveToHistory = async (title: string, id: string, userId: string, messages: any[], completion: string) => {

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

const getTools = () => {
  const googleSearch = new GoogleCustomSearch({
    apiKey: process.env.GOOGLE_API_KEY,
    googleCSEId: process.env.GOOGLE_CSE_ID,
  });


  const webBrowser = new WebBrowser({
    model: new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.4,
      verbose: false,
      timeout: 5 * 60 * 1000
    }), embeddings: new OpenAIEmbeddings()
  });
  const calculator = new Calculator();

  return [googleSearch, webBrowser, calculator];
}

import { kv } from '@vercel/kv'
import { NextRequest } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse, LangChainStream } from "ai";
import { DynamicTool } from "langchain/tools";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Calculator } from "langchain/tools/calculator";
import { GoogleCustomSearch } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { AIMessage, ChainValues, ChatMessage, HumanMessage } from "langchain/schema";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { BaseCallbackHandler } from "langchain/callbacks";
import { AgentAction } from "langchain/schema";
import { getVectorStoreWithTypesense, saveDocsToTypesense } from '@/lib/search';
import {
  RecursiveCharacterTextSplitter,
} from "langchain/text_splitter";

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
  if (message.role === "user") {
    return new HumanMessage(message.content);
  } else if (message.role === "assistant") {
    return new AIMessage(message.content);
  } else {
    return new ChatMessage(message.content, message.role);
  }
};

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
  const previousMessages = messages
    .slice(0, -1)
    .map(convertVercelMessageToLangChainMessage);
  const currentMessageContent = messages[messages.length - 1].content;

  const tools = getTools(userId);
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
      prefix: 'You are a software developer called Ollie the dev. If you dont know something, you can search internet, read webpages, memorize info and recall things from memory'
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
        getCustomAgentHandler(
          {
            handleLLMNewToken: async (text: string) => {
              tempTokens += text;
              return handlers.handleLLMNewToken(text);
            },
            onStreamAdd: async (text: string) => {
              tempTokens += text;
              return handlers.handleLLMNewToken(text);
            },
            handleChainEnd: async (result: ChainValues) => {
              console.log("handleChainEnd")
              const tokens = result.llmOutput?.tokenUsage?.totalTokens ?? 0;
              const title = body.messages[0].content.substring(0, 100);
              const id = body.id ?? nanoid();
              console.log(JSON.stringify(result, null, 2));
              await saveToHistory(`${ title } (${ tokens } tokens)`, id, userId, messages, tempTokens);
              return handlers.handleChainEnd()
            },
            handleLLMError: handlers.handleLLMError,
          }
        )
      ]
    }
  );

  console.log("returning stream")
  return new StreamingTextResponse(stream);
}

const getCustomAgentHandler = (
  {
    handleLLMNewToken,
    onStreamAdd,
    handleChainEnd,
    handleLLMError,
  }:
    {
      handleLLMNewToken: (text: string) => Promise<void>,
      onStreamAdd: (text: string) => void,
      handleChainEnd: (outputs: ChainValues) => Promise<void>,
      handleLLMError: (e: any) => Promise<void>,
    }
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

const getTools = (userId: string) => {
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

  return [googleSearch, webBrowser, calculator, getSearchTool(userId), getMemoizerTool(userId)];
}

const getSearchTool = (userId: string) => {
  return new DynamicTool({
    name: "Memory_Search",
    description:
      "Call this tool to search your memory, input is the search query string",
    func: (input: string) => searchDocuments(userId, input) as any,
  });
}

const getMemoizerTool = (userId: string) => {
  return new DynamicTool({
    name: "Save_To_Memory",
    description:
      "Call this tool to save to memory, input is the data to save as a string",
    func: (input: string) => saveDocuments(userId, input) as any,
  });
}

const searchDocuments = async (userId: string, input: string) => {
  try {
    const vectorStore = await getVectorStoreWithTypesense();
    console.log({
      userId,
      input
    })
    const results = await vectorStore.similaritySearch(input, undefined, {
      filter_by: `userId:=\`${ userId }\``
    });
    console.log(JSON.stringify(results, null, 2));
    return results
      .map((result) => result.pageContent)
      .map((result) => JSON.stringify(result, null, 2)).join("\n");
  } catch (e) {
    console.trace(e);
    return "Error searching memory";
  }
}

const saveDocuments = async (userId: string, input: string) => {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
      chunkOverlap: 200,
    });

    console.log({
      userId,
      input
    })

    const output = await splitter.createDocuments([input]);
    output.map((doc) => {
      doc.metadata = {
        ...doc.metadata,
        userId: userId.toString()
      }
    })

    console.log(JSON.stringify(output, null, 2));
    await saveDocsToTypesense(output);

    return "Saved to memory successfully";
  } catch (e) {
    console.trace(e);
    return "Error saving to memory";
  }
}



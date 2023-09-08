import { getTools } from "@/lib/tools";
import { nanoid } from '@/lib/utils'
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIMessage, ChainValues, ChatMessage, HumanMessage } from "langchain/schema";

import { Message as VercelChatMessage, LangChainStream } from "ai";

import { BaseCallbackHandler } from "langchain/callbacks";
import { AgentAction } from "langchain/schema";
import { saveChats } from "@/app/actions";

const chat = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.4,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY
});

export const getAgentExecutorStream = async ({
    id,
    userId,
    messages,
}: { userId: string; messages: any[]; id?: string; }) => {
    const previousMessages = messages
        .slice(0, -1)
        .map(convertVercelMessageToLangChainMessage);
    const currentMessageContent = messages[messages.length - 1].content;

    const tools = getTools(userId);


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
                            const title = messages[0].content.substring(0, 100);
                            console.log(JSON.stringify(result, null, 2));
                            await saveChats(`${ title } (${ tokens } tokens)`, id ?? nanoid(), userId, messages, tempTokens);
                            return handlers.handleChainEnd()
                        },
                        handleLLMError: handlers.handleLLMError,
                    }
                )
            ]
        }
    );
    return stream;
}

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
    if (message.role === "user") {
        return new HumanMessage(message.content);
    } else if (message.role === "assistant") {
        return new AIMessage(message.content);
    } else {
        return new ChatMessage(message.content, message.role);
    }
};

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

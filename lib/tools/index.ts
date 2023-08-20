
import { DynamicTool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";

import { ChatOpenAI } from "langchain/chat_models/openai";
import { GoogleCustomSearch } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { getVectorStoreWithTypesense, saveDocsToTypesense } from '@/lib/search';
import {
    RecursiveCharacterTextSplitter,
} from "langchain/text_splitter";
import { searchNews } from './google_news';


export const getTools = (userId: string) => {
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

    return [googleSearch, webBrowser, calculator, getSearchTool(userId), getMemoizerTool(userId), getGoogleNewsSearchTool()];
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

const getGoogleNewsSearchTool = () => {
    return new DynamicTool({
        name: "Google_News_Search",
        description:
            "Call this tool to search google news, input is the search query string",
        func: (input: string) => searchGoogleNews(input) as any,
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

const searchGoogleNews = async (input: string) => {
    try {
        const results = await searchNews(input);
        console.log(JSON.stringify(results, null, 2));
        return results
            .map((result) => JSON.stringify(result, null, 2)).join("\n");
    } catch (e) {
        console.trace(e);
        return "Error searching news";
    }
}

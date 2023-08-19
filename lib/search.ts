
import { Client } from "typesense";
import { Typesense,  TypesenseConfig } from "langchain/vectorstores/typesense";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";



export const getTypesenseClient = () =>{
    return new Client({
        nodes: [
          {
            // Ideally should come from your .env file
            host: (process.env as any).TYPESENSE_HOST,
            port: 443,
            protocol: "https",
          },
        ],
        // Ideally should come from your .env file
        apiKey: (process.env as any).TYPESENSE_API_KEY,
        numRetries: 0,
        connectionTimeoutSeconds: 200,
      });
      
}

export const getTypesenseVectorStoreConfig = () =>{
    return  {
        // Typesense client
        typesenseClient: getTypesenseClient(),
        // Name of the collection to store the vectors in
        schemaName: "personal_chat_memory",
        // Optional column names to be used in Typesense
        columnNames: {
          // "vec" is the default name for the vector column in Typesense but you can change it to whatever you want
          vector: "vec",
          // "text" is the default name for the text column in Typesense but you can change it to whatever you want
          pageContent: "text",
          // Names of the columns that you will save in your typesense schema and need to be retrieved as metadata when searching
          metadataColumnNames: ["source", "loc"],
        },
        
      } satisfies TypesenseConfig;
}

export const saveDocsToTypesense = async (docs: Document[]) => {
  console.log("saving docs:" + docs.length)
  const vectorStore = await getVectorStoreWithTypesense();
  console.log("got vector store");
  console.log("adding docs");
  await vectorStore.addDocuments(docs);
}

export const getVectorStoreWithTypesense = async () =>
  new Typesense(new OpenAIEmbeddings(), getTypesenseVectorStoreConfig());

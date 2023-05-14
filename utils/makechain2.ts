import { OpenAIChat } from 'langchain/llms';
import { LLMChain, ChatVectorDBQAChain, loadQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores';
import { PromptTemplate } from 'langchain/prompts';
import { CallbackManager } from 'langchain/callbacks';


const CONDENSE_PROMPT =
    PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);


const QA_PROMPT = PromptTemplate.fromTemplate(
    `Відповідь так, ні або не знаю - без інших слів`,
);



export const makeChain2 = (
    vectorstore: PineconeStore,
    onTokenStream?: (token: string) => void,
) => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0 }),
    prompt: CONDENSE_PROMPT,
  });

  const docChain = loadQAChain(
      new OpenAIChat({
        temperature: 0,
        modelName: 'gpt-3.5-turbo', //change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
        streaming: Boolean(onTokenStream),
        callbackManager: onTokenStream
            ? CallbackManager.fromHandlers({
              async handleLLMNewToken(token) {
                onTokenStream(token);
                console.log(token);
              },
            })
            : undefined,
      }),
      { prompt: QA_PROMPT },
  );

  return new ChatVectorDBQAChain({
    vectorstore,
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
    k: 3, //number of source documents to return
  });
};

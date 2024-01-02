import { OpenAI } from 'langchain/llms/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { PromptTemplate } from 'langchain/prompts';
import { Document } from 'langchain/document';
import { loadQARefineChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    mood: z
      .string()
      .describe('the mood of the person who wrote the journal entry.'),
    subject: z.string().describe('the subject of the journal entry.'),
    negative: z
      .boolean()
      .describe(
        'is the journal entry negative? (i.e. does it contain negative emotions?).',
      ),
    summary: z.string().describe('quick summary of the entire entry.'),
    color: z
      .string()
      .describe(
        'a hexidecimal color code that represents the mood of the entry. Example #00ff00 is the color of happiness.',
      ),
    sentimentScore: z
      .number()
      .describe(
        'sentiment of the text and rated on a scale of -10 to 10, where -10 is extremely negative, 0 is netural, and 10 is extremely positive.',
      ),
  }),
);

export const getPrompt = async (content) => {
  const format_instructions = parser.getFormatInstructions();
  const prompt = new PromptTemplate({
    template:
      'Analyze the following journal entry. Follow the instructions and format your response to match the format instructions, no matter what! \n{format_instructions}\n{entry}',
    inputVariables: ['entry'],
    partialVariables: { format_instructions },
  });

  const input = await prompt.format({
    entry: content,
  });
  return input;
};

export const analyze = async (prompt) => {
  const input = await getPrompt(prompt);
  const model = new OpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo' });
  const result = await model.call(input);

  try {
    return parser.parse(result);
  } catch (e) {
    console.log(e);
  }
};

export const qa = async (question, entries) => {
  const docs = entries.map((entry) => {
    return new Document({
      pageContent: entry.content,
      metadata: { id: entry.id, created: entry.created },
    });
  });
  const model = new OpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo' });
  const chain = loadQARefineChain(model);
  const embeddings = new OpenAIEmbeddings();
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  const relevantDocs = await store.similaritySearch(question);
  const res = await chain.call({
    input_documents: relevantDocs,
    question,
  });
  return res.output_text;
};

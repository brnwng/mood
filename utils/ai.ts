import { OpenAI } from 'langchain/llms/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { PromptTemplate } from 'langchain/prompts';

export const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    mood: z
      .string()
      .describe('the mood of the person who wrote the journal entry.'),
    subject: z.string().describe('subject of journal entry.'),
    summary: z.string().describe('quick summary of the entire entry.'),
    negative: z.boolean().describe('does it contain negative emotions?'),
    color: z
      .string()
      .describe(
        'a hexidecimal color code that represents mood of the entry. Example #00ff00 is the color of happiness.',
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

  console.log(input);

  return input;
};

export const analyze = async (prompt) => {
  const input = await getPrompt(prompt);
  const model = new OpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo' });
  const result = await model.call(input);
  console.log(result);
};

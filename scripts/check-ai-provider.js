import 'dotenv/config';
import { checkAiProvider } from '../server/rag.js';

try {
  const result = await checkAiProvider();
  console.log('AI provider check passed.');
  console.log(JSON.stringify(result, null, 2));
  console.log('The API key was not printed. Provider requests may incur usage charges.');
} catch (error) {
  console.error(`AI provider check failed: ${error.message}`);
  process.exitCode = 1;
}

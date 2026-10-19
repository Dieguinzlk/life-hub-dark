import { google } from '@ai-sdk/google';

// Definição do modelo atualizado recomendado pela API
const modelName = process.env.GEMINI_MODEL || 'models/gemini-3.8-flash';

// Exemplo de uso na sua função de chat ou configuração do SDK
export const aiModel = google(modelName);

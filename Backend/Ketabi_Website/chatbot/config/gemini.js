import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenAI } from "@google/genai";

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export default genAI;

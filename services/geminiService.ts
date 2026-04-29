
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { TranslationMode, ChatMessage, LinguisticSettings } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  mode: TranslationMode = 'smart',
  imageData?: { data: string; mimeType: string },
  settings?: LinguisticSettings
): Promise<string> => {
  const ai = getAI();
  
  let model = 'gemini-3-flash-preview';
  let thinkingBudget = 0;

  // Determination of model based on settings or mode
  if (settings?.modelType === 'pro') {
    model = 'gemini-3-pro-preview';
    thinkingBudget = 32768;
  } else if (settings?.modelType === 'flash') {
    model = 'gemini-3-flash-preview';
    thinkingBudget = 0;
  } else {
    // Auto mode follows the translationMode state
    switch (mode) {
      case 'normal':
        model = 'gemini-3-flash-preview';
        thinkingBudget = 0;
        break;
      case 'smart':
        model = 'gemini-3-flash-preview';
        thinkingBudget = 16000;
        break;
      case 'pro':
        model = 'gemini-3-pro-preview';
        thinkingBudget = 32768;
        break;
    }
  }

  const settingsContext = settings ? `
    Target Sub-dialect: ${settings.subDialect} (Adjust vocabulary for this specific region).
    Formality: ${settings.formality}.
    Advanced Orthography: ${settings.useAdvancedOrthography ? 'Enable (Use symbols like ڤ, ڕ, ڵ, ۆ, ێ)' : 'Standard'}.
    Include Latin Transliteration: ${settings.showTransliteration ? 'Yes (Include it below the Arabic script)' : 'No'}.
  ` : '';

  let contents: any;
  if (imageData) {
    contents = {
      parts: [
        {
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
          },
        },
        {
          text: `Translate the text in this image from ${sourceLang} to ${targetLang}. ${settingsContext} Only return the translated text. Context: "${text}"`,
        },
      ],
    };
  } else {
    if (!text.trim()) return "";
    contents = `Translate the following text from ${sourceLang} to ${targetLang}. 
    ${settingsContext}
    Original Text: "${text}"`;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: settings?.temperature ?? 0.3,
        thinkingConfig: { thinkingBudget },
      },
    });

    return response.text?.trim() || "Translation error";
  } catch (error) {
    console.error("Translation failed:", error);
    throw new Error("Failed to connect to the translation service.");
  }
};

export const generateSpeech = async (text: string, language: string): Promise<string> => {
  const ai = getAI();
  try {
    const isBadini = language === 'badini';
    const isSoran = language === 'ku-ckb';
    
    // Selection of voice based on linguistic profile
    let voiceName = 'Zephyr';
    if (isBadini) voiceName = 'Kore';
    else if (isSoran) voiceName = 'Puck';
    else if (language === 'ar') voiceName = 'Charon';

    // For Badini, we explicitly prompt the TTS engine to handle the specific phonology
    const speechPrompt = isBadini 
      ? `Read this text clearly in the Badini Kurdish dialect: ${text}` 
      : text;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: speechPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    return base64Audio;
  } catch (error) {
    console.error("Speech generation failed:", error);
    throw error;
  }
};

export const getAssistantResponse = async (
  message: string,
  history: ChatMessage[],
  onChunk: (chunk: string) => void,
  imageData?: { data: string; mimeType: string }
): Promise<void> => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are a helpful and professional Badini Kurdish Linguistic Assistant. 
      Your primary language of communication is Kurdish Badini (Arabic Script). 
      Even if the user asks in English or another language, respond primarily in Badini, providing translations or explanations only if necessary.
      Your goal is to help users learn the Behdinan dialect, explain grammar, culture, and provide context for translations. 
      Be friendly, encouraging, and accurate about regional variations (Duhok, Zakho, etc.).`,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 2048 },
    },
    history: history.map(h => {
      const parts: any[] = [{ text: h.text }];
      if (h.image) {
        parts.push({ inlineData: { data: h.image, mimeType: 'image/jpeg' } });
      }
      return {
        role: h.role,
        parts: parts
      };
    })
  });

  try {
    let msgContent: any = message;
    if (imageData) {
      msgContent = [
        { text: message },
        { inlineData: { data: imageData.data, mimeType: imageData.mimeType } }
      ];
    }
    const result = await chat.sendMessageStream({ message: msgContent });
    for await (const chunk of result) {
      const text = (chunk as GenerateContentResponse).text;
      if (text) onChunk(text);
    }
  } catch (error) {
    console.error("Assistant chat failed:", error);
    throw new Error("Assistant error.");
  }
};

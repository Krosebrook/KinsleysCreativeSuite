import { GoogleGenAI, Chat, Modality, Type } from "@google/genai";
import type { Message, StoryboardScene } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * A centralized error handler for Gemini API calls.
 * @param error The error caught from a try-catch block.
 * @param context A string describing the operation that failed (e.g., 'Image Editing').
 * @returns A new Error object with a user-friendly message.
 */
const handleApiError = (error: unknown, context: string): Error => {
    // 1. Log the original error for debugging.
    console.error(`API Error in ${context}:`, error);

    // 2. Set a generic, safe default message.
    let userFriendlyMessage = `An unexpected error occurred during ${context}. Please try again.`;

    // 3. Extract a string from the unknown error type.
    let messageToInspect = '';
    if (error instanceof Error) {
        messageToInspect = error.message;
    } else if (typeof error === 'string') {
        messageToInspect = error;
    } else {
        try {
            messageToInspect = JSON.stringify(error);
        } catch {
            messageToInspect = 'An unreadable error occurred.';
        }
    }
    
    const lowerCaseMessage = messageToInspect.toLowerCase();

    // 4. Check for specific, common error patterns and provide actionable feedback.
    if (lowerCaseMessage.includes('failed to fetch')) {
        userFriendlyMessage = 'A network error occurred. Please check your internet connection and try again.';
    } else if (lowerCaseMessage.includes('api key not valid') || lowerCaseMessage.includes('api_key_invalid')) {
        userFriendlyMessage = 'Your API key is invalid or missing. Please ensure it is correctly configured.';
    } else if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('rate limit') || lowerCaseMessage.includes('429')) {
        userFriendlyMessage = 'You have exceeded your API quota or rate limit. Please check your usage and billing details, or try again later.';
    } else if (lowerCaseMessage.includes('safety') || lowerCaseMessage.includes('blocked')) {
        userFriendlyMessage = 'Your request was blocked due to safety settings. Please adjust your prompt and try again.';
    } else if (lowerCaseMessage.includes('400 bad request') || lowerCaseMessage.includes('invalid argument')) {
        userFriendlyMessage = `The request sent to the AI model was invalid. Please check your input and try again. Context: ${context}`;
    } else if (lowerCaseMessage.includes('503') || lowerCaseMessage.includes('model is overloaded') || lowerCaseMessage.includes('server error')) {
        userFriendlyMessage = 'The AI model is currently overloaded or unavailable. Please try again in a few moments.';
    } else if (lowerCaseMessage.includes("not found")) {
        // Special handling for Veo's key selection flow
        if (context === 'Video Generation' || context === 'Video Extension') {
             userFriendlyMessage = "API key not found or invalid. This can happen if the key was recently deleted. Please re-select your API key and try again.";
        } else {
             userFriendlyMessage = 'The requested AI model or resource was not found. This might be a configuration issue.';
        }
    }

    // 5. Return a new Error object.
    return new Error(userFriendlyMessage);
};

// --- Chat Functions ---

export const createChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-flash-lite-latest',
    config: {
      systemInstruction: 'You are a friendly and helpful creative assistant for the Gemini Creative Suite.',
    },
  });
};

export const groundedChat = async (message: string): Promise<Message> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter(Boolean) || [];
    
    return {
        role: 'model',
        text: response.text,
        sources: sources,
    };
  } catch (error) {
    throw handleApiError(error, 'Grounded Chat');
  }
};

// --- Story Booster Functions ---

export const analyzeText = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Please analyze the following story text. Provide feedback on its strengths and weaknesses, focusing on plot, character development, pacing, and overall engagement. Format your response using markdown with headings for each section. Here is the text: "${text}"`,
        });
        return response.text;
    } catch (error) {
        throw handleApiError(error, 'Text Analysis');
    }
};

export const improveText = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Please improve the following story text. Enhance the prose, fix any grammatical errors, and make it more engaging, while preserving the original plot and tone. Here is the text: "${text}"`,
        });
        return response.text;
    } catch (error) {
        throw handleApiError(error, 'Text Improvement');
    }
};

export const suggestTitles = async (text: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest 5 creative titles for the following story. Return the titles as a JSON object with a "titles" key containing an array of strings. Story: "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        titles: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["titles"],
                }
            }
        });

        const jsonResponse = JSON.parse(response.text.trim());
        return jsonResponse.titles || [];
    } catch (error) {
        throw handleApiError(error, 'Title Suggestion');
    }
};

export const generateStoryIdea = async (prompt: string, genre: string): Promise<string> => {
    try {
        const fullPrompt = genre && genre !== 'any'
            ? `Write a short ${genre} story starter (around 100-150 words) based on this prompt: "${prompt}"`
            : `Write a short story starter (around 100-150 words) based on this prompt: "${prompt}"`;
            
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });
        return response.text;
    } catch (error) {
        throw handleApiError(error, 'Story Idea Generation');
    }
};


// NEW: Storyboard function
export const generateStoryboardPrompts = async (storyText: string): Promise<StoryboardScene[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Analyze the following story and break it down into 4 key visual scenes for a storyboard. For each scene, provide a short description, a detailed image prompt for an AI image generator, and a list of character names mentioned in that scene. Story: "${storyText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    scene_description: { type: Type.STRING },
                                    image_prompt: { type: Type.STRING },
                                    characters_mentioned: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const jsonResponse = JSON.parse(response.text.trim());
        return jsonResponse.scenes || [];
    } catch (error) {
        throw handleApiError(error, 'Storyboard Prompt Generation');
    }
};

// --- Image Generation/Editing Functions ---

const generateColoringPage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '4:3',
        },
    });
    return response.generatedImages[0].image.imageBytes;
};

export const generateColoringPages = async (
  theme: string,
  childName: string,
  numPages: number,
  borderStyle: string,
  subtitle: string,
  artStyle: string,
  customPrompt: string,
  customCoverPrompt: string
): Promise<{ cover: string; pages: string[] }> => {
    try {
        const customInstructions = customPrompt ? ` Additional instructions from the user: "${customPrompt}".` : '';

        const coverArtDescription = customCoverPrompt 
            ? customCoverPrompt 
            : `The theme is '${theme}'.`;

        const coverPrompt = `Create a fun, kid-friendly coloring book cover. The scene should be: "${coverArtDescription}". The title text to include is '${childName}'s Coloring Adventure'. The style should be ${artStyle}, black and white line art, suitable for coloring. Add a decorative border of ${borderStyle}. ${subtitle ? `Include the subtitle text: '${subtitle}'.` : ''}${customInstructions}`;
        
        const pagePrompts = Array.from({ length: numPages }, (_, i) => 
            `A single, clear coloring book page for a child. The theme is '${theme}'. The style should be simple ${artStyle}, black and white line art with thick outlines. The scene should be simple and easy to color. Scene idea ${i + 1} of ${numPages}.${customInstructions}`
        );

        const [cover, ...pages] = await Promise.all([
            generateColoringPage(coverPrompt),
            ...pagePrompts.map(prompt => generateColoringPage(prompt))
        ]);

        return { cover, pages };
    } catch (error) {
        throw handleApiError(error, 'Coloring Page Generation');
    }
};

export const generateSticker = async (prompt: string): Promise<string> => {
    try {
        const fullPrompt = `Create a die-cut sticker of: "${prompt}". The sticker should be visually appealing, with a distinct white border and a transparent background. The style should be fun and cartoonish.`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png', // PNG for transparency
              aspectRatio: '1:1',
            },
        });
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        throw handleApiError(error, 'Sticker Generation');
    }
};

// For Storyboard - generates a new image from a prompt + optional references
export const generateStoryImage = async (
  prompt: string,
  characterB64s?: (string | null)[],
  styleB64?: string | null
): Promise<string> => {
  try {
    const parts: any[] = [];

    if (characterB64s) {
      for (const charB64 of characterB64s) {
        if (charB64) {
          parts.push({
            inlineData: { data: charB64, mimeType: 'image/png' },
          });
        }
      }
    }
    
    if (styleB64) {
      parts.push({
        inlineData: { data: styleB64, mimeType: 'image/png' },
      });
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image was returned from the model.");
  } catch (error) {
    throw handleApiError(error, 'Story Image Generation');
  }
};


export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  maskB64?: string | null,
  stickerB64?: string | null,
  characterB64?: string | null,
  styleB64?: string | null
): Promise<string> => {
  try {
    const parts: any[] = [{
      inlineData: { data: base64ImageData, mimeType: mimeType },
    }];

    if (characterB64) {
      parts.push({
        inlineData: { data: characterB64, mimeType: 'image/png' },
      });
    }
    
    if (styleB64) {
      parts.push({
        inlineData: { data: styleB64, mimeType: 'image/png' },
      });
    }

    if (stickerB64) {
      parts.push({
        inlineData: { data: stickerB64, mimeType: 'image/png' },
      });
    }

    parts.push({ text: prompt });

    if (maskB64) {
      parts.push({
        inlineData: { data: maskB64, mimeType: 'image/png' },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image was returned from the model.");
  } catch (error) {
    throw handleApiError(error, 'Image Editing');
  }
};

export const convertImageToLineArt = async (
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: 'Convert this image into a black and white line art coloring page. The lines should be clean, bold, and well-defined. Remove all colors, shadows, and gradients.',
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No line art image was returned from the model.");
  } catch (error) {
    throw handleApiError(error, 'Image to Line Art Conversion');
  }
};


// --- Video Generation Functions ---

const mapVeoStateToMessage = (state: string | undefined): string => {
    switch (state) {
        case 'GENERATE_VIDEOS_STATE_PENDING':
            return 'Request pending, preparing for generation...';
        case 'GENERATE_VIDEOS_STATE_GENERATING':
            return 'Generating video frames... this is the longest step.';
        case 'GENERATE_VIDEOS_STATE_ENCODING':
            return 'Encoding video...';
        case 'GENERATE_VIDEOS_STATE_UPLOADING':
            return 'Finalizing and uploading video...';
        default:
            return 'Checking generation status...';
    }
};

const pollVeoOperation = async (
  initialOperation: any,
  videoAi: GoogleGenAI,
  onProgress: (message: string) => void
): Promise<{ videoUrl: string, videoObject: any }> => {
    let operation = initialOperation;
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        operation = await videoAi.operations.getVideosOperation({ operation: operation });

        const message = mapVeoStateToMessage(operation.metadata?.state as string);
        onProgress(message);
    }

    onProgress("Video processing complete! Fetching download link...");
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error("Video generation succeeded but no download link was found.");
    }

    onProgress("Downloading video...");
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY!}`);
    if (!response.ok) {
        throw new Error(`Failed to download video file. Status: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    
    return { 
        videoUrl, 
        videoObject: operation.response?.generatedVideos?.[0]?.video 
    };
};

export const generateVideo = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void
): Promise<{ videoUrl: string, videoObject: any }> => {
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  try {
    onProgress("Sending request to the video model...");
    const operation = await videoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: base64ImageData,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });

    onProgress("Video generation started. This can take a few minutes...");
    return await pollVeoOperation(operation, videoAi, onProgress);
  } catch (error) {
    throw handleApiError(error, 'Video Generation');
  }
};

export const extendVideo = async (
    previousVideo: any,
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    onProgress: (message: string) => void
): Promise<{ videoUrl: string, videoObject: any }> => {
    const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    try {
        onProgress("Sending request to extend video...");
        const operation = await videoAi.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt,
            video: previousVideo,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio,
            }
        });

        onProgress("Video extension started. This can take a few minutes...");
        
        return await pollVeoOperation(operation, videoAi, onProgress);
    } catch (error) {
        throw handleApiError(error, 'Video Extension');
    }
};
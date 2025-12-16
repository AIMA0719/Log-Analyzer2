
import { GoogleGenAI } from "@google/genai";
import { ParsedData, LogCategory } from '../types';

export interface AiAnalysisResult {
  analysis: string; // Internal technical summary
  koreanResponse: string; // Response in Korean (Primary)
  translatedResponse: string | null; // Response in target language (Secondary)
  targetLanguage: string | null; // Name of the target language
}

export const generateAiDiagnosis = async (data: ParsedData, userContext?: string, customApiKey?: string): Promise<AiAnalysisResult> => {
  // Priority: Custom Key (User provided) > Env Key (Developer provided)
  const apiKey = customApiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  // Initialize client with the selected key
  const ai = new GoogleGenAI({ apiKey });
  const { metadata, logs, diagnosis } = data;

  // 1. Prepare Data Summary
  const errorLogs = logs
    .filter(l => l.category === LogCategory.ERROR)
    .slice(-15)
    .map(l => `[${l.rawTimestamp}] ${l.message}`)
    .join('\n');

  const initLogs = logs
    .slice(0, 10)
    .map(l => `[${l.rawTimestamp}] ${l.message}`)
    .join('\n');

  // 2. Construct the Prompt
  const prompt = `
Act as a Senior Technical Support Engineer for the "Infocar OBD2 Scanner" app.
Analyze the provided log summary and generate Customer Service (CS) responses.

--- SESSION METADATA ---
Device: ${metadata.model} (${metadata.userOS})
Car: ${metadata.carName} (Fuel: ${metadata.carInfo['carFuelType'] || 'Unknown'})
App Version: ${metadata.appVersion}
Country Code: ${metadata.countryCode || 'Unknown'}

--- DIAGNOSIS SUMMARY (Rule-based) ---
Status: ${diagnosis.status}
Detected Issues: ${diagnosis.issues.join(', ') || 'None detected by rules'}
Diagnosis Type: ${diagnosis.csType}

--- LOG SNIPPETS ---
[Initialization Phase]
${initLogs}

[Recent Errors]
${errorLogs || 'No explicit error logs found.'}

--- ADDITIONAL CONTEXT FROM SUPPORT STAFF ---
${userContext ? userContext : 'None provided. Analyze based on logs only.'}

--- MANDATORY TEMPLATES (HIGHEST PRIORITY) ---
If the "Diagnosis Type" matches the conditions below, you MUST use the provided Korean text exactly for 'koreanResponse'.

CASE 1: Diagnosis Type is "GENERAL_CONNECTION" (or general protocol handshake failure)
Use this text exactly:
"""
안녕하십니까 인포카입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.

고객님께서 프로토콜로 인한 연결 관련 어려움을 겪으신 것으로 보입니다.
네트워크가 원활한 상태에서 설정 -> 스캐너 연결 -> 상단의 "연결 문제 확인하기" 탭을 누르신 뒤 해당 내용 확인 부탁 드립니다.

또한 
1. 앱 내 [설정] -> [프로토콜&데이터] 기능을 통해 [응답 대기시간] 및 [재연결 횟수] 늘리기.
2. [프로토콜 종류]에서 프로토콜을 순차적으로 바꾸면서 데이터가 정상적으로 표시되어지는지 확인 부탁 드립니다. (먼저 6번 시도 부탁 드립니다.)

추가적으로 다른 궁금하신 사항이 있으시다면 앱 메인 페이지에서 "사용 가이드" 확인 부탁 드립니다.

감사합니다.
"""

CASE 2: Diagnosis Type is "NO_DATA_PROTOCOL" (or connected but getting NO DATA for 010D/010C)
Use this text exactly:
"""
안녕하십니까 인포카입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.

고객님께서 호환되는 프로토콜과 연결이 되지 않아 "NO DATA" 가 응답 되며, 반복적인 비정상 응답으로인한 연결 종료가 된 것으로 보입니다.

아래 사항 참고 부탁 드립니다.
1. 앱 내 [설정] -> [프로토콜&데이터] 기능을 통해 [응답 대기시간] 및 [재연결 횟수] 늘리기.
2. [프로토콜 종류]에서 프로토콜을 순차적으로 바꾸면서 데이터가 정상적으로 표시되어지는지 확인 부탁 드립니다. (먼저 6번 시도 부탁 드립니다.)

추가적으로 다른 궁금하신 사항이 있으시다면 앱 메인 페이지에서 "사용 가이드" 확인 부탁 드립니다.

감사합니다.
"""

If neither case applies, generate a polite and accurate analysis based on the logs and context.

--- TASK ---
1. Check if a MANDATORY TEMPLATE applies.
2. **Step A**: Generate a CS Response in **KOREAN (Hangul)**. 
   - If a mandatory template applies, use it.
   - If not, analyze the logs to understand the root cause and write a custom response following the standard format (Greeting -> Body -> Closing).
3. **Step B**: If the Country Code (${metadata.countryCode}) indicates a language OTHER than Korean (e.g., US, JP, CN, DE), translate the Korean response (Step A) into that target language. 
   - If the Country Code is KR or unknown, the translated response can be null.

--- STANDARD RESPONSE FORMAT RULES ---
If NO mandatory template applies, the 'koreanResponse' MUST strictly follow this structure:

안녕하십니까 인포카입니다.
먼저 이용에 불편함을 드려 죄송의 말씀 드립니다.

[Body in Korean]

감사합니다.

**IMPORTANT STYLE RULE**: Do NOT use markdown bold formatting (e.g., **text**) in any part of the response. Use plain text only.

--- OUTPUT ---
Return JSON with the following structure:
{
  "analysis": "Brief technical summary",
  "koreanResponse": "The response in Korean",
  "translatedResponse": "The translated response (or null if target is Korean)",
  "targetLanguage": "Name of the target language (e.g. English, Japanese)"
}
`;

  try {
    // 3. Call Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(responseText) as AiAnalysisResult;
    return result;

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    throw error;
  }
};

import { useState, useEffect } from 'react';
import { useMessageHandler } from './hooks/useMessageHandler';
import { processCurrentContent, debugPageContent, hasTryAgainButton, clickNextButton } from './utils/contentHandler';
import type { ContentType, QuestionData, AnswerData } from './utils/contentHandler';

export default function App() {
  const { connectionStatus, response } = useMessageHandler();

  const [examStarted, setExamStarted] = useState(false);
  const [currentQA, setCurrentQA] = useState<{ question: string; answer?: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [processingContent, setProcessingContent] = useState(false);
  const [debugMode, setDebugMode] = useState(true);
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [processedQuestions, setProcessedQuestions] = useState<number>(0);
  const [isProcessingQuestion, setIsProcessingQuestion] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [needsUserIntervention, setNeedsUserIntervention] = useState<boolean>(false);

  // Content processing loop
  useEffect(() => {
    let contentCheckInterval: NodeJS.Timeout;

    if (examStarted && !processingContent && !isProcessingQuestion && !needsUserIntervention) {
      contentCheckInterval = setInterval(async () => {
        try {
          setProcessingContent(true);

          // Log debug info if debug mode is enabled
          if (debugMode) {
            debugPageContent();
          }

          // Check if there's a Try Again button before processing
          if (hasTryAgainButton()) {
            console.log('Found Try Again button - user intervention needed');
            setNeedsUserIntervention(true);
            setProcessingContent(false);
            return;
          }

          const detectedContentType = await processCurrentContent(handleOpenAIProcessing);
          setContentType(detectedContentType);

          // For text content, we don't need to show it as a question being processed
          if (detectedContentType === 'text_content') {
            setCurrentQA(null);
          }

          console.log(`Processed content of type: ${detectedContentType}`);

          // If content type is unknown, try clicking Next button as a fallback
          if (detectedContentType === 'unknown') {
            console.log('Attempting to click Next button as fallback for unknown content');
            const clicked = await clickNextButton();
            if (clicked) {
              console.log('Successfully clicked Next button as fallback');
              // Clear debug info when moving to next content
              setDebugInfo('');
            }
          }

          // For any new content, clear the previous debug info
          if (detectedContentType !== 'unknown') {
            setDebugInfo('');
          }

          // Check again after processing in case we now have a Try Again button
          if (hasTryAgainButton()) {
            console.log('Found Try Again button after processing - user intervention needed');
            setNeedsUserIntervention(true);
          }
        } catch (error) {
          console.error('Error processing content:', error);
        } finally {
          setProcessingContent(false);
        }
      }, 5000); // Check for new content every 5 seconds
    }

    return () => {
      if (contentCheckInterval) clearInterval(contentCheckInterval);
    };
  }, [examStarted, processingContent, debugMode, isProcessingQuestion, needsUserIntervention]);

  // Function to handle OpenAI processing via background script
  const handleOpenAIProcessing = async (questionData: QuestionData): Promise<AnswerData> => {
    try {
      // Set flag to prevent multiple processing
      setIsProcessingQuestion(true);

      // Update debug info with the extracted question data
      let debugQuestionInfo = `
QUESTION DATA:
Title: ${questionData.title}
Question: ${questionData.question}
`;

      if (questionData.type === 'true_false') {
        debugQuestionInfo += `Choices: ${questionData.choices
          .map((c, i) => `\n  ${i + 1}. ${c.text} (Options: ${c.options.join(' | ')})`)
          .join('')}`;
      } else if (questionData.type === 'multiple_choice') {
        debugQuestionInfo += `Options: ${questionData.choices.map((c, i) => `\n  ${i + 1}. ${c.text}`).join('')}`;
      }

      setDebugInfo(debugQuestionInfo);
      console.log('QUESTION DATA FOR OPENAI:', questionData);

      setAiStatus('processing');
      setCurrentQA({
        question: `${questionData.title}\n${questionData.question}`,
        answer: undefined,
      });

      // Format the question for OpenAI dynamically based on the actual content
      let prompt = '';

      if (questionData.type === 'true_false') {
        // Get the actual options from the first choice (assuming all choices have the same options)
        const optionExamples = questionData.choices[0]?.options || [];

        prompt = `
You are a real estate exam expert. Answer the following true/false questions with precision:

Title: ${questionData.title}
Question: ${questionData.question}

For each of the following scenarios, indicate the correct answer:
${questionData.choices.map((choice, index) => `${index + 1}. ${choice.text}`).join('\n')}

Options for each scenario:
${optionExamples.map(option => `- ${option}`).join('\n')}

IMPORTANT: Respond ONLY with a numbered list matching the scenarios, with EXACTLY the text of the correct option for each.
Format your answer EXACTLY as:
${questionData.choices.map((_, index) => `${index + 1}. [EXACT OPTION TEXT]`).join('\n')}

No explanation or additional text.`;
      } else if (questionData.type === 'multiple_choice') {
        prompt = `
You are a real estate exam expert. Answer the following multiple choice question with precision:

Title: ${questionData.title}
Question: ${questionData.question}

Choose the best answer from these options:
${questionData.choices.map((choice, index) => `${index + 1}. ${choice.text}`).join('\n')}

IMPORTANT: Respond ONLY with the EXACT text of the correct option.
Do not include numbers, explanations, or any additional text.
Just provide the exact text of the correct answer.`;
      }

      console.log('Sending to OpenAI:', prompt);

      // Increment processed questions counter
      setProcessedQuestions(prev => prev + 1);

      // Send message to background script
      const result = await sendMessageToBackground(prompt);

      if (result.status === 'error') {
        throw new Error(result.error || 'Unknown error from background script');
      }

      // Parse the response
      const aiResponse = result.aiResponse || '';
      setCurrentQA(prev => ({
        question: prev?.question || '',
        answer: aiResponse,
      }));

      // Extract answers from the response
      const answers = parseOpenAIResponse(aiResponse, questionData.type);

      // Update debug info with the answers
      const debugAnswerInfo = `
QUESTION DATA:
Title: ${questionData.title}
Question: ${questionData.question}
${
  questionData.type === 'true_false'
    ? `Choices: ${questionData.choices.map((c, i) => `\n  ${i + 1}. ${c.text} (Options: ${c.options.join(' | ')})`).join('')}`
    : questionData.type === 'multiple_choice'
      ? `Options: ${questionData.choices.map((c, i) => `\n  ${i + 1}. ${c.text}`).join('')}`
      : ''
}

ANSWERS FROM OPENAI:
${answers.map((answer, i) => `${i + 1}. ${answer}`).join('\n')}
      `;
      setDebugInfo(debugAnswerInfo);
      console.log('ANSWERS FROM OPENAI:', answers);

      setAiStatus('success');
      return { answers };
    } catch (error) {
      console.error('Error processing with OpenAI:', error);
      setAiStatus('error');
      setAiError(error instanceof Error ? error.message : 'Unknown error');
      return { answers: [] };
    } finally {
      // Reset processing flag after a delay to prevent immediate reprocessing
      setTimeout(() => {
        setIsProcessingQuestion(false);
      }, 2000);
    }
  };

  // Function to send message to background script
  const sendMessageToBackground = (
    text: string,
  ): Promise<{
    status: string;
    aiResponse?: string;
    error?: string;
  }> => {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'SEND_MESSAGE', text }, response => {
        resolve(response);
      });
    });
  };

  // Function to parse OpenAI response based on question type
  const parseOpenAIResponse = (response: string, questionType: ContentType): string[] => {
    if (questionType === 'true_false') {
      // Extract lines like "1. Law is applicable"
      const lines = response.split('\n').filter(line => /^\d+\./.test(line.trim()));

      // Extract just the answer part (e.g., "Law is applicable")
      return lines.map(line => {
        const match = line.match(/^\d+\.\s*(.*)/);
        return match ? match[1].trim() : '';
      });
    } else if (questionType === 'multiple_choice') {
      // For multiple choice, we expect just the text of the answer
      // Clean up any numbering or extra text
      const cleanResponse = response
        .trim()
        .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
        .replace(/^-\s*/, ''); // Remove leading dash like "- "

      return [cleanResponse];
    }

    return [];
  };

  const handleStartExam = async () => {
    console.log('Starting exam automation...');
    setExamStarted(true);
    setShowInstructions(false);
    setAiStatus('idle');
    setAiError(null);
    setProcessedQuestions(0);
    setIsProcessingQuestion(false);
    setDebugInfo('');

    // Initial content check
    try {
      setProcessingContent(true);

      // Log debug info if debug mode is enabled
      if (debugMode) {
        debugPageContent();
      }

      const detectedContentType = await processCurrentContent(handleOpenAIProcessing);
      setContentType(detectedContentType);
    } catch (error) {
      console.error('Error processing initial content:', error);
    } finally {
      setProcessingContent(false);
    }
  };

  const handleDebugToggle = () => {
    setDebugMode(prev => !prev);
    if (!debugMode) {
      // Run debug immediately when turning on debug mode
      debugPageContent();
    }
  };

  const handleClearCache = () => {
    // Reset processing state
    setIsProcessingQuestion(false);
    setProcessingContent(false);
    setProcessedQuestions(0);
    setDebugInfo('');
    console.log('Reset processing state');
  };

  // Function to resume automation after user intervention
  const handleResumeAutomation = () => {
    setNeedsUserIntervention(false);
    console.log('Resuming automation after user intervention');
  };

  return (
    <div className="fixed top-[50px] right-4 z-50 flex flex-col gap-4 rounded-lg bg-white p-6 shadow-xl w-[400px] border border-gray-200">
      {showInstructions && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h2>
          <ol className="list-decimal pl-4 space-y-2 text-blue-700">
            <li>Open your exam Unit Page</li>
            <li>Start the automated process</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2 italic">The automation will handle everything for you</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleStartExam}
          className={`flex-1 py-3 ${
            examStarted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          } text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm`}
          disabled={examStarted}>
          {examStarted ? 'Running...' : "Let's Go"}
        </button>

        <button
          onClick={handleDebugToggle}
          className={`px-3 py-1 ${
            debugMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
          } font-medium rounded-lg transition-colors duration-200 text-sm`}>
          {debugMode ? 'Debug: ON' : 'Debug'}
        </button>

        <button
          onClick={handleClearCache}
          className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-lg transition-colors duration-200 text-sm">
          Reset State
        </button>
      </div>

      {contentType && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">Current Content:</h3>
          <p className="text-sm text-blue-700">{contentType}</p>
          {processingContent && <p className="text-xs text-blue-600 italic mt-1">Processing content...</p>}
          {isProcessingQuestion && (
            <p className="text-xs text-orange-600 italic mt-1">Processing question with OpenAI...</p>
          )}
          <p className="text-xs text-blue-600 mt-1">Processed questions: {processedQuestions}</p>
        </div>
      )}

      {aiStatus !== 'idle' && (
        <div
          className={`p-3 rounded-lg border ${
            aiStatus === 'processing'
              ? 'bg-yellow-50 border-yellow-200'
              : aiStatus === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
          }`}>
          <h3
            className={`text-sm font-semibold mb-1 ${
              aiStatus === 'processing' ? 'text-yellow-800' : aiStatus === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
            {aiStatus === 'processing'
              ? 'AI Processing...'
              : aiStatus === 'success'
                ? 'AI Response Received'
                : 'AI Error'}
          </h3>
          {aiStatus === 'error' && aiError && <p className="text-xs text-red-600">{aiError}</p>}
        </div>
      )}

      {debugInfo && (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 overflow-auto max-h-[250px]">
          <h3 className="text-base font-semibold text-gray-700 mb-1">Debug Info:</h3>
          <pre className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">{debugInfo}</pre>
        </div>
      )}

      {currentQA && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Current Question:</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {currentQA.question.length > 400 ? currentQA.question.substring(0, 400) + '...' : currentQA.question}
            </p>
          </div>
          {currentQA.answer && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Answer:</h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {currentQA.answer.length > 400 ? currentQA.answer.substring(0, 400) + '...' : currentQA.answer}
              </p>
            </div>
          )}
        </div>
      )}

      {response && (
        <div
          className={`p-4 rounded-lg ${
            response.includes('Error')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-gray-700 border border-green-200'
          }`}>
          {response.length > 400 ? response.substring(0, 400) + '...' : response}
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">{connectionStatus}</div>

      {needsUserIntervention && (
        <div className="bg-red-100 p-4 rounded-lg border border-red-300 mt-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">User Action Required</h3>
          <p className="text-sm text-red-700 mb-3">Some answers were incorrect. Please manually:</p>
          <ol className="list-decimal pl-5 text-sm text-red-700 mb-3">
            <li>Click "Try Again" button</li>
            <li>Select the correct answers</li>
            <li>Click "Check Answers"</li>
            <li>Once you see the "Next" button, click the Resume button below</li>
          </ol>
          <button
            onClick={handleResumeAutomation}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200">
            Resume Automation
          </button>
        </div>
      )}

      <div className="absolute top-2 left-2 cursor-move opacity-50 hover:opacity-100">⋮⋮</div>
    </div>
  );
}

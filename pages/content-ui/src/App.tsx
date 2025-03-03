import { useState, useEffect } from 'react';
import { useMessageHandler } from './hooks/useMessageHandler';
import {
  processCurrentContent,
  debugPageContent,
  hasTryAgainButton,
  clickNextButton,
  isExamSubmissionDialogPresent,
  clickSubmitExamButton,
} from './utils/contentHandler';
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
  const [examSubmissionDetected, setExamSubmissionDetected] = useState<boolean>(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  // Remove the draggable functionality for now
  useEffect(() => {
    // We'll keep this empty for now and implement draggable later
  }, []);

  // Add keyframe animation for robot
  useEffect(() => {
    // Create style element for keyframes if it doesn't exist
    const existingStyle = document.getElementById('robot-animation-style');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'robot-animation-style';
      style.textContent = `
        @keyframes moveRobot {
          0% {
            left: 0;
          }
          50% {
            left: calc(100% - 60px);
          }
          100% {
            left: 0;
          }
        }
        
        .robot-container {
          position: relative;
          width: 100%;
          height: 100px;
          overflow: hidden;
        }
        
        .robot {
          position: absolute;
          left: 0;
          animation: moveRobot 5s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // Clean up on unmount
    return () => {
      const style = document.getElementById('robot-animation-style');
      if (style) {
        document.head.removeChild(style);
      }
    };
  }, []);

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

          // Check for exam submission dialog
          const submissionDialogPresent = isExamSubmissionDialogPresent();
          if (submissionDialogPresent) {
            setExamSubmissionDetected(true);
            console.log('Exam submission dialog detected');

            // Automatically click the Submit Exam button
            const clicked = await clickSubmitExamButton();
            if (clicked) {
              console.log('Successfully clicked Submit Exam button');
              setDebugInfo(prev => prev + '\n\nEXAM SUBMISSION:\nClicked "Submit Exam" button');
            }
          } else {
            setExamSubmissionDetected(false);
          }

          // Check if there's a Try Again button before processing
          if (hasTryAgainButton()) {
            console.log('Found Try Again button - user intervention needed');
            setNeedsUserIntervention(true);
            setProcessingContent(false);
            return;
          }

          // Process the current content
          // eslint-disable-next-line prettier/prettier
          const detectedContentType = await processCurrentContent(questionData => {
            // Only send actual questions to OpenAI, not text content
            if (questionData.type === 'text_content' || questionData.type === 'unknown') {
              console.log(`Skipping OpenAI processing for ${questionData.type} content`);
              return Promise.resolve({ answers: [] });
            }
            // Process actual questions with OpenAI
            return handleOpenAIProcessing(questionData);
          });

          // eslint-disable-next-line prettier/prettier
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
              // Clear debug info and content state when moving to next content
              setDebugInfo('');
              setCurrentQA(null);
              setContentType(null);
              setAiStatus('idle');
            }
          }

          // For any new content, clear the previous debug info and content state
          if (detectedContentType !== 'unknown') {
            setDebugInfo('');
            setCurrentQA(null);
            setContentType(null);
            setAiStatus('idle');
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
      } else if (questionData.type === 'multiple_choice' || questionData.type === 'unit_exam') {
        prompt = `
You are a real estate exam expert. Answer the following multiple choice question with precision:

${questionData.type === 'unit_exam' ? '' : 'Title: ' + questionData.title + '\n'}
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
    } else if (questionType === 'multiple_choice' || questionType === 'unit_exam') {
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

      // Process the current content with the same filtering logic
      // eslint-disable-next-line prettier/prettier
      const detectedContentType = await processCurrentContent(questionData => {
        // Only send actual questions to OpenAI, not text content
        if (questionData.type === 'text_content' || questionData.type === 'unknown') {
          console.log(`Skipping OpenAI processing for ${questionData.type} content`);
          return Promise.resolve({ answers: [] });
        }
        // Process actual questions with OpenAI
        return handleOpenAIProcessing(questionData);
      });

      // eslint-disable-next-line prettier/prettier
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
    <div
      id="real-estate-exam-extension"
      className="fixed z-50 flex flex-col gap-4 rounded-lg bg-white pt-4 pb-6 px-6 shadow-xl w-[400px] border border-gray-200"
      style={{
        top: '50px',
        right: '20px',
        left: 'auto',
        bottom: 'auto',
      }}>
      {showInstructions && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 ">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h2>
          <p className="text-blue-700">Go to your lesson page and click "Let's Go" to start.</p>
        </div>
      )}

      {/* Add divider between instructions and buttons */}
      {showInstructions && <hr className="border-gray-200 my-1" />}

      {examStarted && !showInstructions && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 robot-container">
          <div className="text-6xl robot">🤖</div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Main action button in its own container */}
        <div className="w-full">
          <button
            onClick={handleStartExam}
            disabled={examStarted || processingContent || isProcessingQuestion}
            className={`w-full py-3 h-14 flex items-center justify-center ${
              examStarted
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } font-semibold rounded-lg transition-colors duration-200 text-lg shadow-sm`}>
            {examStarted ? 'Automating' : "Let's Go"}
          </button>
        </div>

        {/* Secondary buttons in their own container - only show when exam has started */}
        {examStarted && (
          <div className="flex gap-2">
            <button
              onClick={handleDebugToggle}
              className={`px-4 py-2.5 flex-1 ${
                debugMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
              } font-medium rounded-lg transition-colors duration-200 text-base`}>
              {debugMode ? 'Debug: ON' : 'Debug'}
            </button>

            <button
              onClick={handleClearCache}
              className="px-4 py-2.5 flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-lg transition-colors duration-200 text-base">
              Reset State
            </button>
          </div>
        )}
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
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 text-base">
            Resume Automation
          </button>
        </div>
      )}

      {examSubmissionDetected && (
        <div className="bg-green-100 p-4 rounded-lg border border-green-300 mt-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Exam Submission</h3>
          <p className="text-sm text-green-700 mb-3">
            Exam submission dialog detected. The "Submit Exam" button will be clicked automatically.
          </p>
        </div>
      )}
    </div>
  );
}

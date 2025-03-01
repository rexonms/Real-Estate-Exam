import { useState, useEffect } from 'react';
import { useMessageHandler } from './hooks/useMessageHandler';

interface ExamData {
  question: string;
  choices: string[];
  type: 'multiple-choice' | 'yes-no' | 'text-only' | 'matching' | 'true-false';
  title?: string;
  matches?: string[]; // Array of items to match with choices
  scenarios?: string[]; // Array of scenarios for true-false questions
}

export default function App() {
  const { connectionStatus, setMessage, response, sendMessage, clearResponse } = useMessageHandler();

  const [examStarted, setExamStarted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [currentQA, setCurrentQA] = useState<{ question: string; answer?: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [automationPaused, setAutomationPaused] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examStarted && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [examStarted, remainingTime]);

  const selectAnswer = (answerText: string | string[]) => {
    console.log('Selecting answer:', answerText);

    // Handle multiple answers (select all that apply)
    if (Array.isArray(answerText)) {
      const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.checkbox, label.radio'));
      console.log(
        'Found labels:',
        labels.map(l => l.textContent?.trim()),
      );

      let allSelected = true;

      for (const answer of answerText) {
        let found = false;

        for (const label of labels) {
          const labelText = label.textContent?.trim();

          if (labelText === answer) {
            console.log(`Found matching label for "${answer}", clicking...`);
            label.click();
            found = true;

            // Wait a moment to ensure the click registers - reduced from 300ms to 150ms
            setTimeout(() => {
              // Check if the label now has the 'selected' class
              if (!label.classList.contains('selected')) {
                console.log('Label not selected after click, trying again...');
                label.click();
              }
            }, 150);

            break;
          }
        }

        if (!found) {
          console.log(`Could not find label for answer: "${answer}"`);
          allSelected = false;
        }
      }

      return allSelected;
    }

    // Handle single answer (radio buttons or single checkbox)
    const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.radio, label.checkbox'));
    console.log(
      'Found labels:',
      labels.map(l => l.textContent?.trim()),
    );

    for (const label of labels) {
      const labelText = label.textContent?.trim();
      console.log('Checking label:', labelText, 'against answer:', answerText);

      if (labelText === answerText) {
        console.log('Found matching label, clicking...');
        label.click();

        // Wait a moment for the button to become enabled - reduced from 500ms to 250ms
        setTimeout(() => {
          const nextButton = document.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn');
          if (nextButton && nextButton.disabled) {
            console.log('Next button is still disabled after selecting answer, trying again...');
            label.click();
          }
        }, 250);

        return true;
      }
    }

    console.log('No matching label found');
    return false;
  };

  const clickNextButton = async () => {
    console.log('Attempting to find next button...');

    // Check for text-only content Next button
    const textOnlyContainer = document.querySelector('.ces-inquiry-text');
    if (textOnlyContainer) {
      console.log('Found ces-inquiry-text container');
      const textNextBtn = textOnlyContainer.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn');

      if (textNextBtn) {
        const buttonText = textNextBtn.textContent?.trim() || '';
        console.log('Found text-only content Next button with text:', buttonText);

        // Skip buttons that contain "Continue to Final Exam" or similar text
        if (
          buttonText.includes('Continue to Final Exam') ||
          (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
        ) {
          console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
          return false;
        }

        // Log the delay but click immediately
        const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
        console.log(
          `Found text-only content Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
        );
        textNextBtn.click();
        clearResponse();
        return true;
      }
    }

    // Check for key points view Continue button
    const keyPointsView = document.querySelector('.product-node-keypoints-view');
    if (keyPointsView) {
      console.log('Found product-node-keypoints-view container');
      const keyPointsContinueBtn = keyPointsView.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn');

      if (keyPointsContinueBtn) {
        const buttonText = keyPointsContinueBtn.textContent?.trim() || '';
        console.log('Found key points Continue button with text:', buttonText);

        // Skip buttons that contain "Continue to Final Exam" or similar text
        if (
          buttonText.includes('Continue to Final Exam') ||
          (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
        ) {
          console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
          return false;
        }

        // Log the delay but click immediately
        const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
        console.log(
          `Found key points Continue button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
        );
        keyPointsContinueBtn.click();
        clearResponse();
        return true;
      }
    }

    // Check for "Check Answers" button first (for multiple choice questions)
    const checkAnswersBtn = document.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn:not([disabled])');
    if (checkAnswersBtn && checkAnswersBtn.textContent?.includes('Check Answers')) {
      console.log('Found enabled Check Answers button, clicking...');
      checkAnswersBtn.click();
      clearResponse();
      return true;
    }

    // Try the new format first
    const unitNextBtn = document.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn:not([disabled])');
    if (unitNextBtn) {
      // Skip buttons that contain "Continue to Final Exam" or similar text
      const buttonText = unitNextBtn.textContent?.trim() || '';
      if (
        buttonText.includes('Continue to Final Exam') ||
        (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
      ) {
        console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
        return false;
      }

      // If it's a "Next" button, add a short delay before clicking
      if (buttonText.includes('Next')) {
        const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
        console.log(`Found enabled Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`);
        unitNextBtn.click();
        clearResponse();
        return true;
      }

      console.log('Found enabled Unit Next button, clicking...');
      unitNextBtn.click();
      clearResponse();
      return true;
    }

    // Check if there's a disabled next button that needs an answer first
    const disabledNextBtn = document.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn[disabled]');
    if (disabledNextBtn) {
      console.log('Found disabled Next button, need to select an answer first');

      // Try to find and click any radio button or checkbox to select an answer
      const anyOption = document.querySelector<HTMLLabelElement>('label.radio, label.checkbox');
      if (anyOption) {
        console.log('Selecting the first available answer');
        anyOption.click();

        // Add a short delay to allow the button to become enabled
        console.log('Waiting for Next button to become enabled...');
        await new Promise(resolve => setTimeout(resolve, 250));

        // Try clicking the now-enabled button
        const enabledBtn = document.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn:not([disabled])');
        if (enabledBtn) {
          // Skip buttons that contain "Continue to Final Exam" or similar text
          const buttonText = enabledBtn.textContent?.trim() || '';
          if (
            buttonText.includes('Continue to Final Exam') ||
            (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
          ) {
            console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
            return false;
          }

          console.log('Next button is now enabled, clicking immediately...');
          enabledBtn.click();
          clearResponse();
          return true;
        } else {
          console.log('Next button did not become enabled after selecting an answer');
        }

        return true;
      }
    }

    // Fall back to the previous button formats if needed
    const nextBtn = document.querySelector<HTMLButtonElement>('button.btn-next:not([disabled])');
    if (nextBtn) {
      // Skip buttons that contain "Continue to Final Exam" or similar text
      const buttonText = nextBtn.textContent?.trim() || '';
      if (
        buttonText.includes('Continue to Final Exam') ||
        (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
      ) {
        console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
        return false;
      }

      // If it's a "Next" button, add a short delay before clicking
      if (buttonText.includes('Next')) {
        const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
        console.log(`Found enabled Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`);
        nextBtn.click();
        clearResponse();
        return true;
      }

      console.log('Found enabled Next button, clicking...');
      nextBtn.click();
      clearResponse();
      return true;
    }

    const checkAnswersOldBtn = document.querySelector<HTMLButtonElement>('button.btn-check:not([disabled])');
    if (checkAnswersOldBtn) {
      console.log('Found enabled Check Answers button, clicking...');
      checkAnswersOldBtn.click();
      clearResponse();
      return true;
    }

    const continueBtn = document.querySelector<HTMLButtonElement>('button.btn-continue:not([disabled])');
    if (continueBtn) {
      // Skip buttons that contain "Continue to Final Exam" or similar text
      const buttonText = continueBtn.textContent?.trim() || '';
      if (
        buttonText.includes('Continue to Final Exam') ||
        (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
      ) {
        console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
        return false;
      }

      // Add a short delay before clicking Continue button
      const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
      console.log(
        `Found enabled Continue button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
      );
      continueBtn.click();
      clearResponse();
      return true;
    }

    // Log all buttons to help with debugging
    console.log(
      'No clickable button found. Available buttons:',
      Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim(),
        class: b.className,
        disabled: b.hasAttribute('disabled'),
      })),
    );

    return false;
  };

  const extractExamData = (): ExamData | null => {
    console.log('Starting extractExamData...');

    // Check for key points view
    const keyPointsView = document.querySelector('.product-node-keypoints-view');
    if (keyPointsView) {
      console.log('Found product-node-keypoints-view container');

      // Get the title
      const titleElement = keyPointsView.querySelector('.keypoints-title');
      const title = titleElement?.textContent?.trim() || '';

      // Get the content (key points)
      const keyPointsList = keyPointsView.querySelectorAll('li.content-text');
      const keyPoints = Array.from(keyPointsList).map(item => item.textContent?.trim() || '');

      console.log('Key points title:', title);
      console.log('Found key points:', keyPoints.length);

      // Combine title and key points into a single text
      let content = title ? `${title}\n\n` : '';
      keyPoints.forEach((point, index) => {
        content += `${index + 1}. ${point}\n`;
      });

      return {
        question: content,
        choices: [],
        type: 'text-only',
        title: title || undefined,
      };
    }

    // Check for true-false questions (commingling/conversion type)
    const tofContainer = document.querySelector('.ces-inquiry-tof');
    if (tofContainer) {
      console.log('Found ces-inquiry-tof container');

      // Get the title and question text
      const contentTitle = tofContainer.querySelector('.content-title');
      const contentText = tofContainer.querySelector('.content-text');

      const title = contentTitle?.textContent?.trim() || '';
      const questionText = contentText?.textContent?.trim() || '';

      console.log('Title:', title);
      console.log('Question text:', questionText);

      // Get all scenarios
      const scenarioElements = Array.from(tofContainer.querySelectorAll('.tof-choice-text'));
      const scenarios = scenarioElements.map(item => item.textContent?.trim() || '');

      console.log('Found scenarios:', scenarios);

      // Get the options (usually just two options like "Commingling" and "Conversion")
      const firstChoiceBox = tofContainer.querySelector('.tof-choice-box');
      const optionLabels = Array.from(firstChoiceBox?.querySelectorAll('label.radio') || []);
      const options = optionLabels.map(label => label.textContent?.trim() || '').filter(text => text !== '');

      console.log('Found options for true-false:', options);

      if (scenarios.length > 0 && options.length > 0) {
        return {
          question: title ? `${title}\n\n${questionText}` : questionText,
          choices: options,
          scenarios: scenarios,
          type: 'true-false',
        };
      }
    }

    // Check for matching questions
    const matchingContainer = document.querySelector('.ces-inquiry-matching');
    if (matchingContainer) {
      console.log('Found ces-inquiry-matching container');

      // Get the title and question text
      const contentTitle = matchingContainer.querySelector('.content-title');
      const contentText = matchingContainer.querySelector('.content-text');

      const title = contentTitle?.textContent?.trim() || '';
      const questionText = contentText?.textContent?.trim() || '';

      console.log('Title:', title);
      console.log('Question text:', questionText);

      // Get all matching items
      const matchingItems = Array.from(document.querySelectorAll('.matching-choice-text'))
        .map(item => item.textContent?.trim() || '')
        .filter(text => text !== '');

      console.log('Found matching items:', matchingItems);

      // Get all possible choices (answers)
      const choiceLabels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.radio'));
      const choices = [
        ...new Set(choiceLabels.map(label => label.textContent?.trim() || '').filter(text => text !== '')),
      ];

      console.log('Found choices for matching:', choices);

      if (matchingItems.length > 0 && choices.length > 0) {
        return {
          question: title ? `${title}\n\n${questionText}` : questionText,
          choices,
          matches: matchingItems,
          type: 'matching',
        };
      }
    }

    // First try the panel-body pattern (exam questions)
    const questionContainer = document.querySelector('.panel-body');
    if (questionContainer) {
      console.log('Found panel-body container');
      const questionElement = questionContainer.querySelector('.content-text');
      const questionText = questionElement?.textContent?.trim() || '';

      const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.radio'));
      const choices = labels.map(label => label.textContent?.trim() || '').filter(text => text !== '');

      if (!questionText) {
        console.log('Could not extract question text');
        return null;
      }

      // If we have no choices, treat it as text-only content
      if (choices.length === 0) {
        return {
          question: questionText,
          choices: [],
          type: 'text-only',
        };
      }

      const isYesNo = choices.length === 2 && choices[0].toLowerCase() === 'yes' && choices[1].toLowerCase() === 'no';

      return {
        question: questionText,
        choices,
        type: isYesNo ? 'yes-no' : 'multiple-choice',
      };
    }

    // Try the multi-choice container (new format)
    const multiChoiceContainer = document.querySelector('.ces-inquiry-multi-choice');
    if (multiChoiceContainer) {
      console.log('Found ces-inquiry-multi-choice container');

      // Get the title and question text
      const contentTitle = multiChoiceContainer.querySelector('.content-title');
      const contentText = multiChoiceContainer.querySelector('.content-text');

      const title = contentTitle?.textContent?.trim() || '';
      const questionText = contentText?.textContent?.trim() || '';

      console.log('Title:', title);
      console.log('Question text:', questionText);

      // Get all checkbox labels
      const checkboxLabels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.checkbox'));
      console.log('Found checkbox labels:', checkboxLabels.length);

      if (checkboxLabels.length > 0) {
        const choices = checkboxLabels.map(label => label.textContent?.trim() || '').filter(text => text !== '');

        console.log('Extracted choices:', choices);

        // Check if this is an "Allowed/Not allowed" question format
        const hasAllowedFormat = choices.some(c => c === 'Allowed' || c === 'Not allowed');

        // Check if the question contains "select all that apply" text
        const isMultiSelect =
          questionText.toLowerCase().includes('select all that apply') ||
          questionText.match(/which\s+(\w+\s+){0,3}of these/i) !== null;

        return {
          question: title ? `${title}\n\n${questionText}` : questionText,
          choices,
          type: isMultiSelect ? 'multiple-choice' : 'multiple-choice', // Always treat as multiple choice
        };
      }
    }

    // Try the segment-box pattern (old format)
    const segmentBox = document.querySelector('.segment-box.node-content-box');
    if (segmentBox) {
      console.log('Found segment-box container');

      const contentTitle = segmentBox.querySelector('.content-title');
      const contentText = segmentBox.querySelector('.content-text');

      const title = contentTitle?.textContent?.trim() || '';
      const questionText = contentText?.textContent?.trim() || '';

      console.log('Title:', title);
      console.log('Question text:', questionText);

      // Check for checkbox labels (select all that apply)
      const checkboxLabels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.checkbox'));
      console.log('Found checkbox labels:', checkboxLabels.length);

      if (checkboxLabels.length > 0) {
        console.log('Found checkbox labels (select all that apply)');
        const choices = checkboxLabels.map(label => label.textContent?.trim() || '').filter(text => text !== '');

        console.log('Extracted choices:', choices);

        // Check if the question contains "select all that apply" text
        const isMultiSelect =
          questionText.toLowerCase().includes('select all that apply') ||
          questionText.match(/which\s+(\w+\s+){0,3}of these/i) !== null;

        return {
          question: title ? `${title}\n\n${questionText}` : questionText,
          choices,
          type: isMultiSelect ? 'multiple-choice' : 'multiple-choice', // Always treat as multiple choice
        };
      }
    }

    // Try the ces-inquiry-text pattern (text content)
    const inquiryContainer = document.querySelector('.ces-inquiry-text');
    if (inquiryContainer) {
      console.log('Found ces-inquiry-text container');

      // Try to get the title if available
      const titleElement = inquiryContainer.querySelector('.content-title');
      const contentElement = inquiryContainer.querySelector('.content-text');

      const title = titleElement?.textContent?.trim() || '';
      const content = contentElement?.textContent?.trim() || '';

      if (!content) {
        console.log('Could not extract content from ces-inquiry-text');
        return null;
      }

      return {
        question: title ? `${title}\n\n${content}` : content,
        choices: [],
        type: 'text-only',
        title: title || undefined,
      };
    }

    console.log('No recognized content container found');
    return null;
  };

  const handleAnswer = async (response: { aiResponse: string }) => {
    console.log('Processing answer:', response);
    if (!response?.aiResponse) {
      throw new Error('No answer in response');
    }

    const examData = extractExamData();
    if (!examData) {
      throw new Error('Could not extract exam data');
    }

    // Add retry mechanism for invalid responses
    const maxRetries = 2;
    let currentTry = 0;
    let validResponse = false;
    let processedResponse = response;

    while (!validResponse && currentTry <= maxRetries) {
      try {
        if (examData.type === 'true-false') {
          console.log('Processing true-false question response');

          // Parse the response format "1-A, 2-B, 3-A, 4-B"
          const scenarioAnswers = processedResponse.aiResponse.split(',').map(pair => pair.trim());
          console.log('Scenario answers:', scenarioAnswers);

          // Validate response format
          const validFormat = scenarioAnswers.every(answer => /^\d+-[A-Z]$/.test(answer.trim()));
          if (!validFormat) {
            throw new Error(`Invalid response format: ${processedResponse.aiResponse}`);
          }

          // Track if all selections were successful
          let allSelected = true;

          // Process each scenario answer
          for (const answer of scenarioAnswers) {
            // Extract the scenario number and choice letter
            const match = answer.match(/(\d+)-([A-Z])/);
            if (!match) {
              console.log(`Invalid answer format: ${answer}`);
              continue;
            }

            const scenarioNumber = parseInt(match[1]);
            const choiceLetter = match[2];

            // Convert letter to index (A=0, B=1, etc.)
            const choiceIndex = choiceLetter.charCodeAt(0) - 65;

            if (scenarioNumber < 1 || scenarioNumber > (examData.scenarios?.length || 0)) {
              console.log(`Scenario number ${scenarioNumber} is out of range`);
              allSelected = false;
              continue;
            }

            if (choiceIndex < 0 || choiceIndex >= examData.choices.length) {
              console.log(`Choice letter ${choiceLetter} is out of range`);
              allSelected = false;
              continue;
            }

            const scenarioText = examData.scenarios?.[scenarioNumber - 1] || '';
            const choiceText = examData.choices[choiceIndex];

            console.log(`For scenario ${scenarioNumber} (${scenarioText}), selecting ${choiceLetter} (${choiceText})`);

            // Find the corresponding choice box
            const choiceBoxes = document.querySelectorAll('.tof-choice-box');
            if (scenarioNumber <= choiceBoxes.length) {
              const choiceBox = choiceBoxes[scenarioNumber - 1];

              // Find the label with the matching choice text
              const labels = Array.from(choiceBox.querySelectorAll<HTMLLabelElement>('label.radio'));
              console.log(`Found ${labels.length} labels in choice box ${scenarioNumber}`);

              let found = false;
              for (const label of labels) {
                const labelText = label.textContent?.trim();
                console.log(`Checking label: "${labelText}" against choice: "${choiceText}"`);

                if (labelText === choiceText) {
                  console.log(`Found matching label, clicking...`);
                  label.click();
                  found = true;

                  // Wait a moment to ensure the click registers
                  await new Promise(resolve => setTimeout(resolve, 150));
                  break;
                }
              }

              if (!found) {
                console.log(`Could not find label for choice: "${choiceText}" in choice box ${scenarioNumber}`);
                allSelected = false;
              }
            } else {
              console.log(`Choice box ${scenarioNumber} not found`);
              allSelected = false;
            }
          }

          setCurrentQA(prev => ({
            ...prev!,
            answer: processedResponse.aiResponse,
            timestamp: new Date().toISOString(),
          }));

          // Click the "Check Answers" button if all selections were successful
          if (allSelected) {
            // Add a delay of 5-10 seconds before clicking the Check Answers button
            const delayTime = Math.floor(Math.random() * 5000) + 5000; // Random delay between 5-10 seconds
            console.log(`Waiting ${delayTime / 1000} seconds before clicking Check Answers button...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));

            // Try multiple possible selectors for the Check Answers button
            const checkButton = document.querySelector<HTMLButtonElement>(
              '.ces-inquiry-tof button.check, ' +
                '.ces-inquiry-tof button.unit-btn.next-unit-btn, ' +
                'button.unit-btn.next-unit-btn:not([disabled]), ' +
                'button.check',
            );

            if (checkButton) {
              console.log('Found Check Answers button with text:', checkButton.textContent);
              console.log('Clicking Check Answers button');
              checkButton.click();

              // Wait for the "Next" button to appear after checking answers
              console.log('Waiting for Next button to appear after checking answers...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for UI to update

              // Check if answers were correct by looking for feedback element
              const feedbackElement = document.querySelector('.feedback');
              const isCorrect = feedbackElement?.classList.contains('correct');
              console.log('Feedback element found:', !!feedbackElement, 'Is correct:', isCorrect);

              if (isCorrect) {
                // If answers are correct, look for the Next button
                console.log('Answers are correct, looking for Next button');
                const nextButton = document.querySelector<HTMLButtonElement>(
                  '.ces-inquiry-tof button.unit-btn.next-unit-btn:not([disabled]), ' +
                    'button.unit-btn.next-unit-btn:not([disabled])',
                );

                // Skip buttons that contain "Continue to Final Exam" or similar text
                if (nextButton) {
                  const buttonText = nextButton.textContent?.trim() || '';
                  if (
                    buttonText.includes('Continue to Final Exam') ||
                    (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
                  ) {
                    console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
                  } else if (buttonText.includes('Next')) {
                    console.log('Found Next button, clicking...');
                    // Add a short delay before clicking Next button
                    const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
                    console.log(
                      `Found enabled Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
                    );
                    nextButton.click();
                  } else {
                    console.log('Next button not found after correct answers');
                  }
                } else {
                  console.log('Next button not found after correct answers');
                }
              } else {
                // If answers are incorrect, look for Try Again button
                console.log('Answers are incorrect, looking for Try Again button');
                const tryAgainButton = document.querySelector<HTMLButtonElement>(
                  '.ces-inquiry-tof button.unit-btn.next-unit-btn:not([disabled]), ' +
                    'button.unit-btn.next-unit-btn:not([disabled])',
                );

                if (tryAgainButton && tryAgainButton.textContent?.includes('Try Again')) {
                  console.log('Found Try Again button, stopping automation');
                  setAutomationPaused(true);
                  alert(
                    'Incorrect answers. Automation paused. Click "Let\'s Go" to continue manually, then click the "Resume" button to restart automation.',
                  );

                  // Click the "Let's Go" button to reset the question
                  setTimeout(() => {
                    const letsGoButton = document.querySelector<HTMLButtonElement>(
                      'button.btn-primary:not([disabled]), ' + 'button.btn:not([disabled])',
                    );

                    if (
                      letsGoButton &&
                      (letsGoButton.textContent?.includes("Let's Go") ||
                        letsGoButton.textContent?.includes('Try Again'))
                    ) {
                      console.log('Found "Let\'s Go" or "Try Again" button, clicking to reset question');
                      letsGoButton.click();
                    } else {
                      console.log(
                        'Could not find "Let\'s Go" or "Try Again" button. Available buttons:',
                        Array.from(document.querySelectorAll('button')).map(b => ({
                          text: b.textContent?.trim(),
                          class: b.className,
                          disabled: b.hasAttribute('disabled'),
                        })),
                      );
                    }
                  }, 1000); // Wait 1 second before looking for the Let's Go button

                  return; // Stop further processing
                } else {
                  console.log('Try Again button not found after incorrect answers');
                }
              }
            } else {
              console.log('Check Answers button not found. Looking for buttons with "Check" text');

              // Find buttons that contain "Check" in their text
              const allButtons = Array.from(document.querySelectorAll('button'));
              console.log(
                'Available buttons:',
                allButtons.map(b => ({
                  text: b.textContent?.trim(),
                  class: b.className,
                  disabled: b.hasAttribute('disabled'),
                })),
              );

              // Try to find a button with "Check" in its text
              const checkTextButton = allButtons.find(
                b => b.textContent?.includes('Check') && !b.hasAttribute('disabled'),
              );

              if (checkTextButton) {
                console.log('Found button with "Check" text:', checkTextButton.textContent);
                checkTextButton.click();
              } else {
                // Try clicking any enabled button that might be the check button
                const anyEnabledButton = document.querySelector<HTMLButtonElement>(
                  'button.unit-btn:not([disabled]), button:not([disabled])',
                );
                if (anyEnabledButton) {
                  console.log('Clicking fallback button:', anyEnabledButton.textContent);
                  anyEnabledButton.click();
                }
              }
            }
          } else {
            console.log('Not all selections were successful, not clicking Check Answers button');
          }

          validResponse = true;
        } else if (examData.type === 'matching') {
          // Parse the response format "1-A, 2-B, 3-C"
          const matchAnswers = processedResponse.aiResponse.split(',').map(pair => pair.trim());
          console.log('Match answers:', matchAnswers);

          // Validate response format
          const validFormat = matchAnswers.every(answer => /^\d+-[A-Z]$/.test(answer.trim()));
          if (!validFormat) {
            throw new Error(`Invalid response format: ${processedResponse.aiResponse}`);
          }

          // Track if all selections were successful
          let allSelected = true;

          // Process each match pair
          for (const pair of matchAnswers) {
            // Extract the item number and choice letter
            const match = pair.match(/(\d+)-([A-Z])/);
            if (!match) {
              console.log(`Invalid match pair format: ${pair}`);
              continue;
            }

            const itemNumber = parseInt(match[1]);
            const choiceLetter = match[2];

            // Convert letter to index (A=0, B=1, etc.)
            const choiceIndex = choiceLetter.charCodeAt(0) - 65;

            if (itemNumber < 1 || itemNumber > (examData.matches?.length || 0)) {
              console.log(`Item number ${itemNumber} is out of range`);
              allSelected = false;
              continue;
            }

            if (choiceIndex < 0 || choiceIndex >= examData.choices.length) {
              console.log(`Choice letter ${choiceLetter} is out of range`);
              allSelected = false;
              continue;
            }

            const itemText = examData.matches?.[itemNumber - 1] || '';
            const choiceText = examData.choices[choiceIndex];

            console.log(`Matching item ${itemNumber} (${itemText}) with choice ${choiceLetter} (${choiceText})`);

            // Find the matching item container
            const matchingBoxes = document.querySelectorAll('.matching-choice-box');
            if (itemNumber <= matchingBoxes.length) {
              const matchingBox = matchingBoxes[itemNumber - 1];

              // Find the choice label within this matching box
              const labels = Array.from(matchingBox.querySelectorAll<HTMLLabelElement>('label.radio'));
              console.log(`Found ${labels.length} labels in matching box ${itemNumber}`);

              // Find the label with the matching choice text
              let found = false;
              for (const label of labels) {
                const labelText = label.textContent?.trim();
                console.log(`Checking label: "${labelText}" against choice: "${choiceText}"`);

                if (labelText === choiceText) {
                  console.log(`Found matching label, clicking...`);
                  label.click();
                  found = true;

                  // Wait a moment to ensure the click registers
                  await new Promise(resolve => setTimeout(resolve, 150));
                  break;
                }
              }

              if (!found) {
                console.log(`Could not find label for choice: "${choiceText}" in matching box ${itemNumber}`);
                allSelected = false;
              }
            } else {
              console.log(`Matching box ${itemNumber} not found`);
              allSelected = false;
            }
          }

          setCurrentQA(prev => ({
            ...prev!,
            answer: processedResponse.aiResponse,
            timestamp: new Date().toISOString(),
          }));

          // Click the "Check Answers" button if all selections were successful
          if (allSelected) {
            // Add a delay of 5-10 seconds before clicking the Check Answers button
            const delayTime = Math.floor(Math.random() * 5000) + 5000; // Random delay between 5-10 seconds
            console.log(`Waiting ${delayTime / 1000} seconds before clicking Check Answers button...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));

            // Try multiple possible selectors for the Check Answers button
            const checkButton = document.querySelector<HTMLButtonElement>(
              '.ces-inquiry-matching button.check, ' +
                '.ces-inquiry-matching button.unit-btn.next-unit-btn:not([disabled]), ' +
                'button.unit-btn.next-unit-btn:not([disabled]), ' +
                'button.check',
            );

            if (checkButton) {
              console.log('Found Check Answers button with text:', checkButton.textContent);
              console.log('Clicking Check Answers button');
              checkButton.click();

              // Wait for the UI to update after checking answers
              console.log('Waiting for UI to update after checking answers...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for UI to update

              // Check if answers were correct by looking for feedback element
              const feedbackElement = document.querySelector('.feedback');
              const isCorrect = feedbackElement?.classList.contains('correct');
              console.log('Feedback element found:', !!feedbackElement, 'Is correct:', isCorrect);

              if (isCorrect) {
                // If answers are correct, look for the Next button
                console.log('Answers are correct, looking for Next button');
                const nextButton = document.querySelector<HTMLButtonElement>(
                  '.ces-inquiry-matching button.unit-btn.next-unit-btn:not([disabled]), ' +
                    'button.unit-btn.next-unit-btn:not([disabled])',
                );

                // Skip buttons that contain "Continue to Final Exam" or similar text
                if (nextButton) {
                  const buttonText = nextButton.textContent?.trim() || '';
                  if (
                    buttonText.includes('Continue to Final Exam') ||
                    (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
                  ) {
                    console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
                  } else if (buttonText.includes('Next')) {
                    console.log('Found Next button, clicking...');
                    // Add a short delay before clicking Next button
                    const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
                    console.log(
                      `Found enabled Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
                    );
                    nextButton.click();
                  } else {
                    console.log('Next button not found after correct answers');
                  }
                } else {
                  console.log('Next button not found after correct answers');
                }
              } else {
                // If answers are incorrect, look for Try Again button
                console.log('Answers are incorrect, looking for Try Again button');
                const tryAgainButton = document.querySelector<HTMLButtonElement>(
                  '.ces-inquiry-matching button.unit-btn.next-unit-btn:not([disabled]), ' +
                    'button.unit-btn.next-unit-btn:not([disabled])',
                );

                if (tryAgainButton && tryAgainButton.textContent?.includes('Try Again')) {
                  console.log('Found Try Again button, stopping automation');
                  setAutomationPaused(true);
                  alert(
                    'Incorrect answers. Automation paused. Click "Let\'s Go" to continue manually, then click the "Resume" button to restart automation.',
                  );

                  // Click the "Let's Go" button to reset the question
                  setTimeout(() => {
                    const letsGoButton = document.querySelector<HTMLButtonElement>(
                      'button.btn-primary:not([disabled]), ' + 'button.btn:not([disabled])',
                    );

                    if (
                      letsGoButton &&
                      (letsGoButton.textContent?.includes("Let's Go") ||
                        letsGoButton.textContent?.includes('Try Again'))
                    ) {
                      console.log('Found "Let\'s Go" or "Try Again" button, clicking to reset question');
                      letsGoButton.click();
                    } else {
                      console.log(
                        'Could not find "Let\'s Go" or "Try Again" button. Available buttons:',
                        Array.from(document.querySelectorAll('button')).map(b => ({
                          text: b.textContent?.trim(),
                          class: b.className,
                          disabled: b.hasAttribute('disabled'),
                        })),
                      );
                    }
                  }, 1000); // Wait 1 second before looking for the Let's Go button

                  return; // Stop further processing
                } else {
                  console.log('Try Again button not found after incorrect answers');
                }
              }
            } else {
              console.log('Check Answers button not found. Looking for buttons with "Check" text');

              // Find buttons that contain "Check" in their text
              const allButtons = Array.from(document.querySelectorAll('button'));
              console.log(
                'Available buttons:',
                allButtons.map(b => ({
                  text: b.textContent?.trim(),
                  class: b.className,
                  disabled: b.hasAttribute('disabled'),
                })),
              );

              // Try to find a button with "Check" in its text
              const checkTextButton = allButtons.find(
                b => b.textContent?.includes('Check') && !b.hasAttribute('disabled'),
              );

              if (checkTextButton) {
                console.log('Found button with "Check" text:', checkTextButton.textContent);
                checkTextButton.click();
              } else {
                // Try clicking any enabled button that might be the check button
                const anyEnabledButton = document.querySelector<HTMLButtonElement>(
                  'button.unit-btn:not([disabled]), button:not([disabled])',
                );
                if (anyEnabledButton) {
                  console.log('Clicking fallback button:', anyEnabledButton.textContent);
                  anyEnabledButton.click();
                }
              }
            }
          } else {
            console.log('Warning: Not all matches could be selected, not clicking Check Answers button');
          }

          validResponse = true;
        } else {
          // Handle multiple choice or select all that apply
          console.log('Processing multiple choice question response');

          // Check if this is a multi-select question
          const isMultiSelect =
            examData.question.toLowerCase().includes('select all that apply') ||
            examData.question.match(/which\s+(\w+\s+){0,3}of these/i) !== null;

          if (isMultiSelect) {
            // Handle multiple answers (select all that apply)
            const answerNumbers = processedResponse.aiResponse.split(',').map(num => parseInt(num.trim()));
            console.log('Answer numbers for multi-select:', answerNumbers);

            // Validate response format
            if (answerNumbers.some(isNaN)) {
              throw new Error(`Invalid answer format for multi-select: ${processedResponse.aiResponse}`);
            }

            // Get the answer texts
            const answerTexts = answerNumbers.map(num => {
              if (num < 1 || num > examData.choices.length) {
                throw new Error(`Answer number ${num} is out of range`);
              }
              return examData.choices[num - 1];
            });

            console.log(`Selecting multiple answers: ${answerTexts.join(', ')}`);

            setCurrentQA(prev => ({
              ...prev!,
              answer: `Selected: ${answerTexts.join(', ')} (Choices ${answerNumbers.join(', ')})`,
              timestamp: new Date().toISOString(),
            }));

            // Find and click the labels for each answer
            const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.checkbox, label.radio'));
            console.log(
              'Found labels:',
              labels.map(l => l.textContent?.trim()),
            );

            let allSelected = true;
            for (const answer of answerTexts) {
              let found = false;
              for (const label of labels) {
                const labelText = label.textContent?.trim();
                if (labelText === answer) {
                  console.log(`Found matching label for "${answer}", clicking...`);
                  label.click();
                  found = true;

                  // Wait a moment to ensure the click registers
                  await new Promise(resolve => setTimeout(resolve, 150));
                  break;
                }
              }

              if (!found) {
                console.log(`Could not find label for answer: "${answer}"`);
                allSelected = false;
              }
            }

            // Click the "Check Answers" button if all selections were successful
            if (allSelected) {
              // Add a delay of 5-10 seconds before clicking the Check Answers button
              const delayTime = Math.floor(Math.random() * 5000) + 5000; // Random delay between 5-10 seconds
              console.log(`Waiting ${delayTime / 1000} seconds before clicking Check Answers button...`);
              await new Promise(resolve => setTimeout(resolve, delayTime));

              // Try multiple possible selectors for the Check Answers button
              const checkButton = document.querySelector<HTMLButtonElement>(
                '.ces-inquiry-multi-choice button.check, ' +
                  '.ces-inquiry-multi-choice button.unit-btn.next-unit-btn:not([disabled]), ' +
                  'button.unit-btn.next-unit-btn:not([disabled]), ' +
                  'button.check',
              );

              if (checkButton) {
                console.log('Found Check Answers button with text:', checkButton.textContent);
                console.log('Clicking Check Answers button');
                checkButton.click();

                // Wait for the UI to update after checking answers
                console.log('Waiting for UI to update after checking answers...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for UI to update

                // Check if answers were correct by looking for feedback element
                const feedbackElement = document.querySelector('.feedback');
                const isCorrect = feedbackElement?.classList.contains('correct');
                console.log('Feedback element found:', !!feedbackElement, 'Is correct:', isCorrect);

                if (isCorrect) {
                  // If answers are correct, look for the Next button
                  console.log('Answers are correct, looking for Next button');
                  const nextButton = document.querySelector<HTMLButtonElement>(
                    '.ces-inquiry-multi-choice button.unit-btn.next-unit-btn:not([disabled]), ' +
                      'button.unit-btn.next-unit-btn:not([disabled])',
                  );

                  // Skip buttons that contain "Continue to Final Exam" or similar text
                  if (nextButton) {
                    const buttonText = nextButton.textContent?.trim() || '';
                    if (
                      buttonText.includes('Continue to Final Exam') ||
                      (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
                    ) {
                      console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
                    } else if (buttonText.includes('Next')) {
                      console.log('Found Next button, clicking...');
                      // Add a short delay before clicking Next button
                      const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
                      console.log(
                        `Found enabled Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
                      );
                      nextButton.click();
                    } else {
                      console.log('Next button not found after correct answers');
                    }
                  } else {
                    console.log('Next button not found after correct answers');
                  }
                } else {
                  // If answers are incorrect, look for Try Again button
                  console.log('Answers are incorrect, looking for Try Again button');
                  const tryAgainButton = document.querySelector<HTMLButtonElement>(
                    '.ces-inquiry-multi-choice button.unit-btn.next-unit-btn:not([disabled]), ' +
                      'button.unit-btn.next-unit-btn:not([disabled])',
                  );

                  if (tryAgainButton && tryAgainButton.textContent?.includes('Try Again')) {
                    console.log('Found Try Again button, stopping automation');
                    setAutomationPaused(true);
                    alert(
                      'Incorrect answers. Automation paused. Click "Let\'s Go" to continue manually, then click the "Resume" button to restart automation.',
                    );

                    // Click the "Let's Go" button to reset the question
                    setTimeout(() => {
                      const letsGoButton = document.querySelector<HTMLButtonElement>(
                        'button.btn-primary:not([disabled]), ' + 'button.btn:not([disabled])',
                      );

                      if (
                        letsGoButton &&
                        (letsGoButton.textContent?.includes("Let's Go") ||
                          letsGoButton.textContent?.includes('Try Again'))
                      ) {
                        console.log('Found "Let\'s Go" or "Try Again" button, clicking to reset question');
                        letsGoButton.click();
                      } else {
                        console.log(
                          'Could not find "Let\'s Go" or "Try Again" button. Available buttons:',
                          Array.from(document.querySelectorAll('button')).map(b => ({
                            text: b.textContent?.trim(),
                            class: b.className,
                            disabled: b.hasAttribute('disabled'),
                          })),
                        );
                      }
                    }, 1000); // Wait 1 second before looking for the Let's Go button

                    return; // Stop further processing
                  } else {
                    console.log('Try Again button not found after incorrect answers');
                  }
                }
              } else {
                console.log('Check Answers button not found. Looking for buttons with "Check" text');

                // Find buttons that contain "Check" in their text
                const allButtons = Array.from(document.querySelectorAll('button'));
                console.log(
                  'Available buttons:',
                  allButtons.map(b => ({
                    text: b.textContent?.trim(),
                    class: b.className,
                    disabled: b.hasAttribute('disabled'),
                  })),
                );

                // Try to find a button with "Check" in its text
                const checkTextButton = allButtons.find(
                  b => b.textContent?.includes('Check') && !b.hasAttribute('disabled'),
                );

                if (checkTextButton) {
                  console.log('Found button with "Check" text:', checkTextButton.textContent);
                  checkTextButton.click();
                } else {
                  // Try clicking any enabled button that might be the check button
                  const anyEnabledButton = document.querySelector<HTMLButtonElement>(
                    'button.unit-btn:not([disabled]), button:not([disabled])',
                  );
                  if (anyEnabledButton) {
                    console.log('Clicking fallback button:', anyEnabledButton.textContent);
                    anyEnabledButton.click();
                  }
                }
              }
            } else {
              console.log('Could not find label for answer, not clicking Check Answers button');
            }
          } else {
            // Handle single answer (radio buttons)
            const answerNumber = parseInt(processedResponse.aiResponse.trim());
            console.log('Answer number for single choice:', answerNumber);

            // Validate response format
            if (isNaN(answerNumber)) {
              throw new Error(`Invalid answer number: ${processedResponse.aiResponse}`);
            }

            if (answerNumber < 1 || answerNumber > examData.choices.length) {
              throw new Error(`Answer number ${answerNumber} is out of range`);
            }

            const answerText = examData.choices[answerNumber - 1];
            console.log(`Selecting answer ${answerNumber}: ${answerText}`);

            setCurrentQA(prev => ({
              ...prev!,
              answer: `Selected: ${answerText} (Choice ${answerNumber})`,
              timestamp: new Date().toISOString(),
            }));

            // Find and click the label for the answer
            const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label.radio, label.checkbox'));
            console.log(
              'Found labels:',
              labels.map(l => l.textContent?.trim()),
            );

            let found = false;
            for (const label of labels) {
              const labelText = label.textContent?.trim();
              if (labelText === answerText) {
                console.log(`Found matching label, clicking...`);
                label.click();
                found = true;

                // Wait a moment to ensure the click registers
                await new Promise(resolve => setTimeout(resolve, 150));
                break;
              }
            }

            // Click the "Check Answers" button if selection was successful
            if (found) {
              // Add a delay of 5-10 seconds before clicking the Check Answers button
              const delayTime = Math.floor(Math.random() * 5000) + 5000; // Random delay between 5-10 seconds
              console.log(`Waiting ${delayTime / 1000} seconds before clicking Check Answers button...`);
              await new Promise(resolve => setTimeout(resolve, delayTime));

              // Try multiple possible selectors for the Check Answers button
              const checkButton = document.querySelector<HTMLButtonElement>(
                '.ces-inquiry-multi-choice button.check, ' +
                  '.panel-body button.check, ' +
                  'button.unit-btn.next-unit-btn:not([disabled]), ' +
                  'button.check',
              );

              if (checkButton) {
                console.log('Found Check Answers button with text:', checkButton.textContent);
                console.log('Clicking Check Answers button');
                checkButton.click();

                // Wait for the UI to update after checking answers
                console.log('Waiting for UI to update after checking answers...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for UI to update

                // Check if answers were correct by looking for feedback element
                const feedbackElement = document.querySelector('.feedback');
                const isCorrect = feedbackElement?.classList.contains('correct');
                console.log('Feedback element found:', !!feedbackElement, 'Is correct:', isCorrect);

                if (isCorrect) {
                  // If answers are correct, look for the Next button
                  console.log('Answers are correct, looking for Next button');
                  const nextButton = document.querySelector<HTMLButtonElement>(
                    '.ces-inquiry-multi-choice button.unit-btn.next-unit-btn:not([disabled]), ' +
                      '.panel-body button.unit-btn.next-unit-btn:not([disabled]), ' +
                      'button.unit-btn.next-unit-btn:not([disabled])',
                  );

                  // Skip buttons that contain "Continue to Final Exam" or similar text
                  if (nextButton) {
                    const buttonText = nextButton.textContent?.trim() || '';
                    if (
                      buttonText.includes('Continue to Final Exam') ||
                      (buttonText.toLowerCase().includes('continue') && buttonText.toLowerCase().includes('exam'))
                    ) {
                      console.log('Found "Continue to Final Exam" button, skipping automatic click:', buttonText);
                    } else if (buttonText.includes('Next')) {
                      console.log('Found Next button, clicking...');
                      // Add a short delay before clicking Next button
                      const shortDelay = Math.floor(Math.random() * 1000) + 1000; // Random delay between 1-2 seconds
                      console.log(
                        `Found enabled Next button, clicking immediately (simulated ${shortDelay / 1000} second delay)...`,
                      );
                      nextButton.click();
                    } else {
                      console.log('Next button not found after correct answers');
                    }
                  } else {
                    console.log('Next button not found after correct answers');
                  }
                } else {
                  // If answers are incorrect, look for Try Again button
                  console.log('Answers are incorrect, looking for Try Again button');
                  const tryAgainButton = document.querySelector<HTMLButtonElement>(
                    '.ces-inquiry-multi-choice button.unit-btn.next-unit-btn:not([disabled]), ' +
                      '.panel-body button.unit-btn.next-unit-btn:not([disabled]), ' +
                      'button.unit-btn.next-unit-btn:not([disabled])',
                  );

                  if (tryAgainButton && tryAgainButton.textContent?.includes('Try Again')) {
                    console.log('Found Try Again button, stopping automation');
                    setAutomationPaused(true);
                    alert(
                      'Incorrect answers. Automation paused. Click "Let\'s Go" to continue manually, then click the "Resume" button to restart automation.',
                    );

                    // Click the "Let's Go" button to reset the question
                    setTimeout(() => {
                      const letsGoButton = document.querySelector<HTMLButtonElement>(
                        'button.btn-primary:not([disabled]), ' + 'button.btn:not([disabled])',
                      );

                      if (
                        letsGoButton &&
                        (letsGoButton.textContent?.includes("Let's Go") ||
                          letsGoButton.textContent?.includes('Try Again'))
                      ) {
                        console.log('Found "Let\'s Go" or "Try Again" button, clicking to reset question');
                        letsGoButton.click();
                      } else {
                        console.log(
                          'Could not find "Let\'s Go" or "Try Again" button. Available buttons:',
                          Array.from(document.querySelectorAll('button')).map(b => ({
                            text: b.textContent?.trim(),
                            class: b.className,
                            disabled: b.hasAttribute('disabled'),
                          })),
                        );
                      }
                    }, 1000); // Wait 1 second before looking for the Let's Go button

                    return; // Stop further processing
                  } else {
                    console.log('Try Again button not found after incorrect answers');
                  }
                }
              } else {
                console.log('Check Answers button not found. Looking for buttons with "Check" text');

                // Find buttons that contain "Check" in their text
                const allButtons = Array.from(document.querySelectorAll('button'));
                console.log(
                  'Available buttons:',
                  allButtons.map(b => ({
                    text: b.textContent?.trim(),
                    class: b.className,
                    disabled: b.hasAttribute('disabled'),
                  })),
                );

                // Try to find a button with "Check" in its text
                const checkTextButton = allButtons.find(
                  b => b.textContent?.includes('Check') && !b.hasAttribute('disabled'),
                );

                if (checkTextButton) {
                  console.log('Found button with "Check" text:', checkTextButton.textContent);
                  checkTextButton.click();
                } else {
                  // Try clicking any enabled button that might be the check button
                  const anyEnabledButton = document.querySelector<HTMLButtonElement>(
                    'button.unit-btn:not([disabled]), button:not([disabled])',
                  );
                  if (anyEnabledButton) {
                    console.log('Clicking fallback button:', anyEnabledButton.textContent);
                    anyEnabledButton.click();
                  }
                }
              }
            } else {
              console.log('Could not find label for answer, not clicking Check Answers button');
            }
          }

          validResponse = true;
        }
      } catch (error) {
        console.error(`Error processing response (attempt ${currentTry + 1}):`, error);

        if (currentTry < maxRetries) {
          console.log(`Retrying with more specific prompt (attempt ${currentTry + 2})...`);
          currentTry++;

          // Create a more specific prompt based on the error
          let retryPrompt = '';

          if (examData.type === 'true-false') {
            retryPrompt = `
I need ONLY the answer in the format "1-A, 2-B, 3-A, 4-B" for each scenario.
For example, if scenario 1 is commingling, respond with "1-A".
If scenario 2 is conversion, respond with "2-B".
Combine all answers with commas like: "1-A, 2-B, 3-A, 4-B"
Do not include any other text or explanations.`;
          } else if (examData.type === 'matching') {
            retryPrompt = `
I need ONLY the answer in the format "1-A, 2-B, 3-C" for each item.
For example, if item 1 matches with option A, respond with "1-A".
Combine all answers with commas like: "1-A, 2-B, 3-C"
Do not include any other text or explanations.`;
          } else if (examData.question.toLowerCase().includes('select all that apply')) {
            retryPrompt = `
I need ONLY the numbers of the correct answers separated by commas.
For example: "1,3,4"
Do not include any other text or explanations.`;
          } else {
            retryPrompt = `
I need ONLY the number of the correct answer.
For example: "2"
Do not include any other text or explanations.`;
          }

          console.log('Sending retry prompt:', retryPrompt);
          setMessage(retryPrompt);
          try {
            const retryResponse = await sendMessage(retryPrompt);
            processedResponse = retryResponse;
            console.log('Received retry response:', processedResponse);
          } catch (retryError) {
            console.error('Error getting retry response:', retryError);
            throw retryError;
          }
        } else {
          console.error('Exhausted all retry attempts');
          throw error;
        }
      }
    }
  };

  const sendToOpenAI = async (examData: ExamData) => {
    const isMultiSelect =
      examData.question.toLowerCase().includes('select all that apply') ||
      examData.question.match(/which\s+(\w+\s+){0,3}of these/i) !== null;

    let prompt = '';

    if (examData.type === 'true-false') {
      // Format true-false questions (like commingling/conversion)
      prompt = `
You are a real estate exam expert. Answer the following question with precision:

Question: ${examData.question}

Scenarios:
${examData.scenarios?.map((scenario, index) => `${index + 1}. ${scenario}`).join('\n')}

Options:
${examData.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`).join('\n')}

IMPORTANT REAL ESTATE CONCEPTS:
- Commingling: Mixing client funds with personal or business funds
- Conversion: Unauthorized use of client funds for personal purposes
- Trust accounts: Must be separate from personal/business accounts
- Earnest money: Must be deposited in trust accounts promptly
- Broker responsibilities: Must maintain separate accounts for client funds

For each numbered scenario (1, 2, 3, etc.), respond with the letter of the correct option.
Format your answer EXACTLY as "1-A, 2-B, 3-A, 4-B" etc. No explanation or additional text.`;
    } else if (examData.type === 'matching') {
      // Format matching questions differently
      prompt = `
You are a real estate exam expert. Answer the following question with precision:

Question: ${examData.question}

Items to Match:
${examData.matches?.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Possible Matches:
${examData.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`).join('\n')}

This is a matching question. For each numbered item (1, 2, 3, etc.), respond with the letter of the matching choice.
Format your answer EXACTLY as "1-A, 2-B, 3-C" etc. No explanation or additional text.`;
    } else {
      // Format regular questions with more context
      prompt = `
You are a real estate exam expert. Answer the following question with precision:

Question: ${examData.question}

Choices:
${examData.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n')}

${
  examData.type === 'yes-no'
    ? 'This is a Yes/No question. Please analyze it carefully and respond with ONLY the number: 1 for Yes, or 2 for No.'
    : isMultiSelect
      ? `This is a "select all that apply" question. Please analyze it carefully and respond with ONLY the numbers of ALL correct answers separated by commas (e.g., "1,3,4"). No explanation or additional text.`
      : `Please analyze the question and choices carefully. Respond with ONLY the number (1-${examData.choices.length}) of the correct answer.`
} No explanation or additional text.

IMPORTANT: Your answer must be ONLY the number(s) of the correct choice(s). Do not include any other text.`;
    }

    setMessage(prompt);
    return await sendMessage(prompt);
  };

  const handleTextContent = async () => {
    console.log('Processing text-only content...');

    // Check if we're in a ces-inquiry-text container
    const textOnlyContainer = document.querySelector('.ces-inquiry-text');
    if (textOnlyContainer) {
      console.log('Found ces-inquiry-text container for text-only content');

      // Get the title and content for logging
      const titleElement = textOnlyContainer.querySelector('.content-title');
      const contentElement = textOnlyContainer.querySelector('.content-text');

      const title = titleElement?.textContent?.trim() || '';
      const content = contentElement?.textContent?.trim() || '';
      console.log('Text-only content title:', title);
      console.log('Text-only content length:', content.length);

      // Check for the Next button directly
      const nextButton = textOnlyContainer.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn');
      if (nextButton) {
        console.log('Found Next button directly in text-only container:', nextButton.textContent);
      } else {
        console.log('No Next button found directly in text-only container');
      }
    }

    // Use a shorter delay for text-only content
    const delay = Math.floor(Math.random() * 500) + 500; // 0.5-1 second
    console.log(`Text-only content detected, waiting ${delay}ms before continuing...`);

    setCurrentQA(prev => ({
      ...prev!,
      answer: 'Reading content...',
    }));

    await new Promise(resolve => setTimeout(resolve, delay));

    // Try clicking the next button
    const success = await clickNextButton();

    if (!success) {
      console.log('Failed to click next button for text content, trying again with general selector');

      // Try a more general approach as a fallback
      const anyNextButton = document.querySelector<HTMLButtonElement>('button.unit-btn.next-unit-btn:not([disabled])');
      if (anyNextButton && anyNextButton.textContent?.includes('Next')) {
        console.log('Found general Next button, clicking as fallback');
        anyNextButton.click();
        return true;
      }

      // Try any button with "Next" in its text as a last resort
      const allButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
      const nextTextButton = allButtons.find(btn => btn.textContent?.includes('Next'));
      if (nextTextButton) {
        console.log('Found button with "Next" text as last resort, clicking:', nextTextButton.textContent);
        nextTextButton.click();
        return true;
      }

      console.error('Could not click any next button for text content');
      return false;
    }

    return true;
  };

  const clickNextUncheckedLesson = () => {
    console.log('Looking for the next unchecked lesson...');

    // Find all lesson items
    const lessonItems = Array.from(document.querySelectorAll('.child-box'));
    console.log(`Found ${lessonItems.length} lesson items`);

    // Loop through each lesson item to find the first unchecked one
    for (const item of lessonItems) {
      // Check if this lesson has an unchecked icon (not completed)
      const icon = item.querySelector('.fa-circle-thin, .fa-circle:not(.fa-check-circle)');
      if (icon) {
        // Get the lesson title for logging
        const titleElement = item.querySelector('.child-title');
        const lessonTitle = titleElement?.textContent?.trim() || 'Unknown lesson';

        console.log(`Found unchecked lesson: "${lessonTitle}"`);
        console.log('Clicking on this lesson...');

        // Click on the lesson item (with type assertion to HTMLElement)
        (item as HTMLElement).click();
        return true;
      }
    }

    console.log('No unchecked lessons found');
    return false;
  };

  const processContent = async () => {
    // If automation is paused, don't process content
    if (automationPaused) {
      console.log('Automation is paused. Click "Resume Automation" to continue.');
      return false;
    }

    // Check if we're on a lesson selection page by looking for lesson items
    const lessonItems = document.querySelectorAll('.child-box');
    if (lessonItems.length > 0) {
      console.log('Detected lesson selection page with', lessonItems.length, 'lessons');
      return clickNextUncheckedLesson();
    }

    // Clear any previous responses
    clearResponse();

    // Check for text-only content directly first for better logging
    const textOnlyContainer = document.querySelector('.ces-inquiry-text');
    if (textOnlyContainer) {
      console.log('Detected text-only content directly in processContent');
      const nextButton = textOnlyContainer.querySelector('button.unit-btn.next-unit-btn');
      console.log('Text-only content has Next button:', !!nextButton);
      if (nextButton) {
        console.log('Text-only Next button text:', nextButton.textContent?.trim());
        console.log('Text-only Next button disabled:', nextButton.hasAttribute('disabled'));
      }
    }

    const examData = extractExamData();
    if (!examData) {
      throw new Error('Could not extract exam data');
    }

    console.log('Extracted exam data type:', examData.type);

    setCurrentQA({
      question: examData.question,
      answer: examData.type === 'text-only' ? 'Reading content...' : 'Thinking...',
    });

    if (examData.type === 'text-only') {
      console.log('Handling text-only content...');
      return await handleTextContent();
    }

    const response = await sendToOpenAI(examData);
    await handleAnswer(response);
    return true;
  };

  const waitForNewContent = async (): Promise<boolean> => {
    console.log('Waiting for new content...');

    // Check if automation is paused
    if (automationPaused) {
      console.log('Automation is paused due to incorrect answers. Click "Resume" to continue.');
      return false;
    }

    // Wait for new content to appear
    const maxAttempts = 10;
    let attempts = 0;
    while (attempts < maxAttempts) {
      // Check for all possible content patterns
      const panelContainer = document.querySelector('.panel-body');
      const inquiryContainer = document.querySelector('.ces-inquiry-text');
      const segmentBox = document.querySelector('.segment-box.node-content-box');
      const multiChoiceContainer = document.querySelector('.ces-inquiry-multi-choice');
      const matchingContainer = document.querySelector('.ces-inquiry-matching');
      const tofContainer = document.querySelector('.ces-inquiry-tof');
      const keyPointsView = document.querySelector('.product-node-keypoints-view');

      // Check for buttons in each container
      const inquiryNextButton = inquiryContainer?.querySelector('button.unit-btn.next-unit-btn');
      const keyPointsNextButton = keyPointsView?.querySelector('button.unit-btn.next-unit-btn');
      const anyNextButton = document.querySelector('button.unit-btn.next-unit-btn');

      console.log('Content detection:', {
        panelContainer: !!panelContainer,
        inquiryContainer: !!inquiryContainer,
        segmentBox: !!segmentBox,
        multiChoiceContainer: !!multiChoiceContainer,
        matchingContainer: !!matchingContainer,
        tofContainer: !!tofContainer,
        keyPointsView: !!keyPointsView,
        inquiryNextButton: !!inquiryNextButton,
        keyPointsNextButton: !!keyPointsNextButton,
        anyNextButton: !!anyNextButton,
      });

      if (
        panelContainer ||
        inquiryContainer ||
        segmentBox ||
        multiChoiceContainer ||
        matchingContainer ||
        tofContainer ||
        keyPointsView
      ) {
        // Check specifically for text-only content in ces-inquiry-text
        if (inquiryContainer) {
          const nextButton = inquiryContainer.querySelector('button.unit-btn.next-unit-btn');
          console.log('Found ces-inquiry-text container with Next button:', !!nextButton);
          if (nextButton) {
            console.log('Text-only content Next button text:', nextButton.textContent?.trim());
            console.log('Text-only content Next button disabled:', nextButton.hasAttribute('disabled'));
          }
        }

        console.log(
          `Found content: ${
            panelContainer
              ? 'panel-body'
              : inquiryContainer
                ? 'ces-inquiry-text'
                : segmentBox
                  ? 'segment-box'
                  : matchingContainer
                    ? 'matching-question'
                    : tofContainer
                      ? 'true-false-question'
                      : keyPointsView
                        ? 'key-points-view'
                        : 'multi-choice'
          }`,
        );

        // Log all available labels to help with debugging
        const labels = Array.from(document.querySelectorAll('label.checkbox, label.radio'));
        console.log('Available labels:', labels.length);
        console.log(
          'Label texts:',
          labels.map(l => l.textContent?.trim()),
        );

        // Log all available buttons
        const buttons = Array.from(document.querySelectorAll('button'));
        console.log('Available buttons:', buttons.length);
        console.log(
          'Button texts:',
          buttons.map(b => ({
            text: b.textContent?.trim(),
            class: b.className,
            disabled: b.hasAttribute('disabled'),
          })),
        );

        // Clear any previous response when new content is found
        clearResponse();

        // Reduced from 500ms to 250ms
        await new Promise(resolve => setTimeout(resolve, 250));
        return true;
      }

      console.log('Waiting for new content...');
      // Keep this at 250ms to maintain the same number of checks
      await new Promise(resolve => setTimeout(resolve, 250));
      attempts++;
    }

    console.log('No content found after maximum attempts');
    return false;
  };

  const handleStartExam = async () => {
    console.log('Starting exam automation...');

    // Check if we already have content
    const initialContent = document.querySelector(
      '.segment-box.node-content-box, .panel-body, .ces-inquiry-text, .ces-inquiry-multi-choice, .ces-inquiry-matching, .ces-inquiry-tof, .product-node-keypoints-view',
    );
    if (initialContent) {
      console.log('Found initial content, processing...');
      await processContent();
    } else {
      console.log('No initial content found, waiting for content to appear...');
    }

    // Start the automation loop
    setExamStarted(true);

    // Set a timer to check for new content
    const checkInterval = setInterval(async () => {
      if (!examStarted) {
        console.log('Exam automation stopped');
        clearInterval(checkInterval);
        return;
      }

      try {
        const hasNewContent = await waitForNewContent();
        if (hasNewContent) {
          console.log('New content detected, processing...');
          await processContent();
        }
      } catch (error: any) {
        console.error('Error in automation loop:', error);
        setAutomationPaused(true);
        alert(`Automation paused due to error: ${error.message}`);
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  };

  // Add a function to resume automation
  const handleResumeAutomation = () => {
    console.log('Resuming automation...');
    setAutomationPaused(false);
    processContent();
  };

  return (
    <div className="fixed top-[50px] right-4 z-50 flex flex-col gap-4 rounded-lg bg-white p-6 shadow-xl w-[400px] border border-gray-200">
      {showInstructions && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h2>
          <ol className="list-decimal pl-4 space-y-2 text-blue-700">
            <li>Open your exam page and ensure you're ready to begin</li>
            <li>Click "Let's Go" to start the automated process</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2 italic">The automation will handle everything for you</p>
        </div>
      )}

      <button
        onClick={handleStartExam}
        className={`w-full py-3 ${
          examStarted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        } text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm`}
        disabled={examStarted}>
        {examStarted ? `Automation: (${remainingTime}s remaining)` : "Let's Go"}
      </button>

      {currentQA && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-gray-600 mb-1">Current Question:</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {currentQA.question.length > 400 ? currentQA.question.substring(0, 400) + '...' : currentQA.question}
            </p>
          </div>
          {currentQA.answer && (
            <div>
              <h3 className="text-xs font-semibold text-gray-600 mb-1">Answer:</h3>
              <p className="text-sm text-gray-800">
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

      <div className="absolute top-2 left-2 cursor-move opacity-50 hover:opacity-100">⋮⋮</div>
    </div>
  );
}

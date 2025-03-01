/**
 * Content detection and interaction utilities
 */

/**
 * Content types that can be detected
 */
export type ContentType = 'true_false' | 'multiple_choice' | 'unknown';

/**
 * Interface for question data
 */
export interface QuestionData {
  type: ContentType;
  contentId: string;
  title: string;
  question: string;
  choices: Array<{
    text: string;
    options: string[];
    optionElements?: HTMLElement[]; // Store DOM elements for direct interaction
  }>;
}

/**
 * Interface for answer data
 */
export interface AnswerData {
  answers: string[];
  explanation?: string;
}

// Store processed content IDs to prevent repeated processing
const processedContentIds = new Set<string>();

/**
 * Generates a content ID based on the content's title and question
 * @param title The content title
 * @param question The content question
 * @returns A unique identifier for the content
 */
const generateContentId = (title: string, question: string): string => {
  return `${title}::${question}`.replace(/\s+/g, '').toLowerCase();
};

/**
 * Checks if content has already been processed
 * @param contentId The content ID to check
 * @returns True if the content has already been processed
 */
export const hasContentBeenProcessed = (contentId: string): boolean => {
  return processedContentIds.has(contentId);
};

/**
 * Marks content as processed
 * @param contentId The content ID to mark as processed
 */
export const markContentAsProcessed = (contentId: string): void => {
  processedContentIds.add(contentId);
  console.log(`Marked content as processed: ${contentId}`);
  console.log(`Total processed content: ${processedContentIds.size}`);
};

/**
 * Detects the type of content currently displayed
 * @returns The detected content type
 */
export const detectContentType = (): ContentType => {
  const trueFalseElement = document.querySelector('.ces-inquiry-tof');
  const multipleChoiceElement = document.querySelector('.ces-inquiry-multi-choice');

  console.log('TRUE_FALSE Element:', trueFalseElement ? 'Found' : 'Not Found');
  console.log('MULTIPLE_CHOICE Element:', multipleChoiceElement ? 'Found' : 'Not Found');

  if (trueFalseElement) {
    return 'true_false';
  } else if (multipleChoiceElement) {
    return 'multiple_choice';
  } else {
    return 'unknown';
  }
};

/**
 * Checks if the current content is information-only with a "Next" button
 * @returns True if the content is information-only
 */
export const isInformationContent = (): boolean => {
  // Look for the inquiry text container
  const inquiryTextElement = document.querySelector('.ces-inquiry-text');
  if (!inquiryTextElement) return false;

  // Look for the next button
  const nextButton = inquiryTextElement.querySelector('.next-unit-btn');
  if (!nextButton) return false;

  // Look for content text
  const contentText = inquiryTextElement.querySelector('.content-text');
  if (!contentText) return false;

  return true;
};

/**
 * Checks if there are any incorrect answers after submitting
 * @returns True if the Try Again button is present
 */
export const hasTryAgainButton = (): boolean => {
  const tryAgainButton = document.querySelector('button.unit-btn.next-unit-btn[ng-click="ctrl.resetInquiry()"]');
  return !!tryAgainButton;
};

/**
 * Extracts question data from TRUE_FALSE content
 * @returns The extracted question data
 */
export const extractTrueFalseQuestionData = (): QuestionData | null => {
  try {
    // Get the title
    const titleElement = document.querySelector('.ces-inquiry-content .content-title');
    const title = titleElement ? titleElement.textContent?.trim() || '' : '';

    // Get the question text
    const questionElement = document.querySelector('.ces-inquiry-content .content-text');
    const question = questionElement ? questionElement.textContent?.trim() || '' : '';

    // Get the choices
    const choiceElements = document.querySelectorAll('.tof-choice-box');

    // Log all choice boxes for debugging
    console.log(`Found ${choiceElements.length} choice boxes`);

    const choices = Array.from(choiceElements).map((choiceElement, index) => {
      const textElement = choiceElement.querySelector('.tof-choice-text');
      const text = textElement ? textElement.textContent?.trim() || '' : '';

      console.log(`Choice ${index + 1} text: "${text}"`);

      const optionElements = choiceElement.querySelectorAll('label.radio');
      console.log(`Choice ${index + 1} has ${optionElements.length} options`);

      const optionElementsArray = Array.from(optionElements) as HTMLElement[];

      const options = optionElementsArray.map((optionElement, optIndex) => {
        const optText = optionElement.textContent?.trim() || '';
        console.log(`  Option ${optIndex + 1}: "${optText}"`);
        return optText;
      });

      return {
        text,
        options,
        optionElements: optionElementsArray,
      };
    });

    // Generate a content ID
    const contentId = generateContentId(title, question);

    // Log the extracted data for debugging
    console.log('Extracted TRUE_FALSE question data:', {
      title,
      question,
      choices: choices.map(c => ({
        text: c.text,
        options: c.options,
      })),
      contentId,
    });

    return {
      type: 'true_false',
      contentId,
      title,
      question,
      choices,
    };
  } catch (error) {
    console.error('Error extracting TRUE_FALSE question data:', error);
    return null;
  }
};

/**
 * Handles information-only content by clicking the "Next" button after a delay
 * @param delayMs Delay in milliseconds before clicking the button
 * @returns Promise that resolves when the action is complete
 */
export const handleInformationContent = (delayMs: number = 3000): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const nextButton = document.querySelector('.ces-inquiry-text .next-unit-btn') as HTMLButtonElement;
      if (nextButton) {
        nextButton.click();
        console.log('Clicked Next button on information content');
      } else {
        console.warn('Next button not found');
      }
      resolve();
    }, delayMs);
  });
};

/**
 * Extracts data from a multiple choice question
 * @returns The extracted question data or null if extraction fails
 */
export const extractMultipleChoiceQuestionData = (): QuestionData | null => {
  try {
    const contentElement = document.querySelector('.ces-inquiry-multi-choice');
    if (!contentElement) {
      console.warn('Multiple choice content element not found');
      return null;
    }

    // Extract title
    const titleElement = contentElement.querySelector('.content-title');
    const title = titleElement ? titleElement.textContent?.trim() || '' : '';

    // Extract question
    const questionElement = contentElement.querySelector('.content-text');
    const question = questionElement ? questionElement.textContent?.trim() || '' : '';

    // Extract choices
    const choiceElements = contentElement.querySelectorAll('.multi-choice-box .row');
    const choices = Array.from(choiceElements).map(choiceElement => {
      const labelElement = choiceElement.querySelector('label.checkbox');
      const text = labelElement ? labelElement.textContent?.trim() || '' : '';

      // For multiple choice, there are no separate options - the label itself is the option
      return {
        text,
        options: [text], // The option is the same as the text
        optionElements: labelElement ? [labelElement as HTMLElement] : [],
      };
    });

    // Generate a content ID
    const contentId = generateContentId(title, question);

    console.log('Extracted Multiple Choice Question Data:', {
      title,
      question,
      choices: choices.map(c => ({ text: c.text, options: c.options })),
    });

    return {
      type: 'multiple_choice',
      contentId,
      title,
      question,
      choices,
    };
  } catch (error) {
    console.error('Error extracting multiple choice question data:', error);
    return null;
  }
};

/**
 * Selects an answer for a multiple choice question
 * @param questionData The question data
 * @param answer The answer to select
 * @returns Promise that resolves when the answer is selected
 */
export const selectMultipleChoiceAnswer = async (questionData: QuestionData, answer: string): Promise<void> => {
  if (questionData.type !== 'multiple_choice') {
    console.warn('Question data is not for a multiple choice question');
    return;
  }

  console.log('Selecting multiple choice answer:', answer);

  let answerSelected = false;

  // Try exact match first
  for (const choice of questionData.choices) {
    if (choice.text === answer && choice.optionElements && choice.optionElements.length > 0) {
      console.log(`Found exact match for "${answer}"`);
      choice.optionElements[0].click();
      answerSelected = true;
      break;
    }
  }

  // If no exact match, try case-insensitive match
  if (!answerSelected) {
    const lowerAnswer = answer.toLowerCase();
    for (const choice of questionData.choices) {
      if (choice.text.toLowerCase() === lowerAnswer && choice.optionElements && choice.optionElements.length > 0) {
        console.log(`Found case-insensitive match for "${answer}"`);
        choice.optionElements[0].click();
        answerSelected = true;
        break;
      }
    }
  }

  // If still no match, try partial match (answer contains the choice text or vice versa)
  if (!answerSelected) {
    for (const choice of questionData.choices) {
      if (
        (choice.text.includes(answer) || answer.includes(choice.text)) &&
        choice.optionElements &&
        choice.optionElements.length > 0
      ) {
        console.log(`Found partial match for "${answer}" with "${choice.text}"`);
        choice.optionElements[0].click();
        answerSelected = true;
        break;
      }
    }
  }

  if (!answerSelected) {
    console.warn(`Could not find a match for answer: "${answer}"`);
    console.log(
      'Available choices:',
      questionData.choices.map(c => c.text),
    );
  }

  // Wait a moment for the UI to update
  await new Promise(resolve => setTimeout(resolve, 500));
};

/**
 * Handles multiple choice content by extracting the question, sending it to OpenAI, and selecting an answer
 * @param callback Function to call with the extracted question data
 * @returns Promise that resolves when the action is complete
 */
export const handleMultipleChoiceContent = async (
  callback: (questionData: QuestionData) => Promise<AnswerData>,
): Promise<void> => {
  // Check if we're looking at results with a Try Again button
  if (hasTryAgainButton()) {
    console.log('Found Try Again button - stopping automation');
    // Return early without processing - this will effectively pause the automation
    return;
  }

  // Check if there's a Next button (meaning we've already answered correctly)
  const nextButton = document.querySelector(
    'button.unit-btn.next-unit-btn:not([ng-click="ctrl.resetInquiry()"])',
  ) as HTMLButtonElement;
  if (nextButton && !nextButton.disabled) {
    console.log('Found Next button, clicking to proceed to next question');
    nextButton.click();
    return;
  }

  // Extract question data
  const questionData = extractMultipleChoiceQuestionData();
  if (!questionData) {
    console.warn('Failed to extract multiple choice question data');
    return;
  }

  console.log('Processing multiple choice question data:', questionData);

  try {
    // Send to callback (which will handle OpenAI processing)
    const answerData = await callback(questionData);
    console.log('Received answer data:', answerData);

    if (answerData.answers && answerData.answers.length > 0) {
      // For multiple choice, we only need the first answer
      await selectMultipleChoiceAnswer(questionData, answerData.answers[0]);

      // Click the Check Answers button
      await clickCheckAnswersButton();

      // Wait a moment for results to appear
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if we got any wrong and need to stop
      if (hasTryAgainButton()) {
        console.log('Answer was incorrect - stopping automation');
        // We'll stop here and let the user handle it
      }
    } else {
      console.warn('No answers received from OpenAI');
    }
  } catch (error) {
    console.error('Error handling multiple choice content:', error);
  }
};

/**
 * Handles TRUE_FALSE content by extracting the question, sending it to OpenAI, and selecting answers
 * @param callback Function to call with the extracted question data
 * @returns Promise that resolves when the action is complete
 */
export const handleTrueFalseContent = async (
  callback: (questionData: QuestionData) => Promise<AnswerData>,
): Promise<void> => {
  // Check if we're looking at results with a Try Again button
  if (hasTryAgainButton()) {
    console.log('Found Try Again button - stopping automation');
    // Return early without processing - this will effectively pause the automation
    return;
  }

  // Check if there's a Next button (meaning we've already answered correctly)
  const nextButton = document.querySelector(
    'button.unit-btn.next-unit-btn:not([ng-click="ctrl.resetInquiry()"])',
  ) as HTMLButtonElement;
  if (nextButton && !nextButton.disabled) {
    console.log('Found Next button, clicking to proceed to next question');
    nextButton.click();
    return;
  }

  // Extract question data
  const questionData = extractTrueFalseQuestionData();
  if (!questionData) {
    console.warn('Failed to extract TRUE_FALSE question data');
    return;
  }

  console.log('Processing TRUE_FALSE question data:', questionData);

  try {
    // Send to callback (which will handle OpenAI processing)
    const answerData = await callback(questionData);
    console.log('Received answer data:', answerData);

    // Select the answers
    await selectTrueFalseAnswers(questionData, answerData.answers);

    // Click the Check Answers button
    await clickCheckAnswersButton();

    // Wait a moment for results to appear
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if we got any wrong and need to stop
    if (hasTryAgainButton()) {
      console.log('Some answers were incorrect - stopping automation');
      // We'll stop here and let the user handle it
    }
  } catch (error) {
    console.error('Error handling TRUE_FALSE content:', error);
  }
};

/**
 * Selects answers for TRUE_FALSE questions using the actual DOM elements
 * @param questionData The question data containing choices and option elements
 * @param answers Array of answers from OpenAI
 */
export const selectTrueFalseAnswers = async (questionData: QuestionData, answers: string[]): Promise<void> => {
  const { choices } = questionData;

  if (answers.length === 0) {
    console.warn('No answers provided');
    return;
  }

  console.log(`Selecting answers for ${choices.length} choices with ${answers.length} answers`);
  console.log('Answers to select:', answers);

  // For each choice, select the appropriate answer
  for (let i = 0; i < choices.length; i++) {
    if (i >= answers.length) {
      console.warn(`No answer provided for choice ${i + 1}`);
      continue;
    }

    const choice = choices[i];
    const answer = answers[i];

    console.log(`\n--- Processing choice ${i + 1}: "${choice.text}" ---`);
    console.log(`Looking for answer: "${answer}"`);

    if (!choice.optionElements || choice.optionElements.length === 0) {
      console.warn(`No option elements found for choice ${i + 1}`);
      continue;
    }

    console.log(`Available options (${choice.options.length}):`);
    choice.options.forEach((opt, idx) => {
      console.log(`  ${idx + 1}. "${opt}"`);
    });

    // First try exact match
    let matched = false;

    // Try exact match first
    for (let j = 0; j < choice.optionElements.length; j++) {
      const optionElement = choice.optionElements[j];
      const optionText = choice.options[j];

      if (optionText === answer) {
        console.log(`Found EXACT match for "${answer}" - clicking option ${j + 1}`);
        optionElement.click();
        matched = true;
        break;
      }
    }

    // If no exact match, try case-insensitive match
    if (!matched) {
      console.log(`No exact match found for "${answer}", trying case-insensitive match`);

      for (let j = 0; j < choice.optionElements.length; j++) {
        const optionElement = choice.optionElements[j];
        const optionText = choice.options[j];

        if (optionText.toLowerCase() === answer.toLowerCase()) {
          console.log(`Found CASE-INSENSITIVE match: "${optionText}" for "${answer}" - clicking option ${j + 1}`);
          optionElement.click();
          matched = true;
          break;
        }
      }
    }

    // If still no match, try partial match
    if (!matched) {
      console.log(`No case-insensitive match found, trying partial match`);

      for (let j = 0; j < choice.optionElements.length; j++) {
        const optionElement = choice.optionElements[j];
        const optionText = choice.options[j];

        // Try partial match (case insensitive)
        if (
          optionText.toLowerCase().includes(answer.toLowerCase()) ||
          answer.toLowerCase().includes(optionText.toLowerCase())
        ) {
          console.log(`Found PARTIAL match: "${optionText}" for "${answer}" - clicking option ${j + 1}`);
          optionElement.click();
          matched = true;
          break;
        }
      }
    }

    // If still no match, select the first option as fallback
    if (!matched) {
      console.log(`No match found for "${answer}", selecting first option as fallback`);
      if (choice.optionElements.length > 0) {
        choice.optionElements[0].click();
        console.log(`Selected first option: "${choice.options[0]}"`);
      }
    }

    // Add a small delay between selections to ensure they register
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Add a final delay to ensure all selections are registered
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Finished selecting all answers');
};

/**
 * Clicks the Check Answers button
 * @returns Promise that resolves to true if the button was clicked, false otherwise
 */
export const clickCheckAnswersButton = (): Promise<boolean> => {
  return new Promise(resolve => {
    // Wait a short time to ensure all selections are registered
    setTimeout(() => {
      console.log('Looking for Check Answers button...');

      // Try multiple selectors for the check answers button
      const selectors = [
        '.unit-btn.next-unit-btn[ng-click="ctrl.checkAnswers()"]',
        '.unit-btn.next-unit-btn',
        'button.unit-btn:not(.prev-unit-btn)',
        '.unit-btn',
        'button:contains("Check Answers")',
        'button:contains("check answers")',
      ];

      // Log all buttons for debugging
      const allButtons = document.querySelectorAll('button, .unit-btn');
      console.log(`Found ${allButtons.length} buttons on the page:`);

      Array.from(allButtons).forEach((btn, idx) => {
        const btnEl = btn as HTMLButtonElement;
        console.log(
          `  Button ${idx + 1}: Text="${btnEl.textContent?.trim()}", Class="${btnEl.className}", Disabled=${btnEl.disabled}`,
        );
      });

      // Try each selector
      for (const selector of selectors) {
        try {
          console.log(`Trying selector: ${selector}`);
          const buttons = document.querySelectorAll(selector);
          console.log(`  Found ${buttons.length} matching elements`);

          if (buttons.length > 0) {
            // Try to find a button with "Check Answers" text first
            for (let i = 0; i < buttons.length; i++) {
              const button = buttons[i] as HTMLButtonElement;
              const buttonText = button.textContent?.trim().toLowerCase() || '';

              if (buttonText.includes('check') && buttonText.includes('answer') && !button.disabled) {
                console.log(`  Clicking button with text: "${button.textContent?.trim()}"`);
                button.click();
                console.log('Clicked Check Answers button');
                resolve(true);
                return;
              }
            }

            // If no button with "Check Answers" text, click the first enabled button
            for (let i = 0; i < buttons.length; i++) {
              const button = buttons[i] as HTMLButtonElement;
              if (!button.disabled) {
                console.log(`  Clicking first enabled button with text: "${button.textContent?.trim()}"`);
                button.click();
                console.log('Clicked button that might be Check Answers');
                resolve(true);
                return;
              }
            }
          }
        } catch (e) {
          console.log(`Error with selector ${selector}:`, e);
        }
      }

      // Try finding by text content
      const buttonByText = Array.from(allButtons).find(b => {
        const text = b.textContent?.trim().toLowerCase() || '';
        return text.includes('check') && text.includes('answer');
      }) as HTMLButtonElement;

      if (buttonByText && !buttonByText.disabled) {
        console.log(`Found Check Answers button by text content: "${buttonByText.textContent?.trim()}"`);
        buttonByText.click();
        console.log('Clicked Check Answers button');
        resolve(true);
        return;
      }

      // Last resort: try to click any button that might be a submit button
      const possibleSubmitButtons = Array.from(allButtons).filter(b => {
        const btnEl = b as HTMLButtonElement;
        if (btnEl.disabled) return false;

        const text = btnEl.textContent?.trim().toLowerCase() || '';
        const className = btnEl.className.toLowerCase();

        return (
          text.includes('submit') ||
          text.includes('next') ||
          text.includes('continue') ||
          className.includes('submit') ||
          className.includes('next')
        );
      });

      if (possibleSubmitButtons.length > 0) {
        const submitButton = possibleSubmitButtons[0] as HTMLButtonElement;
        console.log(`Trying possible submit button: "${submitButton.textContent?.trim()}"`);
        submitButton.click();
        console.log('Clicked possible submit button');
        resolve(true);
        return;
      }

      console.warn('Could not find any suitable button to click');
      resolve(false);
    }, 1500); // Increased delay to ensure all selections are registered
  });
};

/**
 * Main function to process the current content
 * @param openAICallback Function to call with question data for OpenAI processing
 * @returns Promise that resolves with the detected content type
 */
export const processCurrentContent = async (
  openAICallback?: (questionData: QuestionData) => Promise<AnswerData>,
): Promise<ContentType> => {
  const contentType = detectContentType();
  console.log('Detected content type:', contentType);

  switch (contentType) {
    case 'true_false':
      console.log('Processing TRUE_FALSE content...');
      if (openAICallback) {
        await handleTrueFalseContent(openAICallback);
      } else {
        console.warn('No OpenAI callback provided for TRUE_FALSE content');
      }
      break;
    case 'multiple_choice':
      console.log('Processing multiple choice content...');
      if (openAICallback) {
        await handleMultipleChoiceContent(openAICallback);
      } else {
        console.warn('No OpenAI callback provided for multiple choice content');
      }
      break;
    default:
      console.log('Unknown content type detected, no action taken');
      break;
  }

  return contentType;
};

/**
 * Debug function to log details about the current page content
 * Helps with troubleshooting content detection
 */
export const debugPageContent = (): void => {
  console.group('Content Detection Debug');

  // Check for inquiry text container
  const inquiryTextElement = document.querySelector('.ces-inquiry-text');
  console.log('Inquiry Text Element:', inquiryTextElement ? 'Found' : 'Not Found');

  // Check for TRUE_FALSE elements
  const trueFalseElement = document.querySelector('.ces-inquiry-tof');
  console.log('TRUE_FALSE Element:', trueFalseElement ? 'Found' : 'Not Found');

  // Check for multiple choice elements
  const multipleChoiceElement = document.querySelector('.ces-inquiry-multi-choice');
  console.log('MULTIPLE_CHOICE Element:', multipleChoiceElement ? 'Found' : 'Not Found');

  if (trueFalseElement) {
    const choiceBoxes = document.querySelectorAll('.tof-choice-box');
    console.log('TRUE_FALSE Choice Boxes:', choiceBoxes.length);

    // Log the question title and text
    const titleElement = document.querySelector('.ces-inquiry-content .content-title');
    console.log('Question Title:', titleElement ? titleElement.textContent : 'Not Found');

    const questionElement = document.querySelector('.ces-inquiry-content .content-text');
    console.log('Question Text:', questionElement ? questionElement.textContent : 'Not Found');

    // Log all choices and their options
    Array.from(choiceBoxes).forEach((choiceBox, index) => {
      const textElement = choiceBox.querySelector('.tof-choice-text');
      console.log(`Choice ${index + 1} Text:`, textElement ? textElement.textContent : 'Not Found');

      const options = choiceBox.querySelectorAll('label.radio');
      console.log(
        `Choice ${index + 1} Options:`,
        Array.from(options).map(opt => opt.textContent?.trim()),
      );
    });

    // Log all buttons
    const buttons = document.querySelectorAll('.unit-btn');
    console.log(
      'Available buttons:',
      Array.from(buttons).map(b => ({
        text: b.textContent,
        disabled: (b as HTMLButtonElement).disabled,
        classes: b.className,
      })),
    );
  }

  if (inquiryTextElement) {
    // Check for next button
    const nextButton = inquiryTextElement.querySelector('.next-unit-btn');
    console.log('Next Button:', nextButton ? 'Found' : 'Not Found');

    // Check for content text
    const contentText = inquiryTextElement.querySelector('.content-text');
    console.log('Content Text:', contentText ? 'Found' : 'Not Found');

    // Log the content title if available
    const contentTitle = inquiryTextElement.querySelector('.content-title');
    console.log('Content Title:', contentTitle ? contentTitle.textContent : 'Not Found');

    // Log the first paragraph of content if available
    if (contentText) {
      const firstParagraph = contentText.querySelector('p');
      console.log('First Paragraph:', firstParagraph ? firstParagraph.textContent : 'No paragraphs found');
    }
  }

  // Log processed content IDs
  console.log('Processed Content IDs:', Array.from(processedContentIds));

  console.groupEnd();
};

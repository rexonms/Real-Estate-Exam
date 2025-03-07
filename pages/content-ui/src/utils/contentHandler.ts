/**
 * Content detection and interaction utilities
 */

/**
 * Content types that can be detected
 */
export type ContentType = 'true_false' | 'multiple_choice' | 'unknown' | 'text_content' | 'unit_exam';

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
  // Try multiple selectors for each content type to be more thorough
  const trueFalseSelectors = ['.ces-inquiry-tof', 'ces-inquiry-tof'];
  const multipleChoiceSelectors = ['.ces-inquiry-multi-choice', 'ces-inquiry-multi-choice'];
  const textContentSelectors = ['.ces-inquiry-text', 'ces-inquiry-text', '[ng-switch-when="TEXT_EDIT"]'];
  // Update unit exam selectors to be more specific and not match text content
  const unitExamSelectors = [
    '.node-content-box .exam-question-box',
    // Only consider it a unit exam if it has radio buttons or checkboxes for answers
    '.segment-box.node-content-box:has(label.radio)',
    '.segment-box.node-content-box:has(input[type="radio"])',
    '.segment-box.node-content-box:has(.exam-question-box)',
  ];

  // Check for true/false content
  let trueFalseElement = null;
  for (const selector of trueFalseSelectors) {
    trueFalseElement = document.querySelector(selector);
    if (trueFalseElement) break;
  }

  // Check for multiple choice content
  let multipleChoiceElement = null;
  for (const selector of multipleChoiceSelectors) {
    multipleChoiceElement = document.querySelector(selector);
    if (multipleChoiceElement) break;
  }

  // Check for text content
  let textContentElement = null;
  for (const selector of textContentSelectors) {
    textContentElement = document.querySelector(selector);
    if (textContentElement) break;
  }

  // Check for unit exam content
  let unitExamElement = null;
  for (const selector of unitExamSelectors) {
    unitExamElement = document.querySelector(selector);
    if (unitExamElement) break;
  }

  // Additional check: if we found a unit exam element, verify it actually has question elements
  if (unitExamElement) {
    const hasRadioButtons = unitExamElement.querySelectorAll('label.radio, input[type="radio"]').length > 0;
    const hasExamQuestionBox = unitExamElement.querySelector('.exam-question-box') !== null;

    if (!hasRadioButtons && !hasExamQuestionBox) {
      console.log('Found unit exam element but no radio buttons or question box - treating as text content');
      unitExamElement = null;
    }
  }

  // Log all elements for debugging
  console.log('TRUE_FALSE Element:', trueFalseElement ? 'Found' : 'Not Found');
  console.log('MULTIPLE_CHOICE Element:', multipleChoiceElement ? 'Found' : 'Not Found');
  console.log('TEXT_CONTENT Element:', textContentElement ? 'Found' : 'Not Found');
  console.log('UNIT_EXAM Element:', unitExamElement ? 'Found' : 'Not Found');

  // Additional debugging - log all content-related elements
  console.log('All content elements on page:');
  const allContentElements = document.querySelectorAll(
    'div[class*="inquiry"], div[ng-switch-when], div.exam-question-box',
  );
  allContentElements.forEach((el, index) => {
    console.log(`Element ${index + 1}:`, el.tagName, el.className, el.getAttribute('ng-switch-when'));
  });

  // Check for Next button as a fallback
  const nextButton = document.querySelector('button.unit-btn.next-unit-btn');
  if (nextButton) {
    console.log('Found Next button:', nextButton);
  }

  if (trueFalseElement) {
    return 'true_false';
  } else if (multipleChoiceElement) {
    return 'multiple_choice';
  } else if (unitExamElement) {
    return 'unit_exam';
  } else if (textContentElement) {
    return 'text_content';
  } else if (nextButton) {
    // If we found a Next button but couldn't identify the content type,
    // treat it as text content as a fallback
    console.log('Content type unknown but Next button found - treating as text content');
    return 'text_content';
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

              // Skip buttons with "continue to final exam" text
              if (buttonText.includes('continue to final exam')) {
                console.log(`  Skipping button with text containing "continue to final exam"`);
                continue;
              }

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
              const buttonText = button.textContent?.trim().toLowerCase() || '';

              // Skip buttons with "continue to final exam" text
              if (buttonText.includes('continue to final exam')) {
                console.log(`  Skipping button with text containing "continue to final exam"`);
                continue;
              }

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
        return text.includes('check') && text.includes('answer') && !text.includes('continue to final exam');
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

        // Skip buttons with unwanted text
        if (
          text.includes('continue to final exam') ||
          text.includes('continue to unit exam') ||
          text.includes('continue to lesson')
        ) {
          console.log(`Skipping button with text: "${btnEl.textContent?.trim()}"`);
          return false;
        }

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
 * Clicks the Next button on any content type
 * @returns Promise that resolves to true if the button was clicked
 */
export const clickNextButton = async (): Promise<boolean> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Try multiple selectors for the Next button
      const nextButtonSelectors = [
        'button.unit-btn.next-unit-btn:not([ng-click="ctrl.resetInquiry()"])',
        'button.unit-btn.next-unit-btn[ng-click="ctrl.goToNextStep()"]',
        'button.unit-btn.next-unit-btn',
      ];

      let nextButton: HTMLButtonElement | null = null;
      const foundButtons: HTMLButtonElement[] = [];

      // Try each selector
      for (const selector of nextButtonSelectors) {
        const buttons = document.querySelectorAll(selector);
        if (buttons.length > 0) {
          // Filter out buttons with unwanted text
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i] as HTMLButtonElement;
            const buttonText = button.textContent?.trim().toLowerCase() || '';

            // Skip buttons with text containing "continue to final exam", "continue to unit exam", or "continue to lesson"
            if (
              !button.disabled &&
              !buttonText.includes('continue to final exam') &&
              !buttonText.includes('continue to unit exam') &&
              !buttonText.includes('continue to lesson')
            ) {
              foundButtons.push(button);
            } else if (
              buttonText.includes('continue to final exam') ||
              buttonText.includes('continue to unit exam') ||
              buttonText.includes('continue to lesson')
            ) {
              console.log(`Skipping button with text: "${button.textContent?.trim()}"`);
            }
          }
        }
      }

      // Use the first valid button found
      if (foundButtons.length > 0) {
        nextButton = foundButtons[0];
      }

      if (nextButton && !nextButton.disabled) {
        console.log('Found Next button, clicking to proceed', nextButton.textContent);
        nextButton.click();
        resolve(true);
      } else {
        console.warn('Next button not found or disabled');
        // Log all buttons for debugging
        const allButtons = document.querySelectorAll('button');
        console.log('All buttons on page:');
        allButtons.forEach((btn, index) => {
          console.log(`Button ${index + 1}:`, btn.textContent?.trim(), btn.className, btn.disabled);
        });
        resolve(false);
      }
    }, 1000);
  });
};

/**
 * Handles text content by simply clicking the Next button
 * @returns Promise that resolves when the action is complete
 */
export const handleTextContent = async (): Promise<void> => {
  console.log('Processing text content');

  try {
    // Try to extract title and content for logging
    const titleElement = document.querySelector('.content-title');
    const contentElement = document.querySelector('.content-text');

    const title = titleElement ? titleElement.textContent?.trim() || '' : '';
    const content = contentElement ? contentElement.textContent?.trim() || '' : '';

    console.log('Text content title:', title);
    console.log('Text content (truncated):', content.substring(0, 100) + (content.length > 100 ? '...' : ''));

    // Simply click the Next button
    const clicked = await clickNextButton();

    if (!clicked) {
      console.warn('Failed to click Next button on text content');
    }
  } catch (error) {
    console.error('Error handling text content:', error);
  }
};

/**
 * Extracts data from a unit exam question
 * @returns The extracted question data or null if extraction fails
 */
export const extractUnitExamQuestionData = (): QuestionData | null => {
  try {
    // Get the question text
    const questionElement = document.querySelector('.node-content-box .content-text');
    const question = questionElement ? questionElement.textContent?.trim() || '' : '';

    // Get the title (for unit exams, we'll use a generic title)
    const title = 'Unit Exam Question';

    // Get the choices
    const choiceElements = document.querySelectorAll('.exam-question-box label.radio');

    // Log all choice elements for debugging
    console.log(`Found ${choiceElements.length} exam choices`);

    const choices = Array.from(choiceElements).map((choiceElement, index) => {
      const text = choiceElement.textContent?.trim() || '';
      console.log(`Choice ${index + 1} text: "${text}"`);

      return {
        text,
        options: [text], // The option is the same as the text
        optionElements: [choiceElement as HTMLElement],
      };
    });

    // Generate a content ID
    const contentId = generateContentId(title, question);

    console.log('Extracted Unit Exam Question Data:', {
      title,
      question,
      choices: choices.map(c => ({ text: c.text })),
    });

    return {
      type: 'unit_exam',
      contentId,
      title,
      question,
      choices,
    };
  } catch (error) {
    console.error('Error extracting unit exam question data:', error);
    return null;
  }
};

/**
 * Selects an answer for a unit exam question
 * @param questionData The question data
 * @param answer The answer to select
 * @returns Promise that resolves when the answer is selected
 */
export const selectUnitExamAnswer = async (questionData: QuestionData, answer: string): Promise<void> => {
  if (questionData.type !== 'unit_exam') {
    console.warn('Question data is not for a unit exam question');
    return;
  }

  console.log('Selecting unit exam answer:', answer);

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
 * Handles unit exam content by extracting the question, sending it to OpenAI, and selecting an answer
 * @param callback Function to call with the extracted question data
 * @returns Promise that resolves when the action is complete
 */
export const handleUnitExamContent = async (
  callback: (questionData: QuestionData) => Promise<AnswerData>,
): Promise<void> => {
  console.log('Processing unit exam question');

  try {
    // Extract question data
    const questionData = extractUnitExamQuestionData();
    if (!questionData) {
      console.warn('Failed to extract unit exam question data');
      return;
    }

    console.log('Processing unit exam question data:', questionData);

    // Send to callback (which will handle OpenAI processing)
    const answerData = await callback(questionData);
    console.log('Received answer data:', answerData);

    if (answerData.answers && answerData.answers.length > 0) {
      // For unit exam, we only need the first answer
      await selectUnitExamAnswer(questionData, answerData.answers[0]);

      // Check if the Next button is enabled after selecting an answer
      const nextButton = document.querySelector('button.unit-btn.next-unit-btn:not([disabled])') as HTMLButtonElement;

      if (nextButton) {
        console.log('Found enabled Next button, clicking to proceed to next question');
        nextButton.click();
      } else {
        console.warn('Next button not found or still disabled after selecting answer');
      }
    } else {
      console.warn('No answers received from OpenAI');
    }
  } catch (error) {
    console.error('Error handling unit exam content:', error);
  }
};

/**
 * Checks if the exam submission dialog is present
 * @returns True if the submission dialog is visible
 */
export const isExamSubmissionDialogPresent = (): boolean => {
  // Look for the dialog with the specific text about submitting the exam
  const dialogText = document.querySelector('.dialog-content-container-outer .alert-text');
  if (!dialogText) return false;

  const text = dialogText.textContent?.toLowerCase() || '';
  return text.includes('ready to submit this exam');
};

/**
 * Clicks the "Submit Exam" button in the submission dialog
 * @returns Promise that resolves to true if the button was clicked
 */
export const clickSubmitExamButton = async (): Promise<boolean> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Look for buttons in the dialog
      const buttons = document.querySelectorAll('.dialog-content-container-outer .alert-buttons-right button');
      console.log(`Found ${buttons.length} buttons in the submission dialog`);

      // Find the Submit Exam button
      let submitButton: HTMLButtonElement | null = null;

      Array.from(buttons).forEach((btn, index) => {
        const btnEl = btn as HTMLButtonElement;
        const text = btnEl.textContent?.trim().toLowerCase() || '';
        console.log(`Button ${index + 1}: "${btnEl.textContent?.trim()}", Class="${btnEl.className}"`);

        if (text.includes('submit exam')) {
          submitButton = btnEl;
        }
      });

      if (submitButton) {
        console.log('Found Submit Exam button, clicking to submit the exam');
        submitButton.click();
        resolve(true);
      } else {
        console.warn('Submit Exam button not found');
        resolve(false);
      }
    }, 1000);
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
  // First check if the exam submission dialog is present
  if (isExamSubmissionDialogPresent()) {
    console.log('Exam submission dialog detected, attempting to click Submit Exam button');
    await clickSubmitExamButton();
    return 'unknown'; // Return unknown since we're in a dialog, not a content page
  }

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
    case 'unit_exam':
      console.log('Processing unit exam content...');
      if (openAICallback) {
        await handleUnitExamContent(openAICallback);
      } else {
        console.warn('No OpenAI callback provided for unit exam content');
      }
      break;
    case 'text_content':
      console.log('Processing text content');
      await handleTextContent();
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

  // Check for unit exam elements
  const unitExamElement = document.querySelector('.node-content-box .exam-question-box');
  console.log('UNIT_EXAM Element:', unitExamElement ? 'Found' : 'Not Found');

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

  if (unitExamElement) {
    // Log the question text
    const questionElement = document.querySelector('.node-content-box .content-text');
    console.log('Exam Question Text:', questionElement ? questionElement.textContent : 'Not Found');

    // Log all choices
    const choices = document.querySelectorAll('.exam-question-box label.radio');
    console.log('Exam Choices:', choices.length);
    Array.from(choices).forEach((choice, index) => {
      console.log(`Choice ${index + 1} Text:`, choice.textContent?.trim());
    });

    // Log the Next button status
    const nextButton = document.querySelector('button.unit-btn.next-unit-btn') as HTMLButtonElement;
    console.log('Next Button:', nextButton ? `Found (Disabled: ${nextButton.disabled})` : 'Not Found');
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

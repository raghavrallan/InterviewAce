const chatService = require('../services/chatService');
const logger = require('../utils/logger');

const QUESTION_PROMPTS = {
  behavioral: `Generate a behavioral interview question based on the candidate's resume. Focus on past experiences, teamwork, leadership, and problem-solving. The question should use the STAR method framework (Situation, Task, Action, Result).`,

  technical: `Generate a technical interview question based on the candidate's skills and experience from their resume. Include coding challenges, system design, or technical concept questions relevant to their background.`,

  situational: `Generate a situational interview question that presents a hypothetical scenario relevant to the candidate's field. The question should assess problem-solving, decision-making, and critical thinking skills.`
};

const DIFFICULTY_MODIFIERS = {
  easy: 'Keep the question straightforward and suitable for entry-level positions.',
  medium: 'Make the question moderately challenging, suitable for mid-level professionals.',
  hard: 'Create a complex, challenging question suitable for senior-level positions.'
};

exports.generateQuestion = async (req, res, next) => {
  try {
    const { resumeContext, questionType = 'behavioral', difficulty = 'medium', previousQuestions = [] } = req.body;

    if (!resumeContext) {
      return res.status(400).json({
        success: false,
        error: 'Resume context is required'
      });
    }

    const questionPrompt = QUESTION_PROMPTS[questionType] || QUESTION_PROMPTS.behavioral;
    const difficultyModifier = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.medium;

    const previousQuestionsContext = previousQuestions.length > 0
      ? `\n\nPreviously asked questions (do not repeat):\n${previousQuestions.join('\n')}`
      : '';

    const fullPrompt = `${questionPrompt}

${difficultyModifier}

Candidate's Resume:
${resumeContext}
${previousQuestionsContext}

Respond with a JSON object containing:
{
  "question": "The interview question",
  "hints": ["hint1", "hint2", "hint3"],
  "framework": "STAR" or "PROBLEM_SOLUTION" or "TECHNICAL"
}`;

    const response = await chatService.openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        {
          role: 'system',
          content: 'You are an expert interview question generator. Generate high-quality, relevant interview questions tailored to the candidate\'s background.'
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    let result;
    try {
      // Try to parse JSON response
      result = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      // Fallback if response is not JSON
      result = {
        question: response.choices[0].message.content.trim(),
        hints: [],
        framework: questionType === 'technical' ? 'TECHNICAL' : 'STAR'
      };
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Practice question generation error:', error);
    next(error);
  }
};

exports.evaluateAnswer = async (req, res, next) => {
  try {
    const {
      question,
      answer,
      resumeContext,
      questionType = 'behavioral',
      expectedFramework = 'STAR',
      speechMetrics = {}
    } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Question and answer are required'
      });
    }

    const evaluationPrompt = `Evaluate this interview answer and provide detailed feedback.

**Interview Question:** ${question}

**Candidate's Answer:** ${answer}

**Question Type:** ${questionType}

**Expected Framework:** ${expectedFramework}

**Speech Metrics:**
- Filler Words: ${speechMetrics.fillerWords || 0}
- Words Per Minute: ${speechMetrics.wordsPerMinute || 0}
- Duration: ${speechMetrics.duration || 0} seconds
- Clarity: ${speechMetrics.clarity || 0}%

**Resume Context:**
${resumeContext || 'Not provided'}

Provide comprehensive feedback covering:

1. **Strengths** - What the candidate did well
2. **Areas for Improvement** - Specific suggestions
3. **Framework Usage** - How well they followed ${expectedFramework} method
4. **Content Quality** - Relevance and depth of the answer
5. **Delivery Analysis** - Based on speech metrics
6. **Score** - Rate the answer from 1-10
7. **Improved Answer** - Provide a model answer using the ${expectedFramework} framework

Format your response in markdown with clear sections.`;

    const response = await chatService.openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        {
          role: 'system',
          content: 'You are an expert interview coach providing constructive feedback to help candidates improve their interview performance.'
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const feedback = response.choices[0].message.content;

    res.json({
      success: true,
      data: {
        feedback
      }
    });

  } catch (error) {
    logger.error('Answer evaluation error:', error);
    next(error);
  }
};

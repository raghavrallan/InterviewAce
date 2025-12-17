const { AzureOpenAI } = require('openai');
const logger = require('../utils/logger');

class JobDescriptionService {
  constructor() {
    this._openai = null;
  }

  // Lazy initialization of Azure OpenAI client
  get openai() {
    if (!this._openai) {
      this._openai = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT
      });
    }
    return this._openai;
  }

  /**
   * Parse job description and extract key information
   */
  async parseJobDescription(jdText) {
    try {
      logger.info('Parsing job description...');

      const prompt = `Analyze this job description and extract structured information in JSON format.

Job Description:
${jdText}

Extract and return ONLY a JSON object with these fields:
{
  "jobTitle": "extracted job title",
  "company": "company name if mentioned",
  "location": "location if mentioned",
  "experienceLevel": "entry/mid/senior/lead",
  "requiredSkills": ["skill1", "skill2", ...],
  "preferredSkills": ["skill1", "skill2", ...],
  "responsibilities": ["responsibility1", "responsibility2", ...],
  "qualifications": ["qualification1", "qualification2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "summary": "brief 2-3 sentence summary of the role"
}

Focus on technical skills, programming languages, frameworks, tools, and soft skills.
Return ONLY the JSON, no additional text.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [
          {
            role: 'system',
            content: 'You are a job description analyzer. Extract structured information and return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content.trim();

      // Try to parse JSON
      try {
        const parsed = JSON.parse(content);
        logger.info('Job description parsed successfully');
        return parsed;
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const extracted = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(extracted);
        }

        throw parseError;
      }
    } catch (error) {
      logger.error('Job description parsing error:', error);
      throw new Error(`Failed to parse job description: ${error.message}`);
    }
  }

  /**
   * Calculate skill match between resume and JD
   */
  async calculateSkillMatch(resumeText, parsedJD) {
    try {
      logger.info('Calculating skill match...');

      const allJDSkills = [
        ...(parsedJD.requiredSkills || []),
        ...(parsedJD.preferredSkills || [])
      ];

      const prompt = `Compare the candidate's resume with the job requirements and calculate skill matches.

Job Requirements:
${JSON.stringify(allJDSkills, null, 2)}

Candidate Resume:
${resumeText}

Return ONLY a JSON object with:
{
  "matchedSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "matchPercentage": 75,
  "strongPoints": ["point1", "point2", ...],
  "improvementAreas": ["area1", "area2", ...],
  "overallAssessment": "brief assessment"
}

Return ONLY the JSON, no additional text.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [
          {
            role: 'system',
            content: 'You are a skill matching expert. Analyze and return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content.trim();

      // Try to parse JSON
      try {
        const parsed = JSON.parse(content);
        logger.info(`Skill match calculated: ${parsed.matchPercentage}%`);
        return parsed;
      } catch (parseError) {
        // Extract JSON from markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const extracted = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(extracted);
        }

        throw parseError;
      }
    } catch (error) {
      logger.error('Skill match calculation error:', error);
      throw new Error(`Failed to calculate skill match: ${error.message}`);
    }
  }

  /**
   * Generate tailored interview questions based on JD
   */
  async generateTailoredQuestions(parsedJD, count = 5) {
    try {
      logger.info('Generating tailored questions...');

      const prompt = `Generate ${count} interview questions tailored to this job description.

Job Title: ${parsedJD.jobTitle}
Required Skills: ${(parsedJD.requiredSkills || []).join(', ')}
Responsibilities: ${(parsedJD.responsibilities || []).slice(0, 3).join('; ')}

Generate questions that:
1. Test technical knowledge of required skills
2. Assess experience with key responsibilities
3. Evaluate cultural fit
4. Mix behavioral and technical questions

Return ONLY a JSON array:
[
  {
    "question": "the question",
    "type": "technical|behavioral|situational",
    "skill": "related skill",
    "difficulty": "easy|medium|hard"
  }
]

Return ONLY the JSON array, no additional text.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [
          {
            role: 'system',
            content: 'You are an interview question generator. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content.trim();

      // Try to parse JSON
      try {
        const parsed = JSON.parse(content);
        logger.info(`Generated ${parsed.length} tailored questions`);
        return parsed;
      } catch (parseError) {
        // Extract JSON from markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const extracted = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(extracted);
        }

        throw parseError;
      }
    } catch (error) {
      logger.error('Tailored questions generation error:', error);
      throw new Error(`Failed to generate tailored questions: ${error.message}`);
    }
  }
}

module.exports = new JobDescriptionService();

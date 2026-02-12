const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class CompanyService {
  constructor() {
    this._companiesData = null;
  }

  /**
   * Load companies data from JSON file
   */
  async loadCompaniesData() {
    if (this._companiesData) {
      return this._companiesData;
    }

    try {
      const dataPath = path.join(__dirname, '../data/companies.json');
      const fileContent = await fs.readFile(dataPath, 'utf-8');
      this._companiesData = JSON.parse(fileContent);
      logger.info(`Loaded ${this._companiesData.companies.length} companies`);
      return this._companiesData;
    } catch (error) {
      logger.error('Failed to load companies data:', error);
      throw new Error('Failed to load companies data');
    }
  }

  /**
   * Get list of all companies
   */
  async getAllCompanies() {
    const data = await this.loadCompaniesData();
    return data.companies.map(company => ({
      id: company.id,
      name: company.name,
      logo: company.logo,
      industry: company.industry,
      size: company.size,
      headquarters: company.headquarters
    }));
  }

  /**
   * Get detailed information about a specific company
   */
  async getCompanyById(companyId) {
    const data = await this.loadCompaniesData();
    const company = data.companies.find(c => c.id === companyId);

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    return company;
  }

  /**
   * Get company interview tips
   */
  async getCompanyTips(companyId) {
    const company = await this.getCompanyById(companyId);
    return {
      companyName: company.name,
      culture: company.culture,
      interviewProcess: company.interviewProcess,
      interviewFocus: company.interviewFocus,
      preparationResources: company.preparationResources
    };
  }

  /**
   * Get common questions for a company
   */
  async getCompanyQuestions(companyId, type = 'all') {
    const company = await this.getCompanyById(companyId);

    if (type === 'all') {
      return company.commonQuestions;
    }

    if (company.commonQuestions[type]) {
      return company.commonQuestions[type];
    }

    throw new Error(`Invalid question type: ${type}. Must be 'behavioral', 'technical', 'situational', or 'all'`);
  }

  /**
   * Generate AI-powered company-specific questions based on resume
   */
  async generateCompanyQuestions(companyId, resumeText, count = 5, questionType = 'behavioral') {
    try {
      const company = await this.getCompanyById(companyId);
      logger.info(`Generating ${count} ${questionType} questions for ${company.name}...`);

      const cultureContext = company.culture.keywords.join(', ');
      const valuesContext = company.culture.values.join('; ');
      const focusAreas = company.interviewFocus.join(', ');
      const sampleQuestions = company.commonQuestions[questionType] || [];

      const prompt = `Generate ${count} ${questionType} interview questions tailored for ${company.name}.

Company Context:
- Culture: ${cultureContext}
- Values: ${valuesContext}
- Interview Focus: ${focusAreas}
- Work Style: ${company.culture.workStyle}

${resumeText ? `Candidate's Resume:\n${resumeText.slice(0, 2000)}\n` : ''}

Sample Questions Style:
${sampleQuestions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate ${count} questions that:
1. Align with ${company.name}'s culture and values
2. Test relevant skills for their interview focus areas
3. ${resumeText ? 'Are personalized to the candidate\'s experience' : 'Are general but company-specific'}
4. Follow the style and difficulty of sample questions

Return ONLY a JSON array:
[
  {
    "question": "the question",
    "category": "${questionType}",
    "focusArea": "related focus area from: ${focusAreas}",
    "difficulty": "easy|medium|hard",
    "explanation": "Why this question is relevant for ${company.name}"
  }
]

Return ONLY the JSON array, no additional text.`;

      const messages = [
        {
          role: 'system',
          content: `You are an interview question generator specialized in ${company.name} interview preparation. Generate questions that reflect ${company.name}'s culture and values. Return only valid JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await aiProvider.chat(messages, {
        temperature: 0.8,
        max_tokens: 2000
      });

      const content = aiProvider.getContent(response).trim();

      // Try to parse JSON
      try {
        const parsed = JSON.parse(content);
        logger.info(`Generated ${parsed.length} questions for ${company.name}`);
        return {
          company: company.name,
          companyId: company.id,
          questionType,
          questions: parsed
        };
      } catch (parseError) {
        // Extract JSON from markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const extracted = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(extracted);
          return {
            company: company.name,
            companyId: company.id,
            questionType,
            questions: parsed
          };
        }

        throw parseError;
      }
    } catch (error) {
      logger.error('Company questions generation error:', error);
      throw new Error(`Failed to generate company questions: ${error.message}`);
    }
  }

  /**
   * Get company culture fit assessment
   */
  async assessCultureFit(companyId, candidateAnswers) {
    try {
      const company = await this.getCompanyById(companyId);
      logger.info(`Assessing culture fit for ${company.name}...`);

      const cultureContext = company.culture.keywords.join(', ');
      const valuesContext = company.culture.values.join('; ');

      const prompt = `Assess the candidate's cultural fit for ${company.name}.

Company Culture:
- Keywords: ${cultureContext}
- Values: ${valuesContext}
- Work Style: ${company.culture.workStyle}

Candidate's Answers/Profile:
${candidateAnswers}

Provide an assessment in JSON format:
{
  "overallFit": "high|medium|low",
  "fitPercentage": 75,
  "strengths": ["strength1", "strength2", ...],
  "concerns": ["concern1", "concern2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "culturalAlignment": {
    "values": ["aligned value1", "aligned value2", ...],
    "gaps": ["gap1", "gap2", ...]
  },
  "summary": "Brief 2-3 sentence assessment"
}

Return ONLY the JSON, no additional text.`;

      const messages = [
        {
          role: 'system',
          content: `You are a culture fit analyst for ${company.name}. Assess alignment with company values and culture. Return only valid JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await aiProvider.chat(messages, {
        temperature: 0.5,
        max_tokens: 1500
      });

      const content = aiProvider.getContent(response).trim();

      // Try to parse JSON
      try {
        const parsed = JSON.parse(content);
        return {
          company: company.name,
          companyId: company.id,
          ...parsed
        };
      } catch (parseError) {
        // Extract JSON from markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const extracted = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(extracted);
          return {
            company: company.name,
            companyId: company.id,
            ...parsed
          };
        }

        throw parseError;
      }
    } catch (error) {
      logger.error('Culture fit assessment error:', error);
      throw new Error(`Failed to assess culture fit: ${error.message}`);
    }
  }

  /**
   * Search companies by name or industry
   */
  async searchCompanies(query) {
    const data = await this.loadCompaniesData();
    const lowerQuery = query.toLowerCase();

    return data.companies.filter(company =>
      company.name.toLowerCase().includes(lowerQuery) ||
      company.industry.toLowerCase().includes(lowerQuery)
    ).map(company => ({
      id: company.id,
      name: company.name,
      logo: company.logo,
      industry: company.industry,
      size: company.size
    }));
  }
}

module.exports = new CompanyService();

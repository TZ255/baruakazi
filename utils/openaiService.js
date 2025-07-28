const OpenAI = require('openai');
const { zodResponseFormat, zodTextFormat } = require('openai/helpers/zod');
const { z } = require('zod');
const fs = require('fs')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LetterSchema = z.object({
  userInfo: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    address: z.string().nullable()
  }),
  jobInfo: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    reportTo: z.string().default('Hiring Manager')
  }),
  letterParts: z.object({
    greeting: z.string(),
    introduction: z.string(),
    body: z.string(),
    closing: z.string(),
    signature: z.string()
  })
})


const systemInstructions = `You are a professional cover letter writer specializing in the Tanzanian job market. Analyze the uploaded CV/resume file and generate a well-structured, professional cover letter that highlights relevant experience and skills. Always respond with valid JSON in the specified format.`

const userPrompt = (jobInfo) => {
  return `Analyze the uploaded CV/resume file and generate a professional cover letter for the following job opportunity:

JOB INFORMATION:
- Job Title: ${jobInfo.jobTitle}
- Company Name: ${jobInfo.companyName}
- Job Location: ${jobInfo.jobLocation}
- Job Description: ${jobInfo.jobDescription}

REQUIREMENTS:
1. Extract user information from the CV file (name, email, phone, address)
2. Create a professional cover letter with these sections:
   - Greeting (Use name from job's 'reportTo' field if available, otherwise default to 'Dear Hiring Manager')
   - Introduction (brief introduction and position interest)
   - Body (2-3 paragraphs highlighting relevant experience and skills from the CV)
   - Closing (call to action and professional closing)
   - Signature block

3. Tailor the content to the specific job and company based on CV content
4. Use professional Tanzanian business language
5. Keep each section concise but impactful
6. Highlight specific achievements and experience from the CV that match the job requirements
7. reportTo field should be Hiring Manager or specific person if mentioned in job description

RESPONSE FORMAT:
{
  "userInfo": {
    "fullName": "extracted from CV",
    "email": "extracted from CV", 
    "phone": "extracted from CV or null if not available",
    "address": "extracted from CV or null if not available"
  },
  "jobInfo": {
    "title": "${jobInfo.jobTitle}",
    "company": "${jobInfo.companyName}",
    "location": "${jobInfo.jobLocation}",
    "reportTo": "extracted from job description or default to 'Hiring Manager'"
  },
  "letterParts": {
    "greeting": "Dear [Name/Hiring Manager],",
    "introduction": "Opening paragraph introducing yourself and expressing interest",
    "body": "2-3 paragraphs highlighting relevant experience and skills for this role based on CV content",
    "closing": "Professional closing paragraph with call to action",
    "signature": "Sincerely,\\n[Your name]"
  }
}

Generate the cover letter now based on the CV file analysis:`
}

const OpenAIService = async (cvFile, jobInfo) => {
  try {
    //upload file
    const file = await openai.files.create({
      file: fs.createReadStream(cvFile),
      purpose: "user_data",
    });


    //structured output
    const response = await openai.responses.parse({
      model: "gpt-4o-mini",
      input: [
        {
          role: "assistant",
          content: systemInstructions
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: userPrompt(jobInfo) },
            {
              type: "input_file",
              file_id: file.id
            },
          ],
        },
      ],
      temperature: 0.3,
      text: {
        format: zodTextFormat(LetterSchema, "letter_schema_output"),
      },
    });

    await openai.files.delete(file.id)
    const letter_schema_output = response.output_parsed;
    return letter_schema_output
  } catch (error) {
    console.log(error?.message, error)
    throw error
  }
}

module.exports = OpenAIService;
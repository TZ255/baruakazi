const OpenAI = require('openai');
const { zodResponseFormat, zodTextFormat } = require('openai/helpers/zod');
const { z } = require('zod');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const htmlDescriptionSchema = z.object({
    html: z.string(),
    text: z.string()
});

const systemInstructions = `You are a professional job description formatter. Your task is to format a given job description into clear and well-structured text, both as plain text and inside a basic HTML "<div>" container with no styling.

- The HTML version should be clean and semantic, using only basic HTML tags.
- Do **not** include "<h1>" or "<h2>" tags, as the container appears below the main page title, Start your headings at "<h3>".
- Ensure the description is concise, professional, and attractive to job seekers.
- Use proper formatting such as "<ul>", "<li>", "<strong>", "<em>", "<a>", "<b>", "<i>" and "<u>" where appropriate to enhance readability.
- Preserve the original meaning, but improve grammar, clarity, and flow.
- Prioritize readability and structure while keeping the tone professional and informative.
- The text version should be clean and free of HTML tags, suitable for plain text display.
- The text version should not exceed 7500 characters.
`

const refineJobDescription = async (jobDescription) => {
    try {
        const response = await openai.responses.parse({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "system",
                    content: systemInstructions,
                },
                {
                    role: "user",
                    content: jobDescription
                }
            ],
            text: {
                format: zodTextFormat(htmlDescriptionSchema, 'formattedHTMLDescription')
            },
            temperature: 0.3
        });

        const formattedHTMLDescription = response.output_parsed;
        return formattedHTMLDescription;
    } catch (aiError) {
        console.error('OpenAI formatting error:', aiError);
    }
}

module.exports = {
    refineJobDescription
}
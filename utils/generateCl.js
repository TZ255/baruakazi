const fs = require('fs');
const path = require('path');
const os = require('os');
const OpenAIService = require('./openaiService');
const Bin = require('../models/Bin');

async function generateCoverLetterAsync(binId, jobInfo, cvFile) {
    try {
        const tempFilePath = path.join(os.tmpdir(), `cv_${Date.now()}_${cvFile.originalname}`);
        fs.writeFileSync(tempFilePath, cvFile.buffer);

        const openaiResponse = await OpenAIService(tempFilePath, jobInfo);

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        console.log('🎉 OpenAI generation completed successfully!');

        await Bin.findByIdAndUpdate(binId, {
            openaiResponse,
            status: 'ready'
        });

        console.log('✅ Bin document updated with ready status');
    } catch (error) {
        await Bin.findByIdAndUpdate(binId, {
            status: 'error',
            errorMessage: error.message
        });
        throw error;
    }
}

module.exports = generateCoverLetterAsync
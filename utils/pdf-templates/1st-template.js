const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
  Roboto: {
    normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
    italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);
const defaultFont = 'Roboto';

function buildHeader(userInfo) {
  const headerContent = [
    {
      text: userInfo.fullName,
      style: 'header',
      margin: [0, 0, 0, 5]
    }
  ];

  const contactInfo = [];

  if (userInfo.email) contactInfo.push(userInfo.email);
  if (userInfo.phone) contactInfo.push(userInfo.phone);
  if (userInfo.address) contactInfo.push(userInfo.address);

  if (contactInfo.length > 0) {
    headerContent.push({
      text: contactInfo.join(' | '),
      style: 'contact',
      margin: [0, 0, 0, 10]
    });
  }

  return headerContent;
}

function buildCompanyInfo(jobInfo) {
  return [
    {
      text: jobInfo?.reportTo+',' || 'Hiring Manager,',
      margin: [0, 0, 0, 2]
    },
    {
      text: jobInfo.company+',',
      margin: [0, 0, 0, 2]
    },
    {
      text: jobInfo.companyAddress+',',
      margin: [0, 0, 0, 2]
    },
    {
      text: jobInfo.location+'.',
      margin: [0, 0, 0, 5]
    },
    {
      text: `Re: Application for ${jobInfo.title}`,
      bold: true,
      alignment: 'center',
      margin: [0, 10, 0, 0]
    }
  ];
}

function buildDocDefinition(letterData) {
  const { userInfo, jobInfo, letterParts } = letterData;

  return {
    content: [
      ...buildHeader(userInfo),

      {
        text: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        alignment: 'right',
        margin: [0, 20, 0, 20]
      },

      ...buildCompanyInfo(jobInfo),

      { text: letterParts.greeting || '', margin: [0, 20, 0, 10] },
      { text: letterParts.introduction || '', margin: [0, 0, 0, 15], alignment: 'justify' },
      { text: letterParts.body || '', margin: [0, 0, 0, 15], alignment: 'justify' },
      { text: letterParts.closing || '', margin: [0, 0, 0, 15], alignment: 'justify' },
      { text: letterParts.signature || '', margin: [0, 20, 0, 0] }
    ],

    styles: {
      header: {
        fontSize: 16,
        bold: true,
        color: '#2c3e50'
      },
      contact: {
        fontSize: 10,
        color: '#7f8c8d'
      }
    },

    defaultStyle: {
      font: defaultFont,
      fontSize: 11,
      lineHeight: 1.4
    },

    pageMargins: [60, 60, 60, 60],
    pageSize: 'A4'
  };
}

function generateCoverLetterPDF(letterData) {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition = buildDocDefinition(letterData);
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(new Error('Failed to generate PDF'));
    }
  });
}

module.exports = generateCoverLetterPDF;

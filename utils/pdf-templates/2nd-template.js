const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
  Roboto: {
    normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, 'fonts/Roboto-Bold.ttf'), // Use bold for headers
    italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts/Roboto-BoldItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);
const defaultFont = 'Roboto';

function buildHeader(userInfo) {
  const contactLines = [];
  if (userInfo.email) contactLines.push(userInfo.email);
  if (userInfo.phone) contactLines.push(userInfo.phone);
  if (userInfo.address) contactLines.push(userInfo.address);

  return [
    {
      text: userInfo.fullName,
      style: 'mainHeader',
      alignment: 'center',
      margin: [0, 0, 0, 5]
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 400, y2: 0, lineWidth: 1 }],
      margin: [0, 0, 0, 10],
      alignment: 'center'
    },
    {
      text: contactLines.join('  •  '),
      style: 'contact',
      alignment: 'center',
      margin: [0, 0, 0, 20]
    }
  ];
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
      margin: [0, 0, 0, 10]
    },
    {
      text: `Re: Application for ${jobInfo.title}`,
      style: 'jobTitle',
      margin: [0, 10, 0, 10]
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
        margin: [0, 0, 0, 20]
      },

      ...buildCompanyInfo(jobInfo),

      { text: letterParts.greeting || '', style: 'paragraph', margin: [0, 10, 0, 10] },
      { text: letterParts.introduction || '', style: 'paragraph' },
      { text: letterParts.body || '', style: 'paragraph' },
      { text: letterParts.closing || '', style: 'paragraph' },
      { text: letterParts.signature || '', margin: [0, 30, 0, 0] }
    ],

    styles: {
      mainHeader: {
        fontSize: 18,
        bold: true,
        color: '#2c3e50'
      },
      contact: {
        fontSize: 10,
        color: '#7f8c8d'
      },
      jobTitle: {
        bold: true,
        alignment: 'center',
        fontSize: 12,
        color: '#34495e'
      },
      paragraph: {
        fontSize: 11,
        lineHeight: 1.5,
        alignment: 'justify',
        margin: [0, 0, 0, 15]
      }
    },

    defaultStyle: {
      font: defaultFont
    },

    pageMargins: [60, 60, 60, 60],
    pageSize: 'A4'
  };
}

function generatePDF2ndTemp(letterData) {
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

module.exports = generatePDF2ndTemp;

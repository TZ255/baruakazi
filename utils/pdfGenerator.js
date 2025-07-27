const PdfPrinter = require('pdfmake');

class PDFGenerator {
  constructor() {
    // Define fonts for pdfmake - using built-in fonts approach
    let fonts;
    
    try {
      // Try to load pdfmake fonts
      const vfs = require('pdfmake/build/vfs_fonts.js');
      fonts = {
        Roboto: {
          normal: Buffer.from(vfs.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
          bold: Buffer.from(vfs.pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
          italics: Buffer.from(vfs.pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
          bolditalics: Buffer.from(vfs.pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64')
        }
      };
    } catch (error) {
      console.log('Using fallback fonts due to:', error.message);
      // Fallback to default fonts
      fonts = {
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };
    }
    
    this.printer = new PdfPrinter(fonts);
    this.defaultFont = fonts.Roboto ? 'Roboto' : 'Helvetica';
  }
  
  async generateCoverLetterPDF(letterData) {
    try {
      const docDefinition = this.buildDocumentDefinition(letterData);
      
      return new Promise((resolve, reject) => {
        const doc = this.printer.createPdfKitDocument(docDefinition);
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        
        doc.end();
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }
  
  buildDocumentDefinition(letterData) {
    const { userInfo, jobInfo, letterParts } = letterData;
    
    return {
      content: [
        // Header with user information
        this.buildHeader(userInfo),
        
        // Date
        {
          text: new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          alignment: 'right',
          margin: [0, 20, 0, 20]
        },
        
        // Company information
        this.buildCompanyInfo(jobInfo),
        
        // Greeting
        {
          text: letterParts.greeting,
          margin: [0, 20, 0, 10]
        },
        
        // Introduction
        {
          text: letterParts.introduction,
          margin: [0, 0, 0, 15],
          alignment: 'justify'
        },
        
        // Body
        {
          text: letterParts.body,
          margin: [0, 0, 0, 15],
          alignment: 'justify'
        },
        
        // Closing
        {
          text: letterParts.closing,
          margin: [0, 0, 0, 15],
          alignment: 'justify'
        },
        
        // Signature
        {
          text: letterParts.signature,
          margin: [0, 20, 0, 0]
        }
      ],
      
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          color: '#2c3e50'
        },
        subheader: {
          fontSize: 12,
          color: '#34495e'
        },
        contact: {
          fontSize: 10,
          color: '#7f8c8d'
        }
      },
      
      defaultStyle: {
        font: this.defaultFont,
        fontSize: 11,
        lineHeight: 1.4
      },
      
      pageMargins: [60, 60, 60, 60],
      pageSize: 'A4'
    };
  }
  
  buildHeader(userInfo) {
    const headerContent = [
      {
        text: userInfo.fullName,
        style: 'header',
        margin: [0, 0, 0, 5]
      }
    ];
    
    // Contact information
    const contactInfo = [];
    
    if (userInfo.email) {
      contactInfo.push(userInfo.email);
    }
    
    if (userInfo.phone) {
      contactInfo.push(userInfo.phone);
    }
    
    if (userInfo.address) {
      contactInfo.push(userInfo.address);
    }
    
    if (contactInfo.length > 0) {
      headerContent.push({
        text: contactInfo.join(' | '),
        style: 'contact',
        margin: [0, 0, 0, 10]
      });
    }
    
    return headerContent;
  }
  
  buildCompanyInfo(jobInfo) {
    return [
      {
        text: jobInfo?.reportTo || 'Hiring Manager',
        margin: [0, 0, 0, 2]
      },
      {
        text: jobInfo.company,
        bold: true,
        margin: [0, 0, 0, 2]
      },
      {
        text: jobInfo.location,
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
  
  // Alternative simpler template
  buildSimpleDocumentDefinition(letterData) {
    const { userInfo, jobInfo, letterParts } = letterData;
    
    return {
      content: [
        // Simple header
        {
          text: userInfo.fullName,
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 5]
        },
        
        {
          text: [
            userInfo.email,
            userInfo.phone ? ` • ${userInfo.phone}` : '',
            userInfo.address ? ` • ${userInfo.address}` : ''
          ].filter(Boolean).join(''),
          fontSize: 10,
          margin: [0, 0, 0, 20]
        },
        
        // Date and company
        {
          text: new Date().toLocaleDateString(),
          alignment: 'right',
          margin: [0, 0, 0, 20]
        },
        
        {
          text: [
            'Hiring Manager',
            jobInfo.company,
            jobInfo.location
          ].join('\n'),
          margin: [0, 0, 0, 20]
        },
        
        // Letter content
        { text: letterParts.greeting, margin: [0, 0, 0, 15] },
        { text: letterParts.introduction, margin: [0, 0, 0, 15], alignment: 'justify' },
        { text: letterParts.body, margin: [0, 0, 0, 15], alignment: 'justify' },
        { text: letterParts.closing, margin: [0, 0, 0, 15], alignment: 'justify' },
        { text: letterParts.signature, margin: [0, 20, 0, 0] }
      ],
      
      defaultStyle: {
        font: this.defaultFont,
        fontSize: 11,
        lineHeight: 1.3
      },
      
      pageMargins: [60, 60, 60, 60]
    };
  }
  
  async testPDFGeneration() {
    try {
      const testData = {
        userInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '+255 123 456 789',
          address: 'Dar es Salaam, Tanzania'
        },
        jobInfo: {
          title: 'Software Developer',
          company: 'Tech Company Ltd',
          location: 'Dar es Salaam'
        },
        letterParts: {
          greeting: 'Dear Hiring Manager,',
          introduction: 'I am writing to express my interest in the Software Developer position.',
          body: 'With my experience in web development and passion for technology, I believe I would be a valuable addition to your team.',
          closing: 'Thank you for considering my application. I look forward to hearing from you.',
          signature: 'Sincerely,\nJohn Doe'
        }
      };
      
      const pdf = await this.generateCoverLetterPDF(testData);
      return { success: true, size: pdf.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = PDFGenerator;
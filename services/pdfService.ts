// This assumes jsPDF is loaded from a CDN in index.html
declare const jspdf: any;

export const createPdf = (coverImage: string, pageImages: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Check if the PDF library is available.
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        console.error("jsPDF library is not loaded. Please check the script tag in index.html.");
        reject(new Error("The PDF generation library failed to load. Please try refreshing the page."));
        return;
    }
    
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
          orientation: 'p',
          unit: 'pt',
          format: 'a4'
        });
    
        const addImageToPage = (imageData: string) => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 40;
          const contentWidth = pageWidth - margin * 2;
          const contentHeight = pageHeight - margin * 2;
          
          // Image is 4:3 aspect ratio from the API call
          const imageAspectRatio = 4 / 3;
          let imgWidth = contentWidth;
          let imgHeight = contentWidth / imageAspectRatio;
    
          if (imgHeight > contentHeight) {
            imgHeight = contentHeight;
            imgWidth = contentHeight * imageAspectRatio;
          }
    
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
    
          doc.addImage(`data:image/png;base64,${imageData}`, 'PNG', x, y, imgWidth, imgHeight);
        };
    
        // Add cover page
        addImageToPage(coverImage);
    
        // Add content pages
        pageImages.forEach((page) => {
          doc.addPage();
          addImageToPage(page);
        });
    
        const pdfBlobUrl = doc.output('bloburl');
        
        // 2. More specific check for generation failure.
        if (!pdfBlobUrl) {
          throw new Error('jsPDF returned an empty result. The PDF could not be generated.');
        }
        resolve(pdfBlobUrl);

    } catch (error) {
        // 3. Log the technical error and reject with a more informative user message.
        console.error("Error creating PDF:", error);
        reject(new Error("An unexpected error occurred while creating the PDF. The image data may be invalid or the browser may have run out of memory."));
    }
  });
};
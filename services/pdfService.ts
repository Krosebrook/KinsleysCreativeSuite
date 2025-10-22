
// This assumes jsPDF is loaded from a CDN in index.html
declare const jspdf: any;

export const createPdf = (coverImage: string, pageImages: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
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
        pageImages.forEach((page, index) => {
          doc.addPage();
          addImageToPage(page);
        });
    
        const pdfBlobUrl = doc.output('bloburl');
        if (!pdfBlobUrl) {
          throw new Error('jsPDF failed to generate a blob URL.');
        }
        resolve(pdfBlobUrl);

    } catch (error) {
        console.error("Error creating PDF:", error);
        reject(new Error("There was an issue creating the PDF file."));
    }
  });
};

import { useState } from 'react';

export const usePrint = () => {
  const [isPrinting, setIsPrinting] = useState(false);

  const printData = (content) => {
    setIsPrinting(true);
    
    const printWindow = window.open('', '_blank');
    
    const printStyles = `
      <style>
        @media print {
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
          }
          .print-layout { 
            width: 100%; 
          }
          .print-header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .print-header h1 { 
            margin: 0 0 10px 0; 
            color: #333; 
          }
          .print-summary { 
            display: flex; 
            justify-content: space-around; 
            margin-top: 15px; 
          }
          .print-summary p { 
            margin: 5px; 
            font-weight: bold; 
          }
          .print-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          .print-table th, 
          .print-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
            font-size: 12px; 
          }
          .print-table th { 
            background-color: #f5f5f5; 
            font-weight: bold; 
          }
          .defaulter-row { 
            background-color: #ffebee; 
          }
          .compliant-row { 
            background-color: #e8f5e8; 
          }
          .print-footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #ccc; 
            font-size: 12px; 
            color: #666; 
          }
        }
        @page { 
          margin: 1in; 
        }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Safety Compliance Report</title>
          ${printStyles}
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
      setIsPrinting(false);
    };
  };

  return { printData, isPrinting };
};
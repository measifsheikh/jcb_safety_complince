import React, { useState } from 'react';
import './ExportOptions.css';

const ExportOptions = ({ data }) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = ['Date', 'Name', 'Department', 'Area', 'Safety Shoes', 'Safety Glasses', 'Safety Jacket', 'Status'];
    
    const csvContent = [
      headers.join(','),
      ...data.map(record => [
        new Date(record.date).toLocaleDateString(),
        `"${record.name}"`,
        `"${record.department}"`,
        `"${record.area.replace('_', ' ')}"`,
        record.safetyShoes ? 'Yes' : 'No',
        record.safetyGlasses ? 'Yes' : 'No',
        record.safetyJacket ? 'Yes' : 'No',
        record.isDefaulter ? 'Non-Compliant' : 'Compliant'
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'safety-compliance-report.csv', 'text/csv');
  };

  const exportToJSON = () => {
    if (data.length === 0) return;

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'safety-compliance-report.json', 'application/json');
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // This would typically use a library like jsPDF
      // For now, we'll create a simple HTML-to-PDF solution
      const printWindow = window.open('', '_blank');
      const content = generatePDFContent(data);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Safety Compliance Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .defaulter-row { background-color: #ffebee; }
              .compliant-row { background-color: #e8f5e8; }
              .header { text-align: center; margin-bottom: 20px; }
              .summary { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDFContent = (records) => {
    const totalRecords = records.length;
    const defaulters = records.filter(r => r.isDefaulter).length;
    const complianceRate = totalRecords ? ((totalRecords - defaulters) / totalRecords * 100).toFixed(1) : 0;

    return `
      <div class="header">
        <h1>Safety Compliance Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="summary">
        <h3>Summary</h3>
        <p>Total Records: ${totalRecords}</p>
        <p>Non-Compliant Records: ${defaulters}</p>
        <p>Compliance Rate: ${complianceRate}%</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Department</th>
            <th>Area</th>
            <th>Shoes</th>
            <th>Glasses</th>
            <th>Jacket</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr class="${record.isDefaulter ? 'defaulter-row' : 'compliant-row'}">
              <td>${new Date(record.date).toLocaleDateString()}</td>
              <td>${record.name}</td>
              <td>${record.department}</td>
              <td>${record.area.replace('_', ' ')}</td>
              <td>${record.safetyShoes ? 'Yes' : 'No'}</td>
              <td>${record.safetyGlasses ? 'Yes' : 'No'}</td>
              <td>${record.safetyJacket ? 'Yes' : 'No'}</td>
              <td>${record.isDefaulter ? 'Non-Compliant' : 'Compliant'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="export-options">
      <div className="export-dropdown">
        <button className="export-button">
          Export ▼
        </button>
        <div className="export-menu">
          <button 
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="export-option"
          >
            Export as CSV
          </button>
          <button 
            onClick={exportToJSON}
            disabled={data.length === 0}
            className="export-option"
          >
            Export as JSON
          </button>
          <button 
            onClick={exportToPDF}
            disabled={data.length === 0 || isExporting}
            className="export-option"
          >
            {isExporting ? 'Generating PDF...' : 'Export as PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportOptions;

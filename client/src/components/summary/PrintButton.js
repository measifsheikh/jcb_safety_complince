import React from 'react';
import { usePrint } from '../../hooks/usePrint';
import './PrintButton.css';

const PrintButton = ({ data }) => {
  const { printData, isPrinting } = usePrint();

  const handlePrint = () => {
    const printContent = generatePrintContent(data);
    printData(printContent);
  };

  const generatePrintContent = (records) => {
    const totalRecords = records.length;
    const defaulters = records.filter(r => r.isDefaulter).length;
    const complianceRate = totalRecords ? ((totalRecords - defaulters) / totalRecords * 100).toFixed(1) : 0;
    const currentDate = new Date().toLocaleDateString();

    return `
      <div class="print-layout">
        <div class="print-header">
          <h1>Safety Compliance Report</h1>
          <p>Generated on: ${currentDate}</p>
          <div class="print-summary">
            <p>Total Records: ${totalRecords}</p>
            <p>Non-Compliant: ${defaulters}</p>
            <p>Compliance Rate: ${complianceRate}%</p>
          </div>
        </div>
        
        <table class="print-table">
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
                <td>${record.safetyShoes ? '✓' : '✗'}</td>
                <td>${record.safetyGlasses ? '✓' : '✗'}</td>
                <td>${record.safetyJacket ? '✓' : '✗'}</td>
                <td>${record.isDefaulter ? 'Non-Compliant' : 'Compliant'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="print-footer">
          <p>Safety Compliance Tracking System</p>
        </div>
      </div>
    `;
  };

  return (
    <button 
      className="print-button"
      onClick={handlePrint}
      disabled={isPrinting || data.length === 0}
    >
      {isPrinting ? 'Printing...' : 'Print Report'}
    </button>
  );
};

export default PrintButton;
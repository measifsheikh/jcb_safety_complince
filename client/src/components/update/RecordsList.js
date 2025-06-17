import React from 'react';
import './RecordsList.css';

const RecordsList = ({ records, onRecordSelect, selectedRecord }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getComplianceIcon = (isDefaulter) => {
    return isDefaulter ? '❌' : '✅';
  };

  return (
    <div className="records-list">
      <h3>Recent Records</h3>
      
      {records.length === 0 ? (
        <p className="no-records">No records available</p>
      ) : (
        <div className="records-table">
          <div className="table-header">
            <div className="col-date">Date</div>
            <div className="col-name">Name</div>
            <div className="col-department">Department</div>
            <div className="col-area">Area</div>
            <div className="col-status">Status</div>
          </div>
          
          <div className="table-body">
            {records.map(record => (
              <div
                key={record.id}
                className={`table-row ${selectedRecord?.id === record.id ? 'selected' : ''} ${record.isDefaulter ? 'defaulter' : 'compliant'}`}
                onClick={() => onRecordSelect(record)}
              >
                <div className="col-date">{formatDate(record.date)}</div>
                <div className="col-name">{record.name}</div>
                <div className="col-department">{record.department}</div>
                <div className="col-area">{record.area.replace('_', ' ')}</div>
                <div className="col-status">
                  <span className="status-icon">
                    {getComplianceIcon(record.isDefaulter)}
                  </span>
                  <span className="status-text">
                    {record.isDefaulter ? 'Non-Compliant' : 'Compliant'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsList;
import React, { useState } from 'react';
import TablePagination from './TablePagination';
import './SummaryTable.css';

const SummaryTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const sortedData = React.useMemo(() => {
    const sortableData = [...data];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSafetyIcon = (hasEquipment) => {
    return hasEquipment ? '✅' : '❌';
  };

  return (
    <div className="summary-table-container">
      <div className="table-responsive">
        <table className="summary-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('date')}>
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => requestSort('name')}>
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => requestSort('department')}>
                Department {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => requestSort('area')}>
                Area {sortConfig.key === 'area' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Safety Shoes</th>
              <th>Safety Glasses</th>
              <th>Safety Jacket</th>
              <th onClick={() => requestSort('isDefaulter')}>
                Status {sortConfig.key === 'isDefaulter' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record) => (
              <tr key={record.id} className={record.isDefaulter ? 'defaulter-row' : 'compliant-row'}>
                <td>{formatDate(record.date)}</td>
                <td>{record.name}</td>
                <td>{record.department}</td>
                <td>{record.area.replace('_', ' ')}</td>
                <td className="equipment-cell">
                  {getSafetyIcon(record.safetyShoes)}
                </td>
                <td className="equipment-cell">
                  {getSafetyIcon(record.safetyGlasses)}
                </td>
                <td className="equipment-cell">
                  {getSafetyIcon(record.safetyJacket)}
                </td>
                <td>
                  <span className={`status-badge ${record.isDefaulter ? 'defaulter' : 'compliant'}`}>
                    {record.isDefaulter ? 'Non-Compliant' : 'Compliant'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        totalItems={sortedData.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default SummaryTable;
import React from 'react';
import { useParams } from 'react-router-dom';

function RecordDetail() {
  const { objectId, id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Record Details</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <p className="text-gray-600">Object ID: {objectId}</p>
          <p className="text-gray-600">Record ID: {id}</p>
          {/* Placeholder content - replace with actual record details */}
          <p className="text-gray-500">Record details will be displayed here</p>
        </div>
      </div>
    </div>
  );
}

export default RecordDetail;
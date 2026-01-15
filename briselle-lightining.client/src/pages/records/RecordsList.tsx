import React from 'react';
import { useParams } from 'react-router-dom';

function RecordsList() {
  const { objectId } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Records for Object {objectId}</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          {/* Placeholder content - replace with actual records list */}
          <p className="text-gray-500">No records found</p>
        </div>
      </div>
    </div>
  );
}

export default RecordsList;
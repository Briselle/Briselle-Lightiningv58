import { useMemo } from 'react';

interface ObjectStats {
  objectName: string;
  totalRecords: number;
  createdToday: number;
}

function ObjectMetrics() {
  // Normally this would be fetched from an API
  const objectStats: ObjectStats[] = [
    { objectName: 'Account', totalRecords: 356, createdToday: 7 },
    { objectName: 'Contact', totalRecords: 842, createdToday: 12 },
    { objectName: 'Lead', totalRecords: 157, createdToday: 5 },
    { objectName: 'Opportunity', totalRecords: 89, createdToday: 3 },
    { objectName: 'Task', totalRecords: 38, createdToday: 0 },
  ];

  // Calculate the maximum value for proper bar scaling
  const maxRecords = useMemo(() => {
    return Math.max(...objectStats.map(stat => stat.totalRecords));
  }, [objectStats]);

  return (
    <div className="mt-4">
      {objectStats.map((stat) => (
        <div key={stat.objectName} className="mb-4 last:mb-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{stat.objectName}</span>
            <span className="text-sm text-gray-500">{stat.totalRecords} records</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full"
              style={{ width: `${(stat.totalRecords / maxRecords) * 100}%` }}
            ></div>
          </div>
          <div className="mt-1">
            <span className="text-xs text-success font-medium">
              +{stat.createdToday} today
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ObjectMetrics;
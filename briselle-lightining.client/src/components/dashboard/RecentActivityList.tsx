import { formatDistanceToNow } from 'date-fns';
import { User, Edit, PlusCircle, Trash2 } from 'lucide-react';

interface Activity {
  id: number;
  type: 'create' | 'update' | 'delete';
  user: string;
  object: string;
  record?: string;
  timestamp: Date;
}

function RecentActivityList() {
  // This would come from an API in a real application
  const activities: Activity[] = [
    {
      id: 1,
      type: 'create',
      user: 'John Doe',
      object: 'Account',
      record: 'Acme Inc.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    },
    {
      id: 2,
      type: 'update',
      user: 'Jane Smith',
      object: 'Contact',
      record: 'Sarah Johnson',
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    },
    {
      id: 3,
      type: 'delete',
      user: 'Admin User',
      object: 'Lead',
      record: 'XYZ Corp',
      timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
    },
    {
      id: 4,
      type: 'create',
      user: 'John Doe',
      object: 'Opportunity',
      record: 'New Deal',
      timestamp: new Date(Date.now() - 1000 * 60 * 300), // 5 hours ago
    },
  ];

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'create':
        return <PlusCircle size={16} className="text-success" />;
      case 'update':
        return <Edit size={16} className="text-primary" />;
      case 'delete':
        return <Trash2 size={16} className="text-error" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
          <div className="flex-shrink-0 mr-3">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activity.user} {activity.type}d a {activity.object}
              {activity.record && `: ${activity.record}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
      
      <button className="text-sm text-primary font-medium mt-2 hover:text-primary/80 transition-colors">
        View all activity
      </button>
    </div>
  );
}

export default RecentActivityList;
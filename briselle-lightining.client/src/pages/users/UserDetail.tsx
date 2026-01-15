import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Calendar, Activity, Edit, Trash2 } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  department?: string;
  phone?: string;
  timezone?: string;
}

function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUser({
        id: id || '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Administrator',
        status: 'active',
        lastLogin: '2024-03-10 09:45 AM',
        createdAt: '2023-12-01',
        department: 'IT',
        phone: '+1 (555) 123-4567',
        timezone: 'America/New_York',
      });
      setIsLoading(false);
    }, 500);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">User not found</h2>
        <p className="mt-2 text-gray-500">The user you're looking for doesn't exist.</p>
        <Link to="/users" className="btn btn-primary mt-4">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/users" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{user.name}</h1>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-secondary">
            <Edit size={16} className="mr-2" />
            Edit
          </button>
          <button className="btn btn-danger">
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <div className="flex items-center">
                  <User size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-900">{user.name}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <div className="flex items-center">
                  <Mail size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-900">{user.email}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                <div className="flex items-center">
                  <Shield size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-900">{user.role}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                <div className="flex items-center">
                  <Activity size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-900">{user.department || 'Not specified'}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <span className="text-gray-900">{user.phone || 'Not specified'}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Timezone</label>
                <span className="text-gray-900">{user.timezone || 'Not specified'}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
            <div className="space-y-4">
              {/* Mock activity entries */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start pb-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity size={16} className="text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      User logged in from 192.168.1.{i}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Account Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  user.status === 'active'
                    ? 'bg-success/10 text-success'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Login</label>
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-900">{user.lastLogin}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-900">{user.createdAt}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Permissions</h2>
            <div className="space-y-3">
              {['View Records', 'Create Records', 'Edit Records', 'Delete Records'].map((perm) => (
                <div key={perm} className="flex items-center">
                  <input
                    type="checkbox"
                    id={perm.toLowerCase().replace(' ', '-')}
                    defaultChecked={true}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <label
                    htmlFor={perm.toLowerCase().replace(' ', '-')}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {perm}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
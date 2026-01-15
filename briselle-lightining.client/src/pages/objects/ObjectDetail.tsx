import { useParams, Link } from 'react-router-dom';
import { Settings, Database, ArrowLeft, Plus, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Field {
  id: string;
  name: string;
  apiName: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface ObjectDetail {
  id: string;
  name: string;
  apiName: string;
  description: string;
  fields: Field[];
  recordCount: number;
  lastModified: string;
}

function ObjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [object, setObject] = useState<ObjectDetail | null>(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Mock data - this would come from an API in a real app
      setObject({
        id: id || '1',
        name: 'Account',
        apiName: 'Account__c',
        description: 'Business accounts and organizations',
        recordCount: 356,
        lastModified: '2023-10-15',
        fields: [
          {
            id: '1',
            name: 'Name',
            apiName: 'Name',
            type: 'Text',
            required: true,
            description: 'Account name',
          },
          {
            id: '2',
            name: 'Phone',
            apiName: 'Phone__c',
            type: 'Phone',
            required: false,
            description: 'Primary phone number',
          },
          {
            id: '3',
            name: 'Email',
            apiName: 'Email__c',
            type: 'Email',
            required: false,
            description: 'Primary email address',
          },
          {
            id: '4',
            name: 'Type',
            apiName: 'Type__c',
            type: 'Picklist',
            required: false,
            description: 'Account type',
          },
          {
            id: '5',
            name: 'Industry',
            apiName: 'Industry__c',
            type: 'Picklist',
            required: false,
            description: 'Industry category',
          },
          {
            id: '6',
            name: 'Website',
            apiName: 'Website__c',
            type: 'URL',
            required: false,
            description: 'Company website',
          },
          {
            id: '7',
            name: 'Description',
            apiName: 'Description__c',
            type: 'TextArea',
            required: false,
            description: 'Account description',
          },
        ],
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

  if (!object) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">Object not found</h2>
        <p className="mt-2 text-gray-500">The object you're looking for doesn't exist.</p>
        <Link to="/objects" className="btn btn-primary mt-4">
          Back to Objects
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center mb-6">
        <Link to="/objects" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="page-title mb-0">{object.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{object.name}</h2>
                <p className="text-gray-500 text-sm font-mono mt-1">{object.apiName}</p>
              </div>
              <Link to={`/objects/${object.id}/config`} className="btn btn-secondary">
                <Settings size={16} className="mr-2" />
                Configure
              </Link>
            </div>
            <p className="text-gray-700 mb-4">{object.description}</p>
            <div className="flex space-x-6">
              <div>
                <span className="text-gray-500 text-sm">Records</span>
                <p className="font-medium">{object.recordCount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Last Modified</span>
                <p className="font-medium">{object.lastModified}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Actions</h3>
            </div>
            <div className="space-y-2">
              <Link to={`/objects/${object.id}/records`} className="btn btn-primary w-full justify-start">
                <Database size={16} className="mr-2" />
                View Records
              </Link>
              <Link to={`/objects/${object.id}/records/new`} className="btn btn-secondary w-full justify-start">
                <Plus size={16} className="mr-2" />
                New Record
              </Link>
              <Link to={`/objects/${object.id}/config`} className="btn btn-secondary w-full justify-start">
                <Edit size={16} className="mr-2" />
                Edit Fields
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Fields</h2>
          <button className="btn btn-secondary">
            <Plus size={16} className="mr-2" />
            Add Field
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Field Label</th>
                <th>API Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {object.fields.map((field) => (
                <tr key={field.id}>
                  <td className="font-medium">{field.name}</td>
                  <td className="text-gray-500 font-mono text-xs">{field.apiName}</td>
                  <td>{field.type}</td>
                  <td>
                    {field.required ? (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                        Required
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                        Optional
                      </span>
                    )}
                  </td>
                  <td>{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ObjectDetail;
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, MoveVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Field {
  id: string;
  name: string;
  apiName: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface ObjectConfig {
  id: string;
  name: string;
  apiName: string;
  description: string;
  fields: Field[];
}

function ObjectConfig() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [object, setObject] = useState<ObjectConfig | null>(null);
  const [activeTab, setActiveTab] = useState('fields');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Mock data - this would come from an API in a real app
      setObject({
        id: id || '1',
        name: 'Account',
        apiName: 'Account__c',
        description: 'Business accounts and organizations',
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to={`/objects/${id}`} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="page-title mb-0">Configure {object.name}</h1>
        </div>
        <button className="btn btn-primary">
          <Save size={16} className="mr-2" />
          Save Changes
        </button>
      </div>

      <div className="card mb-6">
        <div className="p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Object Label
            </label>
            <input
              type="text"
              id="name"
              defaultValue={object.name}
              className="input"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="apiName" className="block text-sm font-medium text-gray-700 mb-1">
              API Name
            </label>
            <input
              type="text"
              id="apiName"
              defaultValue={object.apiName}
              className="input font-mono"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              defaultValue={object.description}
              rows={3}
              className="input"
            ></textarea>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'fields'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('fields')}
          >
            Fields
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'layout'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('layout')}
          >
            Page Layout
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'validation'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('validation')}
          >
            Validation Rules
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
        </div>
      </div>

      {activeTab === 'fields' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold">Fields</h2>
            <button className="btn btn-primary">
              <Plus size={16} className="mr-2" />
              Add Field
            </button>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {object.fields.map((field) => (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-md p-4 hover:shadow-sm transition-shadow bg-white"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Field Label
                          </label>
                          <input
                            type="text"
                            defaultValue={field.name}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            API Name
                          </label>
                          <input
                            type="text"
                            defaultValue={field.apiName}
                            className="input font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Type
                          </label>
                          <select className="input">
                            <option value="Text" selected={field.type === 'Text'}>
                              Text
                            </option>
                            <option value="Number" selected={field.type === 'Number'}>
                              Number
                            </option>
                            <option value="Email" selected={field.type === 'Email'}>
                              Email
                            </option>
                            <option value="Phone" selected={field.type === 'Phone'}>
                              Phone
                            </option>
                            <option value="Date" selected={field.type === 'Date'}>
                              Date
                            </option>
                            <option value="DateTime" selected={field.type === 'DateTime'}>
                              Date/Time
                            </option>
                            <option value="Picklist" selected={field.type === 'Picklist'}>
                              Picklist
                            </option>
                            <option value="Checkbox" selected={field.type === 'Checkbox'}>
                              Checkbox
                            </option>
                            <option value="TextArea" selected={field.type === 'TextArea'}>
                              Text Area
                            </option>
                            <option value="URL" selected={field.type === 'URL'}>
                              URL
                            </option>
                            <option value="Lookup" selected={field.type === 'Lookup'}>
                              Lookup
                            </option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          defaultValue={field.description}
                          className="input"
                        />
                      </div>
                      <div className="mt-4 flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${field.id}`}
                          defaultChecked={field.required}
                          className="mr-2"
                        />
                        <label
                          htmlFor={`required-${field.id}`}
                          className="text-sm text-gray-700"
                        >
                          Required Field
                        </label>
                      </div>
                    </div>
                    <div className="ml-4 flex items-start space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <MoveVertical size={16} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-error">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'layout' && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Page Layout</h2>
          <p className="text-gray-500">
            Configure how fields are displayed on record pages.
          </p>
          <div className="mt-4 p-6 border border-dashed border-gray-300 rounded-md text-center">
            <p className="text-gray-500">Drag and drop fields to arrange them on the page layout.</p>
            <button className="btn btn-secondary mt-4">Edit Page Layout</button>
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Validation Rules</h2>
          <p className="text-gray-500">
            Define rules to ensure data quality and consistency.
          </p>
          <div className="mt-4">
            <button className="btn btn-primary">
              <Plus size={16} className="mr-2" />
              Add Validation Rule
            </button>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Permissions</h2>
          <p className="text-gray-500">
            Configure which users can view, create, edit, or delete records.
          </p>
          <div className="mt-6">
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto">
                <div className="py-2 align-middle inline-block min-w-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          View
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Create
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Edit
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Administrator
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Standard User
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={false} />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Read Only
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={false} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={false} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input type="checkbox" defaultChecked={false} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObjectConfig;
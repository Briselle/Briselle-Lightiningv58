import { useParams, Link } from 'react-router-dom';
import { Settings, Database, ArrowLeft, Plus, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

interface Field {
  id: string;
  name: string;
  apiName: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface EntityDetail {
  id: string;
  entity_name_display: string;
  entity_name_system: string;
  entity_description: string;
  entity_updated_at: string;
  recordCount: number;
  fields: Field[];
}

function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [entity, setEntity] = useState<EntityDetail | null>(null);

  useEffect(() => {
    async function fetchEntityDetail() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('entity')
        .select('*')
        .eq('entity_id', id)
        .single();

      if (error || !data) {
        setEntity(null);
        setIsLoading(false);
        return;
      }

      const fieldResponse = await supabase
        .from('fields')
        .select('*')
        .eq('entity_id', id);

      const entityDetail: EntityDetail = {
        id: data.entity_id,
        entity_name_display: data.entity_name_display,
        entity_name_system: data.entity_name_system,
        entity_description: data.entity_description,
        entity_updated_at: data.entity_updated_at,
        recordCount: data.record_count || 0,
        fields: fieldResponse.data || [],
      };

      setEntity(entityDetail);
      setIsLoading(false);
    }

    fetchEntityDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">Entity not found</h2>
        <p className="mt-2 text-gray-500">The entity you're looking for doesn't exist.</p>
        <Link to="/entities" className="btn btn-primary mt-4">
          Back to Entities
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center mb-6">
        <Link to="/entities" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="page-title mb-0">{entity.entity_name_display}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{entity.entity_name_display}</h2>
                <p className="text-gray-500 text-sm font-mono mt-1">{entity.entity_name_system}</p>
              </div>
              <Link to={`/entities/${entity.id}/config`} className="btn btn-secondary">
                <Settings size={16} className="mr-2" />
                Configure
              </Link>
            </div>
            <p className="text-gray-700 mb-4">{entity.entity_description}</p>
            <div className="flex space-x-6">
              <div>
                <span className="text-gray-500 text-sm">Records</span>
                <p className="font-medium">{entity.recordCount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Last Modified</span>
                <p className="font-medium">{entity.entity_updated_at}</p>
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
              <Link to={`/entity/${entity.id}/records`} className="btn btn-primary w-full justify-start">
                <Database size={16} className="mr-2" />
                View Records
              </Link>
              <Link to={`/entity/${entity.id}/records/new`} className="btn btn-secondary w-full justify-start">
                <Plus size={16} className="mr-2" />
                New Record
              </Link>
              <Link to={`/entity/${entity.id}/config`} className="btn btn-secondary w-full justify-start">
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
              {entity.fields.map((field) => (
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

export default EntityDetailPage;

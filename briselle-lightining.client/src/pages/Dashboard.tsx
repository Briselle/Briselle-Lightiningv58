import { ArrowUp, ArrowDown, Users, Database, Activity } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import RecentActivityList from '../components/dashboard/RecentActivityList';
import ObjectMetrics from '../components/dashboard/ObjectMetrics';

function Dashboard() {
  const stats = [
    {
      title: 'Users',
      value: '63',
      change: '+12%',
      isPositive: true,
      icon: <Users size={24} className="text-primary" />,
    },
    {
      title: 'Objects',
      value: '8',
      change: '+2',
      isPositive: true,
      icon: <Database size={24} className="text-accent" />,
    },
    {
      title: 'Records',
      value: '1,482',
      change: '+17%',
      isPositive: true,
      icon: <Activity size={24} className="text-success" />,
    },
  ];

  return (
    <div className="fade-in">
      <h1 className="page-title">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard 
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            isPositive={stat.isPositive}
            icon={stat.icon}
          />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="section-title">Object Metrics</h2>
            <ObjectMetrics />
          </div>
        </div>
        
        <div>
          <div className="card p-6">
            <h2 className="section-title">Recent Activity</h2>
            <RecentActivityList />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
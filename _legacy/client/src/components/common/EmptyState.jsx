import { Info } from 'lucide-react';

export default function EmptyState({ 
  title = 'No data found', 
  description = 'Try adjusting your filters or search terms.', 
  icon: Icon = Info 
}) {
  return (
    <div className="empty-state glass-card animate-fade-in">
      <Icon className="empty-state-icon" />
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
    </div>
  );
}

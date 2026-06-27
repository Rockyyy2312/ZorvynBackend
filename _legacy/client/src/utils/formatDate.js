export function formatDate(dateString, style = 'medium') {
  if (!dateString) return '';
  const date = new Date(dateString);
  
  if (style === 'short') {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

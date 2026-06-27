export default function LoadingSpinner({ size = 'medium', fullPage = false }) {
  const sizeClass = size === 'small' ? 'sm' : size === 'large' ? 'lg' : '';
  
  const spinnerElement = (
    <div className="spinner-container">
      <div className={`spinner ${sizeClass}`}></div>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
}

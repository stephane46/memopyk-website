// Export utility functions for analytics data
export async function downloadCSV(endpoint: string, filename: string) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    if (document.body) {
      document.body.appendChild(link);
    } else {
      throw new Error('document.body not available for file download');
    }
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV download failed:', error);
    throw error;
  }
}

export async function downloadPDF(filename: string = 'analytics_report.pdf') {
  try {
    const response = await fetch('/api/analytics/export/pdf');
    if (!response.ok) {
      throw new Error(`PDF export failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    if (document.body) {
      document.body.appendChild(link);
    } else {
      throw new Error('document.body not available for file download');
    }
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF download failed:', error);
    throw error;
  }
}

export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}
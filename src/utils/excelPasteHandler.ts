// Excel Table Paste Handler for ReactQuill
// This module handles pasting Excel tables into the email editor

// Enhanced Excel detection function
export const isExcelContent = (html: string): boolean => {
  console.log('🔍 isExcelContent called with HTML length:', html?.length);
  
  if (!html || typeof html !== 'string') {
    console.log('❌ Invalid HTML input');
    return false;
  }
  
  // Enhanced Excel markers for better detection
  const excelMarkers = [
    'xmlns:o',
    'xmlns:x',
    'x:autonum',
    'urn:schemas-microsoft-com:office:office',
    'urn:schemas-microsoft-com:office:excel',
    'x:str',
    'x:num'
  ];
  
  // Debug: Log the HTML content for troubleshooting
  console.log('📄 HTML sample (first 200 chars):', html.substring(0, 200));
  
  // Check for Excel-specific markers
  const foundMarkers = excelMarkers.filter(marker => html.includes(marker));
  console.log('🏷️ Excel markers found:', foundMarkers);
  
  // Check for table structure
  const hasTable = html.includes('<table') && html.includes('</table>');
  const tableRowCount = (html.match(/<tr/gi) || []).length;
  const tableCellCount = (html.match(/<td|<th/gi) || []).length;
  
  console.log('📊 Table structure:', { hasTable, tableRowCount, tableCellCount });
  
  // Enhanced detection logic
  const result = hasTable && tableRowCount > 0 && tableCellCount > 0 && (foundMarkers.length > 0 || tableRowCount > 1);
  console.log('✅ isExcelContent result:', result);
  
  return result;
};

export interface ExcelTableData {
  rows: string[][];
  hasHeaders: boolean;
}

export const parseExcelHTML = (html: string): ExcelTableData | null => {
  // Use enhanced Excel detection
  if (!html || !isExcelContent(html)) {
    return null;
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const tables = tempDiv.querySelectorAll('table');
  if (tables.length === 0) return null;

  // Use the first table found
  const table = tables[0];
  const rows = table.querySelectorAll('tr');
  
  if (rows.length === 0) return null;

  const tableData: string[][] = [];
  let hasHeaders = false;

  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td, th');
    const rowData: string[] = [];
    
    cells.forEach((cell) => {
      // Get text content, preserving line breaks and handling Excel-specific formatting
      let cellText = '';
      
      // Handle Excel-specific content
      if (cell.innerHTML.includes('x:str') || cell.innerHTML.includes('mso-')) {
        // Extract text from Excel-specific markup
        const textContent = cell.textContent || cell.innerText || '';
        cellText = textContent.replace(/\n/g, ' ').replace(/\r/g, '').trim();
      } else if (cell.innerHTML.includes('<br')) {
        // Handle line breaks within cells
        cellText = cell.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
      } else {
        // Regular text content
        cellText = cell.textContent || cell.innerText || '';
      }
      
      // Clean up the text - remove extra whitespace but preserve intentional spaces
      cellText = cellText.replace(/\s+/g, ' ').trim();
      rowData.push(cellText);
    });
    
    if (rowData.length > 0) {
      tableData.push(rowData);
      // Check if first row contains headers (th elements or bold formatting)
      if (index === 0) {
        const headerCells = row.querySelectorAll('th');
        const boldCells = row.querySelectorAll('td b, td strong, td font[weight="bold"]');
        if (headerCells.length > 0 || boldCells.length > cells.length / 2) {
          hasHeaders = true;
        }
      }
    }
  });

  // Validate that we have meaningful data
  if (tableData.length === 0 || tableData.every(row => row.every(cell => !cell))) {
    return null;
  }

  return { rows: tableData, hasHeaders };
};

export const createTableHTML = (tableData: ExcelTableData): string => {
  const { rows, hasHeaders } = tableData;
  
  if (rows.length === 0) return '';

  // Create a well-formatted table with clear borders and styling
  let html = '<table class="excel-table" style="border-collapse: collapse; width: 100%; margin: 8px 0; border: 1px solid #cccccc; background-color: #ffffff;">';
  
  rows.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach((cell, cellIndex) => {
      const cellTag = (hasHeaders && rowIndex === 0) ? 'th' : 'td';
      
      // Header cells get special styling
      const headerStyle = hasHeaders && rowIndex === 0 
        ? 'background-color: #f5f5f5; font-weight: bold; color: #333333;'
        : 'background-color: #ffffff; color: #333333;';
      
      const cellStyle = `style="${headerStyle} border: 1px solid #cccccc; padding: 8px 12px; text-align: left; font-family: inherit; font-size: 14px; line-height: 1.4; min-width: 60px;"`;
      
      // Handle empty cells
      const cellContent = cell.trim() === '' ? '&nbsp;' : cell.replace(/\n/g, '<br>');
      
      html += `<${cellTag} ${cellStyle} data-row="${rowIndex}" data-col="${cellIndex}">${cellContent}</${cellTag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table><br>'; // Add line break after table for better spacing
  return html;
};

export const handleExcelPaste = (html: string): string | null => {
  // First check if this is Excel content
  if (!isExcelContent(html)) return null;
  
  const tableData = parseExcelHTML(html);
  if (!tableData) return null;
  
  return createTableHTML(tableData);
};

// Enhanced Excel paste handler for DOM events
export const handleExcelPasteEvent = (event: ClipboardEvent, quill: any): boolean => {
  const clipboardData = event.clipboardData || (window as any).clipboardData;
  if (!clipboardData) return false;
  
  // Get HTML content
  let html = '';
  for (let i = 0; i < clipboardData.types.length; i++) {
    if (clipboardData.types[i] === 'text/html') {
      html = clipboardData.getData('text/html');
      break;
    }
  }
  
  if (!html) return false;
  
  // Debug: Log the HTML content for troubleshooting
  console.log('Excel Paste Debug - HTML content:', html.substring(0, 500));
  console.log('Excel Paste Debug - Is Excel content:', isExcelContent(html));
  
  // Check if this is Excel content
  const tableData = parseExcelHTML(html);
  if (!tableData) return false;
  
  // Debug: Log the processed table data
  console.log('Excel Paste Debug - Parsed table data:', tableData);
  
  // Prevent default paste behavior
  event.preventDefault();
  
  // Get current selection
  const selection = quill.getSelection();
  if (!selection) return false;
  
  try {
    // Method 1: Try to use Quill's table module if available
    if (quill.getModule && quill.getModule('better-table')) {
      try {
        const tableModule = quill.getModule('better-table');
        
        // Insert table using the better-table module
        const { rows, hasHeaders } = tableData;
        const rowCount = rows.length;
        const colCount = rows[0]?.length || 0;
        
        if (rowCount > 0 && colCount > 0) {
          // Use the better-table module's insertTable method if available
          if (tableModule.insertTable) {
            tableModule.insertTable(rowCount, colCount);
            
            // Fill the table with content
            rows.forEach((row, rowIdx) => {
              row.forEach((cell, colIdx) => {
                const cellContent = cell.trim() === '' ? ' ' : cell;
                // Insert content into each cell
                const cellIndex = quill.getSelection()?.index || selection.index;
                quill.insertText(cellIndex, cellContent);
              });
            });
            
            return true;
          }
        }
      } catch (error) {
        console.warn('Better-table module failed, falling back to HTML:', error);
      }
    }
    
    // Method 2: Fallback to HTML insertion
    const tableHTML = createTableHTML(tableData);
    console.log('Excel Paste Debug - Processed table HTML:', tableHTML);
    
    if (quill.clipboard && quill.clipboard.convert) {
      // Convert HTML to Delta format
      const delta = quill.clipboard.convert(tableHTML);
      
      // Insert the Delta at current position
      if (delta && delta.ops && Array.isArray(delta.ops)) {
        quill.updateContents([
          { retain: selection.index },
          ...delta.ops
        ]);
      } else {
        // Fallback if delta.ops is not available
        quill.clipboard.dangerouslyPasteHTML(selection.index, tableHTML);
      }
    } else {
      // Final fallback
      quill.clipboard.dangerouslyPasteHTML(selection.index, tableHTML);
    }
    
    // Move cursor after the table
    const newIndex = selection.index + 1;
    try {
      quill.setSelection(newIndex);
    } catch (error) {
      console.warn('Could not set cursor position:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error inserting table:', error);
    return false;
  }
};

// Custom Quill clipboard module for Excel table pasting (without Delta dependency)
export const createExcelClipboardModule = (quill: any) => {
  return {
    clipboard: {
      matchers: [
        [
          Node.ELEMENT_NODE,
          (node: any, delta: any) => {
            // Check if this is a table element
            if (node.tagName && node.tagName.toLowerCase() === 'table') {
              const html = node.outerHTML || node.innerHTML;
              const excelTable = handleExcelPaste(html);
              
              if (excelTable) {
                // Return the formatted table HTML as plain text
                return { ops: [{ insert: excelTable }] };
              }
            }
            
            // For non-table elements, return original delta
            return delta;
          }
        ],
        [
          'text/html',
          (html: string, delta: any) => {
            const excelTable = handleExcelPaste(html);
            
            if (excelTable) {
              // Return the formatted table HTML as plain text
              return { ops: [{ insert: excelTable }] };
            }
            
            // For non-Excel content, return original delta
            return delta;
          }
        ]
      ]
    }
  };
};

// Alternative approach: Direct DOM manipulation for better Excel compatibility
export const enhanceExcelPaste = (quill: any) => {
  const editorContainer = quill.container;
  
  const pasteHandler = (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    if (!clipboardData) return;
    
    // Get HTML content
    let html = '';
    for (let i = 0; i < clipboardData.types.length; i++) {
      if (clipboardData.types[i] === 'text/html') {
        html = clipboardData.getData('text/html');
        break;
      }
    }
    
    if (!html) return;
    
    // Check if this is Excel content
    const tableData = parseExcelHTML(html);
    if (!tableData) return;
    
    // Prevent default paste behavior
    event.preventDefault();
    
    // Create formatted table
    const tableHTML = createTableHTML(tableData);
    
    // Get current selection
    const selection = quill.getSelection();
    if (!selection) return;
    
    // Insert the table HTML
    quill.clipboard.dangerouslyPasteHTML(selection.index, tableHTML);
    
    // Move cursor after the table
    const newIndex = selection.index + tableHTML.length;
    quill.setSelection(newIndex);
  };
  
  // Add paste event listener
  editorContainer.addEventListener('paste', pasteHandler);
  
  // Return cleanup function
  return () => {
    editorContainer.removeEventListener('paste', pasteHandler);
  };
};
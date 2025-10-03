// Debug version to see exactly what Excel is providing
export const debugExcelPaste = {
  handlePaste(event: ClipboardEvent, quill: any): boolean {
    console.log('🔍 DEBUG EXCEL PASTE - ANALYZING CLIPBOARD');
    
    try {
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        console.log('❌ No clipboard data');
        return false;
      }

      console.log('📋 Available clipboard types:', clipboardData.types);
      
      // Get all available formats
      const html = clipboardData.getData('text/html');
      const plainText = clipboardData.getData('text/plain');
      const rtf = clipboardData.getData('text/rtf');
      
      console.log('📝 HTML content length:', html.length);
      console.log('📝 Plain text content length:', plainText.length);
      console.log('📝 RTF content length:', rtf.length);
      
      if (html) {
        console.log('🌐 First 1000 chars of HTML:', html.substring(0, 1000));
        
        // Check for table indicators
        const hasTable = html.includes('<table');
        const hasExcel = html.includes('urn:schemas-microsoft-com:office:excel');
        const hasMso = html.includes('mso-');
        
        console.log('📊 Has table tag:', hasTable);
        console.log('📊 Has Excel namespace:', hasExcel);
        console.log('📊 Has MSO styles:', hasMso);
        
        if (hasTable) {
          console.log('✅ Table detected in HTML!');
          
          // Try to extract the table
          const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
          console.log('📋 Number of tables found:', tableMatch ? tableMatch.length : 0);
          
          if (tableMatch && tableMatch.length > 0) {
            console.log('🎯 First table:', tableMatch[0].substring(0, 500));
          }
        }
      }
      
      if (plainText) {
        console.log('📝 Plain text preview:', plainText.substring(0, 200));
        
        // Check if plain text looks like table data
        const hasTabs = plainText.includes('\t');
        const hasNewlines = plainText.includes('\n');
        const lines = plainText.split('\n').filter(line => line.trim());
        
        console.log('📊 Has tabs (table indicator):', hasTabs);
        console.log('📊 Has newlines:', hasNewlines);
        console.log('📊 Number of lines:', lines.length);
        
        if (lines.length > 1 && hasTabs) {
          console.log('✅ Plain text looks like table data!');
          console.log('📋 First few lines:');
          lines.slice(0, 3).forEach((line, i) => {
            console.log(`  Line ${i + 1}: "${line}"`);
          });
        }
      }
      
      // Now try to paste based on what we found// Get current selection - try multiple approaches
      let selection = quill.getSelection();
      
      // If no selection, try to get it after a small delay or use fallback
      if (!selection) {
        console.log('⚠️ No immediate selection, trying fallback...');
        
        // Try to get the current index from the editor
        const currentIndex = quill.getLength ? quill.getLength() - 1 : 0;
        if (currentIndex >= 0) {
          selection = { index: currentIndex, length: 0 };
          console.log('✅ Using fallback selection at index:', currentIndex);
        } else {
          console.log('❌ No selection available');
          return false;
        }
      }

      // Strategy 1: If we have HTML with table, try that first
      if (html && html.includes('<table')) {
        console.log('🚀 Trying HTML table insertion...');
        event.preventDefault();
        
        try {
          // Clean the HTML first
          const cleanHTML = html
            .replace(/\r\n/g, '')
            .replace(/\r/g, '')
            .replace(/\n/g, '')
            .replace(/<!--StartFragment-->/g, '')
            .replace(/<!--EndFragment-->/g, '');
            
          console.log('🧹 Cleaned HTML (first 500 chars):', cleanHTML.substring(0, 500));
          
          quill.clipboard.dangerouslyPasteHTML(selection.index, cleanHTML);
          console.log('✅ HTML table insertion SUCCESS!');
          
          // Verify the content was actually inserted
          setTimeout(() => {
            const newContent = quill.getText();
            console.log('📋 Editor content after paste (first 200 chars):', newContent.substring(0, 200));
            const newHTML = quill.root.innerHTML;
            console.log('🌐 Editor HTML after paste (first 500 chars):', newHTML.substring(0, 500));
          }, 100);
          
          return true;
        } catch (htmlError) {
          console.log('❌ HTML insertion failed:', htmlError);
          console.log('Stack trace:', htmlError.stack);
          
          // Try alternative: insert as Delta
          try {
            const delta = quill.clipboard.convert(html);
            quill.updateContents(delta);
            console.log('✅ HTML Delta conversion SUCCESS!');
            return true;
          } catch (deltaError) {
            console.log('❌ Delta conversion also failed:', deltaError);
          }
        }
      }
      
      // Strategy 2: If plain text looks like table data, format it
      if (plainText && plainText.includes('\t') && plainText.includes('\n')) {
        console.log('🚀 Trying formatted plain text insertion...');
        event.preventDefault();
        
        try {
          const lines = plainText.split('\n').filter(line => line.trim());
          const formattedTable = this.formatPlainTextAsTable(lines);
          
          if (formattedTable) {
            console.log('📝 Formatted table HTML:', formattedTable);
            quill.clipboard.dangerouslyPasteHTML(selection.index, formattedTable);
            console.log('✅ Formatted plain text SUCCESS!');
            return true;
          }
        } catch (textError) {
          console.log('❌ Formatted text insertion failed:', textError);
          console.log('Stack trace:', textError.stack);
        }
      }
      
      console.log('📝 Not Excel table content, allowing normal paste');
      return false;
      
    } catch (error) {
      console.log('❌ Debug paste failed:', error);
      return false;
    }
  },
  
  formatPlainTextAsTable(lines: string[]): string {
    try {
      console.log('📝 Formatting', lines.length, 'lines as table');
      
      const rows = lines.map(line => {
        const cells = line.split('\t').map(cell => cell.trim());
        return `<tr>${cells.map(cell => `<td style="padding: 8px; border: 1px solid #ddd;">${cell}</td>`).join('')}</tr>`;
      }).join('');
      
      const tableHTML = `
        <div style="margin: 10px 0;">
          <table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
            ${rows}
          </table>
        </div>
      `;
      
      console.log('✅ Formatted table HTML created successfully');
      return tableHTML;
    } catch (error) {
      console.log('❌ Plain text formatting failed:', error);
      return '';
    }
  }
};
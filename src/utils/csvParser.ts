import { CSVParseResult, DistributionListMember } from '../types';

export class CSVParser {
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static validateName(name: string): boolean {
    return name.trim().length > 0 && name.trim().length <= 100;
  }

  private static parseLine(line: string, rowIndex: number): { member?: DistributionListMember; errors: string[] } {
    const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
    const errors: string[] = [];

    // Expect 5 columns: List Name, Role, Designation, Email Address, Status
    if (columns.length < 5) {
      errors.push(`Row ${rowIndex}: Expected 5 columns (List Name, Role, Designation, Email Address, Status), got ${columns.length}`);
      return { errors };
    }

    const [listName, role, designation, email, status] = columns;

    // Validate list name (optional validation)
    if (!listName || listName.length < 1) {
      errors.push(`Row ${rowIndex}: List name cannot be empty`);
    }

    // Validate role
    if (!role || role.length < 2) {
      errors.push(`Row ${rowIndex}: Role must be at least 2 characters long`);
    }

    // Validate designation
    if (!designation || designation.length < 2) {
      errors.push(`Row ${rowIndex}: Designation must be at least 2 characters long`);
    }

    // Validate email
    if (!this.validateEmail(email)) {
      errors.push(`Row ${rowIndex}: Invalid email "${email}"`);
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      errors.push(`Row ${rowIndex}: Status must be one of: ${validStatuses.join(', ')}`);
    }

    if (errors.length > 0) {
      return { errors };
    }

    const member: DistributionListMember = {
      id: crypto.randomUUID(),
      name: `${designation}`, // Using designation as name for now
      role: role.trim(),
      department: designation.trim(), // Using designation as department
      email: email.toLowerCase().trim(),
      addedAt: new Date().toISOString()
    };

    return { member, errors: [] };
  }

  static parseCSV(csvContent: string): CSVParseResult {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        error: 'CSV file is empty',
        validMembers: [],
        invalidRows: [],
        totalRows: 0
      };
    }

    const validMembers: DistributionListMember[] = [];
    const invalidRows: Array<{ row: number; data: string[]; errors: string[] }> = [];
    let totalRows = 0;

    // Check if first row is header
    const firstLineColumns = lines[0].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
    let startIndex = 0;
    
    // Header detection - check for expected column names
    const expectedHeaders = ['list name', 'role', 'designation', 'email address', 'status'];
    const isHeader = expectedHeaders.every(header => 
      firstLineColumns.some(col => 
        col.toLowerCase().includes(header.toLowerCase()) || 
        (header === 'email address' && col.toLowerCase().includes('email'))
      )
    );
    
    if (isHeader) {
      startIndex = 1;
    }

    // Track emails to detect duplicates
    const seenEmails = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      totalRows++;
      const rowIndex = i + 1; // 1-based row numbering for user display
      const parseResult = this.parseLine(lines[i], rowIndex);

      if (parseResult.errors.length > 0) {
        invalidRows.push({
          row: rowIndex,
          data: lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, '')),
          errors: parseResult.errors
        });
      } else if (parseResult.member) {
        // Check for duplicate emails
        const email = parseResult.member.email.toLowerCase();
        if (seenEmails.has(email)) {
          invalidRows.push({
            row: rowIndex,
            data: lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, '')),
            errors: [`Duplicate email: ${email}`]
          });
        } else {
          seenEmails.add(email);
          validMembers.push(parseResult.member);
        }
      }
    }

    return {
      success: invalidRows.length === 0,
      error: invalidRows.length > 0 ? `Found ${invalidRows.length} invalid rows` : undefined,
      validMembers,
      invalidRows,
      totalRows
    };
  }

  static generateSampleCSV(): string {
    const headers = ['Name', 'Role', 'Department', 'Email'];
    const sampleData = [
      ['John Doe', 'Software Engineer', 'Engineering', 'john.doe@company.com'],
      ['Jane Smith', 'Product Manager', 'Product', 'jane.smith@company.com'],
      ['Mike Johnson', 'Designer', 'Design', 'mike.johnson@company.com']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  static downloadSampleCSV(): void {
    const csvContent = this.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'distribution_list_sample.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  static exportDistributionList(members: DistributionListMember[], listName: string): void {
    const csvData = [
      ['Name', 'Role', 'Department', 'Email', 'Added Date'],
      ...members.map(member => [
        member.name,
        member.role,
        member.department,
        member.email,
        new Date(member.addedAt).toLocaleDateString()
      ])
    ];

    const csvContent = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_members.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
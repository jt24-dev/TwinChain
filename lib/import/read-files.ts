import {
  IMPORT_LIMITS,
  parseCsv,
  previewImport,
  workbookTables,
  type ImportPreview,
} from './network-import.ts';

export async function readImportFiles(
  format: 'excel' | 'csv',
  files: File[],
): Promise<ImportPreview> {
  if (files.length !== (format === 'excel' ? 1 : 2))
    throw new Error('Select the required file or files first.');
  for (const file of files) {
    if (file.size > IMPORT_LIMITS.bytes)
      throw new Error(
        'Each file must be 10 MB or smaller. Split larger networks before importing.',
      );
    if (
      !file.name.toLowerCase().endsWith(format === 'excel' ? '.xlsx' : '.csv')
    )
      throw new Error(
        `Choose ${format === 'excel' ? 'an .xlsx workbook' : '.csv files'}.`,
      );
  }
  if (format === 'csv') {
    const [facilities, routes] = await Promise.all(files.map((f) => f.text()));
    const f = parseCsv(facilities, 'Facilities'),
      r = parseCsv(routes, 'Routes');
    return previewImport(f.rows, r.rows, [...f.issues, ...r.issues]);
  }
  try {
    // Lazy-load the browser-only reader. Formula cells contribute saved values; no calculation or external content is executed.
    const { default: readWorkbook } = await import('read-excel-file/browser');
    const tables = workbookTables(await readWorkbook(files[0]));
    return previewImport(tables.facilities, tables.routes, tables.issues);
  } catch {
    throw new Error(
      'The workbook could not be read. Save it as an unencrypted .xlsx file with Facilities and Routes worksheets, then try again.',
    );
  }
}

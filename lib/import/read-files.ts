import {
  IMPORT_LIMITS,
  parseCsv,
  previewImport,
  workbookTables,
  type ImportIssue,
  type ImportPreview,
  type ImportTable,
} from './network-import.ts';
import {
  applyColumnMapping,
  suggestColumnMapping,
  type ColumnMapping,
} from './import-mapping.ts';

export interface RawImportSheet {
  name: string;
  data: ImportTable;
}

export interface RawImportSource {
  sheets: RawImportSheet[];
  issues: ImportIssue[];
  facilitySheet?: string;
  routeSheet?: string;
  standardSheets: boolean;
}

function checkFiles(format: 'excel' | 'csv', files: File[]) {
  if (
    format === 'excel'
      ? files.length !== 1
      : files.length < 2 || files.length > 3
  )
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
}

export async function readImportSource(
  format: 'excel' | 'csv',
  files: File[],
): Promise<RawImportSource> {
  checkFiles(format, files);
  if (format === 'csv') {
    const [facilities, routes, inventory] = await Promise.all(
      files.map((file) => file.text()),
    );
    const facilityTable = parseCsv(facilities, 'Facilities');
    const routeTable = parseCsv(routes, 'Routes');
    const inventoryTable =
      inventory === undefined ? undefined : parseCsv(inventory, 'Inventory');
    return {
      sheets: [
        { name: 'Facilities', data: facilityTable.rows },
        { name: 'Routes', data: routeTable.rows },
        ...(inventoryTable
          ? [{ name: 'Inventory', data: inventoryTable.rows }]
          : []),
      ],
      issues: [
        ...facilityTable.issues,
        ...routeTable.issues,
        ...(inventoryTable?.issues ?? []),
      ],
      facilitySheet: 'Facilities',
      routeSheet: 'Routes',
      standardSheets: true,
    };
  }
  try {
    // Formula cells contribute saved values; no calculation or external content is executed.
    const { default: readWorkbook } = await import('read-excel-file/browser');
    const sheets: RawImportSheet[] = (await readWorkbook(files[0])).map(
      ({ sheet, data }) => ({ name: sheet, data }),
    );
    const facilities = sheets.filter(
      (sheet) => sheet.name.trim().toLowerCase() === 'facilities',
    );
    const routes = sheets.filter(
      (sheet) => sheet.name.trim().toLowerCase() === 'routes',
    );
    return {
      sheets,
      issues: [],
      facilitySheet: facilities.length === 1 ? facilities[0].name : undefined,
      routeSheet: routes.length === 1 ? routes[0].name : undefined,
      standardSheets: facilities.length === 1 && routes.length === 1,
    };
  } catch {
    throw new Error(
      'The workbook could not be read. Save it as an unencrypted .xlsx file, then try again.',
    );
  }
}

export function previewMappedImport(
  source: RawImportSource,
  facilitySheet: string,
  routeSheet: string,
  facilityMapping: ColumnMapping,
  routeMapping: ColumnMapping,
  inventorySheet = '',
  inventoryMapping?: ColumnMapping,
): ImportPreview {
  const facilities = source.sheets.find(
    (sheet) => sheet.name === facilitySheet,
  );
  const routes = source.sheets.find((sheet) => sheet.name === routeSheet);
  const selectionIssues: ImportIssue[] = [];
  if (!facilities)
    selectionIssues.push({
      severity: 'error',
      table: 'Facilities',
      field: 'worksheet',
      message: 'Choose a Facilities worksheet.',
    });
  if (!routes)
    selectionIssues.push({
      severity: 'error',
      table: 'Routes',
      field: 'worksheet',
      message: 'Choose a Routes worksheet.',
    });
  if (facilitySheet && facilitySheet === routeSheet)
    selectionIssues.push({
      severity: 'error',
      table: 'Workbook',
      field: 'worksheet',
      message: 'Facilities and Routes must use different worksheets.',
    });
  const mappedFacilities = applyColumnMapping(
    facilities?.data ?? [],
    'facilities',
    facilityMapping.fields,
  );
  const mappedRoutes = applyColumnMapping(
    routes?.data ?? [],
    'routes',
    routeMapping.fields,
  );
  const inventory = inventorySheet
    ? applyColumnMapping(
        source.sheets.find((s) => s.name === inventorySheet)?.data ?? [],
        'inventory',
        inventoryMapping?.fields ?? {},
      )
    : undefined;
  if (inventorySheet && [facilitySheet, routeSheet].includes(inventorySheet))
    selectionIssues.push({
      severity: 'error',
      table: 'Inventory',
      field: 'worksheet',
      message: 'Choose a separate inventory worksheet.',
    });
  return previewImport(
    mappedFacilities.table,
    mappedRoutes.table,
    [
      ...source.issues,
      ...selectionIssues,
      ...mappedFacilities.issues,
      ...mappedRoutes.issues,
      ...(inventory?.issues ?? []),
    ],
    inventory?.table,
  );
}

export async function readImportFiles(
  format: 'excel' | 'csv',
  files: File[],
): Promise<ImportPreview> {
  checkFiles(format, files);
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

export function suggestedMappings(
  source: RawImportSource,
  facilitySheet: string,
  routeSheet: string,
) {
  return {
    facilities: suggestColumnMapping(
      source.sheets.find((sheet) => sheet.name === facilitySheet)?.data ?? [],
      'facilities',
    ),
    routes: suggestColumnMapping(
      source.sheets.find((sheet) => sheet.name === routeSheet)?.data ?? [],
      'routes',
    ),
  };
}

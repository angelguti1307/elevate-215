// The single swap point for storage. To move to a database, implement
// SchoolStore/VisitStore/NameVariantStore against db/schema.sql and export them here instead.
import { csvSchoolStore, DEFAULT_SCHOOLS_CSV } from '../schools';
import { jsonVisitStore } from './json-store';
import { createVisitService } from '../visits';
import { createNameVariantService, csvNameVariantStore, DEFAULT_NAME_VARIANTS_CSV } from '../names';

export const schoolStore = csvSchoolStore(process.env.SCHOOLS_CSV ?? DEFAULT_SCHOOLS_CSV);
export const visitStore = jsonVisitStore(process.env.VISITS_JSON ?? 'data/visits.json');
export const nameVariantStore = csvNameVariantStore(process.env.NAME_VARIANTS_CSV ?? DEFAULT_NAME_VARIANTS_CSV);

export const visitService = createVisitService(schoolStore, visitStore);
export const nameVariantService = createNameVariantService(schoolStore, nameVariantStore);

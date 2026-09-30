// The single swap point for storage. To move to a database, implement
// SchoolStore/VisitStore against db/schema.sql and export them here instead.
import { csvSchoolStore, DEFAULT_SCHOOLS_CSV } from '../schools';
import { jsonVisitStore } from './json-store';
import { createVisitService } from '../visits';

export const schoolStore = csvSchoolStore(process.env.SCHOOLS_CSV ?? DEFAULT_SCHOOLS_CSV);
export const visitStore = jsonVisitStore(process.env.VISITS_JSON ?? 'data/visits.json');

export const visitService = createVisitService(schoolStore, visitStore);

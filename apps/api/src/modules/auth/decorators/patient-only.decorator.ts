import { SetMetadata } from '@nestjs/common';
import { PATIENT_ONLY_KEY } from '../auth.constants';

export const PatientOnly = () => SetMetadata(PATIENT_ONLY_KEY, true);

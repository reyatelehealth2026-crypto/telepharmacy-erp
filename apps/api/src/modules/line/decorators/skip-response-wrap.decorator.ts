import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_WRAP } from '../line.constants';

export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP, true);

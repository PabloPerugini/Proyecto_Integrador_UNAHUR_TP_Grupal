import { careersApi } from './careers';
import { progressApi } from './progress';

export const apiService = {
  ...careersApi,
  ...progressApi,
};
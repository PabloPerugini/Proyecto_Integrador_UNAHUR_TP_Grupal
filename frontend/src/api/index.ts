import { usersApi } from './users';
import { careersApi } from './careers';
import { progressApi } from './progress';

export const apiService = {
  ...usersApi,
  ...careersApi,
  ...progressApi,
};
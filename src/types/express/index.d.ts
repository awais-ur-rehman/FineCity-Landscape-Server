import { IUser } from '../../models/User.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validatedQuery?: any;
      branchId?: string;
    }
  }
}

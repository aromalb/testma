// Who can open which part of the desk. Mirrors ACCESS in public/index.html.
export const ACCESS = {
  admin: ['dashboard', 'bookings', 'rentals', 'dispatch', 'quotes', 'payments', 'reports', 'accounts', 'drivers', 'fleet', 'settings'],
  dispatcher: ['dashboard', 'bookings', 'rentals', 'dispatch', 'quotes', 'accounts', 'drivers', 'fleet'],
  accounts: ['dashboard', 'bookings', 'rentals', 'quotes', 'payments', 'reports', 'accounts'],
};

export const ROLE_LABEL = { admin: 'Admin', dispatcher: 'Dispatcher', accounts: 'Accounts' };

export const AREA_LABEL = {
  dashboard: 'Today', bookings: 'Bookings', rentals: 'Rentals', dispatch: 'Dispatch board', quotes: 'Quotes', payments: 'Invoices and payments', reports: 'Reports',
  accounts: 'Client accounts', drivers: 'Chauffeurs', fleet: 'Fleet', settings: 'Settings',
};

// Which roles may write each kind of record.
export const WRITE = {
  bookings: ['admin', 'dispatcher', 'accounts'],
  rentals: ['admin', 'dispatcher', 'accounts'],
  quotes: ['admin', 'dispatcher', 'accounts'],
  payments: ['admin', 'dispatcher', 'accounts'],
  accounts: ['admin', 'accounts'],
  drivers: ['admin', 'dispatcher'],
  vehicles: ['admin', 'dispatcher'],
  invoices: ['admin', 'accounts'],
};

export const COLLECTIONS = Object.keys(WRITE);

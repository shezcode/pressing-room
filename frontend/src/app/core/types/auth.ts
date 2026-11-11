export type Role = 'customer' | 'admin';

// The signed-in person, as the backend returns them on sign-in and sign-up (minus what the app never reads)
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  // The seeded Admin has no location
  countryId?: string;
  communityId?: string;
  provinceId?: string;
};

export type AuthResponse = {
  message: string;
  user: SessionUser;
  token: string;
};

export type Credentials = {
  email: string;
  password: string;
};

export type SignUpData = Credentials & {
  name: string;
  countryId: string;
  // Only Spain has communities and provinces; other countries send them empty
  communityId: string;
  provinceId: string;
};

// What the browser keeps between visits
export type Session = {
  token: string;
  user: SessionUser;
};

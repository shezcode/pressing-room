// Location choices come from the backend's /location routes (Spanish regions)
export interface Country {
  id: string;
  name: string;
  isoCode: string;
}

export interface Community {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  name: string;
  communityId: string;
}

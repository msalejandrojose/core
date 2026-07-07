// Tipos de fila de las tablas de localización. Reflejan los *ResponseDto del
// módulo `geo` de la API (ver apps/api/src/modules/geo).

export interface CountryRow {
  id: string;
  iso2: string;
  iso3: string;
  numericCode: string | null;
  name: string;
  nativeName: string | null;
  phoneCode: string | null;
  isActive: boolean;
}

export interface RegionRow {
  id: string;
  code: string;
  name: string;
  countryId: string;
}

export interface ProvinceRow {
  id: string;
  code: string;
  name: string;
  countryId: string;
  regionId: string | null;
}

export interface MunicipalityRow {
  id: string;
  code: string;
  name: string;
  provinceId: string;
}

export interface PostalCodeRow {
  id: string;
  code: string;
  municipalityId: string;
}

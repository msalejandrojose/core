import type { Condition } from './condition.ts';
import type { I18nKey, JsonValue } from './json.ts';
import type { RepositorySource } from '../repository/types.ts';
import type { Validation } from './validation.ts';

/** Opción de un campo de selección (`select` / `multiselect`). */
export interface SelectOption {
  value: string;
  label: I18nKey;
  disabled?: boolean;
}

/** Opción jerárquica (`treeSelect` / `cascader`). */
export interface TreeOption {
  value: string;
  label: I18nKey;
  disabled?: boolean;
  children?: TreeOption[];
}

// --- Value objects (formas de valor no escalares) ---------------------------

/** Referencia a un archivo subido (el binario vive en el módulo de storage). */
export interface FileRef {
  id?: string;
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

/** Rango de fechas (`dateRange` / `dateRangeTime`). ISO-8601. */
export interface DateRangeValue {
  from: string | null;
  to: string | null;
}

/** Coordenadas geográficas (`coordinates`). */
export interface CoordinatesValue {
  lat: number;
  lng: number;
}

/** Dirección postal estructurada (`address`). */
export interface AddressValue {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

/** Entrada de un mapa clave/valor (`keyValue`). */
export interface KeyValueEntry {
  key: string;
  value: string;
}

/** Política de contraseña declarativa (`password`). */
export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  requireUpper?: boolean;
  requireLower?: boolean;
  requireDigit?: boolean;
  requireSymbol?: boolean;
  disallowCommon?: boolean;
}

/**
 * Metadatos comunes a todos los campos. Las labels son `I18nKey`: el package
 * solo declara la clave, el renderer la resuelve con su provider de i18n.
 */
export interface FieldMeta {
  label?: I18nKey;
  placeholder?: I18nKey;
  helpText?: I18nKey;
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  validations?: Validation[];
  visibleWhen?: Condition;
  enabledWhen?: Condition;
  testId?: string;
}

/** Base de los campos que producen un valor (tienen `name`). */
export interface DataFieldBase extends FieldMeta {
  name: string;
}

/** Base de los campos de selección con opciones estáticas o por repositorio. */
export interface ChoiceFieldBase extends DataFieldBase {
  /** Opciones estáticas. Opcional si se declara `source` (repositorio). */
  options?: SelectOption[];
  /** Fuente de opciones por repositorio (`resolveFormRepositories`). */
  source?: RepositorySource;
}

// --- Texto y contenido ------------------------------------------------------

export interface TextField extends DataFieldBase {
  type: 'text';
  defaultValue?: string;
  /** Sugerencia de render multilínea sin llegar a `textarea`. */
  multiline?: boolean;
}

export interface TextareaField extends DataFieldBase {
  type: 'textarea';
  defaultValue?: string;
  rows?: number;
}

/** Editor de texto enriquecido. El valor es HTML (o markdown) serializado. */
export interface RichtextField extends DataFieldBase {
  type: 'richtext';
  defaultValue?: string;
  /** Formato del valor almacenado. */
  format?: 'html' | 'markdown';
}

export interface EmailField extends DataFieldBase {
  type: 'email';
  defaultValue?: string;
}

export interface UrlField extends DataFieldBase {
  type: 'url';
  defaultValue?: string;
}

/** Identificador amigable de URL (kebab-case). */
export interface SlugField extends DataFieldBase {
  type: 'slug';
  defaultValue?: string;
  /** Campo del que auto-derivar el slug (p. ej. un `title`). */
  from?: string;
}

export interface ColorField extends DataFieldBase {
  type: 'color';
  /** Hex (`#RRGGBB`). */
  defaultValue?: string;
}

export interface PasswordField extends DataFieldBase {
  type: 'password';
  defaultValue?: string;
  policy?: PasswordPolicy;
  /** Mostrar medidor de fortaleza en el renderer. */
  strengthMeter?: boolean;
}

// --- Numérico ---------------------------------------------------------------

export interface NumberField extends DataFieldBase {
  type: 'number';
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface CurrencyField extends DataFieldBase {
  type: 'currency';
  defaultValue?: number;
  min?: number;
  max?: number;
  /** ISO-4217 (`EUR`, `USD`…). */
  currency?: string;
}

export interface PercentageField extends DataFieldBase {
  type: 'percentage';
  defaultValue?: number;
  min?: number;
  max?: number;
}

/** Deslizador acotado. */
export interface RangeField extends DataFieldBase {
  type: 'range';
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
}

/** Puntuación discreta (estrellas). */
export interface RatingField extends DataFieldBase {
  type: 'rating';
  defaultValue?: number;
  /** Nº máximo de estrellas (por defecto 5). */
  max?: number;
}

// --- Fecha y tiempo ---------------------------------------------------------

export interface DateField extends DataFieldBase {
  type: 'date';
  /** ISO-8601 (`YYYY-MM-DD`). */
  defaultValue?: string;
  min?: string;
  max?: string;
}

export interface TimeField extends DataFieldBase {
  type: 'time';
  /** `HH:mm` (o `HH:mm:ss`). */
  defaultValue?: string;
}

export interface DatetimeField extends DataFieldBase {
  type: 'datetime';
  /** ISO-8601 con hora. */
  defaultValue?: string;
}

export interface MonthField extends DataFieldBase {
  type: 'month';
  /** `YYYY-MM`. */
  defaultValue?: string;
}

export interface YearField extends DataFieldBase {
  type: 'year';
  defaultValue?: number;
  min?: number;
  max?: number;
}

export interface TimezoneField extends DataFieldBase {
  type: 'timezone';
  /** IANA tz (`Europe/Madrid`). */
  defaultValue?: string;
}

export interface DateRangeField extends DataFieldBase {
  type: 'dateRange';
  defaultValue?: DateRangeValue;
  min?: string;
  max?: string;
}

/** Rango de fecha-hora (variante de `dateRange` con hora). */
export interface DateRangeTimeField extends DataFieldBase {
  type: 'dateRangeTime';
  defaultValue?: DateRangeValue;
}

// --- Selección --------------------------------------------------------------

export interface SelectField extends ChoiceFieldBase {
  type: 'select';
  defaultValue?: string;
}

export interface MultiselectField extends ChoiceFieldBase {
  type: 'multiselect';
  defaultValue?: string[];
}

export interface RadioField extends ChoiceFieldBase {
  type: 'radio';
  defaultValue?: string;
}

export interface CheckboxField extends DataFieldBase {
  type: 'checkbox';
  defaultValue?: boolean;
}

export interface ToggleField extends DataFieldBase {
  type: 'toggle';
  defaultValue?: boolean;
}

/** Entrada libre de etiquetas. Valor: lista de strings. */
export interface TagsField extends DataFieldBase {
  type: 'tags';
  defaultValue?: string[];
  /** Sugerencias opcionales. */
  suggestions?: string[];
  maxTags?: number;
}

/** Selección única con búsqueda (opciones estáticas o por repositorio). */
export interface AutocompleteField extends ChoiceFieldBase {
  type: 'autocomplete';
  defaultValue?: string;
}

/** Selección sobre un árbol de opciones. */
export interface TreeSelectField extends DataFieldBase {
  type: 'treeSelect';
  options: TreeOption[];
  multiple?: boolean;
  defaultValue?: string | string[];
}

/** Selección en cascada: el valor es la ruta de values desde la raíz. */
export interface CascaderField extends DataFieldBase {
  type: 'cascader';
  options: TreeOption[];
  defaultValue?: string[];
}

// --- Identidad y contacto ---------------------------------------------------

export interface PhoneField extends DataFieldBase {
  type: 'phone';
  defaultValue?: string;
  /** Prefijo por defecto (ISO country, p. ej. `ES`). */
  defaultCountry?: string;
}

/** Código de un solo uso (OTP). */
export interface OtpField extends DataFieldBase {
  type: 'otp';
  defaultValue?: string;
  /** Nº de dígitos (por defecto 6). */
  length?: number;
}

/** Nombre de usuario con comprobación de disponibilidad async (via `custom`). */
export interface UsernameField extends DataFieldBase {
  type: 'username';
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}

// --- Localización -----------------------------------------------------------

export interface AddressField extends DataFieldBase {
  type: 'address';
  defaultValue?: AddressValue;
}

export interface CoordinatesField extends DataFieldBase {
  type: 'coordinates';
  defaultValue?: CoordinatesValue;
}

export interface CountryField extends DataFieldBase {
  type: 'country';
  /** ISO-3166-1 alpha-2. */
  defaultValue?: string;
}

export interface LocaleField extends DataFieldBase {
  type: 'locale';
  /** BCP-47 (`es-ES`). */
  defaultValue?: string;
}

export interface PostalCodeField extends DataFieldBase {
  type: 'postalCode';
  defaultValue?: string;
  /** País para validar el formato (por defecto `ES`). */
  country?: string;
}

// --- Archivos ---------------------------------------------------------------

export interface FileField extends DataFieldBase {
  type: 'file';
  /** Permite múltiples archivos (valor: `FileRef[]`). */
  multiple?: boolean;
  accept?: string[];
  maxSize?: number;
  defaultValue?: FileRef | FileRef[] | null;
}

export interface ImageField extends DataFieldBase {
  type: 'image';
  multiple?: boolean;
  accept?: string[];
  maxSize?: number;
  defaultValue?: FileRef | FileRef[] | null;
}

/** Avatar (imagen única con recorte). */
export interface AvatarField extends DataFieldBase {
  type: 'avatar';
  defaultValue?: FileRef | null;
}

/** Firma manuscrita capturada como imagen. */
export interface SignatureField extends DataFieldBase {
  type: 'signature';
  defaultValue?: FileRef | null;
}

// --- Documentos legales / financieros ---------------------------------------

export interface TaxIdField extends DataFieldBase {
  type: 'taxId';
  defaultValue?: string;
  /** País del identificador fiscal (por defecto `ES`: NIF/NIE/CIF). */
  country?: string;
}

export interface IbanField extends DataFieldBase {
  type: 'iban';
  defaultValue?: string;
}

export interface BankAccountField extends DataFieldBase {
  type: 'bankAccount';
  defaultValue?: string;
}

export interface CreditCardField extends DataFieldBase {
  type: 'creditCard';
  defaultValue?: string;
}

// --- Estructurales ----------------------------------------------------------

export interface HiddenField extends DataFieldBase {
  type: 'hidden';
  defaultValue?: JsonValue;
}

/**
 * Agrupador puramente presentacional. Sus hijos siguen siendo campos de
 * primer nivel (sus valores NO se anidan bajo el grupo), de modo que un grupo
 * solo afecta al layout y a la visibilidad en bloque.
 */
export interface GroupField extends FieldMeta {
  type: 'group';
  fields: readonly Field[];
  /** Nº de columnas en las que distribuir los hijos (el renderer decide). */
  columns?: number;
}

/**
 * Repetidor: una lista de sub-formularios. A diferencia de `group`, SÍ anida
 * valor: el valor es un array de objetos `{ [name]: valor }` según `fields`.
 */
export interface ArrayField extends DataFieldBase {
  type: 'array';
  fields: readonly Field[];
  min?: number;
  max?: number;
  defaultValue?: Record<string, JsonValue>[];
}

/** Mapa clave/valor editable. Valor: `KeyValueEntry[]`. */
export interface KeyValueField extends DataFieldBase {
  type: 'keyValue';
  defaultValue?: KeyValueEntry[];
}

/** JSON libre (editor de código). Valor: cualquier `JsonValue`. */
export interface JsonField extends DataFieldBase {
  type: 'json';
  defaultValue?: JsonValue;
}

// --- UI helpers (sin valor) -------------------------------------------------

export interface HeadingField {
  type: 'heading';
  text: I18nKey;
  level?: 1 | 2 | 3;
  visibleWhen?: Condition;
  testId?: string;
}

export interface ParagraphField {
  type: 'paragraph';
  text: I18nKey;
  visibleWhen?: Condition;
  testId?: string;
}

export interface DividerField {
  type: 'divider';
  visibleWhen?: Condition;
  testId?: string;
}

/** Consentimiento explícito (checkbox con texto legal). Valor: boolean. */
export interface ConsentField extends DataFieldBase {
  type: 'consent';
  /** Texto/enlace del consentimiento. */
  text: I18nKey;
  defaultValue?: boolean;
}

/** Campos que producen un valor en el modelo del formulario. */
export type DataField =
  // Texto y contenido
  | TextField
  | TextareaField
  | RichtextField
  | EmailField
  | UrlField
  | SlugField
  | ColorField
  | PasswordField
  // Numérico
  | NumberField
  | CurrencyField
  | PercentageField
  | RangeField
  | RatingField
  // Fecha y tiempo
  | DateField
  | TimeField
  | DatetimeField
  | MonthField
  | YearField
  | TimezoneField
  | DateRangeField
  | DateRangeTimeField
  // Selección
  | SelectField
  | MultiselectField
  | RadioField
  | CheckboxField
  | ToggleField
  | TagsField
  | AutocompleteField
  | TreeSelectField
  | CascaderField
  // Identidad y contacto
  | PhoneField
  | OtpField
  | UsernameField
  // Localización
  | AddressField
  | CoordinatesField
  | CountryField
  | LocaleField
  | PostalCodeField
  // Archivos
  | FileField
  | ImageField
  | AvatarField
  | SignatureField
  // Legales / financieros
  | TaxIdField
  | IbanField
  | BankAccountField
  | CreditCardField
  // Estructurales
  | HiddenField
  | ArrayField
  | KeyValueField
  | JsonField
  // Consentimiento
  | ConsentField;

/**
 * Unión discriminada de todos los campos. Es **forward-compatible**: los
 * renderers deben ignorar tipos que no conozcan en vez de romper, por lo que
 * añadir un tipo nuevo aquí no es un breaking change para renderers antiguos.
 */
export type Field =
  | DataField
  | GroupField
  | HeadingField
  | ParagraphField
  | DividerField;

export type FieldType = Field['type'];

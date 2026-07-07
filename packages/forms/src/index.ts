// Tipos del schema
export type {
  JsonPrimitive,
  JsonValue,
  I18nKey,
  Condition,
  LeafCondition,
  Validation,
  ValidationKind,
  // Bases y value objects
  SelectOption,
  TreeOption,
  FieldMeta,
  DataFieldBase,
  ChoiceFieldBase,
  FileRef,
  DateRangeValue,
  CoordinatesValue,
  AddressValue,
  KeyValueEntry,
  PasswordPolicy,
  // Texto y contenido
  TextField,
  TextareaField,
  RichtextField,
  EmailField,
  UrlField,
  SlugField,
  ColorField,
  PasswordField,
  // Numérico
  NumberField,
  CurrencyField,
  PercentageField,
  RangeField,
  RatingField,
  // Fecha y tiempo
  DateField,
  TimeField,
  DatetimeField,
  MonthField,
  YearField,
  TimezoneField,
  DateRangeField,
  DateRangeTimeField,
  // Selección
  SelectField,
  MultiselectField,
  RadioField,
  CheckboxField,
  ToggleField,
  TagsField,
  AutocompleteField,
  TreeSelectField,
  CascaderField,
  // Identidad y contacto
  PhoneField,
  OtpField,
  UsernameField,
  // Localización
  AddressField,
  CoordinatesField,
  CountryField,
  LocaleField,
  PostalCodeField,
  // Archivos
  FileField,
  ImageField,
  AvatarField,
  SignatureField,
  // Legales / financieros
  TaxIdField,
  IbanField,
  BankAccountField,
  CreditCardField,
  // Estructurales
  HiddenField,
  GroupField,
  ArrayField,
  KeyValueField,
  JsonField,
  // UI helpers y consentimiento
  HeadingField,
  ParagraphField,
  DividerField,
  ConsentField,
  // Uniones
  DataField,
  Field,
  FieldType,
  FormSchema,
  FormValues,
} from './types/index.ts';

// Helpers
export {
  defineForm,
  getDefaultValues,
  type InferFormValues,
} from './helpers/defineForm.ts';
export { collectDataFields, findDataField, isDataField } from './helpers/walk.ts';

// Condiciones
export {
  evaluateCondition,
  isFieldVisible,
  isFieldEnabled,
} from './conditions/index.ts';

// Validación
export {
  validateForm,
  defaultMessage,
  isUrl,
  isInteger,
  isPhone,
  isLuhnValid,
  isIban,
  isSpanishTaxId,
  isTaxId,
  type CustomValidator,
  type ValidateOptions,
  type ValidationResult,
} from './validation/index.ts';

// Schema persistido (forma JSON de la API) + adaptador al schema declarativo
export type {
  FormFieldType,
  FormFieldOption,
  FormFieldSchema,
  FormSchemaJson,
} from './persisted/types.ts';
export { apiSchemaToCoreSchema } from './persisted/adapter.ts';

// Selectores con repositorio (§5): contrato + resolución
export type {
  FormRepository,
  FormRepositoryOption,
  FormRepositoryQuery,
  FormRepositoryResult,
  FormRepositoryRegistry,
  RepositorySource,
} from './repository/types.ts';
export { resolveFormRepositories } from './repository/resolve.ts';

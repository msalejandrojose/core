// Tipos del schema
export type {
  JsonPrimitive,
  JsonValue,
  I18nKey,
  Condition,
  LeafCondition,
  Validation,
  ValidationKind,
  SelectOption,
  FieldMeta,
  DataFieldBase,
  TextField,
  TextareaField,
  EmailField,
  PasswordField,
  NumberField,
  SelectField,
  MultiselectField,
  RadioField,
  CheckboxField,
  ToggleField,
  DateField,
  HiddenField,
  GroupField,
  HeadingField,
  DividerField,
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
  type CustomValidator,
  type ValidateOptions,
  type ValidationResult,
} from './validation/index.ts';

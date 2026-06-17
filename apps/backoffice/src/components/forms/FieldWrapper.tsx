import { type ReactNode } from 'react';
import {
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface FieldWrapperProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  children: (field: ControllerRenderProps<T, FieldPath<T>>) => ReactNode;
}

/**
 * Reduce el boilerplate de FormField > FormItem > FormLabel > FormControl >
 * FormMessage. El input concreto se pasa como render-prop recibiendo el `field`.
 */
export function FieldWrapper<T extends FieldValues>({
  control,
  name,
  label,
  children,
}: FieldWrapperProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>{children(field)}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

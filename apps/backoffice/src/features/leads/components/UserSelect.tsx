import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/features/users/hooks/use-users';

interface Props {
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
}

/** Selector de usuario (BACKOFFICE) reutilizado para asignar y convertir. */
export function UserSelect({ value, onChange, placeholder }: Props) {
  const { data } = useUsers({ limit: 100, userType: 'BACKOFFICE' });
  const users = data?.data ?? [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? 'Selecciona un usuario'} />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
          return (
            <SelectItem key={u.id} value={u.id}>
              {name || u.email}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

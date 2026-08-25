import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArchetypesTab } from './archetypes/ArchetypesTab';
import { PartsTab } from './parts/PartsTab';

export function CarsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Coches"
        description="Arquetipos y piezas montables, con sus efectos sobre velocidad y agarre — editables sin desplegar el juego."
      />
      <Tabs defaultValue="archetypes">
        <TabsList>
          <TabsTrigger value="archetypes">Arquetipos</TabsTrigger>
          <TabsTrigger value="parts">Piezas</TabsTrigger>
        </TabsList>
        <TabsContent value="archetypes">
          <ArchetypesTab />
        </TabsContent>
        <TabsContent value="parts">
          <PartsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

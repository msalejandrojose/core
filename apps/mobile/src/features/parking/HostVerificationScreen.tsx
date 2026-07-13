import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { documentTextOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { uploadFormFile } from '@/components/forms/upload';
import { SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import {
  getMyHostVerification,
  submitHostVerification,
  type HostVerification,
} from './parking.api';
import { hostVerificationStatusColor, hostVerificationStatusLabel } from './status';

/**
 * KYC básico del host (TASK-155): declara su nombre legal y sube un
 * documento de identidad (reutiliza el flujo de subida de `storage`, igual
 * que las fotos de una plaza). Un admin lo revisa desde el backoffice
 * (`AdminHostVerificationsController`).
 */
export default function HostVerificationScreen() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verification, setVerification] = useState<HostVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [legalName, setLegalName] = useState('');
  const [documentFileId, setDocumentFileId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getMyHostVerification();
    setVerification(data);
    if (data) setLegalName(data.legalName);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  async function handlePickDocument(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const ref = await uploadFormFile(file);
      if (!ref.id) throw new Error('missing file id');
      setDocumentFileId(ref.id);
      setDocumentName(ref.name ?? file.name);
    } catch {
      toast.error('No se pudo subir el documento');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!legalName.trim() || !documentFileId) return;
    setSubmitting(true);
    const { data, errorMessage } = await submitHostVerification({
      legalName: legalName.trim(),
      documentFileId,
    });
    setSubmitting(false);
    if (!data) {
      toast.error('No se pudo enviar la verificación', errorMessage);
      return;
    }
    toast.success('Verificación enviada', 'Te avisaremos cuando la revisemos.');
    setVerification(data);
    setDocumentFileId(null);
    setDocumentName(null);
  }

  // Se puede (re)enviar si no hay solicitud, o si la última fue rechazada.
  const canSubmit = !verification || verification.status === 'REJECTED';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/host" text="" />
          </IonButtons>
          <IonTitle>Verificación de identidad</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {loading ? (
          <SkeletonList rows={3} />
        ) : (
          <>
            {verification ? (
              <div className="core-card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IonIcon
                    icon={shieldCheckmarkOutline}
                    style={{ fontSize: 20, color: 'var(--ion-color-primary)' }}
                  />
                  <IonBadge color={hostVerificationStatusColor(verification.status)}>
                    {hostVerificationStatusLabel(verification.status)}
                  </IonBadge>
                </div>
                {verification.status === 'REJECTED' && verification.rejectionReason ? (
                  <p style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 10 }}>
                    Motivo: {verification.rejectionReason}
                  </p>
                ) : null}
                {verification.status === 'PENDING' ? (
                  <p style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 10 }}>
                    Estamos revisando tu solicitud.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="core-subtitle" style={{ marginBottom: 20 }}>
                Verifica tu identidad para dar más confianza a los huéspedes que reserven tus
                plazas.
              </p>
            )}

            {canSubmit ? (
              <>
                <IonInput
                  className="core-field"
                  value={legalName}
                  onIonInput={(e) => setLegalName(String(e.detail.value ?? ''))}
                  fill="outline"
                  label="Nombre legal completo"
                  labelPlacement="stacked"
                  placeholder="Como aparece en tu documento de identidad"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={handlePickDocument}
                />
                <IonButton
                  expand="block"
                  fill="outline"
                  style={{ marginTop: 16 }}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IonIcon icon={documentTextOutline} slot="start" aria-hidden="true" />
                  {uploading ? 'Subiendo…' : documentName ? documentName : 'Subir documento de identidad'}
                </IonButton>

                <IonButton
                  expand="block"
                  style={{ marginTop: 12 }}
                  disabled={!legalName.trim() || !documentFileId || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Enviando…' : 'Enviar verificación'}
                </IonButton>
              </>
            ) : null}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}

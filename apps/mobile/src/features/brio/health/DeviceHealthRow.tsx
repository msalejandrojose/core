import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { useBrioStore } from '../brio.store';
import { timeAgo } from '../social/social.api';
import {
  deviceHealthApi,
  deviceHealthAvailable,
  deviceHealthName,
  devicePlatform,
  deviceSyncSummary,
  requestDeviceHealth,
  syncDeviceHealth,
  useHealthDeviceStatus,
} from './device-health';

/**
 * Fila de «Salud del teléfono» en Conexiones: conectar Apple Salud / Health
 * Connect, sincronizar a mano y desconectar. En la web dice que es cosa del móvil.
 */
export function DeviceHealthRow() {
  const platform = devicePlatform();
  const name = deviceHealthName(platform);
  const { status, setStatus } = useHealthDeviceStatus();
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const [available, setAvailable] = useState<{ available: boolean; reason?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void deviceHealthAvailable().then(setAvailable);
  }, []);

  // Conectado desde otro teléfono (p. ej. el Android) mientras miras en el iPhone.
  const otherPhone = !!status?.connected && !!platform && status.platform !== platform;
  const connectedHere = !!status?.connected && !otherPhone;

  async function connect() {
    setBusy(true);
    try {
      await requestDeviceHealth();
      const r = await syncDeviceHealth(connectedHere ? (status?.lastSyncAt ?? null) : null);
      setStatus(r.status);
      void refreshDay();
      toast.success(`${name} conectado`, deviceSyncSummary(r.sync));
    } catch (e) {
      toast.error(`No se pudo leer ${name}`, isApiError(e) ? e.message : 'Revisa los permisos en los ajustes del teléfono.');
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    try {
      const r = await syncDeviceHealth(status?.lastSyncAt ?? null);
      setStatus(r.status);
      void refreshDay();
      toast.success('Sincronizado', deviceSyncSummary(r.sync));
    } catch (e) {
      toast.error('No se pudo sincronizar', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await deviceHealthApi.disconnect();
      setStatus(status ? { ...status, connected: false, platform: null, lastSyncAt: null } : null);
      toast.success(`${name} desconectado`, 'Lo ya traído se queda. Los permisos se quitan en los ajustes del teléfono.');
    } catch (e) {
      toast.error('No se pudo desconectar', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const sub = !platform
    ? 'Solo en la app del iPhone o Android'
    : available && !available.available
      ? available.reason
      : connectedHere
        ? status?.lastSyncAt
          ? `Conectado · ${timeAgo(status.lastSyncAt)}`
          : 'Conectado'
        : otherPhone
          ? `Conectado desde ${deviceHealthName(status.platform)}`
          : 'Sueño, pulso, variabilidad, pasos, peso y entrenos';

  const canUse = !!platform && !!available?.available && !!status;

  return (
    <div className="rk-list">
      <div className="rk-row">
        <span className="conn__badge conn__badge--health" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="var(--brio-heart)" />
          </svg>
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">{platform ? name : 'Apple Salud y Health Connect'}</span>
          <span className="rk-row__sub">
            <span className={`conn__dot${connectedHere ? ' is-on' : ''}`} aria-hidden="true" /> {sub}
          </span>
        </span>
        {canUse && (
          <button type="button" className="rk-textbtn" disabled={busy} onClick={() => void (connectedHere ? sync() : connect())}>
            {busy ? '…' : connectedHere ? 'Sincronizar' : 'Conectar'}
          </button>
        )}
      </div>
      {canUse && connectedHere && (
        <button type="button" className="rk-row conn__toggle" disabled={busy} onClick={() => void disconnect()}>
          <span className="rk-row__main">
            <span className="rk-row__title is-danger">Desconectar {name}</span>
          </span>
        </button>
      )}
    </div>
  );
}

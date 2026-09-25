import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveSharedRecord, watchSharedRecord, type SharedCategory, type SharedRecord } from './sharedRepository';

/** Explicit saves, live updates when clean, and revision checks protect another user's changes. */
export function useSharedDocument<T>(category: SharedCategory, id: string, initial: T) {
  const { mode } = useAuth();
  const [data, setValue] = useState(initial);
  const [remote, setRemote] = useState<SharedRecord<T> | null>(null);
  const [loaded, setLoaded] = useState(mode !== 'shared');
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const revision = useRef(0);
  const edits = useRef(0);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const defaults = useRef(initial);
  useEffect(() => {
    if (mode !== 'shared' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, mode]);
  useEffect(() => {
    if (mode !== 'shared') return;
    setLoaded(false); setError(''); dirtyRef.current = false; setDirty(false); setValue(defaults.current); revision.current = 0;
    return watchSharedRecord<T>(category, id, (item) => {
      setRemote(item); setLoaded(true);
      if (!dirtyRef.current) { setValue(item?.data ?? defaults.current); revision.current = item?.revision ?? 0; }
    }, (reason) => { setError(reason.message); setLoaded(false); });
  }, [category, id, mode]);
  function setData(value: T | ((previous: T) => T)) { edits.current += 1; dirtyRef.current = true; setDirty(true); setValue(value); }
  async function save(value?: T) {
    if (mode !== 'shared' || !loaded || inFlight.current) return;
    inFlight.current = true;
    const savedEdit = edits.current;
    const dataToSave = value ?? data;
    setSaving(true); setError('');
    try {
      await saveSharedRecord(category, id, dataToSave, revision.current);
      revision.current += 1;
      if (edits.current === savedEdit) { dirtyRef.current = false; setDirty(false); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'บันทึกไม่สำเร็จ'); }
    finally { inFlight.current = false; setSaving(false); }
  }
  function reload() { setValue(remote?.data ?? defaults.current); revision.current = remote?.revision ?? 0; dirtyRef.current = false; setDirty(false); setError(''); }
  return { data, setData, save, reload, loaded, dirty, saving, error, revision: remote?.revision ?? 0 };
}
